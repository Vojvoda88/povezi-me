# Deploy – svih 7 stavki korak po korak

Svaka stavka je raščlanjena u konkretne korake koje možeš pratiti redom.

---

# STAVKA 1: Repo na GitHub

## 1.1 Provjeri da .env nije u gitu

1. Otvori folder projekta u editoru.
2. Otvori fajl **`.gitignore`**.
3. Provjeri da postoji red: **`.env`** (bez navodnika).
4. Ako nema – dodaj u novi red: `.env` i sačuvaj.

## 1.2 Otvori terminal u folderu projekta

- U VS Code / Cursor: **Terminal → New Terminal** (ili `Ctrl+`` `).
- Ili: u Exploreru uđi u folder **"Sve novo"**, u adresnu traku ukucaj `cmd` pa Enter.

## 1.3 Ako već imaš Git i remote (repo na GitHubu)

1. U terminalu: `git status`
2. Ako vidiš "On branch main" i "nothing to commit" – preskoči na **Stavku 2**.
3. Ako imaš izmjene: `git add .` pa `git commit -m "Ready for deploy"` pa `git push`.

## 1.4 Ako još nemaš Git u projektu

1. U terminalu u folderu projekta pokreni:
   ```bash
   git init
   ```
2. Zatim:
   ```bash
   git add .
   git commit -m "Ready for deploy"
   ```
3. Ne dodavaj nikad `.env` u commit – provjeri opet da je u `.gitignore`.

## 1.5 Kreiranje praznog repozitorijuma na GitHubu

1. Otvori **https://github.com** i uloguj se.
2. Klikni **+** (gore desno) → **New repository**.
3. **Repository name:** npr. `povezi-me` (ili kako hoćeš).
4. **Public**.
5. **NE** štikli "Add a README file", "Add .gitignore", "Choose a license" – ostavi sve prazno.
6. Klikni **Create repository**.

## 1.6 Povezivanje lokalnog projekta s GitHubom

1. GitHub će pokazati uputstvo "…or push an existing repository from the command line".
2. Kopiraj **samo URL** repozitorijuma, npr. `https://github.com/TVOJ_USERNAME/povezi-me.git`.
3. U terminalu (u folderu projekta) pokreni (zamijeni URL svojim):
   ```bash
   git remote add origin https://github.com/TVOJ_USERNAME/povezi-me.git
   git branch -M main
   git push -u origin main
   ```
4. Ako traži login – uloguj se na GitHub (ili koristi Personal Access Token umjesto lozinke).
5. Kad push prođe – **Stavka 1 gotova.** Zapiši URL repozitorijuma, trebat će za Render i Vercel.

---

# STAVKA 2: Backend na Renderu

## 2.1 Registracija / prijava na Render

1. Otvori **https://render.com** u browseru.
2. Klikni **Get Started for Free** (ili **Sign In** ako već imaš nalog).
3. Odaberi **Sign up with GitHub** (preporučeno).
4. Autorizuj Render da pristupi tvom GitHub nalogu (ako traži).

## 2.2 Kreiranje servisa iz Blueprinta

1. Na Render dashboardu klikni **New +** (plavo dugme gore desno).
2. U izborniku odaberi **Blueprint**.
3. Klikni **Connect account** pored GitHuba ako još nije povezan – odaberi organizaciju/nalog i **Install** (ili **Configure** i odaberi repo).
4. U listi repozitorijuma **odaberi repo** u koji si pushao kod (npr. `povezi-me`).
5. Klikni **Connect** (ili **Next**).
6. Render će pročitati **render.yaml** i prikazati jedan servis tipa **Web Service**, imena **povezi-me-api**.
7. Klikni **Apply** (ili **Create resources**).

## 2.3 Otvaranje Environment varijabli

1. Na dashboardu klikni na servis **povezi-me-api**.
2. U lijevom meniju klikni **Environment**.
3. Tu ćeš dodati sve varijable iz tabele ispod – za svaku: **Key** (ime) i **Value** (vrijednost).

## 2.4 Dodavanje env varijabli (jedna po jedna)

Klikni **Add Environment Variable** i unesi **Key** i **Value** za svaku stavku. Možeš koristiti **Bulk Edit** (Add bulk environment variables) i zalijepiti Key=Value liste ako Render to podržava; inače ručno:

