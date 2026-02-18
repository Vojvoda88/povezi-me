# Povezi.ME – Detaljni pregled aplikacije prije lansiranja

Kompletan pregled: šta je urađeno, šta nedostaje i prioriteti da aplikacija bude što kvalitetnije urađena prije puštanja u pogon.

---

## 1. MONETIZACIJA I PLAĆANJA

### Trenutno stanje

| Stavka | Status | Detalj |
|--------|--------|--------|
| **Istaknuti oglasi (promocija)** | ⚠️ Besplatno | Korisnik u formi bira paket (7/14/30 dana). Backend **bez provjere plaćanja** postavlja `featuredUntil`. Svi mogu dobiti istaknuti oglas bez uplate. |
| **Admin – Plaćanja** | ❌ Placeholder | `AdminPayments` prikazuje "Modul plaćanja nije implementiran. Ukupno: 0 €". Backend `GET /admin/payments` vraća `{ payments: [], total: 0 }`. |
| **Stripe u projektu** | Odvojeno | U `supabase/functions/` postoje Edge funkcije (create-checkout-session, stripe-webhook, admin-stripe-sync) i Supabase migracije za Stripe/referrale. **Glavna aplikacija koristi Express + Prisma** – nema Payment modela u Prisma shemi niti Stripe integracije u Express backendu. |

### Šta treba za pravu monetizaciju

1. **Odlučiti arhitekturu plaćanja**
   - **Opcija A:** Uvesti Stripe u Express backend (preporučeno za jedan sustav): model `Payment` u Prisma, Stripe Checkout Session API, webhook endpoint u Expressu, povezivanje `featuredUntil` samo nakon uspješnog plaćanja.
   - **Opcija B:** Koristiti postojeće Supabase Edge funkcije – zahtijeva da frontend i korisnici rade sa Supabase Auth i da se promocija ažurira preko tih funkcija (dva sustava: Express za oglase, Supabase za plaćanja).

2. **Backend (Express + Prisma)**  
   - Dodati model npr. `Payment` (id, userId, adId, amount, currency, stripePaymentIntentId, status, createdAt).  
   - Endpoint za kreiranje Checkout Session (Stripe): korisnik bira paket → backend kreira session, vraća URL.  
   - Webhook `POST /api/webhooks/stripe`: na `checkout.session.completed` postaviti `featuredUntil` na odgovarajući oglas i upisati Payment.  
   - `GET /admin/payments`: čitati iz tabele Payment (umjesto praznog niza).

3. **Frontend**  
   - Nakon odabira paketa istaknutog oglasa: poziv API-ja → redirect na Stripe Checkout.  
   - Stranica "Uspješna uplata" (`/payment-success?session_id=...`) ili callback: prikaz potvrde i osvježavanje oglasa.  
   - U formi za objavu: **ne** slati `featuredPackage` na backend dok nema uspješnog plaćanja – ili backend odbiti postavljanje `featuredUntil` bez zapisa u Payment.

4. **Admin**  
   - Lista plaćanja iz baze (korisnik, oglas, iznos, datum).  
   - Ukupan prihod (revenueTotal) iz agregacije Payment.

**Prioritet:** Visok – bez toga nema stvarne zarade od promocija; trenutno je "istaknuto" besplatno.

---

## 2. KORISNIČKE FUNKCIONALNOSTI – ŠTA NEDOSTAJE

### 2.1 Prijavi oglas (Report)

| Stavka | Status |
|--------|--------|
| **Admin: lista prijava i rješavanje** | ✅ Implementirano (`GET /admin/reports`, `POST /admin/reports/:id/resolve`). |
| **Korisnik: dugme "Prijavi oglas"** | ❌ Nedostaje. Na stranici oglasa nema akcije "Prijavi oglas". |
| **Backend: kreiranje prijave** | ❌ Nema `POST /api/ads/:id/report` ili `POST /api/reports` za običnog korisnika. |

**Šta uraditi:**  
- Backend: `POST /api/ads/:slug/report` (ili `/api/reports`) sa body `{ reason, details? }`, auth obavezan; kreirati `Report` sa `adId`, `reporterUserId`, `reason`, `details`.  
- Frontend: na stranici oglasa dugme "Prijavi oglas" → modal/forma (razlog + opcionalno objašnjenje) → poziv API-ja.

**Prioritet:** Srednji (moderacija i povjerenje korisnika).

### 2.2 Poruke (Chat)

| Stavka | Status |
|--------|--------|
| **Frontend: stranica Poruke** | ✅ Postoji; konverzacije i poruke u **lokalnom React state-u**. |
| **Backend: poruke/konverzacije** | ❌ Nema API-ja. Nema modela Conversation/Message u Prisma. |

