-- AlterTable
ALTER TABLE "Ad" ADD COLUMN     "dedupeKey" TEXT,
ADD COLUMN     "titleNorm" TEXT;

-- CreateIndex
CREATE INDEX "Ad_vlasnikId_dedupeKey_idx" ON "Ad"("vlasnikId", "dedupeKey");
