/**
 * Smart ranking score (runtime only, no DB column).
 * score = (premiumActive ? 1000 : 0) + (views * 0.2) + (likes * 5) + freshnessBoost
 * freshnessBoost: max(0, 50 - daysSinceCreated*5) – gradual decay
 */
export function computeRankingScore(params: {
  premiumActive: boolean;
  views: number;
  likes: number;
  createdAt: Date | string;
}): number {
  const now = new Date();
  const created = typeof params.createdAt === 'string' ? new Date(params.createdAt) : params.createdAt;
  const daysSinceCreated = (now.getTime() - created.getTime()) / (24 * 60 * 60 * 1000);
  const freshnessBoost = Math.max(0, 50 - daysSinceCreated * 5);

  return (
    (params.premiumActive ? 1000 : 0) +
    params.views * 0.2 +
    params.likes * 5 +
    freshnessBoost
  );
}
