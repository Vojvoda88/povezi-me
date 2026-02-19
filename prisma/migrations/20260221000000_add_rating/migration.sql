-- CreateTable
CREATE TABLE "Rating" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "raterId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "adId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Rating_raterId_sellerId_key" ON "Rating"("raterId", "sellerId");
CREATE INDEX "Rating_sellerId_idx" ON "Rating"("sellerId");
CREATE INDEX "Rating_raterId_idx" ON "Rating"("raterId");
