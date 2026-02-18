-- Postavi prvog admin korisnika
-- Izvrši u Supabase Dashboard → SQL Editor
-- Zamijeni 'tvoj@email.com' s tvojim emailom (prvo se registruj na aplikaciji!)

UPDATE "User" SET role = 'ADMIN' WHERE email = 'tvoj@email.com';

-- Provjeri:
-- SELECT id, ime, email, role FROM "User" WHERE role = 'ADMIN';
