import postgres, { Sql } from 'postgres';
import dotenv from 'dotenv';

dotenv.config(); // <-- DEZE REGEL TOEVOEGEN!

const SB_POSTGRES_URL:string = process.env.POSTGRES_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const sql: Sql = postgres(SB_POSTGRES_URL);

export default sql;