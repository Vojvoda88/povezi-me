-- CreateIndex (for faster ads feed: status + expiresAt, status + featuredUntil)
CREATE INDEX IF NOT EXISTS "Ad_status_expiresAt_idx" ON "Ad"("status", "expiresAt");
CREATE INDEX IF NOT EXISTS "Ad_status_featuredUntil_idx" ON "Ad"("status", "featuredUntil");
