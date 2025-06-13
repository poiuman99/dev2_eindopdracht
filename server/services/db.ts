// server/services/db.ts

import postgres, { Sql } from 'postgres'; // Let op: dit is de 'postgres' library
import dotenv from 'dotenv';

dotenv.config(); // <-- Zorg ervoor dat deze er is en BOVEN de variabele definitie staat!

const SB_POSTGRES_URL: string = process.env.POSTGRES_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const sql: Sql = postgres(SB_POSTGRES_URL);

// Optioneel: Voeg een log toe om te bevestigen dat de verbinding wordt geprobeerd
console.log(`Initialiseren databaseverbinding met URL: ${SB_POSTGRES_URL ? 'geconfigureerd' : 'NIET geconfigureerd'}`);


export default sql; // Dit exporteert de 'sql' instantie als default