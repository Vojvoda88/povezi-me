# Render – obavezne postavke

## 1. Migracije baze

**Greška:** `The column Ad.lat does not exist`

Produkcijska baza nema kolone `lat`/`lng`. U Render dashboardu:

1. **Settings** → **Build & Deploy** → **Release Command**
2. Postavi: `npx prisma migrate deploy`

Release command se pokreće prije svakog deploya i izvršava migracije.

## 2. Trust proxy (već u kodu)

Za `express-rate-limit` iza reversa proxy-ja. Ako vidiš `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR`, provjeri da je `app.set('trust proxy', 1)` u `src/index.ts` (već dodano).

## 3. Connection pool (MaxClientsInSessionMode)

**Greška:** `max clients reached - in Session mode max clients are limited to pool_size`

Aplikacija radi, ali admin stats i ostale stranice mogu vraćati DB greške. Supabase Session mode ima limit (~15 konekcija). Prisma drži previše konekcija.

**Rješenje – u Render Dashboardu:**

1. **Dashboard** → tvoj **Web Service** → **Environment**
2. Pronađi `DATABASE_URL`
3. Na kraj URL-a dodaj `?connection_limit=5` (ako već ima `?`, koristi `&connection_limit=5`)

**Primjer:**
```
# Prije (Supabase Direct – port 5432):
postgresql://postgres.xxx:pass@aws-1-eu-central-1.pooler.supabase.com:5432/postgres

# Poslije:
postgresql://postgres.xxx:pass@aws-1-eu-central-1.pooler.supabase.com:5432/postgres?connection_limit=5
```

**Alternativa:** Koristi Supabase **Transaction pooler** (port 6543) umjesto Session (5432) – u Supabase Dashboardu → Project Settings → Database → Connection string (Transaction).
