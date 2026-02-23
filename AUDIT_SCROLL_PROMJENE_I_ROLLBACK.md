# AUDIT: Scroll fix promjene i rollback plan

**Datum:** 2026-02-19  
**Kontekst:** Tražen je fix scroll-a (detail uvijek top + back vraća scroll). Aplikacija je postala nestabilna. Ovaj izvještaj dokumentuje sve promjene i daje rollback plan.

---

## ZADATAK 1 — PROMJENE (TAČNO)

### 1.1 Svi commitovi (scroll + side-effect) — kronološki

| # | SHA | Poruka | Datum |
|---|-----|--------|-------|
| 1 | 1c728ac | Zapamti poziciju skrola na listing stranici | 2026-02-18 16:03 |
| 2 | 5249b79 | Scroll na vrh oglasa + zapamti poziciju na marketplace | 2026-02-18 16:11 |
| 3 | b4e5928 | Skrol: spremi pri kliku na oglas, vrati pri povratku s više pokušaja | 2026-02-18 16:30 |
| 4 | 111663a | Popravka: kategorija fallback, scroll na vrh oglasa, poboljšan scroll restoration | 2026-02-18 16:53 |
| 5 | 051e387 | fix: stabilno ponašanje scrolla između liste oglasa i detalja (adsListScrollY, scrollRestoration manual) | 2026-02-18 19:26 |
| 6 | 694f21a | fix: try-catch oko scroll i sessionStorage da ne pucaju stranice; stabilno ponašanje scrolla lista-detail | 2026-02-18 19:37 |
| 7 | 5ce8e14 | Scroll: ojacani reset na vrhu pri otvaranju oglasa (detail uvijek na vrhu) | 2026-02-18 21:46 |
| 8 | eb5c3e9 | Slike: pun payload + scroll lista/detail popravljen (VirtualList) | 2026-02-18 21:35 |
| 9 | 713a32d | Scroll fix: lista/detail save-restore, detail uvijek top, data-scroll-root za admin | 2026-02-18 23:24 |
| 10 | 66e5777 | Scroll regresija fix: useLayoutEffect na route level, scroll:list: key, detail uvijek top | 2026-02-19 09:34 |
| 11 | 4f9ec43 | Scroll fix: hardScrollToTop resetta sve targete, 1 data-scroll-root, isDetailRoute zaštita | 2026-02-19 09:45 |
| 12 | 33db26a | fix(scroll): restore Marketplace scroll poziciju pri povratku sa detail stranice | 2026-02-19 09:55 |
| 13 | f520591 | fix(scroll): Marketplace restore samo nakon ads loaded, clear tek poslije restore-a | 2026-02-19 10:09 |
| 14 | 6beabfb | fix(scroll): Detail SYNC top bez skoka, Marketplace restore s returnTo flag + success check | 2026-02-19 12:25 |
| 15 | cef253f | fix: jedan scroll owner za Marketplace - VirtualList ili root, bez dual restore | 2026-02-19 12:46 |
| 16 | dc09301 | fix: production DB - preDeploy migrate, db:validate, admin stats 500 sa logom | 2026-02-19 12:59 |

### 1.2 Detalji po commitu (fajlovi + šta + zašto)

1. **1c728ac** – App.tsx (+22)
   - Dodan ref za scroll poziciju liste, save na scroll event.
   - Zašto: prva implementacija “zapamti poziciju”.

2. **5249b79** – App.tsx (+36 -12)
   - Scroll na vrh pri otvaranju oglasa, kombinacija sa save/restore.
   - Zašto: detail uvijek top + restore.

3. **b4e5928** – App.tsx (+20 -31)
   - Refaktor: save pri kliku, restore s više retry-ja.
   - Zašto: bolja pouzdanost restore-a.

4. **111663a** – App.tsx (+45 -14)
   - Kategorija fallback, scroll restoration poboljšanja.
   - Zašto: edge case-ovi.

5. **051e387** – App.tsx (+40 -24)
   - adsListScrollY state, scrollRestoration = 'manual'.
   - Zašto: stabilnije ponašanje između ruta.

