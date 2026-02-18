-- Add NA_CEKANJU to AdStatus enum (oglasi čekaju odobrenje administratora).
-- Must be in a separate transaction from SET DEFAULT (PostgreSQL: new enum value cannot be used in same transaction).
ALTER TYPE "AdStatus" ADD VALUE 'NA_CEKANJU';
