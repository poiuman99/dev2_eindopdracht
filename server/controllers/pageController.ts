// controllers/pageController.ts

import { Request, Response } from "express";
import { getAllCategories } from "../services/menuService"; // Pad aanpassen naar je menuService

export async function renderHomePage(req: Request, res: Response) {
    try {
        const categories = await getAllCategories(); // Haal alle categorieën op voor de navigatie op de homepagina

        res.render("index", {
            title: "Frietkot Beheersysteem",
            introText: "Welkom op het dashboard. Kies een categorie om het menu te bekijken:",
            categories: categories // Geef categorieën mee aan de index.ejs
        });
    } catch (error) {
        console.error('Error rendering home page:', error);
        res.status(500).send('Er is een fout opgetreden bij het laden van de homepagina.');
    }
}