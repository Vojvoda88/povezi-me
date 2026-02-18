# Povezi.ME – Kompletan Audit Upitnik

**Datum:** 17. veljače 2026  
**Cilj:** Due diligence pregled svih funkcionalnosti, sigurnosti, performansi i infrastrukture

---

## 1) MAPA MODULA

### Frontend moduli:
- **Ads** (`useAds`, `features/ads/`) – listing, detalj, CRUD, paginacija, filteri
- **Auth** (`App.tsx` Auth komponenta) – login/logout, Google OAuth, token management
- **Favorites** (`useFavorites`) – dodavanje/uklanjanje favorita, lista
- **Notifications** (`useNotifications`) – lista, mark-read, badge count
- **Chat** (`App.tsx` Chat komponenta) – Socket.io realtime poruke, konverzacije
- **Profile** (`PublicProfile`, `MyAds`) – javni profil, moji oglasi
- **Admin** (`AdminPanel.tsx`) – dashboard, korisnici, oglasi, prijave, plaćanja
- **Payments/Promotions** (`App.tsx` payment flow) – Stripe checkout, premium oglasi
- **Search/Filters** (`FilterPanel`) – kategorije, lokacije, vozila, nekretnine
- **Upload** (`AddAd` komponenta) – image upload preko `/ads/upload`
- **SEO** (`setPageMeta`) – dinamički title, description, OpenGraph
- **Monitoring** – nije vidljivo u kodu (Sentry?)
- **Infra** – Vite dev server, proxy `/api/`, `/health`

### Backend moduli:
- **Auth routes** (`src/routes/auth.ts`) – login, /me, Google OAuth
- **Ads routes** (`src/routes/ads.ts`) – CRUD, upload, filters, pagination, dedupe, ranking
- **Chat routes** (`src/routes/chat.ts`) – konverzacije, poruke, REST API
- **Payments routes** (`src/routes/payments.ts`) – Stripe checkout, webhook
- **Admin routes** (`src/routes/admin.ts`) – stats, users, ads, reports, payments
- **SEO routes** (`src/routes/seo.ts`) – sitemap.xml, robots.txt
- **Socket.io** (`src/lib/socket.ts`) – Redis adapter, auth, rooms
- **Middleware** (`src/middleware/auth.ts`) – JWT verify, requireAdmin
- **Database** (Prisma) – User, Ad, Message, Conversation, Notification, Payment, Report, AdminAuditLog

---

## 2) UPITNIK PO MODULIMA

### A) AUTH / SESSION / SECURITY

**A1.** Kako se korisnik prijavljuje? (email/password, SMS, OAuth?)  
**A2.** Da li postoji `/api/auth/me` endpoint i šta vraća?  
**A3.** Gdje se čuva token (`localStorage`/cookie)? Da li je HttpOnly cookie opcija?  
**A4.** Šta se dešava kad token istekne:
   - da li UI pokaže poruku?
   - da li se korisnik izbacuje sa rute `/oglas/:slug` ili ostaje tu?
**A5.** Da li postoji refresh token ili samo access token?  
**A6.** Da li se Authorization header dodaje SVIUDA gdje treba (ads create/edit/favorites/notifications/chat)?  
**A7.** Da li postoje role (`user`/`admin`/`moderator`)? Kako se štite admin rute?  
**A8.** CSRF: ako su cookies, da li postoji CSRF zaštita? (Ako nije cookies, objasni.)  
**A9.** Rate limiting: postoji li bar na auth endpointima?  
**A10.** Brute force: lockout / captcha / throttling?  
**A11.** Password policy: min length, complexity, reset password flow?  
**A12.** Email verification postoji? Šta ako user nije verified?

---

### B) ADS (OGLASI) – LISTA / DETALJ / CRUD

**B1.** Koji je canonical ID oglasa: `id` ili `slug`? Da li je slug unique?  
**B2.** Da li se `/oglas/:slug` detalj učitava direktno sa API, ili traži iz liste?  
**B3.** Šta se dešava kad oglas ne postoji (404): UI prikazuje "Nema oglasa" ili puca?  
**B4.** Kreiranje oglasa:
   - koja polja su obavezna?
   - validacija na frontu i na backendu?
**B5.** Edit oglasa:
   - ko smije edit (vlasnik/admin)?
   - kako se provjerava ownership?
**B6.** Brisanje oglasa postoji? Ako da, da li je soft-delete (status) ili hard-delete?  
**B7.** Status oglasa (`AKTIVAN`/`PRODAN`/`ISTEKAO`): ko mijenja i kako to utiče na listanje?  
**B8.** Pagination:
   - limit je 24: da li backend podržava `page`/`limit`?
   - vraća li `total`? da li je total tačan?
**B9.** Sorting:
   - postoji li sortiranje (novo, cijena, premium)?
   - da li premium oglasi imaju prioritet i kako?
**B10.** Filteri:
   - kategorija/potkategorija/lokacija/cijena/vozilo/nekretnine...
   - koji filteri se šalju API-ju tačno?
**B11.** Edge-cases:
   - oglas bez slika
   - oglas bez cijene
   - oglas sa invalid `createdAt`
   - oglas bez kontakt imena/telefona
   Da li UI ostaje stabilan?
**B12.** Da li postoji view counter (`pogledi`) i kada se incrementuje?

---

### C) IMAGE UPLOAD / MEDIA

**C1.** Gdje se slike čuvaju (S3/Supabase/storage/local)?  
**C2.** Max broj slika po oglasu? Max veličina po slici?  
**C3.** Da li se slike kompresuju/resize-uju? Thumb generacija?  
**C4.** Lazy loading: da li `<img loading="lazy">` postoji?  
**C5.** CDN: da li se koriste CDN URL-ovi?  
**C6.** Šta ako upload pukne na polovini (partial upload) — rollback?  
**C7.** Da li postoji zaštita od uploadovanja nevalidnih tipova (mime sniffing)?

---

### D) FAVORITES

