import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import axios from "axios";
import { AuthenticatedRequest } from "../middleware/authentication";


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

function generateTransactionToken(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Mock bank API call for demonstration
const simulateBankApi = async (amount: number, userId: number, provider: String): Promise<{ success: boolean }> => {
    // Simulate a delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return { success: true }; // Simulate a successful response
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
                timestamp: new Date()
            }
        })
        let success = false;
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
                success = true;
                //to create the ranscation table for p2p tranaction
            });

            await prisma.p2pTransfer.update({
                where: { id: p2pTransferAction?.id },
                data: {
                    status: "Success",
                    fromUserId: Number(fromUser?.id),
                    toUserId: toUser.id,
                    amount,
                    timestamp: new Date()
                }
            })


            return res.status(200).json({ message: "Fund transfer succesfull" })
        } catch (transactionError: any) {
            await prisma.p2pTransfer.update({
                where: { id: p2pTransferAction?.id },
                data: {
                    status: "Failure",
                    fromUserId: Number(fromUser?.id),
                    toUserId: toUser.id,
                    amount,
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