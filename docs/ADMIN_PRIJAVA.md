# Kako se ulogovati kao administrator

## Način 1: Prijava putem glavne stranice (Google)

1. **Postavi svoj nalog kao admin u bazi**  
   U PostgreSQL bazi izvrši (zamijeni `tvoj@email.com` s emailom koji koristiš za Google prijavu):
   ```sql
   UPDATE "User" SET role = 'ADMIN' WHERE email = 'tvoj@email.com';
   ```
   Ako koristiš Prisma Studio: otvori `npx prisma studio`, tabela **User** → pronađi svoj red (email) → u polju **role** stavi **ADMIN** i snimi.

2. **Prijavi se na sajt**  
   Otvori glavnu stranicu (npr. http://localhost:5173), klikni **Prijavi se** i prijavi se sa **Google-om** (isti email kao u koraku 1).

3. **Uđi u Admin**  
   Nakon prijave u headeru će se pojaviti dugme **Admin**. Klikni na njega da odeš na `/admin` (Dashboard).  
   Ako ne vidiš dugme, provjeri da je u bazi za tvoj email zaista `role = 'ADMIN'`.

---

## Način 2: Direktno na /admin (email + lozinka)

Ako imaš **klasičan nalog** (email + lozinka, npr. iz stare registracije):

1. U bazi postavi tog korisnika kao admin (korak 1 iznad).
2. Otvori **http://localhost:5173/admin** – bićeš preusmjeren na **/admin/login**.
3. Unesi **email** i **lozinka** tog naloga i klikni **Prijavi se**.

Napomena: ako koristiš samo Google prijavu, nemaj lozinku za taj email u bazi; u tom slučaju koristi **Način 1**.

---

## Šta možeš raditi u Admin panelu

- **Dashboard** – pregled broja korisnika, oglasa, prihoda itd.
- **Korisnici** – lista, pretraga, blokiranje, brisanje, promjena uloge.
- **Oglasi** – lista svih oglasa, filter po statusu (Na čekanju, Aktivni, Prodani, Istekli), deaktivacija, promocija, brisanje.
- **Na čekanju** – posebna stranica samo za oglase sa statusom „Na čekanju“. Odobri (oglas postaje aktivan) ili Odbij (brisanje). Kada neko objavi novi oglas, on ide na čekanju i **tebi kao adminu stiže obavještenje u zvonce** (ikona zvona u headeru). Klik na to obavještenje vodi na **Admin → Na čekanju**.
- **Prijave** – prijave korisnika na oglase (rješavanje).
- **Plaćanja** – pregled plaćanja i promocija.
