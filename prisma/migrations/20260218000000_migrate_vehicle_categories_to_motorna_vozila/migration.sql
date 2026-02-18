-- Migracija postojećih oglasa: kategorije Automobili, Motocikli, Kamioni, Traktori, Četvorotočkaši
-- postaju glavna kategorija "motorna_vozila" s potkategorijom = stara kategorija.
-- Cilj: klik na "Motorna vozila" prikazuje oglase (ne prazno).

-- Prvo prebaci staru kategoriju u potkategoriju, zatim postavi glavnu na motorna_vozila
UPDATE "Ad"
SET
  "potkategorija" = "kategorija",
  "kategorija" = 'motorna_vozila'
WHERE "kategorija" IN ('automobili', 'motocikli', 'kamioni', 'traktori', 'cetvorotockasi');
