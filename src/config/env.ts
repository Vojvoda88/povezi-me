/**
 * Validacija env varijabli na startu – fail-fast ako nedostaje obavezna vrijednost.
 * U produkciji: DATABASE_URL, JWT_SECRET i FRONTEND_URL su obavezni.
 */
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 3000)),
  // U development/test režimu DATABASE_URL smije biti prazan (logujemo WARN, ali ne gasimo proces).
  // U produkciji se i dalje tretira kao obavezan (vidi dole).
  DATABASE_URL: z.string().optional().default(''),
  JWT_SECRET: z.string().optional().default(''),
  FRONTEND_URL: z.string().optional().default(''),
  PUBLIC_SITE_URL: z.string().optional().default('https://povezi.me'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(): EnvConfig {
  const parsed = envSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: process.env.PORT,
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    FRONTEND_URL: process.env.FRONTEND_URL,
    PUBLIC_SITE_URL: process.env.PUBLIC_SITE_URL,
  });

  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
    console.error('[CONFIG] Neispravne env varijable:', msg);
    // U development/test modu ne gasimo proces zbog lošeg configa – samo logujemo grešku.
    // U produkciji i dalje fail-fast (nemamo validan cfg da nastavimo).
    const nodeEnv = process.env.NODE_ENV || 'development';
    if (nodeEnv === 'production') {
      process.exit(1);
    }
    // Dev/test: vratimo minimalni cfg da bi se server digao, iako će pojedine funkcije možda fail-ovati kasnije.
    return {
      NODE_ENV: nodeEnv as 'development' | 'test' | 'production',
      PORT: parseInt(process.env.PORT || '3000', 10),
      DATABASE_URL: process.env.DATABASE_URL || '',
      JWT_SECRET: process.env.JWT_SECRET || '',
      FRONTEND_URL: process.env.FRONTEND_URL || '',
      PUBLIC_SITE_URL: process.env.PUBLIC_SITE_URL || 'https://povezi.me',
    };
  }

  const cfg = parsed.data;
  if (cfg.NODE_ENV === 'production') {
    if (!cfg.DATABASE_URL || cfg.DATABASE_URL.trim() === '') {
      console.error('[CONFIG] U produkciji DATABASE_URL je obavezan.');
      process.exit(1);
    }
    if (!cfg.JWT_SECRET || cfg.JWT_SECRET.length < 32) {
      console.error('[SECURITY] U produkciji JWT_SECRET mora biti postavljen i imati najmanje 32 znaka.');
      process.exit(1);
    }
    if (cfg.JWT_SECRET === 'super-tajni-kljuc') {
      console.error('[SECURITY] U produkciji ne smijete koristiti default JWT_SECRET.');
      process.exit(1);
    }
    if (!cfg.FRONTEND_URL || cfg.FRONTEND_URL.trim() === '') {
      console.error('[CONFIG] U produkciji FRONTEND_URL je obavezan (CORS).');
      process.exit(1);
    }
  } else {
    // Dev/test: upozorenja umjesto exit-a za nedostajuće vrijednosti.
    if (!cfg.DATABASE_URL) {
      console.warn('[CONFIG] DATABASE_URL nije postavljen (dev/test). Baza možda neće raditi ispravno.');
    }
  }

  return cfg;
}
