-- New ads default to NA_CEKANJU (existing rows unchanged). Runs after enum value is committed.
ALTER TABLE "Ad" ALTER COLUMN "status" SET DEFAULT 'NA_CEKANJU';
