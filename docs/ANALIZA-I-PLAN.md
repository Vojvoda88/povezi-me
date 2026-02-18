# Poveži.ME – Analiza i plan (Backend, Security, SEO, Dizajn)

Detaljna analiza šta je urađeno, šta nedostaje i šta uraditi dalje.

---

## 1. BACKEND

### ✅ Šta je urađeno
- Jedan ulaz: `src/index.ts` (Express)
- Rute: `/api/auth` (login, register, me), `/api/ads`, `/api/notifications`, `/api/admin`, `/health`
- SEO na backendu: `/sitemap.xml`, `/robots.txt`
- Prisma + PostgreSQL (User, Ad, AdImage)
- Validacija ulaza: Zod (registracija, login, kreiranje oglasa)
- JWT autentifikacija, middleware `authenticate` i `requireAdmin`
- Centralni error handler, request ID, structured logging
- Kompresija (gzip), CORS (production origin), rate limit na `/api`
- Lazy expiration oglasa (expiresAt → ISTEKAO), istaknuti oglasi (featuredUntil)
- Fallback za stariju bazu bez `expiresAt`/`featuredUntil`

### ⚠️ Šta nedostaje / preporuke
| Stavka | Prioritet | Opis |
|--------|-----------|------|
| Notifications API | Srednji | `GET /api/notifications` i `POST /api/notifications/mark-read` vraćaju 501 – implementirati sa Prisma modelom (Notification) i povezati sa frontendom |
| GET oglasa po slug-u | Nizak | Backend ima samo listu oglasa; dodati `GET /api/ads/:slug` za stranicu pojedinačnog oglasa (pogledi, vlasnik) |
| Favoriti na backendu | Srednji | Omiljeni oglasi su samo u React state-u – dodati tabelu/vezu (npr. UserFavorite) i API (dodaj/ukloni/list) da budu trajni |
| Paginacija oglasa | Srednji | `GET /api/ads` vraća sve – za puno oglasa uvesti `?page=1&limit=20` i total count |
| Env provjera | Nizak | Na startu provjeriti da u produkciji postoje `JWT_SECRET`, `DATABASE_URL`; ako ne, logovati upozorenje ili exit |

---

## 2. SECURITY

### ✅ Šta je urađeno
- **Helmet** – sigurnosni headeri (X-Content-Type-Options, X-Frame-Options, itd.)
- **CORS** – u produkciji samo `FRONTEND_URL`; u dev-u sve dozvoljeno
- **Rate limit** – 200 req/15 min na `/api`; 10 req/15 min na login
- **JWT** – Bearer token, 7 dana, provjera u middleware-u
- **Lozinka** – bcrypt hash pri registraciji
- **Validacija** – Zod na register, login i kreiranje oglasa
- **Admin rute** – zaštićene sa `requireAdmin`

### ⚠️ Šta nedostaje / preporuke
| Stavka | Prioritet | Opis |
|--------|-----------|------|
| **JWT_SECRET u produkciji** | Visok | Ako je `JWT_SECRET` default ("super-tajni-kljuc") u produkciji – **obavezno** postaviti jak, nasumičan string u env |
| **Sanitizacija** | Visok | `security/sanitize.ts` (sanitizeHTML) postoji ali **se ne koristi**. Koristiti za `naslov`, `opis` i ostale tekstualne inpute pri kreiranju/izmjeni oglasa (smanjuje XSS) |
| **CAPTCHA** | Srednji | `security/captcha.ts` postoji ali nije povezan. Opciono: na register ili na “zaboravljena lozinka” da smanjiš bot registracije |
| **Audit log** | Nizak | `security/auditLog.ts` postoji ali se ne koristi. Opciono: logovati login, promjenu statusa oglasa, admin akcije (u bazu ili fajl) |
| **HTTPS** | Visok | U produkciji server mora biti iza HTTPS (Render/Vercel to obično rješavaju). U `.env` ne držati tajne u plain text |
| **Limit veličine requesta** | Ok | `express.json({ limit: '2mb' })` – 2MB je ok; za upload slika kasnije koristiti poseban endpoint/file storage |

---

## 3. SEO

