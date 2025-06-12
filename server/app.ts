import express, { Application } from "express";
import path from "path";
import expressLayouts from "express-ejs-layouts";
import routes from "./routes";
import dotenv from 'dotenv';
dotenv.config();

const app: Application = express();
const PORT: number = 3000;

// EJS als template-engine instellen
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware voor layouts
app.use(expressLayouts);
app.set("layout", "layouts/main");

// Middleware om statische bestanden te serveren
app.use(express.static(path.join(__dirname, "/public")));

// Middleware om formulierdata te verwerken
app.use(express.urlencoded({ extended: true }));

// Routes gebruiken
app.use("/", routes);

// Server starten
app.listen(PORT, (): void => {
  console.log(`Server draait op http://localhost:${PORT}`);
});