Poruke se gube pri osvježavanju stranice. Za kvalitetan marketplace preporučeno je kasnije uvesti trajne konverzacije (Prisma modeli + API).

**Prioritet:** Srednji (može se lansirati bez toga ako je kontakt preko telefona/emaila dovoljan).

### 2.3 Obavještenja (Notifications)

| Stavka | Status |
|--------|--------|
| **GET /api/notifications, mark-read** | ✅ Implementirano. |
| **Kreiranje obavještenja** | ❌ Nigdje u kodu se ne kreira `Notification` (npr. pri novoj poruci, pri isteku promocije, pri prijavi oglasa). |

Korisnici mogu vidjeti samo praznu listu ili obavještenja koja neko ručno doda u bazu. Za punu korist treba: kreirati notifikaciju pri određenim događajima (nova poruka, promocija istekla, admin akcija itd.).

**Prioritet:** Nizak do srednji.

### 2.4 Zaboravljena lozinka / Reset lozinke

| Stavka | Status |
|--------|--------|
| **Email modul** | ✅ `src/lib/email.ts` – Resend ili SMTP, `sendEmail(to, subject, html)`. **Nikad se ne poziva** iz ruta. |
| **Reset lozinke** | ❌ Nema rute "zaboravljena lozinka", nema tokena za reset, nema stranice za unos nove lozinke. |

**Šta uraditi:**  
- Backend: `POST /api/auth/forgot-password` (email) → generirati token (npr. u bazi ili JWT kratkog života), poslati link emailom putem `sendEmail`. `POST /api/auth/reset-password` (token, newPassword) → validirati token, postaviti novi hash, invalidirati token.  
- Frontend: stranica "Zaboravljena lozinka" (unos emaila), stranica "Nova lozinka" (token u URL-u, forma za novu lozinku).

**Prioritet:** Srednji (korisnici očekuju opciju reset lozinke).

---

## 3. SIGURNOST I PRAVNO

| Stavka | Status | Napomena |
|--------|--------|----------|
| **JWT, bcrypt, rate limit** | ✅ | Login limit (10/15 min), API limit (200/15 min). |
| **Sanitizacija naslova/opisa** | ✅ | `sanitizeHTML` u `src/routes/ads.ts` pri kreiranju/ ažuriranju. |
| **Env validacija (zod)** | ✅ | Fail-fast u produkciji za DATABASE_URL, JWT_SECRET, FRONTEND_URL. |
| **CAPTCHA** | ❌ | Nije povezan na registraciju/prijavu (smanjuje botove). |
| **Pravila i privatnost** | ✅ | Stranice `/pravila`, `/privatnost`, linkovi u footeru. |
| **Rate limit na POST /api/ads** | ⚠️ | Pokriven općim API limitom (200/15 min); može se dodati stroži limit samo za POST /ads (npr. 10/15 min po korisniku). |

**Prioritet CAPTCHA:** Srednji. **Prioritet strožeg limita za objavu oglasa:** Nizak.

---

## 4. UX I KVALITETA

| Stavka | Status |
|--------|--------|
| **Loading stanja** | Djelomično (spinneri na ključnim mjestima). |
| **Prazna stanja** | Djelomično – ima poruka tipa "Nema oglasa"; provjeriti sve liste (favoriti, moji oglasi, rezultati pretrage). |
| **Validacija formi (frontend)** | Osnovna (required, broj za cijenu). Backend vraća Zod greške – frontend bi trebao prikazivati polja grešaka jasno. |
| **404 stranica** | Trenutno `path="*"` vodi na `<Navigate to="/" />`. Nema posebne "Stranica nije pronađena" stranice. Opciono: zamijeniti s komponentom koja prikazuje poruku i link na početnu. |
| **Poruke o greškama** | Pri objavi oglasa i prijavi se prikazuju; provjeriti da su sve API greške korisnički prikazane. |

**Prioritet 404:** Nizak. **Prioritet validacije/poruka:** Srednji.

---

## 5. SEO I PERFORMANSE

| Stavka | Status |
|--------|--------|
| **Dinamički title i meta** | ✅ Za početnu, kategoriju, oglas. |
| **Open Graph / Twitter** | ✅ Postavljanje u kodu. |
| **Sitemap / robots** | ✅ Backend servira `/sitemap.xml`, `/robots.txt`. |
| **Lazy loading slika** | Korišteno. |
| **Resize slika pri uploadu** | ✅ Frontend resize na 1200px, JPEG 0.85. |
| **Build output (Vite vs backend)** | ⚠️ Oba mogu koristiti `dist/`. Na deployu obično se builda ili samo backend ili samo frontend po servisu; ako oba u istom repo-u, preporuka je `build.outDir` za Vite npr. `dist-frontend`. |

