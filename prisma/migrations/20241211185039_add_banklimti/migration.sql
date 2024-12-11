-- AlterTable
ALTER TABLE "BankAccount" ADD COLUMN     "bankTransferLimit" INTEGER NOT NULL DEFAULT 25000;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "walletLimit" INTEGER NOT NULL DEFAULT 10000;
