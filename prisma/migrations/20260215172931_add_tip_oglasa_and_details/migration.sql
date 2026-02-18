-- AlterTable
ALTER TABLE "Ad" ADD COLUMN     "details" JSONB,
ADD COLUMN     "tipOglasa" TEXT;

-- CreateIndex
CREATE INDEX "Ad_tipOglasa_idx" ON "Ad"("tipOglasa");
