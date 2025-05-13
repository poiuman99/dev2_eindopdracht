import sql from "./db"; // Pas het pad naar je db.ts bestand aan
import { MenuItem } from "./interfaces"; // Pas het pad naar je interface bestand aan

export async function getAllBurgers(): Promise<MenuItem[]> {
  try {
    const data: MenuItem[] = await sql<MenuItem[]>`
      SELECT id, name, price
      FROM burgers;
    `;
    return data;
  } catch (error) {
    console.error('Error fetching burgers:', error);
    throw new Error('Could not fetch burgers: ' + error);
  }
}