6. **694f21a** – App.tsx (+42 -29)
   - try-catch oko scroll i sessionStorage.
   - Zašto: sprečiti crash kad sessionStorage nije dostupan.

7. **5ce8e14** – App.tsx (+68 -16)
   - Ojačan reset na vrhu pri otvaranju oglasa.
   - Zašto: detail uvijek top.

8. **eb5c3e9** – App.tsx (+121 -38)
   - VirtualList, pun payload slika, scroll lista/detail.
   - Zašto: VirtualList + scroll integracija.

9. **713a32d** – App.tsx, AdminPanel.tsx, lib/scroll.ts (nova datoteka)
   - Kreiran lib/scroll.ts (saveScrollForList, loadScrollForList, getScrollRoot, hardScrollToTop, restoreScroll).
   - App.tsx: data-scroll-root, Marketplace restore logika, load/restore efekti.
   - AdminPanel: data-scroll-reset, hardScrollToTop.
   - Zašto: centralizovan scroll helper, jedno mjesto za scroll logiku.

10. **66e5777** – App.tsx, AdminPanel.tsx, lib/scroll.ts
    - useLayoutEffect umjesto useEffect za restore.
    - scroll:list: key u sessionStorage.
    - Zašto: regresija fix, restore prije paint-a.

11. **4f9ec43** – App.tsx, AdminPanel.tsx, lib/scroll.ts
    - hardScrollToTop resetta sve targete (data-scroll-root, data-scroll-reset, document, body, window).
    - isDetailRoute guard – ne reset na list rutama.
    - Zašto: hard reset na detail rutama, bez pregazivanja restore-a.

12. **33db26a** – App.tsx, lib/scroll.ts
    - hardScrollToTop guard samo na detail rutama.
    - Marketplace restore: useLayoutEffect, retry 150ms za virtualizaciju.
    - Zašto: restore ne pregaziti, čekati virtualizaciju.

13. **f520591** – App.tsx, lib/scroll.ts
    - Restore samo nakon ads loaded.
    - clearListScroll tek nakon uspješnog restore-a.
    - loadScrollForList bez brisanja (clear nakon).
    - Zašto: restore na skeleton se pregaziti, clear samo kad radi.

14. **6beabfb** – App.tsx, AdminPanel.tsx, index.html, index.preview.html, lib/scroll.ts
    - scroll-behavior: smooth → auto.
    - Detail: useLayoutEffect SYNC hardScrollToTop.
    - RETURN_TO_MARKETPLACE_KEY samo na klik iz Marketplace-a.
    - Restore success check: clear kad |root.scrollTop - savedY| <= 2.
    - Zašto: izbjeći skok, precizniji restore.

15. **cef253f** – App.tsx, lib/scroll.ts
    - Jedan scroll owner: VirtualList ILI root (dual restore zabranjen).
    - saveScrollForList: virtualOffset > 0 → samo list, inače samo root.
    - Load: virtualOffset > 0 → samo pendingListScrollRef; y > 0 → samo pendingScrollYRef.
    - applyWindow: ne dirati root kad je pendingListScrollRef postavljen.
    - Zašto: VirtualList i root se bore za scroll; jedan owner.

16. **dc09301** – package.json, render.yaml, scripts/db-validate-production.js, src/routes/admin.ts
    - preDeployCommand u render.yaml: NODE_ENV=production npm run migrate:deploy.
    - db:validate script.
    - admin/stats: uklonjen fallback, vraća 500 sa detaljnim logom.
    - Zašto: admin stats 500 na produkciji, DB migracije pri deploy-u.

### 1.3 Svi mijenjani fajlovi (scroll fix rad)

| Fajl | Broj promjena |
|------|---------------|
| App.tsx | 15 commitova |
| lib/scroll.ts | 8 commitova (kreiran u 713a32d) |
| AdminPanel.tsx | 5 commitova |
| index.html | 1 commit |
| index.preview.html | 1 commit |
| package.json | 1 commit (dc09301) |
| render.yaml | 1 commit (dc09301) |
| scripts/db-validate-production.js | 1 commit (dc09301, nova) |
| src/routes/admin.ts | 1 commit (dc09301) |