### ✅ Šta je urađeno
- **index.html**: title, meta description, canonical (https://povezi.me/)
- **Backend**: `/sitemap.xml` (početna, kategorije, oglasi), `/robots.txt` (Allow /, Disallow /admin, Sitemap URL)
- **Jezik**: `lang="sr-Latn"` u HTML-u

### ⚠️ Šta nedostaje / preporuke
| Stavka | Prioritet | Opis |
|--------|-----------|------|
| **HashRouter vs BrowserRouter** | Visok | Aplikacija koristi **HashRouter** (URL tipa `povezi.me/#/oglas/nekislav`). Google indeksira hash, ali za bolji SEO i “lijepije” linkove preporuka je **BrowserRouter** + server koji na sve rute vraća `index.html` (kod deploya na Render/Vercel/Netlify to se lako podešava). Sitemap trenutno ima `/oglas/slug` – sa HashRouter-om stvarni URL je `/#/oglas/slug`. Ako pređeš na BrowserRouter, sitemap i stvarni URL će se slagati |
| **Meta po stranici** | Srednji | Za svaku stranicu (početna, kategorija, pojedinačni oglas) dinamički postaviti `<title>` i meta description (React Helmet ili sl.). Posebno za oglas: title = naslov oglasa, description = kratki opis, Open Graph za dijeljenje |
| **Open Graph / Twitter kartice** | Srednji | U `<head>` dodati `og:title`, `og:description`, `og:image`, `og:url` (i opciono Twitter) da link na oglas lijepo izgleda kad se dijeli na društvenim mrežama |
| **Structured data (JSON-LD)** | Nizak | Za oglase možeš dodati Product/Offer schema (name, price, image) da Google prikaže rich rezultate |
| **Performance** | Srednji | Lazy loading slika (već imaš), code splitting (Vite), minifikacija – već urađeno. Opciono: slike optimizirati (WebP, resize) na backendu ili CDN |

---

## 4. DIZAJN I IZGLED (za kasnije)

Kada završiš backend/security/SEO, možeš se fokusirati na:

- Konsistentnost: tipografija, boje, razmaci (design tokens / Tailwind config)
- Responsive: mobilni prvi, tablet, desktop
- Pristupačnost: kontrast, fokus, aria oznake
- Loading skeletoni i mikro-interakcije (već imaš skeleton za listu oglasa)
- Dark theme – već imaš; opciono light theme toggle
- Stranica “Moji oglasi” – trenutno placeholder; dovršiti listu, akcije (uredi, obriši, status)
- Stranica pojedinačnog oglasa – galerija, CTA, dio za poruke
- Forme (objavi oglas, registracija) – jasne poruke o greškama, validacija u realnom vremenu

---

## 5. PRIORITIZIRANA LISTA (šta uraditi redom)

### Faza A – Security i stabilnost (prije svega) ✅
1. ✅ **JWT_SECRET** – na startu u produkciji aplikacija izlazi ako je prazan ili default.
2. ✅ **Sanitizacija** – `sanitizeHTML` korišten za naslov i opis u `src/routes/ads.ts` pri kreiranju oglasa.
3. ✅ Provjera na startu (production + slab JWT_SECRET → exit).

### Faza B – SEO i URL-ovi ✅
4. ✅ **BrowserRouter** – prelazak sa HashRouter; URL-ovi su sada npr. `/marketplace`, `/oglas/slug`.
5. ✅ **Dinamički title** – `document.title` se mijenja po ruti (početna, marketplace, prijava, itd.).
6. ✅ **Open Graph i Twitter** – tagovi u `index.html` za dijeljenje linkova.

### Faza C – Backend funkcionalnost ✅
7. ✅ **GET /api/ads/:slug** – jedan oglas po slug-u, uvećanje `pogledi`, uključen vlasnik.
8. ✅ **Notifications** – model `Notification`, GET lista i POST mark-read.
9. ✅ **Favoriti** – model `UserFavorite`, GET lista ID-eva, POST dodaj, DELETE ukloni; rute pod `/api/favorites`.
10. ✅ **Paginacija** – `GET /api/ads` vraća `{ ads, total, page, limit }`; podržani query parametri `page` i `limit`.

### Faza D – Dizajn i nove stvari
11. Dovršiti “Moji oglasi”, pojedinačni oglas, forme.
12. Sve što želiš dodati (nove kategorije, filteri, poruke, itd.) – to možemo planirati posebno.

---

## 6. BRZI CHECKLIST PRIJE PRODUKCIJE

- [ ] `JWT_SECRET` u produkciji jak i nasumičan
- [ ] `DATABASE_URL` tačan (npr. Supabase)
- [ ] `FRONTEND_URL` i `PUBLIC_SITE_URL` postavljeni na pravi domen
- [ ] `NODE_ENV=production`
- [ ] Migracije pokrenute (`npx prisma migrate deploy`)
- [ ] HTTPS na serveru
- [ ] CORS origin = samo tvoj frontend domen

Kada odlučiš šta želiš prvo (npr. security + sanitizacija, pa SEO, pa dizajn), reci pa možemo krenuti redom po ovom planu.
