# FINAL PRE-LAUNCH VALIDATION REPORT

**Datum:** 17. februar 2026  
**Projekt:** Povezi.ME  
**Metodologija:** Verifikacija bez izmjena koda

---

## DIO 1 – LIST PERFORMANCE VALIDATION

### Status: **RISK**
### Severity: **Medium**

### Obrazloženje:

**Implementacija:**
- `App.tsx` linija 704-846: Implementacija je **chunking**, ne prava DOM virtualizacija (windowing)
- `VISUAL_WINDOW = 200` – konstanta koja određuje početni chunk
- `displayLimit` state – počinje sa 200, povećava se za 100 po kliku
- `displayList = filtered.slice(0, displayLimit)` – renderuje sve elemente do `displayLimit`

**Analiza:**
1. **DOM renderovanje:** Svi elementi do `displayLimit` se renderuju u DOM odjednom. Za 500 oglasa:
   - Prvo renderovanje: 200 kartica (200 × ~50 DOM čvorova = ~10,000 čvorova)
   - Nakon "Prikaži sljedećih 100": 300 kartica (~15,000 čvorova)
   - Nakon još 100: 400 kartica (~20,000 čvorova)
   - Mobilni uređaji mogu imati performanse probleme sa >300 kartica

2. **UI element:** Dodato je novo dugme "Prikaži sljedećih 100" (linija 1095-1102). To **mijenja UX** – korisnik mora klikati umjesto automatskog scroll-a.

3. **Lazy loading:** ✅ Sve slike imaju `loading="lazy"` (linija 1439, 1572, 1576, 2020, 2653, 2985)

4. **Re-render petlje:** `useMemo` za `filtered` (linija 762-838) i `useEffect` za reset `displayLimit` (linija 840-842) su optimizovani. Nema očiglednih petlji.

**Zaključak:**
- ✅ Lazy loading slika je implementiran
- ⚠️ Chunking umjesto windowinga – DOM može biti velik na mobilnim uređajima
- ⚠️ UX promjena (dugme umjesto infinite scroll) – nije kritično ali mijenja ponašanje

**Preporuka:** Za 10/10 bi trebalo implementirati pravu virtualizaciju (react-window/react-virtualized) ili barem automatski load-on-scroll umjesto dugmeta.

---

## DIO 2 – TOKEN EXPIRY / 401 POLICY VALIDATION

### Status: **RISK**
### Severity: **Medium**

### Obrazloženje:

**Implementacija:**
- `lib/api/client.ts` linija 22-28: `apiFetch()` dispatch-uje `auth:expired` event na **svaki** 401, bez provjere da li je request auth-required
- `App.tsx` linija 405-412: Event listener briše token i postavlja `currentUser` na `null` (nema redirecta)

**Analiza:**

1. **Preciznost logout-a:**
   - ❌ Event se dispatch-uje na **svaki** 401, uključujući public rute koje možda vraćaju 401 iz drugih razloga
   - ❌ Nema provjere da li request ima `Authorization` header
   - ❌ Nema provjere da li je ruta auth-required

2. **Public rute scenario:**
   - User gleda detalj oglasa (nije ulogovan) → `/oglas/:slug`
   - Background fetch (npr. `useNotifications` hook) pokušava da učita notifikacije → vraća 401
   - `apiFetch` dispatch-uje `auth:expired` → token se briše (ako postoji) → `currentUser` se postavlja na `null`
   - ✅ Korisnik **ne** biva redirectovan – ostaje na stranici (linija 408: samo `localStorage.removeItem` i `setCurrentUser(null)`)

3. **Zaštita od infinite loop-a:**
   - ✅ Event se dispatch-uje samo jednom po request-u (u `apiFetch`, prije throw-a)
   - ✅ Event listener se registruje jednom (u `useEffect` sa praznim dependency array-om)
   - ⚠️ **Problem:** Ako `apiFetch` baci grešku i neki drugi kod ponovo pozove `apiFetch` sa istim tokenom, event će se ponovo dispatch-ovati. Međutim, token je već obrisan, tako da nema infinite loop-a.

4. **Edge case:**
   - Ako public API endpoint vrati 401 iz nekog razloga (npr. rate limiting, invalid request format), korisnik će biti logout-ovan iako nije bio ulogovan ili nije trebao biti logout-ovan.