### 1.4 DIFF sažetak – ključne izmjene

**Dodati efekti (App.tsx – Marketplace):**
- useEffect (load): čita sessionStorage kad RETURN_TO_MARKETPLACE_KEY === '1', postavlja pendingScrollYRef / pendingListScrollRef (linije ~833–859).
- useLayoutEffect (restore): applyWindow, applyList, stabilizer, run sa RAF + 6 setTimeout-a (100, 150, 300, 600, 1000, 1500 ms) (linije ~864–995).
- useEffect (scroll save): addEventListener scroll, saveScrollForList (linije ~998–1015).
- useEffect (unmount save): backup save pri unmount (linije ~1018–1030).

**data-scroll-root:**
- App.tsx linija 577: `<div data-scroll-root className="flex-1 overflow-y-auto min-h-0">`
- AdminPanel.tsx linija 190: `<main ... data-scroll-reset>`

**sessionStorage ključevi:**
- `returnTo:marketplace` – flag da se vraća sa detail-a.
- `scroll:list:{pathname}{search}` – npr. `scroll:list:/marketplace` ili `scroll:list:/marketplace?q=auto`. Vrijednost: `{"y":123,"l":0}` ili `{"y":0,"l":456}`.

**Stabilizer timeoutovi:**
- 300 ms i 900 ms: stabilizer(sy, lo) – ponovo apply scroll ako je "resetovan".
- 1200 ms: RESTORE FAILED warning ako scroll ostane na vrhu.

**Virtual offset logika:**
- virtualListScrollRef: trenutni scroll offset VirtualList-a (onScroll callback).
- pendingListScrollRef: snimljen offset za restore.
- Kada virtualOffset > 0: save {y:0, l:offset}, restore samo listRef.scrollTo(offset).
- Kada root mode: save {y:rootScrollTop, l:0}, restore samo root.scrollTop.

---

## ZADATAK 2 — POSLJEDICE / REGRESIJE

### 2.1 Mogući simptomi

1. **Marketplace – back ne vraća scroll**
   - Simptom: Back sa detail na listu, lista na vrhu.
   - Uzrok: VirtualList resetuje scroll nakon restore-a; dual restore; ili VirtualList nije spreman kad se restore pokrene.
   - Reprodukcija: Marketplace → skroluj → klik na oglas → Back.
   - Minimalni fix: provjeriti da listRef.scrollTo stigne prije VirtualList onScroll(0). Možda delay ili retry.

2. **Detail – skrol nije na vrhu**
   - Simptom: Otvaranje oglasa, stranica nije na vrhu.
   - Uzrok: getScrollRoot vraća data-scroll-root element; možda layout nije stabilan kad se hardScrollToTop pozove.
   - Reprodukcija: Lista → klik na oglas.
   - Minimalni fix: Dodati mali delay ili double RAF u hardScrollToTop.

3. **Admin preview – scroll nestabilan**
   - Simptom: Admin pregled oglasa, scroll skače.
   - Uzrok: data-scroll-reset + hardScrollToTop na admin rutama.
   - Reprodukcija: Admin → Oglasi na čekanju → Pogledaj.

4. **API /api/admin/stats 500**
   - Simptom: Admin dashboard ne učitava, 500 na stats.
   - Uzrok: DB migracije nisu primijenjene (npr. AdStatus.NA_CEKANJU, Payment, Report).
   - Reprodukcija: Admin login → Dashboard.
   - Minimalni fix: Pokrenuti `npm run migrate:deploy` na produkciji ili vratiti fallback (200 + prazni podaci).

5. **Previše logova u konzoli**
   - Simptom: Konzola puna [Marketplace] logova.
   - Uzrok: import.meta.env?.DEV logovi u restore/stabilizer.
   - Fix: Ostaviti ili ukloniti DEV logove.

### 2.2 Tačan uzrok po regresiji

