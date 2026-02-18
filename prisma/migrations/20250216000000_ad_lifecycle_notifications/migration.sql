-- Ad: lastActivityAt (bump/extend), deletedAt (soft delete)
ALTER TABLE "Ad" ADD COLUMN IF NOT EXISTS "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Ad" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- Notification: entityId, milestone for dedupe
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "entityId" TEXT;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "milestone" INTEGER;

-- Index for lifecycle queries
CREATE INDEX IF NOT EXISTS "Ad_lastActivityAt_idx" ON "Ad"("lastActivityAt");
CREATE INDEX IF NOT EXISTS "Ad_deletedAt_idx" ON "Ad"("deletedAt");
CREATE INDEX IF NOT EXISTS "Notification_userId_tip_entityId_idx" ON "Notification"("userId", "tip", "entityId");