**D1.** Endpointi: `GET /api/favorites`, `POST /api/favorites`, `DELETE /api/favorites/:id` – tačno?  
**D2.** Da li favorites koristi `adId` ili `slug`?  
**D3.** Šta ako user klikne srce 5x brzo — da li se stanje razbije?  
**D4.** Šta ako backend vrati 401/500 — da li UI rollback-uje ispravno?  
**D5.** Da li favorites lista radi kad oglasi nisu učitani?

---

### E) NOTIFICATIONS

**E1.** Tipovi notifikacija: `message`, `favorite`, `system`, `promo`…?  
**E2.** Da li notifikacije stižu preko poll (fetch) ili realtime (socket)?  
**E3.** Mark-read endpoint: šta vraća i kako se potvrđuje?  
**E4.** Šta ako mark-read failuje — da li ostaje "unread"?  
**E5.** Badge count: da li je izveden iz state-a ili backend broja?  
**E6.** Da li se notifikacije čiste na logout?

---

### F) CHAT / SOCKET.IO

**F1.** Autentikacija socket-a: token u `auth`? šta na `connect_error`?  
**F2.** Reconnect strategija: šta kad internet nestane 30s?  
**F3.** Event payload format: da li je stabilan i validiran?  
**F4.** Da li chat history dolazi preko REST ili socket?  
**F5.** Ko smije pisati kome (blokade)?  
**F6.** Spam/rate limit poruka postoji?  
**F7.** Da li se poruke označavaju pročitanim? Kako se to mapira u notifikacije?  
**F8.** Da li postoji fallback ako socket ne radi (poll)?

---

### G) PROFILE / PUBLIC PROFILE / MY ADS

**G1.** Public profile ruta: `/prodavac/:id` – šta prikazuje?  
**G2.** Da li su podaci privatni (telefon/email) sakriveni?  
**G3.** "Moji oglasi": da li paginira? da li filtrira?  
**G4.** Rating sistem postoji? ko može da ocjenjuje koga?

---

### H) ADMIN / MODERATION

**H1.** Admin panel postoji? koje rute?  
**H2.** Kako se štiti (RBAC)?  
**H3.** Moderation:
   - prijava oglasa (report)?
   - ban korisnika?
   - skidanje oglasa?
**H4.** Audit log (`AdminAuditLog`) postoji? gdje se čuva?

---

### I) PROMOTIONS / PLAĆANJA (ako postoji)

**I1.** Da li postoje premium planovi (7d/14d/30d)? kako se aktiviraju?  
**I2.** Payment provider (Stripe)? da li je dostupan za CG ili koristite workaround?  
**I3.** Webhook handling: idempotency? signature verification?  
**I4.** Šta ako webhook kasni — da li UI pokazuje pending status?

---

### J) PERFORMANCE / STABILITY

**J1.** Da li listanje oglasa radi virtualizaciju ako ima 200+?  
**J2.** Da li se veliki list mapping memoizuje?  
**J3.** Da li se abortuju stale fetch-evi?  
**J4.** Da li postoji global error boundary i da li baca korisnika na marketplace (ne smije)?  
**J5.** Da li postoji caching (ETag, cache-control) i da li UI koristi cache?

---

### K) SEO / META (SPA)

**K1.** Da li se `document.title` mijenja po ruti?  
**K2.** Meta description po ruti?  
**K3.** OpenGraph fallback?  
**K4.** Sitemap/robots?  
**K5.** Ako želite indeksiranje, da li imate SSR/prerender? (Ako ne, očekivanja?)

---

### L) OBSERVABILITY / LOGGING / MONITORING

**L1.** Da li imate Sentry/LogRocket?  
**L2.** Da li se hvata `unhandledrejection` i `window.onerror` u prod?  
**L3.** Da li backend ima request logs i error logs?  
**L4.** Health endpoint postoji? `/health`  
**L5.** Uptime monitoring (UptimeRobot) postoji?

---

### M) INFRA / DEPLOY / CONFIG

**M1.** Gdje je frontend deploy (Vercel/Netlify/Render)?  
**M2.** Gdje je backend deploy (Render/Fly/Railway)?  
**M3.** Baza (Postgres Supabase?) backup i migrations?  
**M4.** ENV var lista (frontend + backend) — da li postoji dokumentacija?  
**M5.** CORS: tačni allowed origins? cookies? headers?  
**M6.** TLS/HTTPS svuda?  
**M7.** Rate limiting/WAF?  
**M8.** CSP, security headers (HSTS, X-Frame-Options, etc.)?

---

## 3) MANUAL QA TEST SCENARIJI

### Scenario 1: Prijava/odjava
**Steps:**
1. Otvori `/prijava`
2. Unesi validne kredencijale
3. Klikni "Prijavi se"
4. Provjeri redirect na `/marketplace`
5. Klikni "Odjavi se"
6. Provjeri redirect na `/prijava` ili `/marketplace`

**Expected:**
- Login uspješan, token u localStorage, user state postavljen
- Logout čisti token i user state

**What to log:**
- Network tab: `POST /api/auth/login` status, response body
- Console: eventualne greške
- localStorage: `povezi_access_token` postoji/nepostoji

---

### Scenario 2: Refresh stranice na `/oglas/:slug`
**Steps:**
1. Otvori `/oglas/neki-slug`
2. Sačekaj da se učitaju podaci
3. Refresh stranice (F5)
4. Provjeri da li se oglas ponovo učita

**Expected:**
- Oglas se učita bez greške
- Nema infinite loading
- Meta tags su postavljeni

**What to log:**
- Network tab: `GET /api/ads/:slug` status, timing
- Console: eventualne greške
- UI: loading state se resetuje

---

### Scenario 3: Otvaranje oglasa dok backend kasni
**Steps:**
1. Otvori `/marketplace`
2. Klikni na oglas
3. U Network tab, throttling: "Slow 3G"
4. Provjeri UI stanje

**Expected:**
- Loading indicator se prikazuje
- Nema crash-a
- Nakon timeout-a, error poruka ili fallback

**What to log:**
- Network tab: request timing, eventualni timeout
- Console: eventualne greške
- UI: loading state, error state

---

### Scenario 4: Offline mode (simulate offline)
**Steps:**
1. Otvori `/marketplace`
2. U DevTools: Network tab → "Offline"
3. Klikni na oglas ili pokušaj refresh
4. Vrati online
5. Provjeri recovery

