-- Clean orphan AdViewThrottle records before adding FK
DELETE FROM "AdViewThrottle" WHERE "adId" NOT IN (SELECT "id" FROM "Ad");

-- Add FK: AdViewThrottle.adId -> Ad.id ON DELETE CASCADE
ALTER TABLE "AdViewThrottle" ADD CONSTRAINT "AdViewThrottle_adId_fkey" FOREIGN KEY ("adId") REFERENCES "Ad"("id") ON DELETE CASCADE ON UPDATE CASCADE;