**Zaključak:**
- ✅ Nema redirecta – korisnik ostaje na stranici
- ⚠️ Logout je previše agresivan – dešava se na svaki 401 bez provjere konteksta
- ⚠️ Public rute mogu biti pogođene ako background fetch vrati 401

**Preporuka:** Za 10/10 bi trebalo dodati provjeru da li request ima `Authorization` header prije dispatch-a eventa, ili barem whitelist ruta koje ne treba triggerovati logout.

---

## DIO 3 – CSP + STRIPE + GOOGLE + STORAGE VALIDATION

### Status: **PASS**
### Severity: **Low**

### Obrazloženje:

**Implementacija:**
- `src/index.ts` linija 74-91: Helmet CSP konfiguracija

**Provjera domena:**

1. **Stripe:**
   - ✅ `scriptSrc`: `"https://js.stripe.com"`, `"https://*.stripe.com"` (linija 79)
   - ✅ `frameSrc`: `"https://js.stripe.com"`, `"https://hooks.stripe.com"` (linija 80)
   - ✅ `connectSrc`: `"https://api.stripe.com"`, `"https://*.stripe.com"` (linija 81)
   - ✅ `styleSrc`: `"https://*.stripe.com"` (linija 83)

2. **Google OAuth:**
   - ✅ `scriptSrc`: `"https://accounts.google.com"`, `"https://apis.google.com"` (linija 79)
   - ✅ `frameSrc`: `"https://accounts.google.com"` (linija 80)
   - ✅ `connectSrc`: `"https://accounts.google.com"`, `"https://*.google.com"` (linija 81)

3. **Supabase Storage:**
   - ✅ `imgSrc`: `"https:"` (linija 82) – pokriva sve HTTPS domene uključujući Supabase storage
   - ✅ `imgSrc`: `"blob:"` (linija 82) – za blob URL-ove

4. **Socket.io:**
   - ✅ `connectSrc`: `"'self'"` (linija 81) – pokriva websocket upgrade kroz proxy (`vite.config.ts` linija 14: `/socket.io` proxy na `http://localhost:3001`)
   - ✅ U produkciji, Socket.io se povezuje direktno na backend domen (takođe pokriveno sa `'self'`)

5. **Sentry (ako postoji):**
   - ⚠️ Nema eksplicitne dozvole za Sentry ingest endpoint
   - ⚠️ `connectSrc` ima `"'self'"` što bi trebalo pokriti ako je Sentry ingest na istom domenu
   - ⚠️ Ako je Sentry ingest na drugom domenu (npr. `o123456.ingest.sentry.io`), trebalo bi dodati u `connectSrc`

**Simulacija flow-a:**
- ✅ Google login: `accounts.google.com` → dozvoljeno u `scriptSrc`, `frameSrc`, `connectSrc`
- ✅ Stripe checkout: `js.stripe.com` → dozvoljeno u `scriptSrc`, `frameSrc`, `connectSrc`
- ✅ Payment success redirect: `'self'` → dozvoljeno
- ✅ Učitavanje slika: Supabase storage → `https:` → dozvoljeno
- ✅ Socket konekcija: `'self'` → dozvoljeno

**Zaključak:**
- ✅ Stripe i Google OAuth su potpuno pokriveni
- ✅ Supabase storage je pokriven kroz `https:`
- ✅ Socket.io je pokriven kroz `'self'`
- ⚠️ Sentry ingest možda nije pokriven ako je na eksternom domenu

**Preporuka:** Za 10/10 bi trebalo dodati Sentry ingest domen u `connectSrc` ako se koristi eksterni Sentry.

---

## DIO 4 – UPLOAD CLEANUP VALIDATION

### Status: **PASS**
### Severity: **Low**

### Obrazloženje:

**Implementacija:**
- `src/lib/storage.ts` linija 39-80: `cleanupTmpUploads()` funkcija
- `src/routes/ads.ts` linija 732, 744-745, 935: Integracija u `createAd` handler

**Analiza:**

1. **Cleanup na fail:**
   - ✅ `cleanupTmpUploads` se poziva samo ako `!isDuplicate && !isZodError` (linija 933-935)
   - ✅ Duplicate i Zod greške ne triggeruju cleanup (što je ispravno – fajlovi su validni)

