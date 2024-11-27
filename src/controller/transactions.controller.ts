import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import axios from "axios";
import { AuthenticatedRequest } from "../middleware/authentication";
import { generateTransactionToken, simulateBankApi } from "../services/mockBanksService";


const prisma = new PrismaClient();

export const addMoney = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { amount, provider } = req.body;

        // Access the authenticated user's ID from the token no need to find the userId specifically form anywhere
        const userId = req.user?.id;
        if (!userId) {
            res.status(400).json({ error: "uSER NOT FOUND" });
        }
        // Validate inputs
        if (!amount || !provider) {
            res.status(400).json({ error: "Missing required fields" });
        }

        if (amount <= 0) {
            res.status(400).json({ error: "Invalid amount" });
        }

        //Verify if user exists,already done but need to be figired out 
        // const user = await prisma.user.findUnique({
        //     where: { id: userId },
        // });

        // if (!user) {
        //     res.status(404).json({ error: "User not found" });
        // }


        const transaction = await prisma.onRampTransaction.create({
            data: {
                status: "Processing",
                token: generateTransactionToken(),
                provider,
                amount,
                startTime: new Date(),
                userId: userId || 0,
            },
        });
        // let bankResponse = await axios.post("https://bankapi.example.com/process", { //hitting the api for the banks to be added here
        //     userId,
        //     amount,
        //     provider,
        // });
        let bankResponse = await simulateBankApi(amount, userId ? userId : 0, provider); //checking for userId or returning the defualt user id 
        if (bankResponse && bankResponse.success) {
            await prisma.onRampTransaction.update({
                where: { id: transaction.id },
                data: { status: "Success" },
            });

            //findign the balance for the user

            const userBalance = await prisma.balance.findUnique({
                where: { userId },
            });

            if (userBalance) {
                await prisma.balance.update({
                    where: { userId },
                    data: {
                        amount: {// 
                            increment: Number(amount)
                        }
                    },
                });
            }
            res
                .status(200)
                .json({ message: "Funds added successfully", transactionId: transaction.id });
        } else {
            await prisma.onRampTransaction.update({
                where: { id: transaction.id },
                data: { status: "Failure" },
            });

            res.status(400).json({ error: "Bank API reported failure" });
        }
    } catch (error) {
        console.error("Error in addMoney:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};


export const p2pTransfer = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const { to, amount } = req.body;

        // Validate inputs
        if (!amount || !to) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        const fromUser = req.user;
        if (!fromUser) {
            return res.status(400).json({ error: "Invalid Sender" });
        }
        //check for toUser exists or not
        const toUser = await prisma.user.findFirst({ //await is imp as ot is a db call
            where: {
                phoneNumber: to
            }
        })

        if (!toUser) {
            return res.status(404).json({ error: "User Not Found" });
        }

        //transaction to transfer fund 
        const p2pTransferAction = await prisma.p2pTransfer.create({
            data: {
                status: "Processing",
                fromUserId: Number(fromUser?.id),
                token: generateTransactionToken(),
                toUserId: toUser.id,
                amount,
                timestamp: new Date(),
                paymentMode: fromUser.phoneNumber.toString(),
                receiverMode: toUser.phoneNumber.toString()
            }
        })

        try {
            await prisma.$transaction(async (tx) => {
                //locking the update row so only one at a time
                await tx.$queryRaw`SELECT * FROM "Balance" WHERE "userId" = ${Number(fromUser?.id)} FOR UPDATE`;

                const fromBalance = await tx.balance.findUnique({
                    where: { userId: Number(fromUser?.id) },
                });
                if (!fromBalance || fromBalance.amount < amount) {
                    throw new Error("Insufficent funds")
                }

                //time to check before lock the problem would occcur show why locking is imp
                // console.log("Before sleep")
                // await new Promise(r => setTimeout(r, 2000));
                // console.log("After sleep")

                await tx.balance.update({
                    where: { userId: Number(fromUser?.id) },
                    data: { amount: { decrement: amount } },
                });

                await tx.balance.update({
                    where: { userId: Number(toUser?.id) },
                    data: { amount: { increment: amount } },
                });

                //to create the ranscation table for p2p tranaction
            });

            await prisma.p2pTransfer.update({
                where: { id: p2pTransferAction?.id },
                data: {
                    status: "Success",
                    timestamp: new Date()
                }
            })


            return res.status(200).json({ message: "Fund transfer succesfull" })
        } catch (transactionError: any) {
            await prisma.p2pTransfer.update({
                where: { id: p2pTransferAction?.id },
                data: {
                    status: "Failure",
                    timestamp: new Date()
                }
            })
            // Handle specific errors or re-throw for general errors

            return res.status(402).json({ error: "Insufficient funds for transfer" });

            //throw transactionError; // Re-throw for other unhandled errors
        }
    } catch (error: any) {
        console.log("Error in Transfering Money:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

export const walletBalance = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const user = req.user;
        if (!user) {
            res.status(404).json("User not Found")
        }
        const UserBalance = await prisma.balance.findFirst({
            where: { userId: user?.id }
        })
        res.status(200).json({ "User Balance": UserBalance?.amount || 0 })

    } catch (error) {
        console.error("Failed To Fetched balance")
        res.status(400).json({ error: "Failed To Fetched balance" })
    }
}

export const getUserTransactionHistory = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const { type, mode } = req.query; //type (from/receiver), and mode (number/bankName)
        const user = req.user;
        if (!user) {
            res.status(404).json("User not Found")
        }
        const userId = user?.id
        if (!userId) {
            return res.status(400).json({ error: "User ID is required" });
        }


         //filters that are added for the  search as per the query
        const filters: any = {};

        if (type === "from") {
            filters.fromUserId = Number(userId);
        } else if (type === "receiver") {
            filters.toUserId = Number(userId);
        }
         else {
            return res.status(400).json({ error: "Invalid transaction type" });
        }

        if (mode) {
            if (type === "from") {
                filters.paymentMode = mode.toString(); // Filter by payment mode for sender
            } else if (type === "receiver") {
                filters.receiverMode = mode.toString(); // Filter by receiver mode for receiver
            }
        }

        // Query transaction history
        const transactionHistory = await prisma.p2pTransfer.findMany({
            where: filters,
            orderBy: { timestamp: "desc" },
            select: {
                //id: true,
                amount: true,
                status: true,
                // token: true,
                timestamp: true,
                fromUser: {
                    select: {
                        userName: true,
                    },
                },
                toUser: {
                    select: {
                        userName: true,
                    },
                },
                paymentMode: true,
                receiverMode: true,
            },
        });

        if (transactionHistory.length === 0) {
            return res.status(404).json({ message: "No transactions found" });
        }

        // Format response
        const formattedHistory = transactionHistory.map((tx) => ({
            //transactionId: tx.id,
            amount: tx.amount,
            status: tx.status,
            timestamp: tx.timestamp,
            //token: tx.token,
            sender: tx.fromUser?.userName || "Unknown",
            receiver: tx.toUser?.userName || "Unknown",
            paymentMode: tx.paymentMode,
            receiverMode: tx.receiverMode,
        }));

        res.status(200).json({
            message: "Transaction history fetched successfully",
            transactions: formattedHistory,
        });
    } catch (error) {
        console.error("Error fetching transaction history:", error);
        res.status(500).json({ error: "Error fetching transaction history:" });
    }
};
