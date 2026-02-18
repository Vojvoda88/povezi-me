/**
 * Učitaj .env prije bilo kojeg drugog koda.
 * Ovaj modul mora biti prvi import u index.ts.
 */
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
