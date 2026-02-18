# Kako da prijateljima pošalješ samo link (da uđu bez instalacije)

Da bi im mogao poslati **samo link** i da oni otvore aplikaciju u browseru, projekat mora biti **na internetu** (deploy-ovan). Jedan link = URL gdje žive frontend (React) aplikacija.

---

## Šta treba uraditi (ukratko)

1. **Deploy-uješ backend** (Node/Express) na neki hosting → dobiješ URL npr. `https://povezi-me-api.onrender.com`
2. **Deploy-uješ frontend** (React) na neki hosting i kažeš mu gdje je API → dobiješ URL npr. `https://povezi-me.vercel.app`
3. **Podesiš** na backendu `FRONTEND_URL` na taj frontend URL, i u Google OAuth redirect URI staviš backend URL (vidi DEPLOY.md).
4. **Link koji šalješ prijateljima** = frontend URL, npr. **https://povezi-me.vercel.app**

Kad oni otvore taj link, vide sajt; ništa ne instaliraju.

---

## Najbrži put do jednog linka (Render + Vercel)

### Korak 1 – Backend na Renderu

1. Otvori [render.com](https://render.com), registruj se (može i GitHub login).
2. **New → Web Service**.
3. Poveži svoj **GitHub** repo (ili uploaduj projekat).
4. **Build Command:** `npm install && npm run build`  
   **Start Command:** `npm start`  
   **Root Directory:** prazno (ili `/`).
5. U **Environment** dodaj sve varijable iz [DEPLOY.md](../DEPLOY.md) (DATABASE_URL, JWT_SECRET, SUPABASE_*, STRIPE_*, GOOGLE_*, itd.).  
   Za sada možeš staviti:
   - **FRONTEND_URL** = `https://tvoj-frontend.vercel.app` (dodaješ nakon što napraviš frontend)
   - **PUBLIC_SITE_URL** = isto
   - **API_PUBLIC_URL** = `https://tvoj-naziv.onrender.com` (Render će ti dati ovaj URL)
   - **BACKEND_URL** = isto (za Google redirect)
6. Klik **Create Web Service**. Render će ti dati URL, npr. `https://povezi-me-api.onrender.com`. Sačuvaj ga.

**Baza:** Koristiš Supabase – u env na Renderu staviš isti `DATABASE_URL`. Jednom pokreni migracije (lokalno s tim DATABASE_URL ili preko Render Shell):  
`NODE_ENV=production npm run migrate:deploy`

---

### Korak 2 – Frontend na Vercelu

1. Otvori [vercel.com](https://vercel.com), registruj se (npr. preko GitHuba).
2. **Add New → Project** → importuj **isti GitHub repo**.
3. **Framework Preset:** Vite.  
   **Build Command:** `npm run build:frontend`  
   **Output Directory:** `dist`  
   **Root Directory:** prazno (ili `/`).
4. U **Environment Variables** dodaj:
   - **VITE_API_URL** = `https://tvoj-naziv.onrender.com/api` (URL tvog Render backenda + `/api`)
5. **Deploy**. Vercel će ti dati URL, npr. `https://povezi-me.vercel.app`. To je **link koji šalješ prijateljima**.

---

### Korak 3 – Poveži backend i frontend

- Na **Renderu** (backend) u env ažuriraj:
  - **FRONTEND_URL** = `https://povezi-me.vercel.app` (tvoj Vercel URL, bez / na kraju)
  - **PUBLIC_SITE_URL** = isto
- U **Google Cloud Console** (ako koristiš Google prijavu) u Authorized redirect URIs dodaj:  
  `https://tvoj-naziv.onrender.com/api/auth/google/callback`
- **Redeploy** backend na Renderu da učita nove env varijable.

---

## Šta im šalješ

Jednostavno im pošalješ poruku tipa:

- *“Evo linka da pogledaš Poveži.ME: https://povezi-me.vercel.app”*

Oni otvore link u browseru – nema instalacije, nema Git, nema terminal.

---

## Napomene

- **Stripe / plaćanja:** Na Renderu mora biti postavljen `STRIPE_SECRET_KEY` i `STRIPE_WEBHOOK_SECRET`; webhook URL u Stripe Dashboardu: `https://tvoj-backend.onrender.com/api/payments/webhook`.
- **Google prijava:** Radi samo ako je na backendu postavljen `BACKEND_URL` i redirect URI u Google Console kao gore.
- **Free tier:** Na Renderu i Vercelu free tier ima ograničenja (npr. backend na Renderu “spava” posle neaktivnosti). Za ozbiljniji test možeš uzeti mali paid plan ili druge hostinge (vidi [HOSTOVANJE-LOVABLE-I-ALTERNATIVE.md](HOSTOVANJE-LOVABLE-I-ALTERNATIVE.md)).

Detaljne env varijable i sigurnost vidi u [DEPLOY.md](../DEPLOY.md).
