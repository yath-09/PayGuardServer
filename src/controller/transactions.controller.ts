import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import axios from "axios";
import { AuthenticatedRequest } from "../middleware/authentication";


const prisma = new PrismaClient();

export const addMoney = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { amount, provider } = req.body;

    // Access the authenticated user's ID from the token
    const userId = req.user?.id;

    // Validate inputs
    if (!userId || !amount || !provider) {
       res.status(400).json({ error: "Missing required fields" });
    }

    if (amount <= 0) {
       res.status(400).json({ error: "Invalid amount" });
    }

    //Step 1: Verify if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
       res.status(404).json({ error: "User not found" });
    }

    // Remaining implementation is the same as before...
    const transaction = await prisma.onRampTransaction.create({
      data: {
        status: "Processing",
        token: generateTransactionToken(),
        provider,
        amount,
        startTime: new Date(),
        userId:user?.id || 0,
      },
    });
    // to check for success without ant bank api
    // let bankResponse={
    //     data:{
    //         status:"success"
    //     }
    // };
    let bankResponse;
    try {
      bankResponse = await axios.post("https://bankapi.example.com/process", { //hitting the api for the banks to be added here
        userId,
        amount,
        provider,
      });
    } catch (error:any) {
      await prisma.onRampTransaction.update({
        where: { id: transaction.id },
        data: { status: "Failure" },
      });

      res
        .status(500)
        .json({ error: "Bank API request failed", details: error.message });
    }

    if (bankResponse && bankResponse.data.status === "success") {
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
            amount:{// 
                increment:Number(amount)
            }
          },
        });
    } 
    //as we are alreayd creating the 0 balcnace so this will not occur
    //else {
    //     await prisma.balance.create({
    //       data: {
    //         userId,
    //         amount,
    //         locked: 0,
    //       },
    //     });
    //   }

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
