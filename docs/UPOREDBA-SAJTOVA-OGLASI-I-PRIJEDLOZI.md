# Usporedba Poveži.ME sa ~50 vodećih oglasnih sajtova – nedostaci i prijedlozi

Lista vodećih oglasnih/marketplace platformi širom svijeta (izvor: Statista, AIM Group, SimilarWeb, industrijske analize) i šta možeš dodati na svoj sajt.

---

## 50+ vodećih oglasnih sajtova (kratka lista)

| # | Sajt | Regija | Fokus |
|---|-----|--------|--------|
| 1 | **Avito.ru** | Rusija | Opšti (najposjećeniji na svijetu) |
| 2 | **Leboncoin.fr** | Francuska | Opšti |
| 3 | **Craigslist.org** | SAD, globalno | Opšti, usluge, nekretnine, poslovi |
| 4 | **Sahibinden.com** | Turska | Opšti, vozila |
| 5 | **OLX** (olx.pl, olx.ua, olx.com.br, itd.) | Globalno (emerging) | Opšti |
| 6 | **Subito.it** | Italija | Opšti |
| 7 | **Otomoto.pl** | Poljska | Vozila |
| 8 | **Facebook Marketplace** | Globalno | Opšti, lokalno |
| 9 | **Gumtree.com** (UK), **Gumtree.com.au** | UK, Australija | Opšti |
| 10 | **Kijiji.ca** | Kanada | Opšti |
| 11 | **Mobile.de** | Njemačka / Evropa | Vozila |
| 12 | **AutoTrader** (UK, USA) | UK, SAD | Vozila |
| 13 | **Finn.no** | Norveška | Opšti |
| 14 | **Blocket.se** | Švedska | Opšti |
| 15 | **2dehands.be** | Belgija | Opšti |
| 16 | **Milanuncios.com** | Španija | Opšti |
| 17 | **Wallapop** | Španija | Second-hand, mobilna prva |
| 18 | **eBay Kleinanzeigen** | Njemačka | Opšti |
| 19 | **Marktplaats.nl** | Holandija | Opšti |
| 20 | **Quikr** | Indija | Opšti |
| 21 | **OfferUp** | SAD | Opšti, mobilna prva |
| 22 | **Letgo** (sada OfferUp) | SAD | Opšti |
| 23 | **Mercari** | SAD, Japan | Second-hand |
| 24 | **Poshmark** | SAD | Moda, second-hand |
| 25 | **Vinted** | Evropa, SAD | Odjeća, second-hand |
| 26 | **Depop** | UK, globalno | Moda, vintage |
| 27 | **Backpage** (historijski) | SAD | – |
| 28 | **ClassifiedAds.com** | SAD | Opšti |
| 29 | **Oodle** | SAD | Opšti |
| 30 | **Trademe.co.nz** | Novi Zeland | Opšti |
| 31 | **Carousell** | Azija | Opšti, chat-first |
| 32 | **Mudah.my** | Malezija | Opšti |
| 33 | **Tokopedia** (marketplace) | Indonezija | Opšti + trgovina |
| 34 | **Shopee** (classifieds dio) | Jugoistočna Azija | Opšti + trgovina |
| 35 | **Jiji.ng** | Nigerija | Opšti |
| 36 | **Tonaton.com** | Gana | Opšti |
| 37 | **Kapruka.com** | Šri Lanka | Opšti |
| 38 | **Autodiler.me** | Crna Gora | Vozila, usluge |
| 39 | **Diler.me** | Crna Gora / region | Vozila |
| 40 | **Pik.ba** | BiH | Opšti |
| 41 | **KupujemProdajem.com** | Srbija | Opšti |
| 42 | **Njuskalo.hr** | Hrvatska | Opšti |
| 43 | **Bolha.com** | Slovenija | Opšti |
| 44 | **Bazar.hr** | Hrvatska | Opšti |
| 45 | **Scout24** (ImmobilienScout24, AutoScout24) | Evropa | Nekretnine, vozila |
| 46 | **Rightmove** | UK | Nekretnine |
| 47 | **Zillow** | SAD | Nekretnine |
| 48 | **Indeed** | Globalno | Poslovi |
| 49 | **LinkedIn Jobs** | Globalno | Poslovi |
| 50 | **Kaspi.kz** (super-app) | Kazahstan | Oglasi + plaćanja + dostava |

---

## Šta Poveži.ME već ima (iz koda)

