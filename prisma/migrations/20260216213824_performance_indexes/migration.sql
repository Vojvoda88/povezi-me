-- AlterTable
ALTER TABLE "User" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "Ad_status_idx" ON "Ad"("status");

-- CreateIndex
CREATE INDEX "Ad_status_kategorija_idx" ON "Ad"("status", "kategorija");

-- CreateIndex
CREATE INDEX "Ad_status_deletedAt_featuredUntil_createdAt_idx" ON "Ad"("status", "deletedAt", "featuredUntil", "createdAt");

-- CreateIndex
CREATE INDEX "Ad_vlasnikId_createdAt_idx" ON "Ad"("vlasnikId", "createdAt");

-- CreateIndex
CREATE INDEX "Conversation_createdAt_idx" ON "Conversation"("createdAt");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");

-- CreateIndex
CREATE INDEX "Report_adId_reporterUserId_idx" ON "Report"("adId", "reporterUserId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");
