// server/app.ts

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import expressLayouts from 'express-ejs-layouts'; // <-- ZORG DAT DEZE IMPORT ER WEER IS
import path from 'path';
import routes from './routes';

const app = express();
const port = process.env.PORT || 3000;

// Middleware voor het parsen van body's
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Configuratie voor EJS en layouts
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// --- DE BELANGRIJKE AANPASSINGEN HIER ---
// 1. Zorg ervoor dat expressLayouts wordt gebruikt
app.use(expressLayouts);

// 2. Vertel express-ejs-layouts waar je layouts map is en welke layout-file te gebruiken
// Als je main.ejs DIRECT in server/views/layouts/ staat
app.set('layout', 'layouts/main'); // <-- Deze regel is cruciaal!
// Of als 'layouts' de standaard map is in je views, en main.ejs erin staat:
// app.set('layout', 'main'); // als je app.set('layout extractScripts', true) en app.set('layout extractStyles', true) gebruikt, kunnen layouts in een subfolder.
// Het is vaak het makkelijkst om de volledige pad relatief aan de views map te geven.
// Dus als main.ejs in server/views/layouts/main.ejs staat, dan is het 'layouts/main'.
// --- EINDE AANPASSINGEN ---


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