- **Kategorije i podkategorije** (Motorna vozila, Nekretnine, Tehnika, Usluge, itd.) + filteri po kategoriji
- **Napredni filteri** za vozila (marka, model, godište, cijena, lokacija, gorivo, itd.) i za nekretnine
- **Pretraga** (full-text / parametri)
- **Omiljeno** (favorites) – čuvanje oglasa
- **Plaćanja (Stripe)** – istaknuti oglasi (featured), webhook, success stranica
- **Prijava/registracija** – JWT, ban, captcha (reCAPTCHA)
- **Objava oglasa** – slike, detalji po kategoriji, vozila (marka/model iz kataloga), nekretnine (tip, sobe, sprat)
- **Admin panel** – korisnici, oglasi, reportovi, ban, plaćanja, VehicleMake/VehicleModel CRUD
- **Prijava oglasa (Report)** – korisnici mogu prijaviti oglas, admin zatvara/obrađuje
- **Notifikacije** – backend podrška
- **Chat** – uključen (Socket.IO, poruke, konverzacije, link "Poruka prodavcu" na oglasu)
- **SEO** – meta title/description, og:title, og:description, og:image
- **Duplikati** – dedupeKey (fingerprint) za izbjegavanje duplikata
- **Pogledi** – brojač + throttling po korisniku/IP
- **Istek oglasa** – expiresAt, lastActivityAt, automatsko brisanje neaktivnih
- **Tema** – dark/light (midnight/light)
- **Responsive** – mobilni izgled, filteri, padajući meniji

---

## Nedostaci u odnosu na vodeće sajtove (šta implementirati)

### 1. **Poruke / Chat**
- **Stanje:** Kod postoji, ali je isključen.
- **Šta rade drugi:** Leboncoin, OLX, Avito, Facebook Marketplace, Carousell – svi imaju **integrisane poruke** između kupca i prodavatelja (često bez odmah otkrivanja broja).
- **Prijedlog:** Uključiti chat (`SHOW_CHAT = true`) i testirati; eventualno “Kontakt preko poruke” kao primarni CTA umjesto samo telefona.

### 2. **Mapa i lokacija**
- **Stanje:** Lokacija je tek kao string (grad), nema koordinata ni mape.
- **Šta rade drugi:** Craigslist, Leboncoin, OLX, Avito – **pretraga na mapi**, “oglasi u blizini”, radius (npr. 10 km).
- **Prijedlog:**  
  - Opciono polje za koordinate ili “odabir na mapi” pri objavi.  
  - Stranica “Pretraga na mapi” (npr. Leaflet/Mapbox) sa pinovima oglasa.  
  - Filter “udaljenost od mene” (uz dozvolu za geolokaciju).

### 3. **Verifikacija korisnika / “Provjereni prodavatelj”**
- **Stanje:** Nema badge-a “provjeren”, verifikacija telefona/emaila nije istaknuta.
- **Šta rade drugi:** AutoTrader (verifikacija preko Stripea), Avito, OLX – “verificirani prodavatelj”, “potvrđen telefon”.
- **Prijedlog:**  
  - Badge “Potvrđen email” / “Potvrđen telefon” na oglasu i profilu.  
  - Opciono “Verificiran prodavatelj” (ručno od strane admina ili nakon uspješne transakcije).

### 4. **Sigurna plaćanja / Escrow**
- **Stanje:** Stripe samo za istaknute oglase, nema plaćanja za sam proizvod.
- **Šta rade drugi:** Facebook Marketplace, Vinted, Carousell – opcija **plaćanja unutar platforme** (kupac plati, novac se drži dok kupac ne potvrdi primitak).
- **Prijedlog:**  
  - Opciono “Plaćaj putem sajta” (Stripe) – escrow-style: novac se oslobodi prodavatelju nakon potvrde ili isteka roka.  
  - Jasno označiti “Sigurna kupovina” gdje je to dostupno.

### 5. **Recenzije i ocjene**
- **Stanje:** U tipovima postoji `Rating`, ali nije vidljivo da se koristi u flowu.
- **Šta rade drugi:** Avito, OLX, eBay, Facebook – **ocjene prodavatelja** nakon transakcije.
- **Prijedlog:**  
  - Nakon završene razmjene (ručno “prodano” ili putem poruke) – pitanje “Ocijenite prodavatelja” (1–5 zvjezdica + komentar).  
  - Prikaz prosjeka i broja recenzija na profilu i na oglasu.

### 6. **Saved search / Upozorenja**
- **Stanje:** Nema.
- **Šta rade drugi:** OLX, Mobile.de, AutoTrader – “Spremi pretragu”, “Obavijesti me kad se pojavi novi oglas koji odgovara kriterijima”.
- **Prijedlog:**  
  - Za prijavljene korisnike: “Spremi ovu pretragu” (naziv + trenutni query).  
  - Email ili notifikacija u aplikaciji kada se objavi novi oglas koji odgovara saved searchu.

