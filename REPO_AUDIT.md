# Repo audit – Povezi.me (Production readiness)

## 1. Struktura repozitorija

| Root | Lokacija | Opis |
|------|----------|------|
| **Frontend** | Korijen projekta (isto kao repo root) | React + TypeScript, Vite. Ulaz: `index.html`, `src/main.tsx`, `App.tsx`, `AdminPanel.tsx`. |
| **Backend** | `src/` | Node.js + Express + TypeScript. Ulaz: `src/index.ts`. Prisma: `prisma/schema.prisma`. |

**Monorepo:** jedan repo, frontend i backend u istom rootu (nema odvojenih `/frontend` i `/backend` foldera).

---

## 2. Build i skripte (`package.json`)

| Skripta | Šta radi |
|---------|----------|
| `npm run build` | Backend: `tsc -p tsconfig.build.json` → izlaz u `dist/` |
| `npm run build:frontend` | Frontend: `vite build` → izlaz u `dist/` (Vite default; pazi da ne prepiše backend `dist/` – Vite obično koristi `dist` za build output). |
| `npm run start` | Backend: `node dist/index.js` (produkcijski start) |
| `npm run dev` | Concurrently: backend (ts-node-dev) + frontend (vite) |
| `npm run db:migrate` | `prisma migrate deploy` (produkcija) |
| `npm run db:seed` | `npx prisma db seed` |
| `postinstall` | `prisma generate` |

**Napomena:** Vite i backend oba mogu koristiti `dist/`. Preporuka: u `vite.config.ts` postaviti `build.outDir` na npr. `dist-frontend` ako serviraš frontend i backend odvojeno, inače backend build piše u `dist/` i frontend također u `dist/` – na Renderu se obično builda samo backend ili samo frontend po servisu.

---

## 3. Env varijable – gdje se čitaju

- **Backend:** `src/env.ts` učitava `dotenv` iz `.env` u cwd. Ostale rute čitaju `process.env.*` (JWT_SECRET, DATABASE_URL, FRONTEND_URL, SUPABASE_*, itd.).
- **Frontend (Vite):** samo varijable s prefiksom `VITE_` su dostupne u kodu. Koristi se `import.meta.env.VITE_API_URL` (u App.tsx i AdminPanel.tsx). **Build time:** Vite u build-u ubacuje vrijednost `VITE_API_URL` iz env-a u bundle; na hostingu (Vercel/Netlify) moraš postaviti Environment Variable `VITE_API_URL` za produkcijski build.

---

## 4. .env i gitignore

- **Potvrđeno:** `.gitignore` sadrži: `.env`, `.env.local`, `.env.*.local` – tajne se ne commituju.
- **Napomena:** Nikad ne commituj `.env`; na hostingu koristi Environment Variables u dashboardu.

---

## 5. Zaključak audita

- Frontend i backend root su identificirani; build skripte jasne.
- Env za backend: iz `.env` (lokalno) ili env varijable (produkcija); za frontend: samo `VITE_API_URL` na build time.
- Gitignore pokriva env fajlove. Koristi `.env.example` kao predložak bez stvarnih tajni.
