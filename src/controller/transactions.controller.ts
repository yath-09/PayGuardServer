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
        if(!userId){
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
        let bankResponse = await simulateBankApi(amount,  userId ? userId:0, provider); //checking for userId or returning the defualt user id 
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
    await new Promise((resolve) => setTimeout(resolve, 100000));
    return { success: false }; // Simulate a successful response
};
