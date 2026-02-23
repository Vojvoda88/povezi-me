# Plan prije pustanja u etar – Poveži.ME

Kompletan izvještaj šta je urađeno, šta nedostaje i u kojim fazama raditi da aplikacija bude kvalitetna i spremna za korisnike.

---

## Šta je već urađeno

- **Auth:** Prijava, registracija, Google OAuth, token, odjava, zaštićene rute.
- **Teme:** Tamno (midnight), svijetlo, toplo; čuvanje u localStorage.
- **Oglasi:** Lista, detalj, favoriti, moji oglasi, filteri po kategoriji (automobili, moto, nekretnine s tipom/spratnošću/kvadraturom), tip oglasa (Prodajem/Tražim).
- **Nekretnine:** Tip nekretnine (stan, kuća, plac, poslovni prostor, garaža, vikendica), tip ponude, **kvadratura (m²)** (jedno polje), broj soba i spratnost uvjetovano, filteri prilagođeni tipu.
- **Mobil:** Responzivan layout, donji meni, „Dodaj oglas” naglašeno, jedna kolona oglasa na malim ekranima, pristup preko mreže (?mobile=1 ili IP:5173).
- **Backend:** Express, Prisma, PostgreSQL (Supabase), rute za auth, oglase (GET lista/po slug-u, GET mine, POST create), favoriti, notifikacije, CORS.
- **Demo:** Ako API ne odgovori, prikazuju se demo oglasi s jasnom porukom.

---

## Faza 1 – Kritično za prvu objavu (bez toga nema prave objave)

| # | Stavka | Status | Opis |
|---|--------|--------|------|
| 1.1 | **Objavi oglas → API** | ✅ | POST /api/ads; osvježavanje liste i preusmjeravanje nakon uspjeha. |
| 1.2 | **Validacija forme** | ✅ | Obavezna polja; prikaz grešaka; backend 400 sa porukama. |
| 1.3 | **Slike** | ✅ | Supabase Storage upload; frontend šalje URL-ove u POST; optimizacija na backendu. |
| 1.4 | **Kontakt na oglasu** | ✅ | API vraća vlasnik.ime/telefon na GET /ads/:slug; prikazuje se na kartici i detalju. |

**Ishod Faze 1:** Korisnik može objaviti oglas koji stvarno završi u bazi; vidi potvrdu ili grešku; lista i detalj rade sa podacima iz API-ja.

---

## Faza 2 – Kvalitet i pouzdanost

| # | Stavka | Status | Opis |
|---|--------|--------|------|
| 2.1 | **Paginacija / „Učitaj još”** | ✅ | GET /api/ads?page=&limit=24; dugme „Učitaj još” učitava sljedeću stranicu i nadovezuje rezultate. |
| 2.2 | **Osvježavanje liste nakon objave** | ✅ | Nakon uspješnog POST poziva poziva se onPublishSuccess() koji radi fetchAds(1, false). |
| 2.3 | **Poruke o greškama** | ✅ | Objava oglasa: prikaz greške iz API-ja, mreža, 401; ostale fetch obrade prema potrebi. |
| 2.4 | **Prikaz detalja nekretnine na karticama i detalju** | ✅ | Na kartici: tip, kvadratura, broj soba, sprat. Na stranici oglasa: sekcija „Specifikacije nekretnine” sa svim poljima. |
| 2.5 | **Trajnost favorita** | — | Favoriti se dohvaćaju/šalju preko API-ja; provjeriti da se broj u headeru ažurira nakon toggle. |

---

## Faza 3 – Slike i mediji ✅

| # | Stavka | Status | Opis |
|---|--------|--------|------|
| 3.1 | **Upload slika** | ✅ | Backend: POST /api/ads/upload (multipart, polje "image"), Supabase Storage, max 5 MB, JPEG/PNG/WebP. Frontend: pri objavi prvo upload svih slika, zatim POST oglasa sa nizom URL-ova. |
| 3.2 | **Pregled i redoslijed** | ✅ | Prva slika = glavna (oznaka "Glavna", obrubljena accent bojom). Dugmad pomjeri lijevo/desno i ukloni; redoslijed se šalje na server. |
| 3.3 | **Optimizacija** | ✅ | Resize na frontendu: slike šire od 1200 px se smanjuju na 1200 px i kompresuju u JPEG (0.85) prije uploada. |

