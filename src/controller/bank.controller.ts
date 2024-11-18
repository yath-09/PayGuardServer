import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authentication";
import { PrismaClient } from "@prisma/client";
import { hashPin } from "../services/hashedPassword";

const prisma = new PrismaClient();

export const addBank = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const { accountNumber, bankName, ifscCode, mpin } = req.body;
        // Validate inputs
        if (!accountNumber || !bankName || !ifscCode ||!mpin) {
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