**Expected:**
- UI ne puca
- Error poruka ili cached data
- Nakon online, auto-refresh ili manual retry

**What to log:**
- Console: network errors
- UI: error state, retry button

---

### Scenario 5: Upload slika (velike, male, pogrešan format)
**Steps:**
1. Otvori `/objavi`
2. Popuni formu
3. Upload sliku > 5MB
4. Upload sliku < 100KB
5. Upload `.txt` fajl umjesto slike
6. Upload validnu sliku

**Expected:**
- Velika slika: error ili auto-resize
- Mala slika: uspješan upload
- Pogrešan format: error poruka
- Validna slika: uspješan upload, preview

**What to log:**
- Network tab: `POST /api/ads/upload` status, payload size
- Console: eventualne greške
- UI: error poruke, preview slika

---

### Scenario 6: Brzi klikovi na favorite
**Steps:**
1. Otvori `/marketplace`
2. Klikni srce na oglasu 5x brzo (u roku od 1s)
3. Provjeri da li se favorite toggle-uje samo jednom
4. Provjeri da li se UI state sinkronizuje sa backendom

**Expected:**
- Optimistic update radi
- Backend poziv se šalje jednom ili se debounce-uje
- Rollback ako backend failuje
- Finalno stanje je tačno

**What to log:**
- Network tab: `POST /api/favorites` ili `DELETE` pozivi (koliko?)
- Console: eventualne greške
- UI: favorite state, eventualni rollback

---

### Scenario 7: Chat disconnect/reconnect
**Steps:**
1. Otvori `/poruke`
2. Sačekaj socket connect
3. U Network tab: simuliraj disconnect (block socket.io)
4. Pošalji poruku
5. Vrati online
6. Provjeri reconnect i poruku

**Expected:**
- Socket se reconnect-uje automatski
- Poruka se šalje nakon reconnect-a
- Nema duplih poruka
- Notifikacije se ažuriraju

**What to log:**
- Console: socket events (`connect`, `disconnect`, `reconnect_attempt`)
- Network tab: socket.io requests
- UI: poruke, notifikacije

---

### Scenario 8: Notifikacije mark-read fail
**Steps:**
1. Otvori `/obavjestenja`
2. Klikni na notifikaciju da se označi kao pročitana
3. U Network tab: simuliraj 500 error na mark-read endpoint
4. Provjeri UI stanje

**Expected:**
- UI ne puca
- Notifikacija ostaje "unread" ili se rollback-uje
- Error poruka se prikazuje

**What to log:**
- Network tab: `POST /api/notifications/:id/read` status
- Console: eventualne greške
- UI: notifikacija state

---

### Scenario 9: Pagination load more 5 puta
**Steps:**
1. Otvori `/marketplace`
2. Scroll do kraja liste
3. Klikni "Učitaj više" 5 puta
4. Provjeri da li se učitavaju novi oglasi
5. Provjeri da li se "Učitaj više" sakriva kad nema više

**Expected:**
- Svaki klik učitava novu stranicu
- Nema duplih oglasa
- Loading state se resetuje
- "Učitaj više" se sakriva kad `hasMore === false`

**What to log:**
- Network tab: `GET /api/ads?page=X` pozivi, status, response
- Console: eventualne greške
- UI: lista oglasa, loading state, `hasMore` flag

---

### Scenario 10: Filter kombinacije (kategorija + lokacija + cijena)
**Steps:**
1. Otvori `/marketplace`
2. Otvori filter panel
3. Odaberi kategoriju "Automobili"
4. Odaberi lokaciju "Podgorica"
5. Postavi cijenu: min 1000, max 5000
6. Klikni "Primijeni"
7. Provjeri rezultate

**Expected:**
- Filteri se kombinuju (AND logika)
- API poziv sadrži sve filtere
- Rezultati su filtrirani tačno
- Paginacija resetuje na stranicu 1

**What to log:**
- Network tab: `GET /api/ads?kategorija=...&lokacija=...&priceMin=...&priceMax=...` query params
- Console: eventualne greške
- UI: lista oglasa, filter state

---

### Scenario 11: 404 oglas
**Steps:**
1. Otvori `/oglas/ne-postojeci-slug-12345`
2. Provjeri UI stanje

**Expected:**
- UI ne puca
- Prikazuje se "Oglas nije pronađen" ili slična poruka
- Nema infinite loading
- Meta tags su fallback (default)

**What to log:**
- Network tab: `GET /api/ads/:slug` status 404
- Console: eventualne greške
- UI: error state, poruka

---

### Scenario 12: 401 na `/favorites` dok si na detalju oglasa (ne smije te izbaciti sa rute)
**Steps:**
1. Otvori `/oglas/:slug`
2. U localStorage: obriši token ili postavi invalid token
3. Klikni srce (favorite)
4. Provjeri da li si ostao na `/oglas/:slug`

**Expected:**
- Redirect na `/prijava` ili error poruka
- **NE** smije te izbaciti sa `/oglas/:slug` ako si samo kliknuo favorite
- Oglas se i dalje prikazuje

**What to log:**
- Network tab: `POST /api/favorites` status 401
- Console: eventualne greške
- UI: error poruka ili redirect, ali oglas ostaje vidljiv

---

### Scenario 13: Token expiry tokom korištenja
**Steps:**
1. Prijavi se
2. Otvori `/moji-oglasi`
3. Sačekaj 7 dana (ili simuliraj expired token u localStorage)
4. Pokušaj refresh liste ili edit oglasa
5. Provjeri UI stanje

**Expected:**
- 401 error se hvata
- Redirect na `/prijava` ili error poruka
- User state se čisti
- Nema crash-a

**What to log:**
- Network tab: `GET /api/ads` ili `PUT /api/ads/:id` status 401
- Console: eventualne greške
- UI: redirect ili error state

---

### Scenario 14: Google OAuth flow
**Steps:**
1. Otvori `/prijava`
2. Klikni "Prijavi se sa Google"
3. Autorizuj u Google popup-u
4. Provjeri redirect i login

