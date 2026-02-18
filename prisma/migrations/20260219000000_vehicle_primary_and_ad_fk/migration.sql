-- VehicleMake: add isPrimary
ALTER TABLE "VehicleMake" ADD COLUMN "isPrimary" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "VehicleMake_vehicleType_isPrimary_idx" ON "VehicleMake"("vehicleType", "isPrimary");

-- VehicleModel: add vehicleType (backfill from make), add isPrimary
ALTER TABLE "VehicleModel" ADD COLUMN "vehicleType" TEXT;
UPDATE "VehicleModel" m SET "vehicleType" = mk."vehicleType" FROM "VehicleMake" mk WHERE m."makeId" = mk."id";
ALTER TABLE "VehicleModel" ALTER COLUMN "vehicleType" SET NOT NULL;
ALTER TABLE "VehicleModel" ADD COLUMN "isPrimary" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "VehicleModel_makeId_isPrimary_idx" ON "VehicleModel"("makeId", "isPrimary");

-- Ad: add makeId, modelId (optional FK)
ALTER TABLE "Ad" ADD COLUMN "makeId" TEXT;
ALTER TABLE "Ad" ADD COLUMN "modelId" TEXT;
CREATE INDEX "Ad_makeId_idx" ON "Ad"("makeId");
ALTER TABLE "Ad" ADD CONSTRAINT "Ad_makeId_fkey" FOREIGN KEY ("makeId") REFERENCES "VehicleMake"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Ad" ADD CONSTRAINT "Ad_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "VehicleModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
