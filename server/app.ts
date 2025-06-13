// server/app.ts

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import expressLayouts from 'express-ejs-layouts';
import path from 'path';
import routes from './routes';
// import initializeDatabase from './services/db'; // <-- VERWIJDER DEZE REGEL

// Importeer direct de 'sql' instantie als de default export van './services/db'
import sql from './services/db'; // <-- VOEG DEZE REGEL TOE! Dit is je database-verbinding

const app = express();
const port = process.env.PORT || 3000;

// De initialisatie van de database (het aanmaken van de 'sql' instantie en de console.log)
// gebeurt al automatisch wanneer './services/db' wordt ingeladen.
// Je hoeft hier GEEN aparte functie aan te roepen voor initialisatie.
// initializeDatabase(); // <-- VERWIJDER DEZE REGEL! Deze functie bestaat niet als een aparte export.

// Middleware voor het parsen van body's
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Configuratie voor EJS view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Layouts Configuratie
app.use(expressLayouts);
app.set('layout', 'layouts/main'); // Dit pad is relatief aan je 'views' map.

// Statische bestanden serveren vanuit de 'public' map
app.use(express.static(path.join(__dirname, '..', 'public')));

// Gebruik je routes
app.use('/', routes);

// Foutafhandeling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).send('Er is iets misgegaan!');
});

// Start de server
app.listen(port, () => {
    console.log(`Server draait op http://localhost:${port}`);
});

export default app;