**Postavke za upload:** U Supabase Dashboard → Storage → napravite bucket `ads` (public). U `.env` dodajte `SUPABASE_URL` (npr. https://xxx.supabase.co) i `SUPABASE_SERVICE_KEY` (Service role key iz Project settings → API). Bez toga upload vraća 503 i oglas se može objaviti bez slika.

---

## Faza 4 – Korisničko iskustvo i pristupačnost

| # | Stavka | Opis |
|---|--------|------|
| 4.1 | **Loading stanja** | Na ključnim mjestima (lista oglasa, detalj, objava, prijava) prikazati spinner ili skeleton umjesto praznog ekrana. |
| 4.2 | **Starije osobe** | Već urađeno: naglašeno „Dodaj oglas”, jasne labele. Dodatno: dovoljno veliki tap targeti, kontrast (teme), moguće povećanje fonta. |
| 4.3 | **Mobil: pull-to-refresh** | Na listi oglasa povuci za osvježavanje (opciono). |
| 4.4 | **Prazna stanja** | Kad nema oglasa u kategoriji, nema rezultata filtera ili nema favorita – jasna poruka i CTA (npr. „Objavite prvi oglas”, „Poništi filtere”). |

---

## Faza 5 – Sigurnost i pravni okvir

| # | Stavka | Opis |
|---|--------|------|
| 5.1 | **JWT i refresh** | Provjera da token ističe i da se korisnik odjavi ili refresh token ako postoji. |
| 5.2 | **Sanitizacija** | Backend već koristi sanitizeHTML za naslov/opis; ostala polja (npr. iz details) također ne smiju unositi raw HTML u bazu bez provjere. |
| 5.3 | **Rate limiting** | Backend ima rate limit; provjeriti da je primjenjen i na POST /api/ads i auth rute. |
| 5.4 | **Pravno** | Stranica s pravilima korištenja, politika privatnosti, obavijest o kolačićima ako se koriste; linkovi u footeru. |

---

## Faza 6 – SEO i deploy

| # | Stavka | Opis |
|---|--------|------|
| 6.1 | **Meta i Open Graph** | Dinamički title/description po stranici (npr. naslov oglasa na /oglas/:slug); već postoji nešto u index.html – proširiti za rute. |
| 6.2 | **Deploy** | Frontend (Vite build) na Vercel/Netlify ili slično; backend na Railway/Render ili VPS; postaviti FRONTEND_URL i BACKEND URL / CORS; env varijable u produkciji (JWT_SECRET, DATABASE_URL, itd.). |
| 6.3 | **Domena** | Ako je domena povezi.me, postaviti je na frontend i eventualno API (api.povezi.me ili subpath). |

---

## Redoslijed rada (preporuka)

1. **Faza 1** – Objavi oglas → API, validacija, slike (minimalno: prazan niz + poruka), kontakt. Bez ovoga aplikacija nije „stvarno” u funkciji.
2. **Faza 2** – Paginacija/refetch, poruke grešaka, prikaz nekretnina na karticama, favoriti. Kvalitet i pouzdanost.
3. **Faza 3** – Upload slika. Bez toga oglasi mogu raditi, ali su slabiji.
4. **Faze 4–6** – UX, sigurnost, pravno, SEO, deploy – prema prioritetu i vremenu.

---

## Napomena o logici

- **Kvadratura:** U filteru je jedna kolona „Kvadratura (m²)” s placeholderom „od npr. 50” – logika ostaje „prikaži oglase s kvadraturom ≥ unesena vrijednost”, samo se ne piše „Min.” u labelu.
- Sva nova polja i filteri trebaju imati jasnu logiku: šta se čuva, šta se filtrira i kako se prikazuje korisniku.

---

*Dokument napravljen kao plan prije pustanja u etar. Ažurirati kako se stavke završavaju.*
