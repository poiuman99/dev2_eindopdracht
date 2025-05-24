// src/routes.ts

import express, { Request, Response, Router } from "express";
const router: Router = express.Router();

// Importeer de benodigde functies en interfaces
// Pas deze paden AAN als ze niet kloppen met jouw projectstructuur!
// Bijvoorbeeld:
// import { MenuItem } from "../interfaces";  // Als interfaces.ts direct in src/interfaces staat
// import { getAllBurgers } from "../services/menuService"; // Als menuService.ts direct in src/services staat
import { MenuItem } from "./services/interfaces"; // Dit pad suggereert dat 'interfaces.ts' in 'src/services' zit
import { getAllBurgers } from "./services/menuService"; // Dit pad suggereert dat 'menuService.ts' in 'src/services' zit


// Route voor de hoofdpagina (root URL: http://localhost:3000/)
router.get("/", async (req: Request, res: Response) => {
  try {
    // Haal de menu-items (burgers) op uit de database
    const burgers: MenuItem[] = await getAllBurgers();

    // Render de 'index.ejs' template en geef de opgehaalde data mee
    // Zorg ervoor dat je een bestand genaamd 'index.ejs' hebt in je 'views' map.
    res.render("index", {
      title: "Welkom bij onze Menukaart!",
      introText: "Ontdek hieronder onze heerlijke selectie van burgers:",
      menuItems: burgers // Geef de opgehaalde burgers mee aan de template
    });
  } catch (error) {
    console.error('Error handling / route (homepage):', error);
    res.status(500).send('Er is een fout opgetreden bij het laden van de homepage.');
  }
});

// Je bestaande route voor de burgers pagina (optioneel; als de homepagina volstaat, kun je deze overwegen te verwijderen)
router.get("/burgers", async (req: Request, res: Response) => {
  try {
    const burgers: MenuItem[] = await getAllBurgers();
    res.render("burgers", { burgers: burgers, title: "Onze Burgers" });
  } catch (error) {
    console.error('Error handling /burgers route:', error);
    res.status(500).send('Er is een fout opgetreden bij het ophalen van de burgers.');
  }
});

export default router;