| Red | Key (tačno ovako) | Odakle uzeti Value |
|-----|---------------------|----------------------|
| 1 | `NODE_ENV` | Upisi: `production` |
| 2 | `DATABASE_URL` | Iz tvog `.env` – red koji počinje sa `DATABASE_URL="postgresql://...` (cijeli string u navodnicima). Ili Supabase Dashboard → Project Settings → Database → Connection string (URI). |
| 3 | `JWT_SECRET` | U terminalu u projektu: `npm run deploy:jwt` – ispisat će novi kljuc. Kopiraj ga (min. 32 znaka). Ili koristi postojeći iz `.env` (za prod bolje novi). |
| 4 | `FRONTEND_URL` | **Ostavi prazno** ili upisi privremeno `https://placeholder.vercel.app` – **nakon Stavke 3** zamijenit ćeš s pravim Vercel URL-om. |
| 5 | `PUBLIC_SITE_URL` | Isto kao FRONTEND_URL – privremeno isto placeholder ili prazno; poslije Stavke 3 stavi pravi Vercel URL. |
| 6 | `API_PUBLIC_URL` | Ne upisuj još. **Nakon** što Render završi prvi deploy, na stranici servisa vidi **URL** (npr. `https://povezi-me-api.onrender.com`). Taj URL upisi ovdje (bez / na kraju). Ako želiš unaprijed: upisi `https://povezi-me-api.onrender.com` (zamijeni s imenom svog servisa). |
| 7 | `BACKEND_URL` | Isti URL kao API_PUBLIC_URL (npr. `https://povezi-me-api.onrender.com`). |
| 8 | `SUPABASE_URL` | Iz tvog `.env` – vrijednost `SUPABASE_URL` (npr. `https://....supabase.co`). |
| 9 | `SUPABASE_SERVICE_KEY` | Iz tvog `.env` – vrijednost `SUPABASE_SERVICE_KEY`. |
| 10 | `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys → **Secret key** (počinje sa `sk_live_` za live; za test `sk_test_`). Kopiraj i zalijepi. |
| 11 | `STRIPE_WEBHOOK_SECRET` | **Ostavi prazno** za sad. Dopuniti ćeš u **Stavki 6** nakon što kreiraš webhook – tada ćeš kopirati "Signing secret" (`whsec_...`) ovdje. |
| 12 | `RESEND_API_KEY` | Resend.com → API Keys → Create API Key → kopiraj kljuc. Ili ako koristiš SMTP: umjesto toga dodaj `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (svaki posebna varijabla). |
| 13 | `EMAIL_FROM` | Npr. `Povezi.me <notifikacije@tvoj-domen.com>` ili `noreply@tvoj-domen.com`. Mora biti adresa koju Resend/SMTP smije slati. |
| 14 | `GOOGLE_CLIENT_ID` | Iz tvog `.env` – `GOOGLE_CLIENT_ID`. |
| 15 | `GOOGLE_CLIENT_SECRET` | Iz tvog `.env` – `GOOGLE_CLIENT_SECRET`. |

Ako koristiš **SMTP** umjesto Resend-a, dodaj i: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (vrijednosti od tvog email provajdera).

## 2.5 Sačuvaj i prvi deploy

1. Klikni **Save Changes** (ili **Save**).
2. Render će automatski pokrenuti **build** pa **deploy**. Na dnu stranice vidiš **Logs**.
3. Sačekaj da status bude **Live** (zeleno). Može trajati nekoliko minuta.
4. Na vrhu stranice servisa vidiš **URL**, npr. **https://povezi-me-api.onrender.com**. **Kopiraj i sačuvaj taj URL** – trebat će za Vercel, Google i Stripe.

## 2.6 Ako API_PUBLIC_URL i BACKEND_URL nisi unio prije

1. Nakon što vidiš URL servisa, u **Environment** dodaj ili izmijeni:
   - `API_PUBLIC_URL` = taj URL (bez / na kraju)
   - `BACKEND_URL` = isti URL
2. **Save** → u meniju **Manual Deploy** → **Deploy latest commit**.

**Stavka 2 gotova.** Backend URL = ono što si zapisao.

---

# STAVKA 3: Frontend na Vercelu

## 3.1 Prijava na Vercel

1. Otvori **https://vercel.com**.
2. **Sign Up** ili **Log In** → **Continue with GitHub**.
3. Autorizuj Vercel da pristupi GitHubu ako traži.

## 3.2 Import projekta

1. Na Vercel dashboardu klikni **Add New…** → **Project**.
2. U listi repozitorijuma vidiš svoj GitHub repo (npr. `povezi-me`). Klikni **Import** pored njega.
3. Ako repozitorijum ne vidiš – **Adjust GitHub App Permissions** i daj pristup tom repo-u.

