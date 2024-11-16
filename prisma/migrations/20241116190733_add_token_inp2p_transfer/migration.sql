/*
  Warnings:

  - A unique constraint covering the columns `[token]` on the table `p2pTransfer` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `token` to the `p2pTransfer` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "p2pTransfer" ADD COLUMN     "token" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "p2pTransfer_token_key" ON "p2pTransfer"("token");