### 7. **Dijeljenje na društvene mreže**
- **Stanje:** Nije provjeravano u detalj; postoji ikona Share2.
- **Šta rade drugi:** Svi veći – “Podijeli na Facebook / WhatsApp / Viber”.
- **Prijedlog:**  
  - Native share (Web Share API) na mobilnom.  
  - Dugmad: Kopiraj link, Share na Facebook, WhatsApp (wa.me sa tekstom), Viber.

### 8. **“Slični oglasi” / “Možda vas zanima”**
- **Stanje:** Nema.
- **Šta rade drugi:** Avito, Leboncoin, OLX – na stranici oglasa “Slični oglasi” (ista kategorija, slična cijena/lokacija).
- **Prijedlog:**  
  - Na dnu stranice oglasa: “Slični oglasi” – isti kategorija/podkategorija, sličan raspon cijene, eventualno ista lokacija.

### 9. **Istorija cijena / Trend cijene**
- **Stanje:** Nema.
- **Šta rade drugi:** Nekretnine (Zillow, Rightmove), ponekad vozila – “cijena u posljednjih 30 dana”, “prosječna cijena u regiji”.
- **Prijedlog:**  
  - Opciono čuvanje “snapshot” cijene pri promjeni oglasa ili mjesečno, pa “Cijena prije X dana”.  
  - Za nekretnine/vozila: “Slični oglasi u prosjeku X €”.