## 3.3 Podešavanje builda

1. **Project Name:** može ostati npr. `povezi-me` ili promijeni (to će biti dio URL-a).
2. **Framework Preset:** trebalo bi da je prepoznat **Vite**. Ako nije – ručno odaberi **Vite**.
3. **Root Directory:** ostavi prazno (`.`).
4. **Build Command:** trebalo bi da piše `npm run build` ili `npm run build:frontend`. Ako piše samo `npm run build`, **promijeni** u: `npm run build:frontend`.
5. **Output Directory:** trebalo bi `dist`. Ako je prazno – upisi: `dist`.
6. **Install Command:** može ostati `npm install`.

## 3.4 Environment varijabla za API

1. Proširi **Environment Variables**.
2. **Key:** `VITE_API_URL`
3. **Value:** `https://TVOJ-RENDER-URL.onrender.com/api`  
   Zamijeni `TVOJ-RENDER-URL` s pravim URL-om backenda iz Stavke 2 (bez `https://` na početku samo ime, npr. `povezi-me-api`), dakle cijeli primjer: `https://povezi-me-api.onrender.com/api`.
4. **Environment:** štikli **Production** (i opciono Preview ako želiš).
5. Klikni **Add** ili potvrdi.

## 3.5 Deploy

1. Klikni **Deploy**.
2. Sačekaj da build prođe (nekoliko minuta). Kad završi, vidiš **Congratulations** i **Visit** link.
3. Klikni **Visit** ili kopiraj URL, npr. **https://povezi-me.vercel.app**. **Zapiši taj URL** – to je tvoj frontend (sajt).

**Stavka 3 gotova.** Frontend URL = ono što si zapisao.

---

# STAVKA 4: Poveži backend i frontend

## 4.1 Otvori Environment na Renderu

1. Na **render.com** otvori svoj servis **povezi-me-api**.
2. U lijevom meniju klikni **Environment**.

## 4.2 Postavi FRONTEND_URL i PUBLIC_SITE_URL

1. Pronađi varijablu **FRONTEND_URL**. Ako je prazna ili placeholder:
   - Klikni **Edit** (ikonica olovke) pored nje.
   - **Value:** upisi **tačno** tvoj Vercel URL, **bez** kosé crte na kraju.  
     Primjer: `https://povezi-me.vercel.app` (ne `https://povezi-me.vercel.app/`).
   - Save.
2. Isto uradi za **PUBLIC_SITE_URL** – ista vrijednost kao FRONTEND_URL (opet bez / na kraju).

## 4.3 Redeploy da se učita novi env

1. U gornjem meniju servisa klikni **Manual Deploy** → **Deploy latest commit** (ili **Clear build cache & deploy** ako nešto ne radi).
2. Sačekaj da deploy završi. Nakon toga backend dozvoljava zahtjeve s tvog Vercel domena (CORS) i redirect nakon Google prijave vodi na pravi frontend.

**Stavka 4 gotova.**

---

# STAVKA 5: Google OAuth (produkcija)

## 5.1 Otvori Google Cloud Console

1. Otvori **https://console.cloud.google.com**.
2. Uloguj se i odaberi **projekat** u kojem imaš OAuth consent screen i OAuth 2.0 Client (isti koji koristiš za Poveži.ME).

## 5.2 Otvori OAuth client

1. U lijevom meniju: **APIs & Services** → **Credentials**.
2. U listi **OAuth 2.0 Client IDs** klikni na svoj client (npr. "Web client 1" ili ime koje si dao).

## 5.3 Dodaj production redirect URI

1. Skroluj do **Authorized redirect URIs**.
2. Klikni **+ ADD URI**.
3. U polje upisi (zamijeni svojim Render URL-om):  
   `https://povezi-me-api.onrender.com/api/auth/google/callback`  
   Tačno: prvo tvoj backend URL (bez / na kraju), pa `/api/auth/google/callback`.
4. Klikni **Save** (dole).

**Stavka 5 gotova.** Google prijava u produkciji će raditi kad korisnik klikne "Nastavi sa Google-om".

---

# STAVKA 6: Stripe webhook

## 6.1 Otvori Stripe Dashboard

1. Otvori **https://dashboard.stripe.com** i uloguj se.
2. Uključi **Live mode** (prekidač gore desno) ako želiš prava plaćanja; za test ostavi **Test mode** i koristi test ključeve.

## 6.2 Kreiraj webhook endpoint