2. **Race condition:**
   - ⚠️ **Potencijalni problem:** `cleanupTmpUploads` se poziva u catch bloku **prije** nego što se ad kreira u bazi. Međutim, cleanup briše samo fajlove čiji path sadrži `/tmp/`, tako da ne može obrisati validne fajlove koji su već premješteni u `/adId/` folder.

3. **Orphan fajlovi:**
   - ✅ `cleanupTmpUploads` provjerava da path sadrži `/tmp/` prije brisanja (linija 49, 53)
   - ✅ Funkcija nikad ne baca greške – sve greške se loguju (linija 58-79)
   - ✅ Ako cleanup failuje, fajlovi ostaju u `/tmp/` folderu (nije idealno, ali ne blokira aplikaciju)

4. **Validni fajlovi:**
   - ✅ Cleanup briše samo fajlove sa `/tmp/` u path-u
   - ✅ Validni fajlovi su premješteni u `/adId/` folder nakon kreiranja ad-a (linija 850-904)
   - ✅ Cleanup se poziva samo ako ad nije kreiran (u catch bloku)

**Zaključak:**
- ✅ Cleanup je deterministički – briše samo `/tmp/` fajlove
- ✅ Ne može obrisati validne fajlove (provjera path-a)
- ⚠️ Mala mogućnost da cleanup failuje i ostavi orphan fajlove, ali ne blokira aplikaciju

**Preporuka:** Za 10/10 bi trebalo dodati retry mehanizam za cleanup ili background job koji čisti stare `/tmp/` fajlove.

---

## DIO 5 – OBSERVABILITY VALIDATION

### Status: **PASS**
### Severity: **Low**

### Obrazloženje:

**Implementacija:**
- `src/lib/runtimeErrorGuard.ts`: Global error guard
- `src/routes/clientLog.ts`: Backend endpoint za client errors
- `src/index.ts` linija 149-220: Health endpoint

**Analiza:**

1. **runtimeErrorGuard bez Sentry:**
   - ✅ `installRuntimeErrorGuard()` ne ovisi o `VITE_SENTRY_DSN` (linija 74-107)
   - ✅ `reportClientError()` radi standalone – samo `console.error` ako `getApiBase` nije proslijeđen (linija 32-66)
   - ✅ Nikad ne baca iznimke – sve greške se hvataju (linija 38-42, 60-65, 85-87, 96-98, 104-106)

2. **POST /api/log-client-error rate limit:**
   - ✅ Rate limit: 30 zahtjeva/minuta (linija 6-12 u `clientLog.ts`)
   - ✅ Endpoint vraća 204 – ne blokira aplikaciju (linija 37)
   - ✅ Frontend radi i ako endpoint ne postoji (linija 60-62 u `runtimeErrorGuard.ts`)

3. **Spam zaštita:**
   - ✅ Rate limit 30/minuta je dovoljno za normalan error flow
   - ✅ `keepalive: true` u fetch pozivu (linija 59) – ne blokira page unload
   - ⚠️ Ako korisnik ima mnogo grešaka (>30/min), neke se neće poslati na backend, ali će se i dalje logovati u konzolu

4. **Health endpoint:**
   - ✅ Vraća 503 ako `ok === false` (linija 208)
   - ✅ Provjerava DB (`dbOk`), Redis (`redisOk` ako je konfigurisan), Storage (`storageOk`)
   - ✅ Monitoring alat može jasno detektovati pad kroz HTTP status kod

**Zaključak:**
- ✅ Error logging radi bez Sentry
- ✅ Rate limit je postavljen
- ✅ Health endpoint vraća 503 kad servisi padnu
- ⚠️ Mala mogućnost da se neki errori ne pošalju na backend ako je rate limit prekoračen, ali se i dalje loguju u konzolu

**Preporuka:** Za 10/10 bi trebalo dodati queue/batch mehanizam za error reporting umjesto direktnog POST-a.

---

## DIO 6 – E2E U CI VALIDATION

### Status: **RISK**
### Severity: **Medium**

### Obrazloženje:

**Implementacija:**
- `.github/workflows/ci.yml` linija 77-121: E2E koraci
- `tests/e2e/auth.spec.ts`: Login/registracija testovi
- `tests/e2e/ads.spec.ts`: Create ad, listing, detail testovi

**Analiza:**

