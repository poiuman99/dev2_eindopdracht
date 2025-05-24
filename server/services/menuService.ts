// src/services/menuService.ts

// Pas het pad naar je db.ts bestand aan.
// Bijvoorbeeld: '../config/db' als het in src/config/db.ts staat,
// of '../utils/db' als het in src/utils/db.ts staat.
import  sql  from "./db"; // Dit is jouw oorspronkelijke pad, controleer of het klopt!

// Pas het pad naar je interface bestand aan.
// Bijvoorbeeld: '../interfaces/menuItem' als MenuItem in src/interfaces/menuItem.ts staat,
// of '../interfaces' als interfaces.ts alle interfaces bevat in src/interfaces/interfaces.ts.
import { MenuItem } from "./interfaces"; // Dit is jouw oorspronkelijke pad, controleer of het klopt!

export async function getAllBurgers(): Promise<MenuItem[]> {
  try {
    // Voer de SQL-query uit.
    // De 'price' kolom komt waarschijnlijk als een string uit de database.
    const rawData = await sql`
      SELECT id, name, price, description
      FROM burgers;
    `;

    // Converteer de opgehaalde data naar het juiste formaat.
    // Vooral belangrijk is de 'price' om te zetten naar een getal (number)
    // zodat .toFixed() in de EJS-template werkt.
    const processedData: MenuItem[] = rawData.map((item: any) => ({
      id: item.id,
      name: item.name,
      price: parseFloat(item.price), // CONVERSIE HIER: zet de string 'price' om naar een number
      description: item.description || null // Zorg dat description er is, zelfs als het null is
    }));

    return processedData;

  } catch (error: any) { // Type 'any' voor 'error' toevoegen voor TypeScript
    console.error('Error fetching burgers:', error);
    // Gooi een meer specifieke foutmelding terug om te helpen bij debugging
    throw new Error('Could not fetch burgers from database: ' + (error.message || error));
  }
}