1. U lijevom meniju: **Developers** → **Webhooks**.
2. Klikni **Add endpoint** (ili **+ Add an endpoint**).
3. **Endpoint URL:** upisi:  
   `https://povezi-me-api.onrender.com/api/payments/webhook`  
   (zamijeni svojim Render URL-om).
4. **Description:** može ostati prazno ili npr. "Povezi.ME checkout".
5. **Events to send:** klikni **Select events** → u pretrazi ukucaj **checkout.session** → štikli **checkout.session.completed** → **Add events**.
6. Klikni **Add endpoint**.

## 6.3 Kopiraj Signing secret

1. Nakon kreiranja endpointa otvori se stranica tog webhooka.
2. U sekciji **Signing secret** klikni **Reveal** (ili **Click to reveal**).
3. Kopiraj vrijednost (počinje sa **whsec_**).

## 6.4 Stavi STRIPE_WEBHOOK_SECRET u Render

1. Na **render.com** → servis **povezi-me-api** → **Environment**.
2. Pronađi **STRIPE_WEBHOOK_SECRET**. Ako je prazan – **Edit** i u **Value** zalijepi kopirani `whsec_...`.
3. Ako varijable nema – **Add Environment Variable** → Key: `STRIPE_WEBHOOK_SECRET`, Value: zalijepi `whsec_...`.
4. **Save**.
5. **Manual Deploy** → **Deploy latest commit** da backend učita novu varijablu.

**Stavka 6 gotova.** Stripe može slati "uplata uspješna" na tvoj backend i istaknuti oglas će se aktivirati.

---

# STAVKA 7: Baza i prvi admin

## 7.1 Pokretanje migracija (jednokratno)

Migracije moraju jednom da se pokrenu nad **produkcijskom** bazom (isti `DATABASE_URL` koji koristi Render).

**Opcija A – lokalno (preporučeno ako imaš Node na računaru):**

1. U folderu projekta otvori `.env` i provjeri da **DATABASE_URL** pokazuje na **istu** bazu koju koristi Render (Supabase connection string). Ako koristiš istu bazu – ostavi kako jeste.
2. U terminalu (u folderu projekta) pokreni:
   ```bash
   set NODE_ENV=production
   npm run migrate:deploy
   ```
   (Na Mac/Linux: `NODE_ENV=production npm run migrate:deploy`)
3. Ako skripta traži potvrdu za produkciju – pročitaj i potvrdi. Kad završi – migracije su primijenjene.

**Opcija B – Render Shell:**

1. Na render.com → servis **povezi-me-api** → u meniju **Shell** (ili **Logs** pa "Start a shell" ako postoji).
2. Ako Render nudi shell u kontejneru, pokreni:
   ```bash
   NODE_ENV=production npm run migrate:deploy
   ```
3. Ako nema Shell – koristi Opciju A (lokalno s istim DATABASE_URL).

## 7.2 Prvi admin korisnik

1. Otvori **sajt** (Vercel URL) u browseru.
2. Klikni **Prijavi se** i **registruj se** normalno (email + lozinka ili Google) – koristi **email** koji želiš za admina.
3. Zatim otvori **Supabase**: **https://supabase.com/dashboard** → odaberi svoj projekat.
4. U lijevom meniju: **SQL Editor**.
5. **New query** i zalijepi (zamijeni email svojim):
   ```sql
   UPDATE "User" SET role = 'ADMIN' WHERE email = 'tvoj@email.com';
   ```
6. Klikni **Run** (ili Execute).
7. Provjera: u **Table Editor** otvori tabelu **User**, pronađi svoj red i provjeri da je **role** = `ADMIN`.
8. Na sajtu odjavi se i ponovo prijavi – sada bi u meniju trebalo da vidiš **Admin** link (ako je u kodu prikazan za admin role).

**Stavka 7 gotova.**

---

# Kraj – šta imaš sada

- **Backend:** radi na Renderu (URL tipa `https://povezi-me-api.onrender.com`).
- **Frontend (sajt):** radi na Vercelu (URL tipa `https://povezi-me.vercel.app`).
- **Link koji šalješ korisnicima:** **Vercel URL** (npr. `https://povezi-me.vercel.app`).

Preporuka: nakon svega uradi kratki **smoke test**: otvori Vercel URL, pregledaj oglase, prijavi se (Google), objavi oglas, probaj "Istaknuti oglas" (Stripe), provjeri "Zaboravljena lozinka" i Admin panel. Ako nešto ne radi – vidi **DEPLOY.md** i **FULL-DEPLOY-CHECKLIST.md** za česte uzroke.
