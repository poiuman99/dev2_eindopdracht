
// Importeer sql uit db.ts
import sql from "./db";
import { MenuItem } from "./interfaces"; // Zorg ervoor dat je dit bestand hebt

// Alle items ophalen uit een specifieke tabel
export async function getAllItems(tableName: string): Promise<MenuItem[]> {
  const data: MenuItem[] = await sql`select id, name, price from ${sql(tableName)}`;
  return data;
}

// Voorbeeld van hoe je de burgers zou ophalen:
async function getBurgers(): Promise<MenuItem[]> {
  return getAllItems('burgers');
}

// Voorbeeld van hoe je de frieten zou ophalen:
async function getFrieten(): Promise<MenuItem[]> {
  return getAllItems('frieten');
}

// Enzovoort voor de andere tabellen...