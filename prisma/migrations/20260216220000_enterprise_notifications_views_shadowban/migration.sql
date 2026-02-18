-- Notification: add dedupeKey (nullable first for backfill)
ALTER TABLE "Notification" ADD COLUMN "dedupeKey" TEXT;

-- Backfill existing notifications (format ensures uniqueness: type:userId:entityId:milestone:id)
UPDATE "Notification"
SET "dedupeKey" = "tip" || ':' || "userId" || ':' || COALESCE("entityId", 'none') || ':' || COALESCE("milestone"::text, 'none') || ':' || "id"
WHERE "dedupeKey" IS NULL;

-- Make NOT NULL and add unique
ALTER TABLE "Notification" ALTER COLUMN "dedupeKey" SET NOT NULL;
CREATE UNIQUE INDEX "Notification_dedupeKey_key" ON "Notification"("dedupeKey");

-- AdViewThrottle table
CREATE TABLE "AdViewThrottle" (
    "id" TEXT NOT NULL,
    "adId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "lastViewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdViewThrottle_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdViewThrottle_adId_key_key" ON "AdViewThrottle"("adId", "key");
CREATE INDEX "AdViewThrottle_lastViewedAt_idx" ON "AdViewThrottle"("lastViewedAt");

-- User: add shadowBanned
ALTER TABLE "User" ADD COLUMN "shadowBanned" BOOLEAN NOT NULL DEFAULT false;
