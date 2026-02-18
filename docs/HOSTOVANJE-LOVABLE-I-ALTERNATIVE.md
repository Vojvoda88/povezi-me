# Kako hostovati Poveži.ME (Lovable vs. ostale opcije)

## Da li mogu sve “ubaciti u Lovable” i tamo hostovati?

**Ne.** Lovable **ne podržava uvoz postojećeg repozitorija**. Iz dokumentacije:

- *"Can I import an existing GitHub repo into Lovable? **No.** You can only export from Lovable to GitHub, not the other way around."*
- Hosting na Lovableu je za projekte **napravljene u Lovable editoru** (Vite + React). Ti kreiraš projekat tamo, opciono ga povežeš na GitHub, pa klikneš **Publish** i dobiješ URL tipa `tvoj-projekat.lovable.app`.

Ovaj projekat je **full-stack** (Node/Express backend, Prisma, baza, React frontend u istom repo-u). Lovable ne može da “preuzme” ceo repo i da ga hostuje kao jednu aplikaciju.

---

## Šta možeš uraditi

### Opcija 1: Hostovanje negdje drugo (preporučeno)

Ovaj projekat je spreman za deploy kao **backend + frontend** na platformama koje podržavaju Node i statički build. Koristi postojeći [DEPLOY.md](../DEPLOY.md) za env varijable i migracije.

**A) Jedan server (backend + frontend zajedno)**  
Npr. **Railway**, **Render**, **Fly.io**:

1. Repo pushaš na GitHub.
2. Kreiraš novi **Web Service** i povežeš repo.
3. **Build:** `npm install && npm run build && npm run build:frontend`
4. **Start:** `npm start` (pokreće backend; frontend serviraš iz `dist/` preko Expressa ako si to već podešio, ili koristiš njihov “static site” za `dist`).
5. Postaviš env varijable iz DEPLOY.md (DATABASE_URL, JWT_SECRET, FRONTEND_URL, Stripe, Google, itd.).

**B) Odvojeno: backend na jednom, frontend na drugom hostu**  
- **Backend:** Railway / Render (Node, `npm run build` + `npm start`).  
- **Frontend:** Vercel ili Netlify:
  - Build: `npm run build:frontend`
  - Root: `dist` (ili kako Vercel/Netlify očekuju)
  - Env: `VITE_API_URL=https://tvoj-backend-url.com/api`
- U Google OAuth i Stripe webhooku koristiš prave production URL-ove (backend i frontend).

---

### Opcija 2: Lovable samo za frontend (komplikovanije)

Ako baš želiš da *nešto* bude povezano s Lovableom:

1. **Backend** i dalje hostuješ negdje (Railway, Render, itd.) kao u Opciji 1.
2. **Frontend** možeš:
   - ili hostovati na Vercel/Netlify (kao u 1B), **bez** Lovablea,  
   - ili u Lovableu napraviti **novi** projekat, ručno (ili copy-paste) prenijeti React/Vite dio koda iz ovog repo-a u taj projekat, povezati ga na GitHub i tamo kliknuti Publish. Lovable će hostovati samo taj frontend; API URL u frontendu mora da pokazuje na tvoj backend (npr. `VITE_API_URL=https://api.povezi.me/api`).

Lovable i dalje **ne može** da “importuje” ovaj ceo repo; možeš samo da u Lovableu gradiš/prilagođavaš frontend i da ga tamo publishuješ, a backend ostaje van Lovablea.

---

## Kratki koraci za brzi deploy (npr. Render)

1. **GitHub:**  
   - Kreiraj repo, pushaj ceo projekat (bez `node_modules` i bez `.env` – koristi `.env.example` ili napomene u DEPLOY.md).

2. **Render.com:**  
   - New → Web Service → poveži GitHub repo.  
   - Build: `npm install && npm run build && npm run build:frontend`  
   - Start: `npm start` (ili `npm run start:prod` ako ga koristiš).  
   - Dodaj sve env varijable iz DEPLOY.md (DATABASE_URL, JWT_SECRET, FRONTEND_URL, PUBLIC_SITE_URL, API_PUBLIC_URL, Supabase, Stripe, Google, itd.).

3. **Baza:**  
   - Već koristiš Supabase (PostgreSQL). Na Renderu u env staviš isti `DATABASE_URL`.  
   - Jednom pokreneš migracije: npr. lokalno s produkcijskim `DATABASE_URL` ili preko Render Shell:  
     `NODE_ENV=production npm run migrate:deploy`

4. **Frontend URL:**  
   - Ako Render servira i frontend (single service), `FRONTEND_URL` i `PUBLIC_SITE_URL` su URL tog servisa (npr. `https://povezi-me.onrender.com`).  
   - Ako frontend ide na Vercel/Netlify, `FRONTEND_URL` i `PUBLIC_SITE_URL` su taj domen, a `VITE_API_URL` na buildu frontenda mora biti URL Render backend-a (npr. `https://povezi-me-api.onrender.com/api`).

5. **Google OAuth:**  
   - U Google Cloud Console u “Authorized redirect URIs” dodaš:  
     `https://tvoj-backend-url.onrender.com/api/auth/google/callback`  
   - U env na Renderu: `BACKEND_URL=https://tvoj-backend-url.onrender.com`

6. **Stripe:**  
   - Webhook endpoint: `https://tvoj-backend-url.onrender.com/api/payments/webhook`  
   - Signing secret u env kao `STRIPE_WEBHOOK_SECRET`.

Nakon toga aplikacija je “hostovana” – samo ne na Lovableu, već na platformi koja podržava ovaj stack. Za detalje o env varijablama, migracijama i provjeri koristi [DEPLOY.md](../DEPLOY.md).
