// server/app.ts

import express, { Application } from "express";
import path from "path";
import expressLayouts from "express-ejs-layouts";
import routes from "./routes";
import dotenv from 'dotenv';

dotenv.config(); // Laad omgevingsvariabelen zo vroeg mogelijk

// Definieer de poort, gebruik process.env.PORT als die bestaat, anders 3000
// Gebruik de nullish coalescing operator (??) voor een schonere fallback
// Dit is de ENIGE declaratie van PORT
const PORT: number = parseInt(process.env.PORT ?? '3000', 10);


const app: Application = express();

// EJS als template-engine instellen
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware voor layouts
app.use(expressLayouts);
app.set("layout", "layouts/main");

// Middleware om statische bestanden te serveren
// Zorg dat het pad naar je 'public' map klopt vanuit de context van het gecompileerde JS-bestand
// Als je server/app.ts compileert naar dist/app.js, dan moet public relatief zijn aan dist
app.use(express.static(path.join(__dirname, "../public"))); // Vaak is '../public' correct voor TS-projecten die naar dist/server compileren


// Middleware om formulierdata te verwerken (JSON en URL-encoded)
app.use(express.json()); // Voeg deze toe als je ook JSON body's verwacht (bijv. van API-calls)
app.use(express.urlencoded({ extended: true }));


// Routes gebruiken
app.use("/", routes);

// Server starten
app.listen(PORT, (): void => {
  console.log(`Server draait op http://localhost:${PORT}`);
});

// Optioneel: exporteer de app als je die in testbestanden wilt gebruiken
// export default app;