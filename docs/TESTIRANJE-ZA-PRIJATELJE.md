# Poveži.ME – Uputstvo za testiranje (za prijatelje)

Kratko uputstvo da nekoliko ljudi može provjeriti aplikaciju.

---

## Ako ti vlasnik pošalje samo link

Ako ti pošalje **samo link** (npr. `https://povezi-me.vercel.app`):

- Otvori ga u browseru (Chrome, Firefox, Edge, Safari).
- Ništa ne instaliraš – samo klikneš i koristiš sajt.
- Checklist šta da testiraš je u **odjeljku 4** ispod (filteri, prijava, oglasi, mobilni prikaz, itd.). Ako nešto ne radi, napiši vlasniku šta si uradio i šta se desilo (po mogućnosti sa screenshotom).

Ako ti vlasnik da i **kod** da pokreneš lokalno na svom računaru, slijedi korake ispod.

---

## 1. Kako dobiti projekat (za lokalno pokretanje)

**Opcija A – GitHub (preporučeno)**  
- Vlasnik projekta te doda kao **collaborator** na privatni repo ili ti da pristup.  
- Kloniraš:  
  `git clone https://github.com/KORISNICKO_IME/povezi-me.git`  
  (ili SSH link ako ga koristiš)  
- Zatim: `cd povezi-me`

**Opcija B – ZIP**  
- Vlasnik projekta napravi arhivu projekta (bez `node_modules` i bez `.env`) i pošalje je (WeTransfer, Drive, itd.).  
- Raspakuješ u neki folder i u terminalu uđeš u taj folder:  
  `cd putanja\do\Sve-novo`

---

## 2. Šta ti treba na računaru

- **Node.js 18 ili noviji**  
  Preuzmi: https://nodejs.org (LTS verzija).  
  Provjera: otvori terminal (PowerShell ili CMD) i ukucaj:  
  `node -v`  
  Trebalo bi da vidiš npr. `v20.x.x` ili `v18.x.x`.

- **Git** (samo ako koristiš Opciju A)  
  Preuzmi: https://git-scm.com

---

## 3. Pokretanje projekta (korak po korak)

U terminalu, u folderu gdje je projekat:

**Korak 1 – instalacija paketa**  
```bash
npm install
```  
(može potrajati minut-dva)

**Korak 2 – .env fajl**  
- Vlasnik projekta će ti **poslati** fajl `.env` na siguran način (npr. privatan chat, ne u repo).  
- Stavi taj `.env` u **isti folder** gdje je projekat (tamo gdje je i `package.json`).  
- Ako nemaš `.env`, kopiraj primjer:  
  - Windows: `copy .env.example .env`  
  - Mac/Linux: `cp .env.example .env`  
  Zatim vlasnik mora da ti da vrijednosti (npr. za bazu i Google prijavu) ili da ti pošalje gotov `.env` za testiranje.

**Korak 3 – baza (samo ako vlasnik kaže da treba)**  
Ako koristite zajedničku bazu, obično **ne treba** ništa. Ako vlasnik kaže da pokreneš migracije:

```bash
npm run db:migrate
npm run db:generate
```

**Korak 4 – pokretanje**  
```bash
npm run dev
```

- Trebalo bi da na kraju piše nešto kao:  
  - Backend: `http://localhost:3001`  
  - Frontend: `http://localhost:5173`  
- Otvori **preglednik** i idi na: **http://localhost:5173**  
- Ako stranica ne učitava, sačekaj 10–15 sekundi (prvo se podiže backend, pa frontend).

**Zaustavljanje:** u terminalu pritisni **Ctrl+C**.

---

## 4. Šta da provjeriš (checklist)

Možeš označivati dok testiraš:

- [ ] **Početna stranica** – učitava se lista oglasa, vidiš kategorije i pretragu.
- [ ] **Filteri** – Tip (Ponuda/Potražnja), Sortiraj (najniža/najviša cijena), Cijena (Od–Do), Lokacija – mijenjaju listu kako očekuješ.
- [ ] **Cijena (Od/Do)** – upisivanje brojeva ne izbacuje iz polja; nakon klika van polja sve radi.
- [ ] **Klik na oglas** – otvara se stranica oglasa sa slikama, opisom, cijenom, kontakt dugmićima.
- [ ] **Prijava (Google)** – “Nastavi sa Google-om” vodi na Google i nakon prijave te vrati na sajt (ako je podešeno).
- [ ] **Bez prijave** – pregled oglasa, kategorija i filtera radi.
- [ ] **Sa prijavom** – Moji oglasi, Sačuvano (favoriti), Obavještenja, Poruke (ako su uključene) – sve se otvara i ne vraća nepoznate greške.
- [ ] **Objavi oglas** – forma se otvara, možeš unijeti naslov, cijenu, slike (ako je upload podešen), objava prolazi ili jasno prijavi grešku.
- [ ] **Mobilni prikaz** – na telefonu ili uskim prozorom preglednika donja traka (Traži, Poruke, Dodaj oglas, Sačuvano, Profil) radi i vodi na prave stranice.
- [ ] **Pravila / Privatnost** – linkovi u podnožju stranice vode na odgovarajuće stranice.
- [ ] **Tema (svijetla/tamna)** – dugme u headeru mijenja izgled bez pucanja stranice.

Ako nešto ne radi (npr. “500 error”, prazna stranica, dugme ne reaguje), zabilježi:
- **Šta si uradio** (korak po korak).
- **Šta se desilo** (poruka, prazan ekran, itd.).
- **Browser** (Chrome, Firefox, Edge…) i da li je na mobu ili desktopu.
- Ako možeš, **screenshot** ili poruku greške iz konzole (F12 → Console).

To možeš poslati vlasniku projekta (npr. u grupu ili na mail).

---

## 5. Česte stvari

- **“Cannot find module” ili “npm run dev ne radi”**  
  Ponovo uradi: `npm install` pa `npm run dev`. Ako i dalje ne ide, provjeri da li je Node 18+: `node -v`.

- **Stranica prazna ili “This site can’t be reached”**  
  Provjeri da li u terminalu piše da je backend pokrenut na 3001 i frontend na 5173. Otvori **http://localhost:5173** (ne 3001). Ako koristiš drugi port (npr. 5174), otvori onaj koji Vite ispiše.

- **Prijava sa Google-om ne radi**  
  To mora da podesi vlasnik (Google Cloud Console, redirect URI). Ti samo možeš prijaviti da ne radi; za test možeš ostati neprijavljen i provjeriti ostale stvari.

- **Upload slika ne radi**  
  Ovisi o Supabase (ili drugom storage-u) u `.env`. To također podesi vlasnik; ti možeš samo provjeriti da li forma za oglas uopšte radi i da li se prikaže jasna greška.

---

## 6. Kako vratiti informacije vlasniku

Kratko napiši:

- **Šta si testirao** (npr. “filteri, prijava, objava oglasa”).
- **Šta radi dobro** (npr. “filter po cijeni, mobilni izgled”).
- **Šta ne radi ili je zbunjujuće** (npr. “nakon klika na Sortiraj ništa se ne mijenja” – ako je to već popravljeno, vlasnik će reći).
- **Browser i uređaj** (Chrome na Windowsu, Safari na iPhone-u, itd.).

Screenshot ili snimak ekrana pomaže, posebno za greške.

---

Ako vlasnik projekta da drugačije instrukcije (npr. drugi URL, druga baza), pridržavaj se njih. Ovo uputstvo služi da svi testiraju **istu verziju** i da imaju **jednostavan checklist** šta sve provjeriti.
