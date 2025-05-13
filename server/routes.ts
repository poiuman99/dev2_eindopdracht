import express, { Request, Response, Router } from "express";
const router: Router = express.Router();

// Correcte importpaden (afhankelijk van je bestandsstructuur)
import { MenuItem } from "./services/interfaces";
import { getAllBurgers } from "./services/menuService";

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