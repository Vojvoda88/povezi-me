# Full deploy checklist – šta ti treba prije nego kreneš u produkciju

Jedna lista: šta već imaš, šta **mora** biti gotovo, i šta je opciono. Kad sve obilježiš, možeš full deploy.

---

## Šta već imaš (iz tvog .env)

- **Supabase** (storage za slike) – URL i Service Key
- **Baza** – PostgreSQL preko Supabase (DATABASE_URL)
- **JWT_SECRET** – postavljen
- **Google prijava** – Client ID i Secret (za produkciju treba samo da u Google Console dodaš production redirect URI)
- **PUBLIC_SITE_URL** – planirano `https://povezi.me`

---

## Šta ti **mora** biti prije go-live

### 1. Env varijable na **backendu** (Render / server)

Na hostingu gdje radi Node backend postavi:

| Varijabla | Vrijednost | Napomena |
|-----------|------------|----------|
| `NODE_ENV` | `production` | Obavezno |
| `DATABASE_URL` | tvoj Supabase connection string | Već imaš |
| `JWT_SECRET` | min. 32 znaka | Već imaš; za prod preporuka: `npm run deploy:jwt` i novi kljuc |
| `FRONTEND_URL` | `https://tvoj-domen.com` (bez / na kraju) | **Mora** – CORS i redirecti |
| `PUBLIC_SITE_URL` | isto kao FRONTEND_URL | Sitemap, canonical |
| `API_PUBLIC_URL` | `https://api.tvoj-domen.com` (ili tvoj backend URL) | robots.txt, sitemap |
| `SUPABASE_URL` | tvoj Supabase URL | Već imaš |
| `SUPABASE_SERVICE_KEY` | tvoj Supabase service key | Već imaš |
| `STRIPE_SECRET_KEY` | `sk_live_xxx` iz Stripe Dashboarda | **Bez ovoga plaćanja (istaknuti oglas) ne rade** |
| `STRIPE_WEBHOOK_SECRET` | `whsec_xxx` iz Stripe webhooka | **Bez ovoga Stripe ne može potvrditi uplatu** |
| `RESEND_API_KEY` **ili** SMTP | Resend API key **ili** SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS | **Bez ovoga “Zaboravljena lozinka” ne šalje email** |
| `EMAIL_FROM` | npr. `Povezi.me <notifikacije@tvoj-domen.com>` | Za from adresu |
| `BACKEND_URL` | `https://api.tvoj-domen.com` (isti kao API) | Za Google OAuth redirect |
| `GOOGLE_CLIENT_ID` | tvoj | Već imaš |
| `GOOGLE_CLIENT_SECRET` | tvoj | Već imaš |

Ako nešto od ovoga nedostaje, backend će raditi djelimično (npr. bez Stripe-a nema plaćanja, bez Resend/SMTP nema reset lozinke).

---

### 2. Env varijable na **frontendu** (Vercel / static host)

Samo za **build** (Vite ugrađuje u build):

| Varijabla | Vrijednost |
|-----------|------------|
| `VITE_API_URL` | `https://api.tvoj-domen.com/api` (tvoj backend URL + `/api`) |

Bez ovoga frontend zove pogrešan (npr. localhost) API u produkciji.

---

### 3. Google Cloud Console (production)

- U **Authorized redirect URIs** dodaj:  
  `https://api.tvoj-domen.com/api/auth/google/callback`  
  (zamijeni s tvojim stvarnim backend URL-om).
- Ako koristiš “Testing” OAuth consent, dodaj test korisnike; za javni sajt kasnije predaj na “Verification”.

---

### 4. Stripe

- **Stripe Dashboard** → Developers → Webhooks → **Add endpoint**
  - URL: `https://api.tvoj-domen.com/api/payments/webhook`
  - Events: `checkout.session.completed`
- Kopiraj **Signing secret** (`whsec_...`) → u env na backend kao `STRIPE_WEBHOOK_SECRET`.
- Za prava plaćanja koristi **live** ključeve (`sk_live_...`, ne test).

---

### 5. Baza (jednokratno)

- Migracije na produkcijsku bazu:  
  `NODE_ENV=production npm run migrate:deploy`  
  (lokalno s produkcijskim `DATABASE_URL` ili preko Render Shell / SSH na server).
- **Prvi admin:** registruj se na sajtu kao običan user, pa u Supabase SQL Editor izvrši (zamijeni email):  
  `UPDATE "User" SET role = 'ADMIN' WHERE email = 'tvoj@email.com';`  
  Vidi `scripts/set-admin.sql`.

---

### 6. Sigurnost

- **.env** nikad u Git (provjeri da je u `.gitignore`).
- Ako si ikad commitao `.env` ili dijelio ključeve: rotiraj (novi JWT: `npm run deploy:jwt`, novi Supabase key u Dashboardu).
- Na hostingu nemoj držati `.env` u repo-u – koristi “Environment Variables” u Renderu/Vercelu.

---

## Šta je opciono (ali korisno)

- **RECAPTCHA** – na registraciji: postavi `RECAPTCHA_SECRET_KEY` (i na frontendu key ako ga koristiš).
- **Sentry** – monitoring: `SENTRY_DSN` (backend), `VITE_SENTRY_DSN` (frontend build).
- **Redis** – za više instanci chata: `REDIS_URL`; bez toga chat radi na jednoj instanci.
- **Custom domen** – npr. `povezi.me` i `api.povezi.me` umjesto `*.onrender.com` / `*.vercel.app`.

---

## Brza provjera prije deploya

```bash
npm run deploy:check
```

Provjeri da nemaš localhost u `DATABASE_URL` kad je `NODE_ENV=production`, da postoje migracije i build skripte.

---

## Nakon deploya – smoke test

- [ ] Otvori frontend URL u browseru.
- [ ] Pregled oglasa, filteri, sort, otvaranje oglasa.
- [ ] Prijava sa Google-om.
- [ ] Objavi oglas sa slikom.
- [ ] Zaboravljena lozinka (provjeri da stigne email).
- [ ] Istaknuti oglas (Stripe checkout do kraja).
- [ ] Admin panel (`/admin`) – prvi admin.
- [ ] Poruke (ako su uključene).
- [ ] Prijavi oglas (report).

---

## Sažetak – šta ti konkretno još treba

1. **Stripe** – Stripe account, live keys, webhook na production URL, `STRIPE_SECRET_KEY` i `STRIPE_WEBHOOK_SECRET` na backendu.
2. **Email** – Resend (preporučeno) ili SMTP; `RESEND_API_KEY` ili SMTP_* + `EMAIL_FROM` na backendu.
3. **Production URL-ovi** – odluči domen (ili Render/Vercel URL), pa na backendu: `FRONTEND_URL`, `PUBLIC_SITE_URL`, `API_PUBLIC_URL`, `BACKEND_URL`; na frontendu pri buildu: `VITE_API_URL`.
4. **Google** – u Console dodaj production redirect URI (`https://tvoj-api/api/auth/google/callback`).
5. **Jednokratno** – migracije na prod bazu, prvi admin preko SQL.
6. **Hosting** – backend (npr. Render) + frontend (npr. Vercel) ili jedan server koji servira oboje; env varijable kako gore.

Kad su sve stavke iz “Šta ti mora biti” i “Baza / Stripe / Google” pokrivene, možeš krenuti full deploy. Detalji za svaku stavku su u **DEPLOY.md**.
