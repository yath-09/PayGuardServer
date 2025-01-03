import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authentication";
import { PrismaClient } from "@prisma/client";
import { comparePin, hashPin } from "../services/hashedPassword";
import { generateTransactionToken, mockBankTransaction } from "../services/mockBanksService";
import { error } from "console";
import amqp from 'amqplib';
const prisma = new PrismaClient();

export const addBank = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const { accountNumber, bankName, ifscCode, mpin } = req.body;
        // Validate inputs
        if (!accountNumber || !bankName || !ifscCode || !mpin) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const user = req?.user;
        if (!user) {
            return res.status(401).json({ error: "Authentication required" });
        }

        // Verify the bank exists
        const bank = await prisma.bank.findUnique({ where: { name: bankName.toLowerCase() } });
        if (!bank) {
            return res.status(400).json({ error: "Invalid bank selected" });
        }

        // If MPIN is not provided, use the user's PIN as the default MPIN
        const secureMpin = mpin
        // ? mpin
        // : user?.pin; // Default to user's PIN if no MPIN is provided

        // Ensure MPIN is a 6-digit number
        if (!/^\d{6}$/.test(secureMpin)) {
            return res.status(400).json({ error: "MPIN must be a 6-digit number" });
        }

        const hashedPin: string = hashPin(secureMpin);

        // Check if the bank account already exists for the user
        const existingAccount = await prisma.bankAccount.findFirst({
            where: { userId: user.id, bankId: bank.id },
        });

        if (existingAccount) {
            return res.status(400).json({ error: "Bank account already exists" });
        }

        // Generate the UPI ID
        const upiId = `${user.phoneNumber}@${bank.name.toLowerCase()}.payguard`;

        // Add the new bank account
        const newBankAccount = await prisma.bankAccount.create({
            data: {
                accountNumber,
                ifscCode,
                bankName: bank.name,
                upiId,
                isDefault: false, // Not the default account initially
                userId: user.id,
                mpin: hashedPin,
                bankId: bank.id,
            },
        });

        res.status(201).json({
            message: "Bank account added successfully",
            bankAccount: {
                accountNumber: newBankAccount.accountNumber,
                bankName: newBankAccount.bankName,
                upiId: newBankAccount.upiId,
            },
        });
    } catch (error) {
        console.error("Error adding bank account:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const userToUserTransfer = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const { senderUpiId, receiverUpiId, amount, mpin } = req.body;

        // Validate inputs
        if (!senderUpiId || !receiverUpiId || !amount || !mpin) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        if (amount <= 0) {
            return res.status(400).json({ error: "Amount must be greater than zero" });
        }

        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: "Authentication required" });
        }

        // Verify the sender's UPI ID and associated account first check if the upi id of the sender is avilable in the auntecticated user or not
        const senderAccount = await prisma.bankAccount.findFirst({
            where: { upiId: senderUpiId, userId: user.id },
        });

        if (!senderAccount) {
            return res.status(404).json({ error: "Sender UPI ID not found" });
        }
        // Verify the receiver's UPI ID and associated account
        const receiverAccount = await prisma.bankAccount.findFirst({
            where: { upiId: receiverUpiId },
            include: { user: true }, // Include user details for the receiver
        });

        if (!receiverAccount) {
            return res.status(404).json({ error: "Receiver UPI ID not found" });
        }

        // Validate MPIN
        // Validate MPIN (hashed comparison)
        const isMpinValid = await comparePin(mpin, senderAccount.mpin);
        // console.log(`Provided MPIN: ${mpin}`);
        // console.log(`Stored Hashed MPIN: ${senderAccount.mpin}`);
        // console.log(`Is MPIN valid: ${isMpinValid}`);

        if (!isMpinValid) {
            return res.status(403).json({ error: "Invalid MPIN" });
        }

        // Simulate bank-side balance check and transfer
        //this is an extra step which is not needed can be removed as we are checking for banks but this is a;ready stored in bankAcoounts
        // const senderBank = await prisma.bank.findUnique({ where: { id: senderAccount.bankId } });
        // const receiverBank = await prisma.bank.findUnique({ where: { id: receiverAccount.bankId } });

        // if (!senderBank || !receiverBank) {
        //     return res.status(500).json({ error: "Bank information unavailable" });
        // }
        if (amount > senderAccount.bankTransferLimit) {
            return res.status(401).json({ error: `Can not transfer more than ${senderAccount.bankTransferLimit} at one go` })
        }

        const userToUserTransferAction = await prisma.p2pTransfer.create({
            data: {
                fromUserId: senderAccount.userId,
                toUserId: receiverAccount.userId,
                amount,
                status: "Processing",
                token: generateTransactionToken(),
                timestamp: new Date(),
                paymentMode: senderAccount.bankName.toString(),
                receiverMode: receiverAccount.bankName.toString(),
            },
        });
        const startTime = Date.now();
        // Mock API call to simulate bank transaction
        const bankTransactionResult = await mockBankTransaction(
            // senderBank.name,
            // receiverBank.name,
            senderAccount.accountNumber,
            receiverAccount.accountNumber,
            amount,
            userToUserTransferAction.token
        );
        //check the processign case with the below 
        await new Promise((resolve) => setTimeout(resolve, 2000));
 
        const processingTime = Date.now() - startTime;
        if (processingTime> 2000) {
            const QUEUE_NAME = "transactionQueue";
            const rabbitMQURL = process.env.RABBITMQ_URL || "amqp://localhost";
            const connection = await amqp.connect(rabbitMQURL);
            const channel = await connection.createChannel();
            await channel.assertQueue(QUEUE_NAME, { durable: true });

            const transactionData = {
                transactionId: userToUserTransferAction.id,
                senderAccountNumber: senderAccount.accountNumber,
                receiverAccountNumber: receiverAccount.accountNumber,
                amount,
                transactionToken: userToUserTransferAction.token,
                retryNumbers:1,
            };

            // Send the transaction to RabbitMQ queue
            channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(transactionData)), {
                persistent: true,
            });
            setTimeout(() => connection.close(), 500);
            return res.status(200).json({
                message: "Transaction queued successfully for processing",
                details: {
                    sender: senderAccount.upiId,
                    receiver: receiverUpiId,
                    amount,
                    status: "Processing",
                },
            });
        }
        if (!bankTransactionResult.success) {
            await prisma.p2pTransfer.update({
                where: { id: userToUserTransferAction?.id },
                data: {
                    status: "Failure",
                    timestamp: new Date()
                },
            });
            return res.status(400).json({
                error: "Transaction failed due to insufficient funds or other bank-side issues",
            });
        }

        // Log the transaction
        await prisma.p2pTransfer.update({
            where: { id: userToUserTransferAction?.id },
            data: {
                status: "Success",
                timestamp: new Date()
            },
        });

        res.status(200).json({
            message: "Transaction successful",
            details: {
                sender: senderAccount.upiId,
                receiver: receiverUpiId,
                amount,
                transactionHash: bankTransactionResult.hash,
            },
        });
    } catch (error) {
        console.error("Error during U2U transfer:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const updateTransferLimit = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    const user = req.user;
    if (!user) {
        res.status(404).json("User not Found")
    }
    const { newLimit, bankName } = req.body;
    if (!newLimit || !bankName) {
        return res.status(400).json({ error: "Missing required fields" });
    }
    if (newLimit <= 0) {
        return res.status(400).json({ error: "Wallet limit must be greater than zero." });
    }

    try {
        const updatedBankAccount = await prisma.bankAccount.updateMany({
            where: {
                userId: user?.id,
                bankName: bankName.toLowerCase(),
            },
            data: {
                bankTransferLimit: newLimit,
            },
        });

        if (updatedBankAccount.count === 0) {
            return res.status(404).json({ error: "Bank Account Not Found" });
        }

        return res.status(200).json({ message: `Bank Transfer Limit Updated Successfully for user ${user?.phoneNumber} to ${newLimit} for bank Account ${bankName}` });
    } catch (error) {
        console.error("Error updating bank transfer limit:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};