1. **E2E izvršavanje:**
   - ✅ E2E testovi se pokreću u CI (linija 117-121)
   - ✅ Backend + frontend se pokreću prije E2E (linija 80-109)
   - ✅ Build **ne** failuje ako E2E padnu – nema `|| exit 1` ili sličnog
   - ⚠️ **Problem:** Ako E2E testovi padnu, CI workflow će proći sa warning-om, ne sa error-om

2. **Test coverage:**
   - ✅ Login: `tests/e2e/auth.spec.ts` linija 32-46
   - ✅ Registracija: `tests/e2e/auth.spec.ts` linija 6-30
   - ✅ Create ad: `tests/e2e/ads.spec.ts` linija 12-38
   - ✅ Upload slike: `tests/e2e/ads.spec.ts` linija 40-62
   - ✅ Listing -> detail: `tests/e2e/ads.spec.ts` linija 64-76
   - ✅ Logout: `tests/e2e/ads.spec.ts` linija 78-93
   - ❌ **Favorite toggle:** Nema testa
   - ❌ **Chat open:** Nema testa
   - ❌ **Payment flow:** Nema E2E testa (postoji samo backend stub u `src/routes/payments.ts` linija 78-96)

3. **Gate-ovanje build-a:**
   - ⚠️ E2E testovi **ne** gate-uju build – ako padnu, CI i dalje prođe
   - ⚠️ Nema `fail-fast` ili `continue-on-error: false` eksplicitno postavljeno

**Zaključak:**
- ✅ E2E testovi se pokreću u CI
- ✅ Pokrivaju osnovne tokove (login, create ad, listing)
- ⚠️ Ne pokrivaju favorite, chat, payment flow
- ⚠️ Ne gate-uju build – CI može proći iako E2E padnu

**Preporuka:** Za 10/10 bi trebalo:
1. Dodati E2E testove za favorite toggle, chat open, payment flow (mock)
2. Eksplicitno postaviti da CI failuje ako E2E padnu (dodati `|| exit 1` ili `continue-on-error: false`)

---

## FINALNI IZVJEŠTAJ

### Da li aplikacija može ići u production bez tehničkog rizika?

**ODGOVOR: UZ OPREZ**

### Obrazloženje:

Aplikacija je **funkcionalno spremna** za produkciju sa sljedećim napomenama:

1. **List Performance (RISK):** Chunking umjesto windowinga može uzrokovati performanse probleme na mobilnim uređajima sa >300 oglasa. UX promjena (dugme umjesto scroll) nije kritična ali mijenja ponašanje.

2. **Token Expiry (RISK):** Logout je previše agresivan – dešava se na svaki 401 bez provjere konteksta. Public rute mogu biti pogođene ako background fetch vrati 401.

3. **CSP (PASS):** Stripe, Google OAuth, Supabase storage i Socket.io su pokriveni. Sentry ingest možda nije pokriven ako je na eksternom domenu.

4. **Upload Cleanup (PASS):** Cleanup je deterministički i siguran. Mala mogućnost da cleanup failuje i ostavi orphan fajlove, ali ne blokira aplikaciju.

5. **Observability (PASS):** Error logging i health monitoring su pouzdani. Rate limit je postavljen.

6. **E2E u CI (RISK):** E2E testovi se pokreću ali ne gate-uju build. Ne pokrivaju favorite, chat, payment flow.

---

## Lista maksimalno 5 stvari koje su posljednje prepreke za 10/10:

1. **Implementirati pravu DOM virtualizaciju** (react-window/react-virtualized) umjesto chunking-a za listu oglasa, ili barem automatski load-on-scroll umjesto dugmeta.

2. **Poboljšati 401 handler** – dodati provjeru da li request ima `Authorization` header prije dispatch-a `auth:expired` eventa, ili whitelist ruta koje ne treba triggerovati logout.

3. **E2E testovi trebaju gate-ovati build** – eksplicitno postaviti da CI failuje ako E2E padnu (`|| exit 1` ili `continue-on-error: false`).

4. **Dodati E2E testove** za favorite toggle, chat open, payment flow (mock).

5. **Dodati Sentry ingest domen u CSP** `connectSrc` ako se koristi eksterni Sentry, ili provjeriti da li je ingest na istom domenu.

---

**Kraj izvještaja**