**Expected:**
- Redirect na Google OAuth
- Nakon autorizacije, redirect nazad sa `?token=...`
- Token se čuva, user se učita
- Redirect na `/marketplace`

**What to log:**
- Network tab: redirect chain, `GET /api/auth/google`, `GET /api/auth/me`
- Console: eventualne greške
- localStorage: token postoji

---

### Scenario 15: Admin panel RBAC
**Steps:**
1. Prijavi se kao običan user (role: USER)
2. Pokušaj otvoriti `/admin`
3. Provjeri redirect
4. Prijavi se kao admin (role: ADMIN)
5. Otvori `/admin`
6. Provjeri pristup

**Expected:**
- Obican user: redirect na `/` ili `/admin/login`
- Admin: pristup admin panelu
- Backend provjera role na svim admin rutama

**What to log:**
- Network tab: `GET /api/admin/*` status 403 za običnog usera
- Console: eventualne greške
- UI: redirect ili admin panel

---

### Scenario 16: Image upload rollback (partial failure)
**Steps:**
1. Otvori `/objavi`
2. Upload 5 slika
3. Tokom uploada, simuliraj network error na 3. slici
4. Provjeri stanje

**Expected:**
- Prve 2 slike su uploadovane
- 3. slika failuje
- UI prikazuje error
- Opcija da nastaviš ili ponoviš upload
- Nema orphaned slika u storage-u

**What to log:**
- Network tab: `POST /api/ads/upload` status za svaku sliku
- Console: eventualne greške
- UI: uploaded slike, error poruka

---

### Scenario 17: Chat history load
**Steps:**
1. Otvori `/poruke`
2. Klikni na konverzaciju
3. Provjeri da li se učitavaju stare poruke
4. Scroll unazad (ako postoji infinite scroll)

**Expected:**
- Poruke se učitavaju preko REST API-ja
- Stare poruke su vidljive
- Nema duplih poruka
- Socket novih poruka se dodaje na kraj

**What to log:**
- Network tab: `GET /api/chat/conversations`, `GET /api/chat/conversations/:id/messages`
- Console: eventualne greške
- UI: lista poruka, loading state

---

### Scenario 18: Premium oglas prioritet u listi
**Steps:**
1. Otvori `/marketplace`
2. Provjeri da li premium oglasi dolaze na vrh
3. Provjeri da li se prikazuje badge "Premium" ili slično

**Expected:**
- Premium oglasi su na vrhu liste (ili imaju poseban ranking)
- Badge je vidljiv
- Sorting po `featuredUntil` ili ranking score

**What to log:**
- Network tab: `GET /api/ads` response, provjeri `featuredUntil` ili ranking
- Console: eventualne greške
- UI: lista oglasa, premium badge

---

### Scenario 19: Payment webhook delay
**Steps:**
1. Otvori `/moji-oglasi`
2. Klikni "Promoviši" na oglasu
3. Završi Stripe checkout
4. Simuliraj webhook delay (block webhook endpoint)
5. Provjeri UI stanje na `/payment-success`

**Expected:**
- Payment je "pending" dok webhook ne stigne
- UI prikazuje pending status ili polling
- Nakon webhook-a, status se ažurira
- Oglas postaje premium

**What to log:**
- Network tab: `GET /api/payments/session-status` polling
- Backend logs: webhook processing
- UI: payment status, oglas `featuredUntil`

---

### Scenario 20: Report oglas flow
**Steps:**
1. Otvori `/oglas/:slug`
2. Klikni "Prijavi oglas" (ako postoji)
3. Unesi razlog i detalje
4. Pošalji prijavu
5. Provjeri da li admin vidi prijavu

**Expected:**
- Report se šalje na backend
- Admin vidi report u `/admin/reports`
- Rate limiting radi (max 10 reports/dan)
- Notifikacija adminu (ako postoji)

**What to log:**
- Network tab: `POST /api/ads/:id/report` status
- Backend logs: report creation
- Admin panel: lista reports

---

### Scenario 21: Edit oglas ownership check
**Steps:**
1. Prijavi se kao User A
2. Kreiraj oglas
3. Odjavi se
4. Prijavi se kao User B
5. Pokušaj edit oglasa User A (direktno URL `/moji-oglasi/uredi/:id`)

**Expected:**
- Backend vraća 403 Forbidden
- UI prikazuje error poruku
- User B ne može edit-ovati oglas User A

**What to log:**
- Network tab: `GET /api/ads/:id`, `PUT /api/ads/:id` status 403
- Console: eventualne greške
- UI: error poruka

---

### Scenario 22: Brisanje oglasa (soft-delete)
**Steps:**
1. Otvori `/moji-oglasi`
2. Klikni "Obriši" na oglasu
3. Potvrdi brisanje
4. Provjeri da li oglas nestaje iz liste
5. Provjeri da li oglas još postoji na `/oglas/:slug` (ako je soft-delete)

**Expected:**
- Oglas se briše iz "Moji oglasi"
- Ako je soft-delete: oglas se ne prikazuje javno ali postoji u bazi
- Ako je hard-delete: oglas se potpuno briše
- Notifikacija korisniku (ako postoji)

**What to log:**
- Network tab: `DELETE /api/ads/:id` status
- Backend logs: delete operation
- Database: provjeri status oglasa

---

### Scenario 23: Public profile privacy
**Steps:**
1. Otvori `/prodavac/:userId`
2. Provjeri da li se prikazuje telefon/email
3. Provjeri da li se prikazuju samo javni podaci
4. Provjeri da li se prikazuju oglasi tog korisnika

**Expected:**
- Telefon/email su sakriveni ili prikazani samo djelomično
- Javni podaci (ime, lokacija) su vidljivi
- Oglasi korisnika su vidljivi
- Nema pristupa privatnim podacima

**What to log:**
- Network tab: `GET /api/users/:id` ili `/api/ads?userId=:id` response
- UI: prikazani podaci

---

### Scenario 24: My ads pagination
**Steps:**
1. Prijavi se kao korisnik sa 50+ oglasima
2. Otvori `/moji-oglasi`
3. Provjeri da li postoji pagination
4. Klikni na stranicu 2
5. Provjeri da li se učitavaju novi oglasi

