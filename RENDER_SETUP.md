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

Za Supabase/Neon dodaj ograničenje u `DATABASE_URL`:

```
postgresql://user:pass@host/db?connection_limit=5
```

Ili za Supabase transaction pooler koristi Pooler URL (port 6543) umjesto direktnog (5432).
