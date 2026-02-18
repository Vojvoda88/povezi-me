-- Add thumbnail and dimension fields to AdImage for image pipeline
ALTER TABLE "AdImage"
  ADD COLUMN "thumbUrl" TEXT,
  ADD COLUMN "width" INTEGER,
  ADD COLUMN "height" INTEGER;

