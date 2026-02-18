-- AlterTable
ALTER TABLE "Ad" ADD COLUMN "make" TEXT;
ALTER TABLE "Ad" ADD COLUMN "model" TEXT;
ALTER TABLE "Ad" ADD COLUMN "vehicleSpecs" JSONB;

-- CreateTable
CREATE TABLE "VehicleMake" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VehicleMake_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleModel" (
    "id" TEXT NOT NULL,
    "makeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "VehicleModel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Ad_kategorija_potkategorija_idx" ON "Ad"("kategorija", "potkategorija");
CREATE INDEX "Ad_make_idx" ON "Ad"("make");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleMake_slug_vehicleType_key" ON "VehicleMake"("slug", "vehicleType");
CREATE INDEX "VehicleMake_vehicleType_idx" ON "VehicleMake"("vehicleType");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleModel_makeId_slug_key" ON "VehicleModel"("makeId", "slug");
CREATE INDEX "VehicleModel_makeId_idx" ON "VehicleModel"("makeId");

-- AddForeignKey
ALTER TABLE "VehicleModel" ADD CONSTRAINT "VehicleModel_makeId_fkey" FOREIGN KEY ("makeId") REFERENCES "VehicleMake"("id") ON DELETE CASCADE ON UPDATE CASCADE;
