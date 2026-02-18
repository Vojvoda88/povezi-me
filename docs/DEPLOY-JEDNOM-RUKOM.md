# Deploy jednom rukom (Render + Vercel)

Kod je spreman: u rootu su **render.yaml** (backend) i **vercel.json** (frontend). Ostaje da uradiš par koraka u browseru.

**Korak po korak za svih 7 stavki (šta tačno kliknuti, šta zalijepiti):** vidi **DEPLOY-7-KORAKA-DETALJNO.md**.

---

## 1. Repo na GitHub

Ako već nemaš:

```bash
cd "c:\Users\Jovan\Desktop\Sve novo"
git init
git add .
git commit -m "Ready for deploy"
```

Kreiraj **prazan** repo na github.com (bez README). Zatim:

```bash
git remote add origin https://github.com/TVOJ_USERNAME/NAZIV_REPOA.git
git branch -M main
git push -u origin main
```

**.env nikad ne push-uj** (treba biti u `.gitignore`).

---

## 2. Backend na Renderu

1. **render.com** → prijavi se (GitHub).
2. **New +** → **Blueprint**.
3. Poveži **GitHub repo** (isti gdje si pushao).
4. Render će naći **render.yaml** i ponuditi servis **povezi-me-api**. Potvrdi **Apply**.
5. Prije prvog deploya otvori servis → **Environment** i dodaj varijable (Key = ime, Value = vrijednost):

| Key | Value |
|-----|--------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | tvoj Supabase connection string |
| `JWT_SECRET` | `npm run deploy:jwt` → kopiraj (min. 32 znaka) |
| `FRONTEND_URL` | ostavi prazno sad; dopuni nakon Vercel deploya |
| `PUBLIC_SITE_URL` | isto kao FRONTEND_URL (dopuni poslije) |
| `API_PUBLIC_URL` | `https://povezi-me-api.onrender.com` (ili kako Render nazove servis) |
| `BACKEND_URL` | isto kao API_PUBLIC_URL |
| `SUPABASE_URL` | tvoj |
| `SUPABASE_SERVICE_KEY` | tvoj |
| `STRIPE_SECRET_KEY` | `sk_live_...` iz Stripe Dashboarda |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` iz Stripe webhooka (kreiraj u koraku 6) |
| `RESEND_API_KEY` | iz resend.com (ili umjesto toga SMTP_* varijable) |
| `EMAIL_FROM` | npr. `Povezi.me <notifikacije@tvoj-domen.com>` |
| `GOOGLE_CLIENT_ID` | tvoj |
| `GOOGLE_CLIENT_SECRET` | tvoj |

6. **Save** → Render krene build i deploy. Sačekaj da dobiješ URL, npr. **https://povezi-me-api.onrender.com**. Zapiši ga.

---

## 3. Frontend na Vercelu

1. **vercel.com** → prijavi se (GitHub).
2. **Add New** → **Project** → **Import** isti GitHub repo.
3. **Framework Preset:** Vite (ako ne prepozna, ručno).
4. **Environment Variables** → Add:
   - **Key:** `VITE_API_URL`
   - **Value:** `https://povezi-me-api.onrender.com/api` (tvoj Render URL + `/api`)
5. **Deploy**. Dobiješ URL, npr. **https://povezi-me.vercel.app**. Zapiši ga.

---

## 4. Poveži backend i frontend

1. **Render** → tvoj servis → **Environment**.
2. Dodaj / izmijeni:
   - `FRONTEND_URL` = `https://povezi-me.vercel.app` (tvoj Vercel URL, **bez** / na kraju)
   - `PUBLIC_SITE_URL` = isto
3. **Save** → **Manual Deploy** → **Deploy latest commit** (da se učita novi env).

---

## 5. Google OAuth (produkcija)

- **Google Cloud Console** → tvoj OAuth client → **Authorized redirect URIs**.
- Dodaj: `https://povezi-me-api.onrender.com/api/auth/google/callback` (tvoj Render URL + `/api/auth/google/callback`).

---

## 6. Stripe webhook

- **Stripe Dashboard** → **Developers** → **Webhooks** → **Add endpoint**.
- **URL:** `https://povezi-me-api.onrender.com/api/payments/webhook`
- **Events:** `checkout.session.completed`
- Kopiraj **Signing secret** → u Render **Environment** stavi kao `STRIPE_WEBHOOK_SECRET` → **Save** → **Manual Deploy**.

---

## 7. Baza i prvi admin

- **Migracije** (jednom, s produkcijskim DATABASE_URL):
  ```bash
  NODE_ENV=production npm run migrate:deploy
  ```
  (lokalno ili Render **Shell**.)

- **Prvi admin:** registruj se na sajtu (Vercel URL), pa u **Supabase** → SQL Editor:
  ```sql
  UPDATE "User" SET role = 'ADMIN' WHERE email = 'tvoj@email.com';
  ```

---

## Link koji šalješ

**https://tvoj-projekat.vercel.app** (tvoj Vercel URL) – to je sajt. Backend radi na Renderu, korisnici ga ne vide.

Ako nešto zapne, vidi **DEPLOY.md** i **FULL-DEPLOY-CHECKLIST.md**.
