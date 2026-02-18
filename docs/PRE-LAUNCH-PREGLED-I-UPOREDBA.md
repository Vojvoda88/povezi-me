# Pre-launch pregled – šta je urađeno i šta ostaje prije hosta i domene

Pregled u odnosu na vodeće oglasne sajtove (OLX, Avito, AutoDiler, KupujemProdajem, itd.) i šta je **obavezno** vs **opciono** prije kupovine hosta i domene.

---

## ✅ Šta je urađeno (spremno za launch)

| Funkcionalnost | Status | Napomena |
|----------------|--------|----------|
| **Sortiraj po** (najnoviji, cijena ↑/↓) | ✅ | UI dropdown, backend podržava |
| **WhatsApp / Viber dugmad** na oglasu | ✅ | Prefilled tekst, ikone/stil |
| **Slični oglasi** na stranici oglasa | ✅ | API `/ads/similar/:slug`, do 8 kartica |
| **Chat (poruke)** | ✅ | `SHOW_CHAT = true`, link "Poruka prodavcu" |
| **Saved search + notifikacije** | ✅ | Spremi pretragu, obavijest kad novi oglas odgovara |
| **Performanse slika** | ✅ | Proxy s `?w=400`, thumbnails, lazy load, virtualizacija 80+, preconnect |
| Kategorije, filteri (vozila, nekretnine, itd.) | ✅ | Katalog marki/modela, top 10 popularnih |
| Objava oglasa, slike, Stripe (istaknuti) | ✅ | Upload, thumb + main WebP |
| Prijava, registracija, JWT, ban | ✅ | Google/Facebook, captcha |
| Admin panel, reportovi, moderacija | ✅ | Oglasi na čekanju, ban, plaćanja |
| SEO (meta, og:image) | ✅ | Po stranici |
| Favoriti, notifikacije (in-app) | ✅ | |
| Responsive, dark/light tema | ✅ | |
| Pravila, privatnost (stranice) | ✅ | |

U odnosu na **prioritetnu listu** iz uporedbe sa 50+ sajtova, **sve prve 4 stavke + sortiranje** su implementirane. To je dovoljno da sajt izgleda i ponaša se kao ozbiljan oglasni portal.

---

## 🔶 Preporučeno prije / odmah nakon kupovine hosta

Ovo nije blokira za kupovinu domene i hosta, ali je pametno imati na umu.

