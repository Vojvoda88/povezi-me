# Šta nam je još ostalo prije lansiranja u etar

Kratak pregled šta je **urađeno** u production readiness reviziji i šta **još treba** od tebe prije go-live.

---

## Urađeno u ovoj reviziji

- **.env.example** – ažuriran (backend + frontend, bez tajni). Koristi ga kao predložak.
- **Frontend API** – jedan helper `getApiBase()` u `api.ts` čita `VITE_API_URL`; u produkciji build obavezno postavi tu varijablu.
- **Backend env** – validacija na startu (zod): u produkciji obavezni `DATABASE_URL`, `JWT_SECRET` (min. 32 znaka), `FRONTEND_URL`. Fail-fast ako nešto fali.
- **Prisma migracija** – kreirana `prisma/migrations/20260216000000_add_admin_report_audit/migration.sql` (User.banned, Report, AdminAuditLog). Na produkciji pokreni `npx prisma migrate deploy`.
- **Prvi admin** – u seedu: ako postaviš `SEED_ADMIN_EMAIL=admin@povezi.me` i pokreneš `npx prisma db seed`, tom korisniku se postavlja `role = ADMIN`. Alternativa: SQL `UPDATE "User" SET role = 'ADMIN' WHERE email = '...';`
- **TS build** – ispravljen: `@types/nodemailer`, Express `Request.requestId`, tipovi u favorites/notifications/seo. `npm run build` (backend) prolazi.
- **SEO** – dinamički `document.title` i meta description + Open Graph za početnu, kategoriju i stranicu oglasa.
- **Legal** – stranice `/pravila` i `/privatnost` + linkovi u footeru.

---

## Gdje se na hostingu postavlja VITE_API_URL (frontend)

- **Vercel:** Project → Settings → Environment Variables. Dodaj `VITE_API_URL` = `https://tvoj-backend.onrender.com/api` (Production). Zatim **Redeploy** da se novi build napravi s tom vrijednošću.
- **Netlify:** Site settings → Build & deploy → Environment. Dodaj `VITE_API_URL` = puni API URL (s `/api`). Ponovi build.
- **Render (static site):** Ako frontend deployaš na Render kao Static Site, u **Environment** dodaj `VITE_API_URL` i **Build Command** ostavi npr. `npm run build:frontend` (Vite će u build uključiti tu vrijednost).

Važno: **VITE_*** varijable se u Vite-u ugrađuju u bundle **u trenutku builda**. Promjena env varijable zahtijeva novi build.

---

## Go-live checklist (redom)

### 1. Env varijable – backend (Render ili VPS)

Na servisu gdje radi Node backend postavi:

| Varijabla | Vrijednost |
|-----------|------------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Connection string za Supabase/Postgres |
| `JWT_SECRET` | Jak nasumičan string (min. 32 znaka) |
| `FRONTEND_URL` | Npr. `https://povezi.me` (bez trailing slash) |
| `PUBLIC_SITE_URL` | Npr. `https://povezi.me` |
| `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` | Ako koristiš upload slika |

### 2. Env varijable – frontend (Vercel/Netlify/Render static)

| Varijabla | Vrijednost |
|-----------|------------|
| `VITE_API_URL` | Puni URL API-ja, npr. `https://povezi-me-api.onrender.com/api` |

Zatim **pokreni novi build** frontenda.

### 3. Baza – migracija

Na serveru (ili lokalno prema produkcijskoj bazi):

```bash
npx prisma migrate deploy
npx prisma generate
```

(Lokalno prvi put: `npx prisma migrate dev --name add_admin_report_audit` ako već nisi, pa na produkciji samo `migrate deploy`.)

### 4. Prvi admin korisnik

**Opcija A – seed:**  
Registruj se na stranici, zatim:

```bash
SEED_ADMIN_EMAIL=tvoj@email.com npx prisma db seed
```

**Napomena:** Seed trenutno briše sve oglase i kreira 50 demo oglasa. Ako već imaš prave oglase, koristi **Opciju B (SQL)** samo za postavljanje admina.

**Opcija B – SQL (Supabase Dashboard → SQL Editor):**

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'tvoj@email.com';
```

### 5. Smoke test

- [ ] **Login** – prijava običnog korisnika i admina.
- [ ] **Oglas** – kreiranje oglasa (sa slikom ako je upload uključen), pregled liste i detalja.
- [ ] **Admin** – ulazak na `/admin`, dashboard, lista korisnika, lista oglasa, ban/unban, promocija oglasa, brisanje oglasa.
- [ ] **Pravila / Privatnost** – otvaranje `/pravila` i `/privatnost`, linkovi u footeru rade.
- [ ] **SEO** – na stranici oglasa provjeri u DevTools / “View Page Source” da se mijenjaju `title` i meta `og:title` / `og:description`.

---

## Lista izmijenjenih fajlova (production readiness)

| Fajl | Promjena |
|------|----------|
| `REPO_AUDIT.md` | Novi – kratak repo audit (frontend/backend root, build, env, gitignore). |
| `.env.example` | Ažuriran – sve potrebne varijable, bez stvarnih tajni. |
| `api.ts` | Novi – `getApiBase()` za frontend (VITE_API_URL). |
| `App.tsx` | Import `getApiBase`, `setPageMeta`, SEO za rute/kategoriju/oglas, pravila/privatnost, LegalPage, footer linkovi. |
| `AdminPanel.tsx` | Import `getApiBase`. |
| `src/config/env.ts` | Novi – validacija env (zod), fail-fast u produkciji. |
| `src/index.ts` | Učitavanje `validateEnv()`, korištenje env configa, uklanjanje RequestWithId (requestId na Request). |
| `src/types/express.d.ts` | Dodan `requestId?: string` na Request. |
| `src/routes/favorites.ts` | Eksplicitni tip za `map` callback. |
| `src/routes/notifications.ts` | Import tipa Notification, tip za `map` callback. |
| `src/routes/seo.ts` | Tip za `forEach` callback (ad). |
| `prisma/migrations/20260216000000_add_admin_report_audit/migration.sql` | Novi – User.banned, Report, AdminAuditLog. |
| `prisma/seed.ts` | Podrška za `SEED_ADMIN_EMAIL` – postavljanje role ADMIN. |
| `package.json` | Dodan `@types/nodemailer` (devDependencies). |
| `PRIJE_LANSIRANJA.md` | Ovaj dokument – ažuriran checklist, uputstva, lista fajlova. |

---

## Status: READY / NOT READY

**READY za lansiranje** nakon što ti uradiš:

1. **Postavi env varijable** na backendu (Render) i frontendu (Vercel/Netlify) kako je gore navedeno.
2. **Pokreni `npx prisma migrate deploy`** (i `prisma generate` ako treba) prema produkcijskoj bazi.
3. **Kreiraj prvog admina** (seed s `SEED_ADMIN_EMAIL` ili SQL `UPDATE`).
4. **Napravi novi build frontenda** s postavljenim `VITE_API_URL` i deployaj ga.

**Ništa ne blokira produkciju** iz koda: build prolazi, migracija je pripremljena, env se validira na startu, pravila i privatnost su na mjestu. Jedino šta “blokira” je tvoja konfiguracija (env, migracija, prvi admin) na hostingu.

---

## Opciono poslije lansiranja

- Refresh token ili “zapamti me”.
- Dedicated 404 stranica.
- Stripe / plaćanja – implementirano, postavi STRIPE_* env.
- CAPTCHA na registraciju.
- E-mail obavijesti (potvrda registracije, prijave oglasa).