| Regresija | Kod (linija) | Provjera |
|-----------|--------------|----------|
| Back ne restore | App.tsx ~877 (applyWindow guard), ~904–918 (applyList), VirtualList onScroll može pregaziti | DevTools: Network ne pomaže; Console logovi [Marketplace] restore list |
| Detail nije top | lib/scroll.ts ~39–55 hardScrollToTop; App.tsx AdDetail useLayoutEffect ~2463 | Provjeriti getScrollRoot() na detail ruti |
| Admin stats 500 | src/routes/admin.ts ~50–67 Promise.all, Prisma modeli | Render logs: [admin/stats] stack |
| preDeploy fail | render.yaml preDeployCommand, migrate-deploy zahtijeva NODE_ENV=production | Render build logs |

---

## ZADATAK 3 — ROLLBACK PLAN

### 3.1 "Last known good" commit

**Prije svih scroll promjena:** `4c01d44` (Fallback: Vercel koristi Render API za Google prijavu)

**Alternativa – prije heavy scroll refaktora (lib/scroll.ts, data-scroll-root):** `35e6355` (Fix build: extra div, reportModal refactor)

Preporuka za rollback: `35e6355` – aplicacija ima admin, slike, većinu fixova; scroll je još u App.tsx bez lib/scroll.ts.

### 3.2 Opcija A: Siguran rollback (git revert, bez force)

Revert commitova od najnovijeg prema najstarijem. Svaki revert je novi commit.

```bash
cd "c:\Users\Jovan\Desktop\PoveziME"

# Revert od dc09301 do 35e6355 (isključivo) – 16 commitova
git revert --no-commit dc09301 cef253f 6beabfb f520591 33db26a 4f9ec43 66e5777 713a32d
git revert --no-commit 5ce8e14 eb5c3e9 694f21a 051e387 111663a b4e5928 5249b79 1c728ac

# Pregled
git status

# Commit
git commit -m "rollback: revert scroll fix commitove, vracamo na 35e6355 stanje"

# Push
git push
```

**Napomena:** Revert 16 commitova može dati konflikte. Ako ima konflikata, ručno ih riješiti ili koristiti Opciju B.

### 3.3 Opcija B: Hitni rollback (reset --hard + force push)

**Upozorenje:** Briše historiju. Samo ako nema drugih developera ili ako je repo samo tvoj.

```bash
cd "c:\Users\Jovan\Desktop\PoveziME"

# Reset na last known good (35e6355)
git reset --hard 35e6355

# Force push (PREGLEDAJ da li je to tačan commit!)
git push --force origin main
```

**Provjera prije pusha:**

```bash
git log --oneline -3
# Trebalo bi vidjeti: 35e6355 Fix build: extra div, reportModal refactor...
```

**Šta gubis:** Sve commitove od 713a32d do dc09301 (scroll fix + admin stats + preDeploy). Admin preview oglasa, VirtualList, itd. ostaju (35e6355 ih ima).

### 3.4 Rollback samo production DB / admin (bez scroll reverta)

Ako je problem samo admin/stats 500:

1. Render: ukloniti `preDeployCommand` iz render.yaml (privremeno).
2. Ručno pokrenuti migracije na production DB.
3. Ili vratiti fallback u admin/stats (200 + prazni podaci kad query pukne).

---

## ZADATAK 4 — MINIMALNI FIX SCROLL-A (BEZ RAZVALJIVANJA)

### 4.1 Cilj

- Detail uvijek top.
- Back vraća scroll na marketplace.
- Minimalne promjene (najmanje fajlova).

### 4.2 Minimalni pristup

**Fajlovi:**
1. `App.tsx` – samo Marketplace sekcija + AdCard onBeforeNavigate.
2. `lib/scroll.ts` – ostaje (već postoji) ili ako rollback na 35e6355, onda bez lib/scroll.ts.

**Ako radiš na trenutnoj verziji (nakon scroll fixa):**

Problem je najvjerovatnije:
- Previše retry/timeout logike.
- VirtualList vs root dual owner i takmičenje.