**Expected:**
- Pagination postoji ako ima više od 24 oglasa
- Klik na stranicu 2 učitava novu stranicu
- Nema duplih oglasa
- Loading state se resetuje

**What to log:**
- Network tab: `GET /api/ads?userId=:id&page=2` request
- UI: lista oglasa, pagination controls

---

### Scenario 25: Notifications polling vs realtime
**Steps:**
1. Otvori `/obavjestenja`
2. Provjeri Network tab: da li se notifikacije fetch-uju periodično
3. Otvori drugi tab sa istim korisnikom
4. U drugom tabu, triggeruj notifikaciju (npr. favorite)
5. Provjeri da li se notifikacija pojavljuje u prvom tabu bez refresh-a

**Expected:**
- Ako je polling: notifikacije se fetch-uju svakih X sekundi
- Ako je realtime: notifikacije se pojavljuju odmah
- Multi-tab sync radi (ako postoji)

**What to log:**
- Network tab: `GET /api/notifications` timing, frequency
- Console: eventualni socket events za notifikacije

---

### Scenario 26: Socket.io Redis cluster test
**Steps:**
1. Otvori dva browser tab-a sa istim korisnikom
2. U tabu 1: otvori `/poruke` i konverzaciju
3. U tabu 2: otvori `/poruke` i istu konverzaciju
4. U tabu 1: pošalji poruku
5. Provjeri da li poruka stiže u tabu 2 bez refresh-a

**Expected:**
- Poruka se pojavljuje u oba tab-a
- Redis adapter radi (multi-instance chat)
- Nema duplih poruka
- Socket rooms su sinkronizovani

**What to log:**
- Console: socket events u oba tab-a
- Backend logs: Redis pub/sub events
- Network tab: socket.io requests

---

### Scenario 27: Multiple browser tabs state sync
**Steps:**
1. Otvori 3 browser tab-a sa istim korisnikom
2. U tabu 1: toggle favorite na oglasu
3. Provjeri da li se favorite state ažurira u tabu 2 i 3
4. U tabu 2: logout
5. Provjeri da li se tab 1 i 3 logout-uju

**Expected:**
- Favorite state se sync-uje kroz tab-ove (ako postoji localStorage listener)
- Logout se propagira kroz sve tab-ove
- Nema stale state

**What to log:**
- localStorage: promene tokena
- Console: `storage` event listeners
- UI: state promene u svim tab-ovima

---

### Scenario 28: Form validation (AddAd)
**Steps:**
1. Otvori `/objavi`
2. Pokušaj submit bez popunjavanja polja
3. Provjeri da li se prikazuju validation errors
4. Popuni samo obavezna polja sa invalid podacima (npr. negativna cijena)
5. Provjeri da li se prikazuju errors

**Expected:**
- Frontend validacija blokira submit
- Error poruke su jasne
- Backend validacija takođe radi (double-check)
- Invalid podaci se ne šalju na backend

**What to log:**
- Console: validation errors
- Network tab: da li se request šalje sa invalid podacima
- UI: error poruke

---

### Scenario 29: Search functionality
**Steps:**
1. Otvori `/marketplace`
2. Unesi search query u search bar
3. Provjeri da li se rezultati filtriraju
4. Provjeri da li se query šalje na backend
5. Provjeri da li se query čuva u URL params

**Expected:**
- Search radi (ako postoji)
- Query se šalje na backend kao `?search=...` ili `?q=...`
- Rezultati su filtrirani
- URL se ažurira sa query param

**What to log:**
- Network tab: `GET /api/ads?search=...` request
- URL: query params
- UI: filtrirani rezultati

---

### Scenario 30: Category navigation
**Steps:**
1. Otvori `/marketplace`
2. Klikni na kategoriju (npr. "Automobili")
3. Provjeri da li se URL mijenja na `/kategorija/automobili`
4. Provjeri da li se lista filtrira po kategoriji
5. Provjeri da li se filter panel ažurira

**Expected:**
- URL se mijenja na `/kategorija/:slug`
- Lista se filtrira po kategoriji
- Filter panel prikazuje relevantne filtere za kategoriju
- Paginacija se resetuje

**What to log:**
- Network tab: `GET /api/ads?kategorija=...` request
- URL: route promena
- UI: filtrirana lista

---

### Scenario 31: Ad status change (PRODAN/ISTEKAO)
**Steps:**
1. Otvori `/moji-oglasi`
2. Klikni "Označi kao prodat" (ako postoji)
3. Provjeri da li se status mijenja
4. Provjeri da li se oglas skida sa javne liste
5. Provjeri da li se oglas još vidi u "Moji oglasi"

**Expected:**
- Status se mijenja na `PRODAN` ili `ISTEKAO`
- Oglas se ne prikazuje na `/marketplace`
- Oglas se još vidi u "Moji oglasi" sa statusom
- Notifikacija korisniku (ako postoji)

**What to log:**
- Network tab: `PUT /api/ads/:id` sa status promenom
- Backend logs: status update
- UI: status badge, lista oglasa

---

### Scenario 32: Payment success page
**Steps:**
1. Završi Stripe checkout flow
2. Redirect na `/payment-success?session_id=...&ad_id=...`
3. Provjeri da li se payment status proverava
4. Provjeri da li se oglas ažurira na premium
5. Provjeri da li se prikazuje success poruka

**Expected:**
- Payment status se proverava preko `/api/payments/session-status`
- Oglas postaje premium (`featuredUntil` se postavlja)
- Success poruka se prikazuje
- Redirect na oglas ili "Moji oglasi" (ako postoji)

**What to log:**
- Network tab: `GET /api/payments/session-status` request
- Backend logs: webhook processing
- UI: success poruka, oglas status

---

### Scenario 33: Password reset flow
**Steps:**
1. Otvori `/zaboravljena-lozinka`
2. Unesi email
3. Provjeri da li se šalje reset email (ili mock)
4. Klikni na reset link (ili otvori `/reset-lozinke?token=...`)
5. Unesi novu lozinku
6. Provjeri da li se lozinka mijenja

