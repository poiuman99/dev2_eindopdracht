// server/routes.ts

import express, { Request, Response, Router } from "express";
import multer from "multer"; // <-- NIEUWE IMPORT
import path from "path";     // <-- NIEUWE IMPORT (voor bestandspaden)
const router: Router = express.Router();

// Update deze importregel met alle functies die je nodig hebt uit menuService
import {
    getProductsByCategoryName,
    getAllCategories,
    getAllProductsWithCategoryName,
    getProductById, // <-- NIEUWE IMPORT
    addProduct,     // <-- NIEUWE IMPORT
    updateProduct,  // <-- NIEUWE IMPORT
    deleteProduct   // <-- NIEUWE IMPORT
} from "./services/menuService";
import { uploadImage, deleteImage } from "./services/imageService"; // <-- NIEUWE IMPORT (deze service maken we zo!)
import { MenuItem } from "./services/interfaces";

// --- Multer Configuratie voor Afbeelding Uploads ---
const storage = multer.memoryStorage(); // Opslaan in het geheugen als Buffer
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Max 5MB
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error("Error: Alleen afbeeldingen (jpeg, jpg, png, gif, webp) zijn toegestaan!"));
    }
});
// --- Einde Multer Configuratie ---


// ... (Bestaande routes voor /, /menu, /categorie/:categoryName, /admin) ...


// Admin Producten Lijst (Bestaande route, geen wijzigingen hier)
router.get("/admin/products", async (req: Request, res: Response) => {
    try {
        const products = await getAllProductsWithCategoryName();
        res.render("admin/products", {
            title: "Producten Beheren",
            message: "Overzicht van alle producten in het systeem.",
            products: products
        });
    } catch (error) {
        console.error('Error handling /admin/products route:', error);
        res.status(500).send('Er is een fout opgetreden bij het laden van de productenlijst.');
    }
});

// NIEUWE ROUTE: Toon Product Toevoegen Formulier
router.get("/admin/products/add", async (req: Request, res: Response) => {
    try {
        const categories = await getAllCategories(); // Nodig om de dropdown te vullen
        res.render("admin/product_form", {
            title: "Product Toevoegen",
            message: "Vul de details in voor het nieuwe product.",
            product: null, // Geen product object betekent 'toevoegen'
            categories: categories
        });
    } catch (error) {
        console.error('Error handling /admin/products/add GET route:', error);
        res.status(500).send('Er is een fout opgetreden bij het laden van het toevoegformulier.');
    }
});

// NIEUWE ROUTE: Verwerk Product Toevoegen Formulier
router.post("/admin/products/add", upload.single('image'), async (req: Request, res: Response) => {
    try {
        const { name, price, description, categoryId, options } = req.body;
        const file = req.file; // Afbeelding als Buffer (van multer)
        let imageUrl: string | null = null;

        if (file) {
            // Upload afbeelding naar Supabase Storage
            imageUrl = await uploadImage(file.buffer, file.originalname, file.mimetype);
        }

        // Parseer opties (als JSON string, of null als leeg)
        let parsedOptions = null;
        if (options && options.trim() !== '') {
            try {
                parsedOptions = JSON.parse(options);
            } catch (e) {
                console.warn('Invalid JSON for options:', options);
                // Je kunt hier een foutmelding naar de gebruiker sturen indien gewenst
                return res.status(400).send('Ongeldige JSON voor opties.');
            }
        }

        const newProduct = await addProduct(
            name,
            parseFloat(price),
            description || null, // Maak leeg string naar null
            parseInt(categoryId),
            imageUrl,
            parsedOptions
        );

        res.redirect('/admin/products'); // Terug naar de productenlijst
    } catch (error) {
        console.error('Error handling /admin/products/add POST route:', error);
        res.status(500).send('Er is een fout opgetreden bij het toevoegen van het product: ' + (error instanceof Error ? error.message : error));
    }
});

// NIEUWE ROUTE: Toon Product Bewerken Formulier
router.get("/admin/products/edit/:id", async (req: Request, res: Response) => {
    try {
        const productId = parseInt(req.params.id);
        const product = await getProductById(productId); // Haal specifiek product op
        const categories = await getAllCategories(); // Nodig om de dropdown te vullen

        if (!product) {
            return res.status(404).send('Product niet gevonden.');
        }

        res.render("admin/product_form", {
            title: `Product Bewerken: ${product.name}`,
            message: `Bewerk de details voor ${product.name}.`,
            product: product, // Geef het product object mee voor bewerking
            categories: categories
        });
    } catch (error) {
        console.error('Error handling /admin/products/edit GET route:', error);
        res.status(500).send('Er is een fout opgetreden bij het laden van het bewerkingsformulier.');
    }
});

// NIEUWE ROUTE: Verwerk Product Bewerken Formulier
router.post("/admin/products/edit/:id", upload.single('image'), async (req: Request, res: Response) => {
    try {
        const productId = parseInt(req.params.id);
        const { name, price, description, categoryId, options, currentImageUrl } = req.body;
        const file = req.file; // Nieuwe afbeelding (indien geüpload)
        let imageUrl: string | null = currentImageUrl || null; // Standaard de huidige URL

        // Als er een nieuwe afbeelding is geüpload
        if (file) {
            // Optioneel: Verwijder de oude afbeelding uit Supabase Storage
            if (currentImageUrl) {
                await deleteImage(currentImageUrl); // Implementeer deze functie in imageService
            }
            // Upload de nieuwe afbeelding
            imageUrl = await uploadImage(file.buffer, file.originalname, file.mimetype);
        }

        // Parseer opties
        let parsedOptions = null;
        if (options && options.trim() !== '') {
            try {
                parsedOptions = JSON.parse(options);
            } catch (e) {
                console.warn('Invalid JSON for options on update:', options);
                return res.status(400).send('Ongeldige JSON voor opties.');
            }
        }

        const updatedProduct = await updateProduct(
            productId,
            name,
            parseFloat(price),
            description || null,
            parseInt(categoryId),
            imageUrl,
            parsedOptions
        );

        if (!updatedProduct) {
            return res.status(404).send('Product niet gevonden voor update.');
        }

        res.redirect('/admin/products'); // Terug naar de productenlijst
    } catch (error) {
        console.error('Error handling /admin/products/edit POST route:', error);
        res.status(500).send('Er is een fout opgetreden bij het bijwerken van het product: ' + (error instanceof Error ? error.message : error));
    }
});

// NIEUWE ROUTE: Product Verwijderen
router.post("/admin/products/delete/:id", async (req: Request, res: Response) => {
    try {
        const productId = parseInt(req.params.id);
        const productToDelete = await getProductById(productId); // Haal product op om afbeelding URL te krijgen

        if (!productToDelete) {
            return res.status(404).send('Product niet gevonden om te verwijderen.');
        }

        // Optioneel: Verwijder de afbeelding uit Supabase Storage
        if (productToDelete.imageUrl) {
            await deleteImage(productToDelete.imageUrl);
        }

        await deleteProduct(productId); // Verwijder product uit DB

        res.redirect('/admin/products');
    } catch (error) {
        console.error('Error handling /admin/products/delete POST route:', error);
        res.status(500).send('Er is een fout opgetreden bij het verwijderen van het product: ' + (error instanceof Error ? error.message : error));
    }
});


export default router;