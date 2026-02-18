-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "AdStatus" AS ENUM ('AKTIVAN', 'PRODAN', 'ISTEKAO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "ime" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "telefon" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "datumRegistracije" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ad" (
    "id" TEXT NOT NULL,
    "naslov" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "opis" TEXT NOT NULL,
    "kategorija" TEXT NOT NULL,
    "potkategorija" TEXT,
    "cijena" DECIMAL(10,2) NOT NULL,
    "lokacija" TEXT NOT NULL,
    "status" "AdStatus" NOT NULL DEFAULT 'AKTIVAN',
    "vlasnikId" TEXT NOT NULL,
    "pogledi" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdImage" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "adId" TEXT NOT NULL,

    CONSTRAINT "AdImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Ad_slug_key" ON "Ad"("slug");

-- CreateIndex
CREATE INDEX "Ad_kategorija_idx" ON "Ad"("kategorija");

-- CreateIndex
CREATE INDEX "Ad_createdAt_idx" ON "Ad"("createdAt");

-- CreateIndex
CREATE INDEX "Ad_vlasnikId_idx" ON "Ad"("vlasnikId");

-- AddForeignKey
ALTER TABLE "Ad" ADD CONSTRAINT "Ad_vlasnikId_fkey" FOREIGN KEY ("vlasnikId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdImage" ADD CONSTRAINT "AdImage_adId_fkey" FOREIGN KEY ("adId") REFERENCES "Ad"("id") ON DELETE CASCADE ON UPDATE CASCADE;