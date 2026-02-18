# Admin panel – šta je promijenjeno

## Pregled

Admin panel za Povezi.me marketplace: zaštićen login po ulozi (ADMIN), backend API s paginacijom i filterima, audit log, frontend na `/admin` bez izmjene javnog dizajna.

---

## A) Auth i sigurnost

- **Express Request** – proširenje tipa u `src/types/express.d.ts`: `req.user` (id, userId, role, email).
- **Backend auth** – JWT verify u `src/middleware/auth.ts`; `requireAdmin` provjera role; u `src/routes/auth.ts`: role u JWT, provjera `user.banned` na login (403), rate limit na login.
- **Frontend** – `AdminGuard` u `AdminPanel.tsx`: redirect na `/admin/login` ako nema user, na `/` ako role !== admin. Admin rute uklopljene u `App.tsx`: za `pathname.startsWith('/admin')` renderuje se samo `AdminRoutes` (bez Header/Footer).

---

## B) Backend admin rute (`src/routes/admin.ts`)

Sve rute zaštićene s `authenticate` + `requireAdmin`. Validacija (zod) i paginacija gdje je navedeno.

| Ruta | Opis |
|------|------|
| **GET /admin/stats** | Dashboard: totalUsers, totalAds, activeAds, premiumAds, reportedAds, revenueTotal, lastUsers(5), lastAds(5). Cache 60s. |
| **GET /admin/users** | Lista: page, limit (max 50), search (email, ime), filter isBanned, role. |
| **GET /admin/users/:id** | Detalji korisnika + broj oglasa. |
| **POST /admin/users/:id/ban** | Ban + razlog (body: reason?). |
| **POST /admin/users/:id/unban** | Uklanjanje bana. |
| **POST /admin/users/:id/role** | Postavljanje role (body: role). |
| **DELETE /admin/users/:id** | Brisanje korisnika. |
| **GET /admin/ads** | Lista: paginacija, search (title, id, email), filter status, category, isPremium, hasReports. |
| **POST /admin/ads/:id/deactivate** | Deaktivacija oglasa. |
| **POST /admin/ads/:id/status** | Postavljanje statusa (body: status). |
| **POST /admin/ads/:id/feature** | Promocija: plan 7|14|30 ili featuredUntil (ISO). **removePromo: true** uklanja promociju. |
| **DELETE /admin/ads/:id** | Brisanje oglasa. |
| **GET /admin/reports** | Lista: paginacija, filter status (open/closed). |
| **POST /admin/reports/:id/resolve** | Rješavanje prijave (body: action?, note?). |
| **GET /admin/payments** | Placeholder (prazan niz). |
| **GET /admin/payments/totals** | Placeholder (total 0). |

Sve mutacije (ban, unban, role, deactivate, status, feature, delete, resolve) logiraju se u **AdminAuditLog** preko `src/lib/audit.ts`.

---

## C) Prisma / baza

- **User**: polja `banned`, `bannedReason`, relacija na Report; indeksi email, role, banned.
- **Report**: model (adId, reporterUserId, reason, details, status open/closed, createdAt, resolvedAt); indeksi adId, status, createdAt.
- **AdminAuditLog**: adminId, action, entityType, entityId, metadata (JSON), createdAt; indeksi adminId, entityType+entityId, createdAt.
- **Ad**: relacija `reports` na Report.

Migracija: pokrenuti `npx prisma migrate dev` (npr. ime `add_admin_report_audit`), zatim `npx prisma generate` (preporučeno zaustaviti backend radi EPERM).

---

## D) Frontend admin (`AdminPanel.tsx` + `App.tsx`)

- **Rute**: `/admin/login`, `/admin` (dashboard), `/admin/users`, `/admin/users/:id`, `/admin/ads`, `/admin/reports`, `/admin/payments`.
- **Data fetching**: timeout 10s, AbortController, `getAuthHeaders()`; loading/empty/error stanja.
- **Liste**: pretraga s debounce 300ms, server-side paginacija, memoizacija.
- **Akcije**: Blokiraj (razlog), Odblokiraj, Obriši (confirm), Promocija 7d/14d/30d, Ukloni promociju, Deaktiviraj oglas, Riješi prijavu.
- Stilovi: iste CSS varijable kao javni dio (`var(--bg-page)`, `var(--accent)` itd.), bez novog dizajn sistema.

---

## Lista izmijenjenih / novih fajlova

| Fajl | Opis |
|------|------|
| `prisma/schema.prisma` | User (banned, bannedReason), Report, AdminAuditLog, Ad.reports, indeksi. |
| `src/types/express.d.ts` | Proširenje Request s `user`. |
| `src/middleware/auth.ts` | JWT verify, postavljanje req.user, requireAdmin. |
| `src/routes/auth.ts` | Role u JWT, banned check na login, rate limit. |
| `src/lib/audit.ts` | **Novo** – createAuditLog(). |
| `src/routes/admin.ts` | Sve admin API rute, validacija, paginacija, audit. |
| `AdminPanel.tsx` | **Novo** – AdminGuard, AdminLogin, AdminLayout, Dashboard, Users, UserDetail, Ads, Reports, Payments, AdminRoutes, useAdminFetch. |
| `App.tsx` | Import AdminRoutes; za /admin render samo AdminRoutes (bez Header/Footer). |
| `ADMIN.md` | **Novo** – ovaj dokument. |

---

## Šta možeš kao admin

- **Korisnici**: pregled, pretraga, filter (blokirani, uloga), detalj korisnika, **blokiranje** (s razlogom), odblokiranje, promjena uloge, brisanje.
- **Oglasi**: pregled, pretraga, filter (status, kategorija, premium, ima prijave), **deaktivacija**, postavljanje statusa, **davanje promocije** (7/14/30 dana), **uklanjanje promocije**, **brisanje oglasa**.
- **Prijave**: lista, filter po statusu, **rješavanje** prijave (s opcijom akcije i napomene).
- **Plaćanja**: placeholder (lista i total 0 dok se ne spoji Stripe/platni model).

Sve navedene akcije se bilježe u audit log (ko, šta, nad kim/čim, kada).
