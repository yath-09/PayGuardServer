-- CreateIndex
CREATE INDEX "BankAccount_bankName_userId_idx" ON "BankAccount"("bankName", "userId");

-- CreateIndex
CREATE INDEX "OnRampTransaction_userId_idx" ON "OnRampTransaction"("userId");
