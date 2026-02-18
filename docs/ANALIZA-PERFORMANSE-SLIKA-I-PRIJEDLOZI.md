# Analiza performansi: zašto veliki oglasni sajtovi rade brzo i šta uraditi na Poveži.ME

## Kako OLX, Avito, AutoDiler itd. postižu brzinu

### 1. **Slike u listi = uvijek male (thumbnails)**
- U listi oglasa učitavaju **samo thumbnail** (npr. 300–400px širine), nikad punu sliku.
- Format: **WebP** (manji od JPEG-a), na nekim **AVIF** za još manji size.
- Rezultat: lista učitava desetine malih slika (npr. 20–50 KB po slici), ne nekoliko MB.

### 2. **Lazy loading**
- Slike ispod “preloma” ekrana ne učitavaju se odmah – browser ih učitava kad korisnik skroluje.
- `loading="lazy"` (native) ili Intersection Observer.
- Rezultat: prvi ekran se učita brzo, ostalo dolazi postepeno.

### 3. **Responzivne slike (srcset / sizes)**
- Za istu sliku server (ili CDN) nudi više veličina (npr. 200w, 400w, 800w).
- Browser bira veličinu prema veličini prikaza i DPI ekrana.
- Rezultat: mobilni ne povlači 1200px sliku za mali kvadratic.

### 4. **CDN (Content Delivery Network)**
- Slike se serviraju s edge servera blizu korisnika, ne direktno s origin servera.
- Dugo cache (npr. 1 godina) na CDN-u.
- Rezultat: manje kašnjenja, manje opterećenje tvog servera.

### 5. **Virtualizacija liste**
- Kad ima puno oglasa (npr. 100+), u DOM-u se renderuje samo ono što je vidljivo + malo “buffer” redova.
- Rezultat: manje DOM čvorova, manje slika u memoriji, manje zahtjeva odjednom, scroll ostaje tečan.

### 6. **Blur placeholder / skeleton**
- Dok se slika učitava, prikaže se blur ili siva kutija (skeleton).
- Rezultat: korisnik odmah vidi da “nešto dolazi”, manje osjećaj čekanja.

### 7. **Jedan zahtjev po slici, dobar cache**
- Browser i CDN drže slike u cacheu (Cache-Control).
- Svaka slika jednom učitana = dalje iz cachea.
- Rezultat: ponovni posjeti i skrolovanje su brzi.

---

## Šta Poveži.ME već ima (dobro)

| Stvar | Status |
|--------|--------|
| Thumbnails pri uploadu | ✅ Backend pravi 400×400 WebP thumbnail i 1600×1600 WebP glavnu sliku |
| Korištenje thumba u listi | ✅ U listi se koristi `slikeThumbs[0]` (ili fallback na `slike[0]`) |
| Lazy loading | ✅ `loading="lazy"` na slikama |
| Virtualizacija | ✅ Kad ima >200 oglasa, koristi se `react-window` (VirtualList) |
| Cache na proxyju | ✅ `Cache-Control: 24h` na `/api/img` |
| Dimenzije na img | ✅ Na karticama je `width={400}` `height={400}` (manji CLS) |
| fetchPriority | ✅ Na detailu hero ima `fetchPriority="high"`, ostalo `low` |

---

## Šta nedostaje / šta poboljšati

### A. Image proxy ne mijenja veličinu
- **Sada:** Proxy samo prosljeđuje sliku s Supabasea (punu ili thumb). Ako negdje slučajno ide puna URL, učitava se cijela.
- **Kod velikih sajtova:** CDN ili server vraća sliku u traženoj veličini (npr. `?w=400`).
- **Prijedlog:** Uvesti opcione parametre `w` i `h` na `/api/img?url=...&w=400`. Na proxyju (Node + Sharp) smanjiti sliku na tu veličinu i vratiti WebP. Za kartice u listi uvijek zvati s `w=400`.

### B. Lista učitava sve kartice odjednom (bez virtualizacije) do 200 oglasa
- **Sada:** VirtualList samo ako ima >200 oglasa. Tipično 24–50 oglasa = svi u DOM-u, sve slike odmah u lazy load redu.
- **Prijedlog:** Spustiti prag na npr. **80** (ili 50). Iznad toga uključiti virtualizaciju da manje elemenata i slika bude aktivno.

### C. Prvih nekoliko slika u listi mogu biti “prioritetne”
- **Sada:** Sve kartice imaju `fetchPriority="low"`.
- **Prijedlog:** Prvih 4–6 slika u listi staviti `fetchPriority="high"` da browser prije učitava LCP sliku (npr. prvu vidljivu karticu).

### D. Nema srcset za različite veličine
- **Sada:** Uvijek jedna URL po kontekstu (thumb za listu, puna za detail).
- **Prijedlog (kasnije):** Ako proxy podržava `w=`, na kartici moći koristiti `srcSet` s 400w i 800w (za retina), pa browser bira. Manji prioritet od A.

### E. Preconnect na origin slika
- **Sada:** Nema eksplicitnog preconnecta.
- **Prijedlog:** U `<head>` ili u root komponenti dodati `rel="preconnect"` na domenu API-ja (ili Supabase) odakle idu slike, da se konekcija ranije uspostavi.

### F. Thumbnail uvijek korišten u listi
- **Sada:** Mapper i kartica koriste `slikeThumbs[0]` ako postoji. Provjeri da API za listu zaista vraća `thumbUrl` za svaki oglas (već je u LISTING_SELECT).
- **Prijedlog:** Samo provjera u kodu i u mreži (Network tab) da se u listi ne učitavaju full-size URL-ovi.

---

## Redoslijed implementacije

1. **Proxy s parametrima `w`/`h`** – najveći utjecaj: kartice uvijek dobiju malu sliku (npr. 400px), čak i ako se negdje pogrešno proslijedi puna.
2. **Kartice u listi zvati proxy s `w=400`** – u `getProxiedImageUrl(previewSrc, 400)` ili slično, da URL za listu uvijek traži 400px.
3. **Spustiti VIRTUAL_LIST_THRESHOLD na 80** – manje DOM-a i manje konkurentnih zahtjeva kada ima više oglasa.
4. **fetchPriority="high"** za prvih 6 karata u listi – bolji LCP.
5. **Preconnect** na API/Supabase domenu – brže prvo učitavanje slika.
6. (Opciono) **Blur placeholder** – CSS ili mali placeholder dok slika nije loadana, za “premium” osjećaj.

---

## Kratko: zašto njima “malo treba za tolike slike”

- U listi **nikad** ne serviraju punu sliku, uvijek **mali thumbnail** (često WebP).
- **Lazy load** = učitava se samo ono što je na ekranu ili blizu.
- **CDN + dugi cache** = slike se uglavnom serviraju s edgea i iz cachea.
- **Virtualizacija** = i kad ima stotine oglasa, u DOM-u je samo desetak redova.
- **Jedna veličina po kontekstu** (ili srcset) = nema prevelikih slika na malom prikazu.

Ako na Poveži.ME u listi uvijek serviraš thumb (ili proxy s `w=400`), koristiš lazy load i smanjiš prag za virtualizaciju, dobit ćeš znatno sličnije ponašanje: brzo učitavanje i manje “kočenja” čak i s puno oglasa.