**Minimalni fix:**
1. U App.tsx Marketplace – pojednostaviti restore: samo jedan `useEffect` koji nakon ads loaded pozove restoreScroll(y) ILI listRef.scrollTo(offset), ne oba. Bez stabilizera osim ako testovi pokažu da je potreban.
2. Ukloniti 6x setTimeout retry – dovoljno 1–2 pokušaja (npr. 100 ms i 400 ms).
3. Ostaviti RETURN_TO_MARKETPLACE_KEY i saveScrollBeforeNavigate na AdCard.

**Ako radiš rollback na 35e6355 pa dodaješ minimalan scroll fix:**

1. **lib/scroll.ts** – kreirati minimalno:
   - `saveScrollForList(key, y)` – sessionStorage.
   - `loadScrollForList(key)` – čitanje.
   - `restoreScroll(y)` – window.scrollTo ili scrollRoot.scrollTop.
   - `hardScrollToTop()` – samo na detail rutama (pathname check).

2. **App.tsx** – samo Marketplace:
   - Na klik na oglas: `saveScrollBeforeNavigate` → saveScrollForList, set RETURN_TO_MARKETPLACE.
   - Na povratak (useEffect kad location je marketplace i hasFlag): loadScrollForList, nakon ads loaded – restoreScroll(y). Bez VirtualList offset logike ako lista nije virtualizirana.

3. **App.tsx** – AdDetail/AdDetailView:
   - useLayoutEffect: `hardScrollToTop()` kad ad učita.

4. **Ne dirati:** index.html scroll-behavior, AdminPanel data-scroll-reset (ili ostaviti samo ako admin scroll radi).

### 4.3 Tačne linije za minimalan fix (na trenutnoj verziji)

- **Pojednostaviti restore:** App.tsx ~864–995. Zamijeniti 6 setTimeout-a sa 2 (100 ms, 400 ms). Ukloniti stabilizer na 300/900 ms osim ako test ne pokaže da je potreban.
- **Provjeriti applyWindow guard:** App.tsx ~877 – kada je VirtualList aktivan, applyWindow se preskače. To je ispravno.
- **VirtualList onScroll reset:** Ako VirtualList šalje onScroll(0) odmah nakon mounta, restore možda stiže prekasno. Probati: pozvati listRef.scrollTo u setTimeout 50 ms nakon što VirtualList mountuje.

---

## ZADATAK 5 — CHECKLIST ZA PRODUKCIJU

### 5.1 10 test koraka (klik/scroll/back)

1. Otvori marketplace – lista se učitava, bez errora.
2. Skroluj naniže ~300px – lista skroluje.
3. Klikni na oglas – otvara se detail, stranica na vrhu.
4. Back – vraća se na listu, scroll je na istoj poziciji (±50px).
5. Skroluj na dno liste – vidi se "Učitaj još" ako ima.
6. Klikni na oglas – detail na vrhu.
7. Back – lista na istoj poziciji.
8. Admin login → Dashboard – učitava se (nema 500).
9. Admin → Oglasi na čekanju → Pogledaj – otvara se oglas, na vrhu.
10. Back – vraća se na admin listu.

### 5.2 Šta gledati u konzoli/network

- **Console:** Nema crvenih errora. `[Marketplace]` logovi su OK u dev.
- **Network:** GET /api/ads – 200. GET /api/admin/stats – 200 (ne 500). GET /api/admin/ads – 200.
- **RESTORE FAILED:** Ako se pojavi – scroll restore nije uspio.

### 5.3 Odmah rollback ako pukne

1. `git reset --hard 35e6355`
2. `git push --force origin main`
3. Render i Vercel će automatski redeploy-ovati (ako su povezani).
4. Ili ručno Redeploy u Render/Vercel dashboardu.

---

## SAŽETAK

- **Scroll fix obuhvata** 16 commitova, uključujući lib/scroll.ts, data-scroll-root, VirtualList owner logiku, admin stats, preDeploy migrate.
- **Last known good:** `35e6355` (prije lib/scroll refaktora).
- **Siguran rollback:** `git revert` niza commitova (može biti konflikta).
- **Hitni rollback:** `git reset --hard 35e6355` + `git push --force`.
- **Minimalni fix:** Pojednostaviti restore (manje retry-a, bez stabilizera osim ako je potrebno), ostaviti jedan scroll owner.