**Expected:**
- Reset email se šalje (ili mock-uje u dev)
- Reset link je validan
- Nova lozinka se postavlja
- Korisnik se može prijaviti sa novom lozinkom

**What to log:**
- Network tab: `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`
- Backend logs: email sending, token validation
- UI: success/error poruke

---

### Scenario 34: Registration flow
**Steps:**
1. Otvori `/registracija`
2. Popuni formu (ime, email, lozinka, telefon)
3. Provjeri validaciju (email format, password strength)
4. Submit formu
5. Provjeri da li se korisnik kreira
6. Provjeri da li se automatski prijavljuje

**Expected:**
- Validacija radi (email, password, required fields)
- Korisnik se kreira u bazi
- Automatski login nakon registracije (ili redirect na login)
- Notifikacija dobrodošlice (ako postoji)

**What to log:**
- Network tab: `POST /api/auth/register` request/response
- Backend logs: user creation
- Database: novi korisnik
- UI: redirect ili login

---

### Scenario 35: Admin ban user
**Steps:**
1. Prijavi se kao admin
2. Otvori `/admin/users`
3. Klikni "Blokiraj" na korisniku
4. Unesi razlog (ako je potrebno)
5. Potvrdi ban
6. Provjeri da li korisnik može da se prijavi

**Expected:**
- Korisnik se ban-uje (`banned: true`)
- Razlog se čuva (`bannedReason`)
- Korisnik ne može da se prijavi (403)
- Audit log se kreira

**What to log:**
- Network tab: `POST /api/admin/users/:id/ban` request
- Backend logs: ban operation, audit log
- Database: `User.banned = true`
- Login test: 403 error

---

### Scenario 36: Admin feature ad (promotion)
**Steps:**
1. Prijavi se kao admin
2. Otvori `/admin/ads`
3. Klikni "Promoviši" na oglasu
4. Odaberi plan (7d/14d/30d)
5. Provjeri da li se `featuredUntil` postavlja
6. Provjeri da li oglas dolazi na vrh liste

**Expected:**
- `featuredUntil` se postavlja na `now + planDays`
- Oglas postaje premium
- Oglas dolazi na vrh liste (ranking)
- Audit log se kreira

**What to log:**
- Network tab: `POST /api/admin/ads/:id/feature` request
- Backend logs: promotion update, audit log
- Database: `Ad.featuredUntil`
- UI: premium badge, ranking

---

### Scenario 37: Dedupe logic (duplicate ads prevention)
**Steps:**
1. Kreiraj oglas sa naslovom "Audi A4 2020"
2. Pokušaj kreirati isti oglas sa istim naslovom i cijenom
3. Provjeri da li backend blokira duplikat
4. Provjeri da li se prikazuje error poruka

**Expected:**
- Backend detektuje duplikat (po naslovu, cijeni, lokaciji)
- Error poruka se prikazuje
- Duplikat se ne kreira
- Korisnik može da override (ako postoji opcija)

**What to log:**
- Network tab: `POST /api/ads` sa duplikatom, status 400/409
- Backend logs: dedupe check
- UI: error poruka

---

### Scenario 38: View counter increment
**Steps:**
1. Otvori `/oglas/:slug`
2. Provjeri da li se `pogledi` incrementuje
3. Refresh stranicu
4. Provjeri da li se `pogledi` ponovo incrementuje ili je throttled
5. Otvori isti oglas u incognito tab-u
6. Provjeri da li se `pogledi` incrementuje

**Expected:**
- `pogledi` se incrementuje na prvi view
- Throttling radi (ne incrementuje na svaki refresh od istog korisnika)
- Različiti korisnici incrementuju counter
- Counter se prikazuje na oglasu

**What to log:**
- Network tab: `POST /api/ads/:id/view` ili automatski u `GET /api/ads/:slug`
- Backend logs: view increment, throttling check
- Database: `Ad.pogledi` promena

---

### Scenario 39: Image lazy loading
**Steps:**
1. Otvori `/marketplace` sa 50+ oglasima
2. Scroll dole sporo
3. Provjeri Network tab: da li se slike učitavaju on-demand
4. Provjeri da li postoje placeholder-i dok se slike učitavaju

**Expected:**
- Slike se učitavaju samo kad su u viewport-u
- `loading="lazy"` atribut postoji na `<img>` tagovima
- Placeholder se prikazuje dok se slika učitava
- Performance je bolji (manje initial load)

**What to log:**
- Network tab: image requests timing (kad se učitavaju)
- HTML: `loading="lazy"` atribut
- UI: placeholder slike

---

### Scenario 40: Error boundary (global crash handler)
**Steps:**
1. Otvori aplikaciju
2. U Console: throw error (`throw new Error('test')`)
3. Provjeri da li postoji error boundary koji hvata grešku
4. Provjeri da li se korisnik redirect-uje na marketplace (ne smije)
5. Provjeri da li se prikazuje error poruka

**Expected:**
- Error boundary hvata grešku
- Korisnik ostaje na istoj ruti (ne redirect na marketplace)
- Error poruka se prikazuje
- Aplikacija ne puca potpuno

**What to log:**
- Console: error boundary catch
- UI: error poruka, ruta ostaje ista

---

### Scenario 41: CORS issues
**Steps:**
1. Otvori aplikaciju sa `fetch('https://drugi-domen.com/api/ads')` u Console
2. Provjeri da li se CORS error prikazuje
3. Provjeri da li su CORS headers postavljeni ispravno za production domain

**Expected:**
- CORS error se prikazuje za neautorizovane domene
- Production domain je u allowed origins
- Preflight requests (OPTIONS) rade ispravno

**What to log:**
- Network tab: CORS headers (`Access-Control-Allow-Origin`)
- Console: CORS errors
- Backend: CORS konfiguracija

---

### Scenario 42: Rate limiting triggers
**Steps:**
1. Pokušaj login 15 puta sa pogrešnom lozinkom u roku od 1 minute
2. Provjeri da li se rate limit aktivira
3. Provjeri da li se prikazuje error poruka
4. Sačekaj window period
5. Provjeri da li se može ponovo pokušati