---

## 6. DEPLOY I KONFIGURACIJA

| Stavka | Status |
|--------|--------|
| **Dokumentacija** | ✅ `PRIJE_LANSIRANJA.md` – go-live checklist, env varijable, migracija, prvi admin. |
| **.env.example** | ✅ Ažuriran. |
| **Backend sluša na 0.0.0.0** | ✅ |
| **Migracije** | ✅ Prisma migracija za User.banned, Report, AdminAuditLog. Na produkciji: `npx prisma migrate deploy`. |
| **Prvi admin** | Ručno: seed sa `SEED_ADMIN_EMAIL` ili SQL `UPDATE "User" SET role = 'ADMIN' WHERE email = '...'`. |

Ništa u kodu ne blokira deploy; potrebno je samo postaviti env (backend + frontend), pokrenuti migraciju i kreirati admina.

---

## 7. SAŽETAK – PRIORITETI

### Kritično za kvalitetnu monetizaciju (prije ili odmah poslije lansiranja)

1. **Plaćanje promocije (Stripe)**  
   - U Express backend: model Payment, Stripe Checkout + webhook, postavljanje `featuredUntil` **samo** nakon plaćanja.  
   - Frontend: redirect na Stripe, success stranica, ukloniti besplatno postavljanje istaknutog u formi (ili ga vezati uz plaćanje).  
   - Admin: lista plaćanja i ukupan prihod iz baze.

### Važno za pouzdanost i povjerenje

2. **Prijavi oglas (Report)**  
   - Backend: `POST /api/ads/:slug/report` (ili slično).  
   - Frontend: dugme "Prijavi oglas" na stranici oglasa + forma.

3. **Zaboravljena lozinka**  
   - Iskoristiti postojeći `sendEmail`; rute forgot-password i reset-password; frontend stranice.

4. **Validacija i poruke grešaka**  
   - Konzistentno prikazivati backend Zod greške na formama (objava oglasa, registracija, itd.).

### Nadogradnje (nakon lansiranja)

5. **Poruke (Chat)** – trajni modeli i API (Conversation, Message).  
6. **Kreiranje obavještenja** – pri događajima (nova poruka, promocija istekla, itd.).  
7. **CAPTCHA** na registraciju/prijavu.  
8. **Dedicated 404 stranica** umjesto redirecta na "/".  
9. **Stroži rate limit** za POST /api/ads po korisniku.

---

## 8. BRZI CHECKLIST – ŠTA JE GOTOVO

- [x] Auth (login, register, JWT, Google OAuth), zaštićene rute  
- [x] Oglasi: lista, detalj, paginacija, filteri, kategorije, tip (prodajem/tražim), nekretnine detalji  
- [x] Objava oglasa → API (naslov, opis, cijena, slike upload, details), **uključujući opciju "istaknuto" (trenutno besplatno)**  
- [x] Moji oglasi, uređivanje, brisanje  
- [x] Favoriti (API + frontend)  
- [x] Notifikacije (GET, mark-read; bez automatskog kreiranja)  
- [x] Admin: dashboard, korisnici (ban, uloga), oglasi (promocija, brisanje, status), prijave (lista, resolve)  
- [x] Legal: pravila, privatnost, footer  
- [x] SEO: title, meta, OG, sitemap, robots  
- [x] Env validacija, CORS, rate limit, sanitizacija  
- [x] Upload slika (Supabase Storage), resize na frontendu  

---

## 9. ŠTA NIJE GOTOVO (kratka lista)

- [ ] **Monetizacija:** Stripe (ili drugi način) – plaćanje promocije, Payment model, admin prikaz plaćanja. Trenutno je istaknuto besplatno.  
- [ ] **Prijavi oglas:** korisničko dugme + backend `POST` za kreiranje Report.  
- [ ] **Zaboravljena lozinka:** rute + email + frontend stranice.  
- [ ] **Poruke:** samo lokalni state – nema trajnog chata (opciono za kasnije).  
- [ ] **Obavještenja:** nitko ne kreira Notification u kodu (opciono).  
- [ ] **Admin Plaćanja:** zamijeniti placeholder stvarnim podacima iz baze kada se uvede Payment.  
- [ ] **CAPTCHA** (opciono).  
- [ ] **404 stranica** (opciono).  

---

*Dokument napravljen kao detaljni pregled cijele aplikacije. Ažurirati kako se stavke rješavaju.*
