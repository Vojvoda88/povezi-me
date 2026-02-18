# Povezi.ME – Uputstvo za deploy na produkciju

Korak-po-korak provjera i deploy checklist.

**Šta mi još treba za full deploy?** → vidi **docs/FULL-DEPLOY-CHECKLIST.md** (lista: šta već imaš, šta mora, Stripe/email/Google).

---

## 1. Prije deploya – lokalna provjera

```bash
npm run deploy:check
```

Generiši novi JWT_SECRET (koristi ga na hostingu):

```bash
npm run deploy:jwt
```

---

## 2. Rotiraj izložene ključeve

Ako si ikad commitao `.env` ili dijelio ključeve:

- **Supabase:** Dashboard → Settings → API → generiši novi Service Role key
- **JWT_SECRET:** `npm run deploy:jwt` → kopiraj u env na hostingu

---

## 3. Env varijable – backend

| Varijabla | Obavezno | Napomena |
|-----------|----------|----------|
| `NODE_ENV` | Da | `production` |
| `DATABASE_URL` | Da | Supabase/Postgres connection string |
| `JWT_SECRET` | Da | Min. 32 znaka, `npm run deploy:jwt` |
| `FRONTEND_URL` | Da | Domen sa kojeg se servira frontend (za CORS), npr. `https://povezi.me` (bez /) |
| `PUBLIC_SITE_URL` | Da | Javni URL frontenda (sitemap, canonical/OG URL-ovi), npr. `https://povezi.me` |
| `API_PUBLIC_URL` | Da | Javni URL backend API-ja (robots.txt, `/sitemap.xml`, prod:sanity), npr. `https://api.povezi.me` |
| `SUPABASE_URL` | Da | Za upload slika |
| `SUPABASE_SERVICE_KEY` | Da | Za upload slika |
| `STRIPE_SECRET_KEY` | Da | `sk_live_xxx` za plaćanja |
| `STRIPE_WEBHOOK_SECRET` | Da | `whsec_xxx` iz Stripe webhooka |
| `RESEND_API_KEY` ili SMTP | Da | Za zaboravljenu lozinku |
| `BACKEND_URL` | Za Google | Npr. `https://api.povezi.me` (Google OAuth redirect) |
| `GOOGLE_CLIENT_ID` | Opciono | Google prijava |
| `GOOGLE_CLIENT_SECRET` | Opciono | Google prijava |
| `RECAPTCHA_SECRET_KEY` | Opciono | CAPTCHA na registraciji |

---

## 4. Env varijable – frontend

| Varijabla | Vrijednost |
|-----------|------------|
| `VITE_API_URL` | `https://tvoj-backend.onrender.com/api` (ili tvoj backend URL + /api) |

**Važno:** Nakon postavljanja obavezno **Redeploy** – Vite ugrađuje env u build.

---

## 5. Baza podataka (Prisma migrate deploy)

```bash
# Na serveru ili lokalno (DATABASE_URL mora pokazivati na produkcijsku bazu):
# NODE_ENV=production je obavezan, kako bi se spriječilo slučajno pokretanje nad pogrešnom bazom.

NODE_ENV=production npm run migrate:deploy
npm run db:generate
```

> Sigurnost: skripta `migrate:deploy` / `db:migrate` internim wrapperom odbija pokretanje ako
> `NODE_ENV !== 'production'`, osim ako eksplicitno postavite `ALLOW_NONPROD_MIGRATE=1`.
> Time se smanjuje rizik da slučajno primijeniš migracije na pogrešnu bazu u dev okruženju.

---

## 6. Prvi admin

**Ne pokreći puni seed** ako imaš oglase – seed briše sve oglase.

1. Registruj se na aplikaciji kao običan korisnik.
2. Otvori `scripts/set-admin.sql`, zamijeni `tvoj@email.com` sa svojim emailom.
3. Supabase Dashboard → SQL Editor → zalijepi i izvrši:

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'tvoj@email.com';
```

---

## 7. Stripe webhook

Stripe Dashboard → Developers → Webhooks → Add endpoint:

- **URL:** `https://tvoj-backend-url.com/api/payments/webhook`
- **Eventi:** `checkout.session.completed`
- Kopiraj **Signing secret** → postavi kao `STRIPE_WEBHOOK_SECRET`

---

## 8. Email (zaboravljena lozinka)

Bez RESEND ili SMTP zaboravljena lozinka neće slati email.

**Resend:** [resend.com](https://resend.com) → API Keys → postavi `RESEND_API_KEY`

**SMTP:** Postavi `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`

---

## 9. Backup baze

- **Supabase:** Automatski dnevni backupovi (plan ovisi o tieru). Ručni backup: Dashboard → Database → Backups, ili `pg_dump` preko connection stringa.
- **Ručni pg_dump (opciono):**  
  `pg_dump "$DATABASE_URL" -F c -f backup-$(date +%Y%m%d).dump`  
  Čuvaj dump na sigurnom mjestu i redovno testiraj restore.
- Ne implementirati backup sistem u aplikaciji – koristiti mogućnosti hosta (Supabase/Render) ili vlastiti cron + pg_dump.

---

## 10. Smoke test nakon deploya

- [ ] Registracija
- [ ] Prijava
- [ ] Objavi oglas sa slikom
- [ ] Zaboravljena lozinka (provjeri email)
- [ ] Istaknuti oglas (Stripe checkout)
- [ ] Admin panel (`/admin`)
- [ ] Poruke
- [ ] Prijavi oglas

---

## Naredbe za hostinge

**Render (Web Service):**
- Build: `npm install && npm run build`
- Start: `npm start`
- Root dir: `/` (ili putanja do projekta)

**Vercel (Frontend):**
- Build: `npm run build:frontend`
- Output: `dist`
- Env: `VITE_API_URL`

---

**Napomena:** `npm run deploy:check` uključuje provjeru DATABASE_URL (i u produkciji da ne pokazuje na localhost).