**Expected:**
- Rate limit se aktivira nakon X pokušaja
- Error poruka: "Previše pokušaja. Pokušajte za X minuta."
- Nakon window period-a, rate limit se resetuje
- Legitimni zahtevi prolaze

**What to log:**
- Network tab: `POST /api/auth/login` status 429
- Backend logs: rate limit trigger
- UI: error poruka

---

### Scenario 43: Large payload handling
**Steps:**
1. Kreiraj oglas sa 20 slika (ako je dozvoljeno)
2. Provjeri da li se upload završava uspješno
3. Provjeri da li se prikazuju sve slike
4. Provjeri da li postoji max limit za broj slika

**Expected:**
- Upload radi za veliki broj slika
- Max limit postoji (npr. 10 slika)
- Error poruka ako prekorači limit
- Performance je prihvatljiv

**What to log:**
- Network tab: upload timing, payload size
- Backend logs: file processing
- UI: lista slika, eventualni error

---

### Scenario 44: Concurrent requests
**Steps:**
1. Otvori `/marketplace`
2. Brzo klikni "Učitaj više" 3 puta
3. Provjeri da li se sve 3 stranice učitavaju
4. Provjeri da li postoje dupli oglasi
5. Provjeri da li se loading state resetuje ispravno

**Expected:**
- Sve 3 stranice se učitavaju (ili se abortuju stare)
- Nema duplih oglasa
- Loading state se resetuje
- AbortController radi (stale requests se cancel-uju)

**What to log:**
- Network tab: `GET /api/ads?page=X` requests, abort status
- Console: eventualni abort errors
- UI: lista oglasa, loading state

---

### Scenario 45: Memory leaks (long session)
**Steps:**
1. Otvori aplikaciju
2. Navigiraj kroz 20+ ruta (marketplace → oglas → poruke → moji-oglasi → ...)
3. Provjeri Memory tab u DevTools: da li raste memory usage
4. Provjeri da li postoje event listeners koji se ne čiste

**Expected:**
- Memory usage ne raste kontinuirano
- Event listeners se čiste na unmount
- Socket connections se zatvaraju
- Nema memory leaks

**What to log:**
- DevTools Memory tab: heap snapshot, memory usage graph
- Console: eventualni warnings o memory leaks
- Network tab: socket connections

---

### Scenario 46: Performance under load (100+ ads)
**Steps:**
1. Otvori `/marketplace` sa 100+ oglasima
2. Provjeri initial load time
3. Provjeri da li se lista renderuje brzo
4. Provjeri da li postoji virtualizacija ili pagination
5. Provjeri scroll performance

**Expected:**
- Initial load je < 3s
- Lista se renderuje brzo (ili je virtualizovana)
- Scroll je smooth (60fps)
- Pagination ili virtualizacija postoji

**What to log:**
- Network tab: load timing
- Performance tab: render timing, FPS
- UI: lista render, scroll performance

---

### Scenario 47: Admin resolve report
**Steps:**
1. Prijavi se kao admin
2. Otvori `/admin/reports`
3. Klikni na report
4. Klikni "Riješi" ili "Resolve"
5. Unesi akciju i napomenu (ako je potrebno)
6. Provjeri da li se report označava kao resolved

**Expected:**
- Report status se mijenja na `closed`
- `resolvedAt` se postavlja
- Akcija i napomena se čuvaju
- Audit log se kreira

**What to log:**
- Network tab: `POST /api/admin/reports/:id/resolve` request
- Backend logs: report resolution, audit log
- Database: `Report.status = 'closed'`

---

### Scenario 48: Chat spam prevention
**Steps:**
1. Otvori `/poruke`
2. Pošalji 20 poruka brzo (u roku od 5 sekundi)
3. Provjeri da li se sve poruke šalju ili se rate limit aktivira
4. Provjeri da li se prikazuje error poruka

**Expected:**
- Rate limiting radi (max X poruka po vremenu)
- Error poruka se prikazuje ako prekorači limit
- Legitimne poruke prolaze
- Spam se blokira

**What to log:**
- Network tab: `POST /api/chat/conversations/:id/messages` requests
- Backend logs: rate limit check
- UI: error poruka

---

### Scenario 49: SEO meta tags per route
**Steps:**
1. Otvori `/marketplace`
2. Provjeri `<title>` i `<meta name="description">`
3. Otvori `/oglas/:slug`
4. Provjeri da li se meta tags mijenjaju
5. Provjeri OpenGraph tags

**Expected:**
- `document.title` se mijenja po ruti
- Meta description se mijenja po ruti
- OpenGraph tags su postavljeni
- Fallback meta tags postoje

**What to log:**
- HTML: `<title>`, `<meta>` tags
- Console: `setPageMeta` pozivi
- UI: meta tags u `<head>`

---

### Scenario 50: Health endpoint availability
**Steps:**
1. Otvori `http://backend-url/health`
2. Provjeri da li vraća 200 OK
3. Provjeri response body (status, timestamp, etc.)
4. Provjeri da li se koristi za monitoring

**Expected:**
- Health endpoint vraća 200 OK
- Response body sadrži status info
- Endpoint je javno dostupan (bez auth)
- Koristi se za uptime monitoring

**What to log:**
- Network tab: `GET /health` response
- Response body: JSON sa statusom
- Monitoring: uptime check konfiguracija

---

## 4) ARTEFAKTI KOJE TREBA PRILOŽITI

### Screenshotovi:
- [ ] Network tab: `GET /api/ads` request/response (headers, payload, timing)
- [ ] Network tab: `GET /api/favorites` request/response
- [ ] Network tab: `GET /api/notifications` request/response
- [ ] Network tab: `POST /api/chat/conversations/:id/messages` request/response
- [ ] Network tab: Socket.io WebSocket frames (connect, message events)
- [ ] Network tab: `POST /api/ads/upload` request (multipart/form-data)
- [ ] Network tab: `POST /api/payments/checkout` request/response
- [ ] Network tab: `POST /api/payments/webhook` (ako je moguće)
- [ ] Console: eventualne greške ili warnings
- [ ] UI: loading states, error states, empty states

