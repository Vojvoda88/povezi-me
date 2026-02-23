# Povezi.ME – Detaljni QA izvještaj

**Datum:** 17. veljače 2026  
**Verzija:** 1.0  
**Testirano:** Lokalni dev (frontend: http://localhost:5173, backend: http://localhost:3001)

---

## 1. SAŽETAK

| Kategorija | Status | Napomena |
|------------|--------|----------|
| Frontend (Vite) | OK | 200 na / |
| Backend (Express) | OK | 200 na /api, /health |
| API oglasi (listing) | OK | Vraća 53 oglasa |
| API oglas po slug | OK | Vraća 200 za postojeći slug |
| Stranica detalja oglasa | OK | /oglas/:slug vraća 200 |
| Sitemap, robots.txt | OK | 200 |
| Unit testovi | OK | 19/19 testova prolazi |

---

## 2. TESTIRANI ENDPOINTI

| Endpoint | Metoda | Status | Napomena |
|----------|--------|--------|----------|
| http://localhost:5173/ | GET | 200 | Frontend SPA |
| http://localhost:3001/health | GET | 200 | Health check |
| http://localhost:3001/api/ads?page=1&limit=5 | GET | 200 | Listing sa paginacijom |
| http://localhost:3001/api/ads/audi-a4-2-0-tdi-15-seed-15 | GET | 200 | Detalj oglasa po slug |
| http://localhost:3001/sitemap.xml | GET | 200 | SEO sitemap |
| http://localhost:3001/robots.txt | GET | 200 | SEO robots |
| http://localhost:5173/oglas/audi-a4-2-0-tdi-15-seed-15 | GET | 200 | SPA ruta – client-side fetch radi preko proxyja |

---

## 3. RUTE I FUNKCIONALNOSTI

### 3.1 Javne rute (bez prijave)
- `/` → redirect na `/marketplace`
- `/marketplace` – listing oglasa
- `/kategorija/:categorySlug` – listing po kategoriji
- `/oglas/:slug` – detalj oglasa
- `/prodavac/:userId` – javni profil prodavca
- `/prijava` – login
- `/registracija` – registracija
- `/pravila` – pravila korištenja
- `/privatnost` – politika privatnosti
- `/zaboravljena-lozinka` – reset lozinke
- `/reset-lozinke` – postavljanje nove lozinke
- `/payment-success` – success redirect nakon Stripe plaćanja

### 3.2 Zahtijevaju prijavu (RequireAuth)
- `/moji-oglasi` – moji oglasi
- `/moji-oglasi/uredi/:id` – uređivanje oglasa
- `/moji-favoriti` – sačuvani oglasi
- `/objavi` – objava novog oglasa
- `/poruke` – chat
- `/obavjestenja` – notifikacije

### 3.3 Admin
- `/admin/*` – zasebne admin rute (AdminPanel)

---

## 4. ŠTA JE URAĐENO NA APLIKACIJI

### 4.1 Infrastruktura
- Vite proxy za `/api/` i `/socket.io` – CORS izbjegnut u dev-u
- API base u dev-u: relativni put `/api` (proxy)
- Socket.io URL u dev-u: `window.location.origin` (proxy)

### 4.2 Oglasi
- Demo/fallback oglasi kad API ne radi ili baza prazna
- `adsAreFallback` – onemogućava klik na kartice kad su fallback
- Klik na fallback karticu → poziva `onRetryAds` umjesto navigacije
- Banner: „Prikazujemo primjer oglasa…“ + dugme Osvježi
- Sitemap: `deletedAt: null` u `where` uvjetu
- AdDetail: optional chaining za `ad.slike` (sprečava crash)

### 4.3 Sigurnost i kvaliteta
- XSS: sanitize-html
- Upload: magic bytes validacija (JPEG/PNG/WebP)
- Rate limiti: chat 20/min, checkout 5/5min, create ad, report
- AdViewThrottle FK + CASCADE
- Cleanup logging u produkciji
- Health check s DB provjerom (degraded)

### 4.4 Backend
- Redis adapter za Socket.io (multi-instance chat)
- Premium ranking bez hard limita (take 1000)
- Prisma migracije: shadowBanned, AdViewThrottle, itd.

---

## 5. GREŠKE I UPOZORENJA

### 5.1 Unit testovi
- **Popravljeno:** mock za `runAdLifecycleCheck` + potpuniji mock podaci (createdAt, _count) – svi testovi prolaze (19/19)

### 5.2 Poznata upozorenja
- `url.parse()` deprecation (Express / Node)
- Vite CJS Node API deprecated
- Proxy greška za `/api.ts` – ispravljeno (proxy samo `/api/`)

### 5.3 EADDRINUSE (port 3000 / 5173)
- Nastaje kad stari Node proces ostane aktivan
- Rješenje: `taskkill /PID <pid> /F` ili upute u `TROUBLESHOOTING.md`

### 5.4 Baza i migracije
- Ponekad: `shadowBanned` / `AdViewThrottle` ne postoji – rješeno `prisma migrate deploy`
- Migracije su primijenjene (nema pending)

---

## 6. PREPORUKE ZA DALJE

### 6.1 Testiranje
1. E2E testovi (npr. Playwright) za: registracija, objava oglasa, klik na oglas, checkout, chat
2. Popraviti unit testove u `tests/ads.test.ts` (mock setup)
3. Load test za listing i upload

### 6.2 Produkcija
1. Redis u produkciji (`REDIS_URL`)
2. Live Stripe keys + webhook na produkciji
3. Sentry (ili ekvivalent) za frontend + backend
4. Backup strategija za bazu

### 6.3 Dokumentacija
- `TROUBLESHOOTING.md` – EADDRINUSE, migracije
- `DEPLOY.md` – env varijable, deploy
- `ADMIN.md` – admin upute

---

## 7. INCIDENT: KLIK NA OGLAS NE RADI (17.02.2026)

### Root cause
Vjerovatno više faktora: (1) Vite proxy key `/api/` (sa trailing slash) mogao je u pojedinim slučajevima ne proslijediti zahtjev; (2) nedostatak error handlinga u AdDetail (mapApiAdToAd, ad.opis) – moguć crash; (3) bez retry-a pri mrežnoj grešci korisnik je ostajao na “Oglas nije pronađen” bez opcije ponovnog pokušaja.

### Urađene promjene (fix)

| Fajl | Promjena |
|------|----------|
| `vite.config.ts` | Proxy key promijenjen sa `/api/` na `/api` radi pouzdanijeg matcha |
| `App.tsx` (AdDetail) | Dodat `loadAd` callback, try/catch oko `mapApiAdToAd`, `fetchError` state, dugme “Pokušaj ponovo” i link “Nazad na oglase” kad oglas nije pronađen |
| `App.tsx` (AdDetail) | Normalizacija URL-a: `(API_BASE || '').replace(/\/$/, '')` da se izbjegne dupli slash |
| `App.tsx` (AdDetail) | Siguran pristup `ad.opis` – `ad.opis != null ? String(ad.opis) : ''` da se izbjegne crash |
| `App.tsx` (AdCard) | `linkTo = ad.slug ? \`/oglas/${ad.slug}\` : '#'` da se spriječi navigacija na `/oglas/undefined` |
| `scripts/smoke-test.js` | Nova skripta: provjera health, listing, detalj oglasa |
| `package.json` | Dodan script `smoke-test` |

### Prije / poslije

- **Prije:** Klik na oglas (DEMO ili realni) ponekad nije otvarao detalj; moguć crash ili “Oglas nije pronađen” bez retry opcije.
- **Poslije:** Klik na realan oglas otvara detalj; fallback kartice ostaju neklikabilne (retry); na grešci postoji “Pokušaj ponovo” i link nazad.

### Provjera

- `GET /api/ads` → 200
- `GET /api/ads/:slug` → 200 za postojeći slug
- `npm run smoke-test` → SVE OK
- Proxy: `GET http://localhost:5173/api/ads/:slug` → 200

### Prevencija

1. Pokretati `npm run smoke-test` prije deploya.
2. U DevTools (Console/Network) pratiti greške fetch-a i API odgovore.
3. Provjeriti da backend radi prije otvaranja frontenda.

---

## 8. QA FIX – NO-GO REMEDIATION (16.02.2026)

### Urađene izmjene

| # | Stavka | Fajl | Promjena |
|---|--------|------|----------|
| 1 | PublicProfile/MyFavorites fallback zaštita | App.tsx | `linksDisabled={!!adsError \|\| !!adsAreFallback}` i `onFallbackClick={onRetryAds}` na AdCard; proslijeđeni `adsError`, `adsAreFallback`, `onRetryAds` kroz rute |
| 2 | API_BASE hardening | api.ts | Normalizacija bez trailing slash; upozorenje u produkciji ako VITE_API_URL nije postavljen; dev strogo "/api" |
| 3 | SPA fallback | README.md | Dodana sekcija: Production hosting mora servirati index.html za nepoznate rute |
| 4 | AdDetail race condition | App.tsx | AbortController u loadAd; abortRef za cleanup; spriječen setState nakon unmount-a |
| 5 | Search debounce | — | Nije potrebno: pretraga radi na form submit, ne na keypress; nema API spam |
| 6 | Orphan images | ✅ | Implementirano: deleteAdImagesFromStorage pri brisanju oglasa; cleanup:orphan-tmp za tmp upload-e |
| 7 | Sentry monitoring | main.tsx, src/index.ts | Frontend: init ako VITE_SENTRY_DSN; Backend: init + captureException ako SENTRY_DSN; bez crasha ako DSN nije postavljen |

### Orphan images (backend cleanup) – ✅ Implementirano

- **Brisanje oglasa:** `DELETE /my/:id` i adLifecycle sada brišu slike iz Supabase Storage prije Prisma delete.
- **Orphan tmp uploadi:** `npm run cleanup:orphan-tmp` (CLEANUP_ORPHAN_TMP_ENABLED=true, TMP_MAX_AGE_HOURS=24) briše tmp fajlove starije od 24h koje korisnik nije priložio oglasu.

---

## 9. ZAKLJUČAK

Aplikacija je funkcionalna u lokalnom dev okruženju. API endpointi odgovaraju 200, oglasi se učitavaju, detalj oglasa po slug-u radi. Proxy konfiguracija ispravno prosljeđuje zahtjeve s frontenda na backend. NO-GO stavke iz QA izvještaja su remedirane.
