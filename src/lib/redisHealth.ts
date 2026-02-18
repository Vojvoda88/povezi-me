import Redis from 'ioredis';

let healthClient: Redis | null = null;

/**
 * Shared Redis klijent za health-check, kako bismo izbjegli kreiranje nove konekcije
 * na svaki /health poziv.
 */
export function getHealthRedisClient(redisUrl: string): Redis {
  if (healthClient) return healthClient;
  healthClient = new Redis(redisUrl);
  return healthClient;
}