### 1. **Produkcijski env i sigurnost**
- [ ] `.env` na serveru: `NODE_ENV=production`, `DATABASE_URL`, `JWT_SECRET`, `STRIPE_*`, `SUPABASE_*`, `VITE_API_URL` (frontend build)
- [ ] Baza: migracije pokrenute (`npx prisma migrate deploy`), seed ako treba
- [ ] HTTPS i domen (Let's Encrypt ili paket od hosta)
- [ ] `VITE_API_URL` pri build-u frontenda da pokazuje na tvoj API (npr. `https://api.povezi.me` ili `https://tvoj-domen.me/api`)

### 2. **Stripe webhook u produkciji**
- [ ] Webhook URL u Stripe dashboardu postavljen na produkcijski URL (npr. `https://api.tvoj-domen.me/api/payments/webhook`)
- [ ] Testirati plaćanje za istaknuti oglas (test kartica) i provjera da oglas postane featured

### 3. **reCAPTCHA / Facebook / Google OAuth**
- [ ] U produkciji: domeni dodati u Google Cloud / Facebook Developer konzoli za OAuth i reCAPTCHA
- [ ] Environment varijable za production keys

### 4. **Email (opciono za start)**
- [ ] Ako koristiš “zaboravljena lozinka” ili email notifikacije: SMTP ili Resend/ SendGrid konfigurisan za produkcijski domen

---

## 📋 Šta može pričekati (nakon lansiranja)

Usporedba sa “najboljim” sajtovima – ovo nije nužno za prvi dan, može doći u narednim iteracijama.

| Funkcionalnost | Zašto može pričekati |
|----------------|----------------------|
| **Mapa** (pinovi oglasa, pretraga po radijusu) | Zahtijeva koordinate, veća implementacija; mnogi regionalni sajtovi kreću bez mape. |
| **Recenzije/ocjene prodavatelja** | Povećava povjerenje, ali nije blokira za launch. |
| **Verifikacija “Provjereni prodavatelj”** | Badge može doći nakon što imaš više korisnika i transakcija. |
| **Statistike za prodavatelja** (pregledi, graf) | Lijepo za retention, nije obavezno prvog dana. |
| **Bump oglasa** | Dodatna monetizacija/engagement, može u fazi 2. |
| **PWA** (manifest, service worker, “Dodaj na početni ekran”) | Korisno za mobilne; web radi i bez toga. |
| **Višejezičnost (i18n)** | EN za turiste/dijasporu može nakon što se potvrdi potreba. |
| **Escrow / plaćanje unutar sajta** | Veliki posao; Stripe za istaknute je dovoljan za start. |
| **RSS feed** | Za power usere; nije tipičan za prvi launch. |
| **AI moderacija** | Ručna moderacija (NA_CEKANJU → AKTIVAN) je prihvatljiva na početku. |

---

## Kratka uporedba sa “najboljim” sajtovima

| Kriterij | OLX / Avito / AutoDiler | Poveži.ME sada |
|----------|-------------------------|-----------------|
| Kategorije i filteri | ✅ | ✅ |
| Sortiranje (datum, cijena) | ✅ | ✅ |
| Chat / poruke | ✅ | ✅ |
| WhatsApp / Viber CTA | ✅ | ✅ |
| Slični oglasi | ✅ | ✅ |
| Saved search + notifikacije | ✅ | ✅ |
| Thumbnails, brzo učitavanje slika | ✅ | ✅ (proxy w=400, lazy, virtualizacija) |
| Mapa | Često ✅ | ❌ (planirano kasnije) |
| Recenzije prodavatelja | Često ✅ | ❌ (Rating u kodu, nije u flowu) |
| Verificirani prodavatelj | Često ✅ | ❌ |
| PWA / mobilna app | Često ✅ | ❌ (samo responsive) |
| Escrow plaćanje | Neki ✅ | ❌ (samo featured) |

Zaključak: **Za prvi launch si u liniji sa onim što korisnici očekuju** (pretraga, filteri, sort, chat, WhatsApp/Viber, slični oglasi, saved search, brze slike). Mapa, recenzije, PWA i escrow mogu doći u narednim verzijama.

---

## Šta konkretno prekontrolisati prije nego kupiš host i domen

1. **Lokalno / staging**
   - [ ] `npm run dev` – sve radi (lista, filteri, sort, objava oglasa, slike, chat, spremljene pretrage, slični oglasi).
   - [ ] Prijava (Google), objava oglasa, “Pozovi”, WhatsApp/Viber, “Poruka prodavcu”, “Spremi pretragu”, notifikacije.
   - [ ] Admin: odobravanje oglasa, reportovi, ban.

2. **Build i env**
   - [ ] `npm run build` (backend) i `npm run build:frontend` (Vite) prolaze bez grešaka.
   - [ ] Imaš listu env varijabli (npr. iz `.env.example`) i znaš šta ćeš postaviti na produkcijskom serveru.

3. **Baza**
   - [ ] Migracije (uključujući SavedSearch) pokrenute; seed ako ti treba za test podatke.

4. **Domen i host**
   - [ ] Odlučio si strukturu: npr. `povezi.me` za frontend, `api.povezi.me` za backend, ili sve na jednom domenu s reverse proxyjem.
   - [ ] Host podržava Node.js, PostgreSQL (ili imaš managed DB), env varijable i HTTPS.

Ako su gornje tri grupe (lokalno, build/env, baza) u redu, **možeš slobodno kupiti host i domen**. Preporuka: prvo pokreni na jeftinom/staging okruženju, provjeri webhook i OAuth na pravom domenu, pa tek onda “ozbiljan” produkcijski plan ako treba.