### Sample API responses:
- [ ] `GET /api/ads?page=1&limit=24` – full response JSON
- [ ] `GET /api/ads/:slug` – full response JSON
- [ ] `GET /api/favorites` – full response JSON
- [ ] `GET /api/notifications` – full response JSON
- [ ] `GET /api/chat/conversations` – full response JSON
- [ ] `GET /api/chat/conversations/:id/messages` – full response JSON
- [ ] `GET /api/auth/me` – full response JSON
- [ ] `GET /api/admin/stats` – full response JSON (ako je admin)

### ENV vars (maskirane):
- [ ] Frontend `.env` ili `vite.config.ts` env vars:
  - `VITE_API_URL`
  - Ostale `VITE_*` varijable
- [ ] Backend `.env` varijable:
  - `JWT_SECRET` (maskirano)
  - `DATABASE_URL` (maskirano)
  - `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (maskirano)
  - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (maskirano)
  - `REDIS_URL` (maskirano)
  - `FRONTEND_URL`, `PUBLIC_SITE_URL`
  - Ostale varijable

### Deployment URLs:
- [ ] Frontend production URL
- [ ] Backend production URL
- [ ] Admin panel URL (ako je drugačiji)
- [ ] Health check URL (`/health`)

### CI logs (ako postoje):
- [ ] Build logs (frontend)
- [ ] Build logs (backend)
- [ ] Test logs (unit, e2e)
- [ ] Deployment logs

### Backend logs:
- [ ] Request logs za 401/500 greške (sample)
- [ ] Error logs za crash-eve (sample)
- [ ] Socket.io logs (connect/disconnect events)
- [ ] Payment webhook logs (sample)

### Lista ruta:
- [ ] Frontend rute (sve `<Route>` komponente)
- [ ] Backend API rute (sve `router.get/post/put/delete`)

---

## 5) RIZICI KOJE TREBA POTVRDITI (bez ocjene)

### Auth & Security:
- [ ] **Auth expiry handling** – da li se token refresh-uje ili korisnik mora ponovo da se prijavi?
- [ ] **Socket auth** – da li se socket token validira na svakom eventu ili samo na connect?
- [ ] **Upload security** – da li se validira mime type i file signature (ne samo extension)?
- [ ] **Rate limiting** – da li postoji na kritičnim endpointima (login, upload, chat)?
- [ ] **Data validation (Zod)** – da li se svi inputi validiraju na backendu?
- [ ] **CSP headers** – da li postoje Content-Security-Policy headers?
- [ ] **XSS protection** – da li se sanitizuje HTML u chat porukama i oglasima?
- [ ] **SQL injection** – da li se koriste Prisma prepared statements svuda?

### Data Integrity:
- [ ] **Duplicate ads prevention** – da li postoji dedupe logika (po naslovu, cijeni, lokaciji)?
- [ ] **Race conditions** – da li postoje race conditions u favorite toggle, payment webhook, promotion?
- [ ] **Transaction consistency** – da li se koriste DB transakcije za kritične operacije (payment, ad creation)?
- [ ] **Orphaned data** – da li se čiste orphaned slike, poruke, notifikacije?

### Performance:
- [ ] **N+1 queries** – da li se koriste Prisma `include` ili `select` da se izbjegnu N+1 queries?
- [ ] **Image optimization** – da li se koriste thumbnails i lazy loading?
- [ ] **Caching** – da li postoji caching za stats, ads list, user data?
- [ ] **Pagination limits** – da li postoji max limit za pagination (da se spriječi DoS)?

### Reliability:
- [ ] **Backups** – da li se baza backup-uje redovno? gdje se čuvaju backup-ovi?
- [ ] **Error recovery** – da li postoji retry logika za failed API calls?
- [ ] **Graceful degradation** – da li aplikacija radi ako Redis/Socket.io ne radi?
- [ ] **Monitoring** – da li postoji alerting za kritične greške (500, DB down, payment failures)?

### Business Logic:
- [ ] **Spam prevention** – da li postoji rate limiting za kreiranje oglasa, slanje poruka?
- [ ] **Premium expiration** – da li se premium oglasi automatski deaktiviraju nakon `featuredUntil`?
- [ ] **Payment idempotency** – da li se webhook-ovi obrađuju idempotentno (da se izbjegnu dupla plaćanja)?
- [ ] **SEO expectations** – da li se očekuje Google indeksiranje bez SSR? (SPA može biti problem)

### Infrastructure:
- [ ] **CORS configuration** – da li su allowed origins tačno postavljeni (ne `*` u production)?
- [ ] **TLS/HTTPS** – da li je HTTPS omogućen svuda?
- [ ] **Environment separation** – da li postoje odvojeni env-ovi za dev/staging/prod?
- [ ] **Secret management** – da li se secrets čuvaju sigurno (ne u git, možda secrets manager)?

### Legal & Compliance:
- [ ] **GDPR** – da li postoji privacy policy i cookie consent?
- [ ] **Data retention** – da li se brišu stari podaci (deleted ads, old messages)?
- [ ] **User data export** – da li korisnik može da izveze svoje podatke?

---

## 6) DODATNA PITANJA (ako nisu pokrivena)

**Q1.** Da li postoji email sending (nodemailer, SendGrid)? Za šta se koristi (verification, password reset, notifications)?

**Q2.** Da li postoji SMS sending? Za šta se koristi?

**Q3.** Da li postoji analytics (Google Analytics, Plausible)? Šta se prati?

**Q4.** Da li postoji A/B testing ili feature flags?

**Q5.** Da li postoji multi-language support (i18n)?

**Q6.** Da li postoji dark mode toggle? Kako se čuva preferenca?

**Q7.** Da li postoji search functionality (full-text search, Elasticsearch)?

**Q8.** Da li postoji geolocation features (mapa, distance calculation)?

**Q9.** Da li postoji social sharing (Facebook, Twitter)?

**Q10.** Da li postoji export functionality (PDF, CSV)?

---

**NAPOMENA:** Ovaj upitnik je dizajniran da pokrije sve aspekte aplikacije. Odgovori na sva pitanja će omogućiti kompletnu ocjenu spremnosti za production.
