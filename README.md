# Poveži.ME – Premium Marketplace

Marketplace za kupovinu i prodaju (automobili, motocikli, nekretnine, tehnika itd.) u Crnoj Gori.

## Potrebno

- Node.js 18+
- PostgreSQL (za backend)

## Instalacija

1. Kloniraj repozitorijum i uđi u folder:
   ```bash
   cd "Sve novo"
   npm install
   ```

2. Kopiraj env primjer i popuni varijable:
   ```bash
   copy .env.example .env
   ```
   U `.env` postavi:
   - `DATABASE_URL` – connection string za PostgreSQL
   - `JWT_SECRET` – tajni kljuc za JWT (npr. dugi random string)
   - Za lokalni razvoj: `VITE_API_URL=http://localhost:3001/api` (opciono; backend dev koristi 3001)

3. **Prisma (baza i klijent)**  
   Backend **ne smije biti pokrenut** (zaustavi ga s Ctrl+C ako radi). Zatim:
   ```bash
   npm run db:migrate
   npm run db:generate
   ```
   Ili: `npx prisma migrate deploy` pa `npx prisma generate`.  
   Kod svakog `npm install` automatski se pokreće `prisma generate` (postinstall). Ako mijenjaš `prisma/schema.prisma`, ponovo pokreni `npm run db:generate` (bez pokrenutog backenda).

## Pokretanje

- **Backend i frontend odjednom:**  
  `npm run dev`  
  Backend: http://localhost:3001 (dev koristi 3001 da izbjegne sukob s portom 3000)  
  Frontend: http://localhost:5173 (ili 5174/5175 ako je 5173 zauzet)  

- **Samo backend:**  
  `npm run backend` (koristi port 3001)  

- **Samo frontend:**  
  `npm run frontend`  
  (Vite proxy šalje /api i /health na localhost:3001)

## Testiranje s prijateljima / suradnicima

- **Želiš im samo poslati link da uđu?** Vidi **docs/POSALJI-LINK-PRIJATELJIMA.md** – kako deploy-ovati (npr. Render + Vercel) da dobiješ jedan URL koji im pošalješ; oni samo otvore link u browseru.
- **Želiš im dati i kod da pokrenu lokalno?** Podijeli im **docs/TESTIRANJE-ZA-PRIJATELJE.md** – i opcija "samo link" i uputstvo za lokalno pokretanje + checklist šta da testiraju.

## Deploy na produkciju

- **Jedan vodič, minimalno klikanja:** **docs/DEPLOY-JEDNOM-RUKOM.md** (Render + Vercel, render.yaml i vercel.json već u projektu).
- Detaljno: **DEPLOY.md**. Brzi pregled:

```bash
npm run deploy:check   # provjera prije deploya
npm run deploy:jwt     # generiši JWT_SECRET za produkciju
npm run db:migrate     # primijeni migracije
```

## Skripte

| Skripta           | Opis                          |
|-------------------|--------------------------------|
| `npm run dev`     | Backend (3001) + frontend (5173) |
| `npm run backend` | Samo Express API (dev, PORT=3001) |
| `npm run frontend`| Samo Vite (React)              |
| `npm run build`   | Build backenda (TypeScript → dist) |
| `npm run build:frontend` | Build React SPA za produkciju |
| `npm run start`   | Pokretanje built backenda (NODE_ENV iz okoline) |
| `npm run start:prod` | Pokretanje built backenda sa `NODE_ENV=production` |
| `npm run test`    | Vitest testovi                 |
| `npm run db:generate` | Regeneriši Prisma klijent (zaustavi backend prije) |
| `npm run db:migrate` / `npm run migrate:deploy` | Sigurna Prisma migrate deploy (vidi DEPLOY.md) |
| `npm run deploy:check`| Provjera prije deploya (gitignore, migracije, build) |
| `npm run deploy:jwt`  | Generiši siguran JWT_SECRET za produkciju |
| `npm run smoke-test`  | Brzi smoke-test API-ja (`/health`, `/api/ads`, detalj oglasa) |
| `npm run ci`      | Lokalni CI: testovi, smoke-test, build backend + frontend |
| `npm run e2e`     | Playwright E2E testovi (vidi ispod: fiksni port 5175) |

## API

- **Auth:** `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` (Bearer token)
- **Oglasi:** `GET /api/ads` – lista (query: q, kategorija, lokacija, page, limit) → `{ ads, total, page, limit }`
- **Oglasi:** `GET /api/ads/:slug` – jedan oglas po slug-u (uključuje vlasnik, uvećava poglede)
- **Oglasi:** `POST /api/ads` – kreiranje (auth obavezan)
- **Obavještenja:** `GET /api/notifications`, `POST /api/notifications/mark-read` (auth)
- **Favoriti:** `GET /api/favorites`, `POST /api/favorites` (body: { adId }), `DELETE /api/favorites/:adId` (auth)
- **SEO:** `GET /sitemap.xml`, `GET /robots.txt`

**Napomena:** U produkciji mora biti postavljen jak `JWT_SECRET` u env; inace aplikacija nece pokrenuti.

**TEST_MODE:** `TEST_MODE=true` je samo za E2E testove (stubovi za upload i Stripe). **Zabranjeno je u produkciji** – backend pri startu izlazi s greškom ako je `NODE_ENV=production` i `TEST_MODE=true`.

### E2E testovi (Playwright)

- Pokretanje: `npm run e2e`. Prije toga skripta `scripts/e2e-prepare.js` oslobodi portove **5175** (Vite) i **3001** (backend) da E2E server uvijek koristi iste portove.
- Playwright koristi **fiksni port 5175** za frontend: komanda `npm run e2e:serve` pokreće backend na 3001 i Vite sa `vite --port 5175`. `baseURL` i `webServer.url` u `playwright.config.ts` su `http://localhost:5175` (ili `E2E_BASE_URL` ako je postavljen). Time su testovi deterministični čak i kad su 5173 ili 3000 zauzeti.

## Produkcija – SPA fallback

Production hosting **mora** servirati `index.html` za sve nepoznate rute (npr. `/oglas/:slug`, `/prodavac/:id`). Na taj način React Router može obraditi rutu nakon direktnog otvaranja ili refresh stranice. Konfigurirajte fallback na `index.html` u Render, Vercel, Nginx ili drugom hostingu.

## Licenca

Privatno / projekat Poveži.ME.