### 10. **WhatsApp / Viber “Kontakt” dugme**
- **Stanje:** Samo telefon (i eventualno poruke kad je chat uključen).
- **Šta rade drugi:** OLX, KupujemProdajem, Diler – direktan link “Pošalji poruku na WhatsApp” (pre-filled tekst).
- **Prijedlog:**  
  - Dugme “Kontaktiraj na WhatsApp” – link `https://wa.me/382...?text=...` sa naslovom oglasa.  
  - Opciono i Viber (viber://contact?number=...).

### 11. **Napredna pretraga (full-text, fuzzy)**
- **Stanje:** Pretraga postoji; nije jasno da li je full-text na naslovu/opisu ili i normalizacija (titleNorm).
- **Šta rade drugi:** Većina – pretraga po naslovu, opisu, tagovima; ispravljanje typo-a.
- **Prijedlog:**  
  - Full-text indeks (PostgreSQL `tsvector` ili Elasticsearch) na naslov + opis.  
  - Normalizacija upita (bez dijakritika, trim) da se poklapa sa `titleNorm`.  
  - Opciono “Did you mean?” ako nema rezultata.

### 12. **Filtriranje i sortiranje**
- **Stanje:** Filteri po kategoriji, vozila, cijena, lokacija, itd.; sortiranje vjerovatno po datumu/cijeni.
- **Šta rade drugi:** “Sort by: Najnovije / Cijena uzlazno / Cijena silazno / Udaljenost / Relevantnost”.
- **Prijedlog:**  
  - Eksplicitno “Sortiraj po” u UI (najnoviji, cijena ↑/↓, istaknuti prvo).  
  - Za mapu: sort po udaljenosti.

### 13. **Mobilna aplikacija / PWA**
- **Stanje:** Samo web (responsive).
- **Šta rade drugi:** OLX, Avito, Facebook – native app ili PWA (push, “Add to home screen”).
- **Prijedlog:**  
  - PWA: manifest.json, service worker (offline stranica liste), push notifikacije za saved search.  
  - Kasnije: React Native / Capacitor za native app ako treba.

### 14. **Višejezičnost (i18n)**
- **Stanje:** Tekst na jednom jeziku (srpski/hrvatski/crnogorski).
- **Šta rade drugi:** OLX, Mobile.de – više jezika (npr. sr, en, možda ru za turiste).
- **Prijedlog:**  
  - Bar EN za stranu publiku (turisti, dijaspora).  
  - Struktura za i18n (npr. react-i18next) i JSON fajlovi po jezicima.

### 15. **Statistike za prodavatelja**
- **Stanje:** Pogledi na oglasu; nije jasno da li prodavatelj vidi “Pregledi ovog oglasa”.
- **Šta rade drugi:** Avito, OLX – “Koliko pregleda”, “Koliko kontakata”, “Vidljivost u pretrazi”.
- **Prijedlog:**  
  - U “Moji oglasi”: pregledi po oglasu, možda graf “pregledi u posljednjih 7 dana”.  
  - “Vaš oglas se pojavio u pretrazi X puta”.

### 16. **“Bump” / Podizanje oglasa**
- **Stanje:** lastActivityAt i “bump” se spominju u kontekstu automatskog brisanja.
- **Šta rade drugi:** Craigslist, OLX – “Podigni oglas na vrh” (jednom dnevno ili uz malu naknadu).
- **Prijedlog:**  
  - “Podigni oglas” (bump) – ažurira lastActivityAt ili posebno “bumpedAt”; sortiranje “Najnovije aktivnosti” uključuje bump.  
  - Opciono ograničenje (npr. 1x sedmično besplatno) ili uz simboličnu naknadu.

### 17. **RSS / Export za oglase**
- **Stanje:** Nema.
- **Šta rade drugi:** Craigslist, neki regionalni – RSS feed za pretragu.
- **Prijedlog:**  
  - RSS link za trenutnu pretragu (npr. /marketplace?q=... → /api/ads/rss?q=...).  
  - Korisno za power usere i agregatore.

### 18. **Moderacija sadržaja (AI / automatska)**
- **Stanje:** Ručna moderacija (status NA_CEKANJU → AKTIVAN); captcha na registraciji/oglasu.
- **Šta rade drugi:** Veliki portali – automatsko skeniranje slika i teksta (scam, zabranjeni sadržaj).
- **Prijedlog:**  
  - Opciono pozivanje eksternog API-ja za mod teksta (npr. OpenAI Moderation ili slično).  
  - Slike: provjera da nisu NSFW (npr. cloud moderation API).  
  - Automatsko odbijanje ili “flag for review” umjesto odmah objave.

### 19. **Zabrana ponovnog objavljivanja (cooldown)**
- **Stanje:** Dedupe za duplikate; nije jasno da li postoji cooldown “isti korisnik ne može isti oglas ponovo objaviti u X dana”.
- **Šta rade drugi:** Smanjuju spam i “bump” preko novog oglasa.
- **Prijedlog:**  
  - Pravilo: nakon brisanja ili isteka, isti korisnik ne može oglas sa istim dedupeKey (ili naslovom) objaviti npr. 7 dana.

### 20. **“Prodano” / “Rezervisano” status**
- **Stanje:** Statusi: NA_CEKANJU, AKTIVAN, PRODAN, ISTEKAO.
- **Šta rade drugi:** Svi – “Označi kao prodano” (sakriva ili filtrira iz pretrage, ostaje za historiju).
- **Prijedlog:**  
  - Jasno dugme “Označi kao prodano” u “Moji oglasi” – postavlja status PRODAN.  
  - Opciono “Rezervisano” (privremeno skriven ili s badge-om).

---

## Prioritetna lista (šta uraditi prvo)

| Prioritet | Šta | Zašto |
|-----------|-----|--------|
| 1 | **Uključiti chat** | Osnovna komunikacija kupac–prodavatelj kao na svim velikim sajtovima. |
| 2 | **WhatsApp / Viber dugme** | Brza implementacija, većina korisnika u regionu koristi WhatsApp. |
| 3 | **“Slični oglasi”** | Povećava vrijeme na sajtu i šansu za klik. |
| 4 | **Saved search + notifikacije** | Povećava povratak korisnika i engagement. |
| 5 | **Mapa (prikaz na mapi)** | Diferencijator u odnosu na lokalne konkurente; očekivano na velikim portalima. |
| 6 | **Recenzije/ocjene prodavatelja** | Povećava povjerenje. |
| 7 | **“Sortiraj po” u UI** | Jednostavno, korisnici to očekuju. |
| 8 | **Statistike za prodavatelja** | Motivira prodavatelje da ostaju na platformi. |
| 9 | **Bump oglasa** | Dodatna monetizacija ili engagement. |
| 10 | **PWA (manifest + service worker)** | “Dodaj na početni ekran”, eventualno push. |

---

## Sažetak

- **Poveži.ME** već ima solidnu bazu: kategorije, napredne filtere (posebno za vozila), plaćanja za istaknute oglase, reportove, admin, SEO, dedupe, poglede.
- Najveći nedostaci u odnosu na **50+ vodećih sajtova** su: **aktiviran chat**, **mapa**, **verifikacija korisnika**, **recenzije**, **saved search/upozorenja**, **WhatsApp/Viber CTA**, **slični oglasi**, **jasno sortiranje**, **escrow/plaćanje unutar sajta** (opciono), **PWA**.
- Ako implementiraš redom: chat → WhatsApp → slični oglasi → saved search → mapa → recenzije, bit ćeš vrlo blizu onome što nude veliki globalni i regionalni oglasni portali.
