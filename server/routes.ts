// server/routes.ts

import express, { Request, Response, Router, NextFunction } from "express";
import multer from "multer";
import path from "path";
const router: Router = express.Router();

// Importeer functies uit menuService (controleer of deze namen kloppen met wat menuService exporteert)
import {
    getProductsByCategoryName,
    getAllCategories,
    getAllProductsWithCategoryName,
    getProductById,
    addProduct,
    updateProduct,
    deleteProduct
} from "./services/menuService"; // Let op: './services/menuService' als menuService in server/services/ staat

// Importeer MenuItem interface
import { MenuItem } from "./services/interfaces"; // Zorg dat dit pad en de interface kloppen

// Zorg ervoor dat SUPABASE_BUCKET_NAME beschikbaar is in .env en geladen is
const SUPABASE_BUCKET_NAME = process.env.SUPABASE_BUCKET_NAME;
if (!SUPABASE_BUCKET_NAME) {
    console.error("SUPABASE_BUCKET_NAME is niet geconfigureerd in .env. Afbeeldingen zullen niet werken.");
}

// --- Multer Configuratie voor Afbeelding Uploads ---
const storage = multer.memoryStorage(); // Opslaan in het geheugen als Buffer
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Max 5MB
    fileFilter: (req, file, cb) => { // Verwijder de expliciete type-annotatie 'multer.FileFilterCallback' hier
        const filetypes = /jpeg|jpg|png|gif|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        // DE FIX IS HIER: Maak een nieuwe Error instantie
        cb(new Error("Error: Alleen afbeeldingen (jpeg, jpg, png, gif, webp) zijn toegestaan!"));
    }
});
// --- Einde Multer Configuratie ---


// =========================================================================
// ALGEMEEN TOEGANKELIJKE ROUTES (Frontend)
// =========================================================================

// ROOT Route: Handles GET requests to '/'
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const categories = await getAllCategories(); // Haal categorieën op voor de navigatiebalk/filters
        const products = await getAllProductsWithCategoryName(); // Haal alle producten op voor de hoofdpagina
        res.render("index", {
            title: "Welkom bij Frietkot",
            categories: categories, // Geef categorieën mee aan de template
            products: products // Geef producten mee aan de template
        });
        return; // Expliciet return na res.render
    } catch (error) {
        console.error('Error handling / route:', error);
        next(error); // Geef de fout door aan de Express foutafhandeling
    }
});

// Menu pagina: Alle producten per categorie
router.get("/menu", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const categories = await getAllCategories();
        const products = await getAllProductsWithCategoryName();

        res.render("category_menu", {
            title: "Ons Menu",
            categories: categories,
            products: products,
            selectedCategory: null, // Of iets specifieks
            introText: "Ontdek al onze heerlijke producten hieronder!" // <-- VOEG DEZE REGEL TOE
        });
        return;
    } catch (error) {
        console.error('Error handling /menu route:', error);
        next(error);
    }
});

// Menu pagina: Producten per specifieke categorie
router.get("/categorie/:categoryName", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const categoryName = req.params.categoryName;
        const categories = await getAllCategories();
        const products = await getProductsByCategoryName(categoryName);

        res.render("category_menu", {
            title: `Menu: ${categoryName}`,
            categories: categories,
            products: products,
            selectedCategory: categoryName,
            introText: `Bekijk hier alle producten in de categorie "${categoryName}".` // <-- VOEG DEZE REGEL TOE
        });
        return;
    } catch (error) {
        console.error('Error handling /categorie/:categoryName route:', error);
        next(error);
    }
});


// =========================================================================
// ADMIN ROUTES
// =========================================================================

// NIEUWE ROUTE: Admin Dashboard / Hoofdpagina Admin
router.get("/admin", (req: Request, res: Response) => {
    // Redirect naar de productenlijst, wat waarschijnlijk je hoofd admin overzicht is
    res.redirect("/admin/products");
    return; // Belangrijk voor TypeScript en Express om de response te beëindigen
});


// Admin Producten Lijst (Bestaande route, direct hieronder)
router.get("/admin/products", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const products = await getAllProductsWithCategoryName();
        res.render("admin/products", {
            title: "Producten Beheren",
            message: "Overzicht van alle producten in het systeem.",
            products: products
        });
        return;
    } catch (error) {
        console.error('Error handling /admin/products route:', error);
        next(error);
    }
});

// Admin Producten Lijst
router.get("/admin/products", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const products = await getAllProductsWithCategoryName();
        res.render("admin/products", {
            title: "Producten Beheren",
            message: "Overzicht van alle producten in het systeem.",
            products: products
        });
        return; // Expliciet return na res.render
    } catch (error) {
        console.error('Error handling /admin/products route:', error);
        next(error);
    }
});

// Toon Product Toevoegen Formulier
router.get("/admin/products/add", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const categories = await getAllCategories();
        res.render("admin/product_form", {
            title: "Product Toevoegen",
            message: "Vul de details in voor het nieuwe product.",
            product: null,
            categories: categories
        });
        return; // Expliciet return na res.render
    } catch (error) {
        console.error('Error handling /admin/products/add GET route:', error);
        next(error);
    }
});

// Verwerk Product Toevoegen Formulier
router.post("/admin/products/add", upload.single('image'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, price, description, categoryId, options } = req.body;
        const file = req.file;
        let imageUrl: string | null = null;

      

        let parsedOptions = null;
        if (options && options.trim() !== '') {
            try {
                parsedOptions = JSON.parse(options);
            } catch (e) {
                console.warn('Invalid JSON for options:', options);
                res.status(400).send('Ongeldige JSON voor opties.');
                return; // Expliciet return na res.send
            }
        }

        const newProduct = await addProduct(
            name,
            parseFloat(price),
            description || null,
            parseInt(categoryId),
            imageUrl,
            parsedOptions
        );

        res.redirect('/admin/products');
        return; // Expliciet return na res.redirect
    } catch (error) {
        console.error('Error handling /admin/products/add POST route:', error);
        next(error);
    }
});

// Toon Product Bewerken Formulier
router.get("/admin/products/edit/:id", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const productId = parseInt(req.params.id);
        const product = await getProductById(productId);
        const categories = await getAllCategories();

        if (!product) {
            res.status(404).send('Product niet gevonden.');
            return; // Expliciet return na res.send
        }

        res.render("admin/product_form", {
            title: `Product Bewerken: ${product.name}`,
            message: `Bewerk de details voor ${product.name}.`,
            product: product,
            categories: categories
        });
        return; // Expliciet return na res.render
    } catch (error) {
        console.error('Error handling /admin/products/edit GET route:', error);
        next(error);
    }
});

// Verwerk Product Bewerken Formulier
router.post("/admin/products/edit/:id", upload.single('image'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const productId = parseInt(req.params.id);
        const { name, price, description, categoryId, options, currentImageUrl } = req.body;
        const file = req.file;
        let imageUrl: string | null = currentImageUrl || null;

      
        let parsedOptions = null;
        if (options && options.trim() !== '') {
            try {
                parsedOptions = JSON.parse(options);
            } catch (e) {
                console.warn('Invalid JSON for options on update:', options);
                res.status(400).send('Ongeldige JSON voor opties.');
                return; // Expliciet return na res.send
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
            res.status(404).send('Product niet gevonden voor update.');
            return; // Expliciet return na res.send
        }

        res.redirect('/admin/products');
        return; // Expliciet return na res.redirect
    } catch (error) {
        console.error('Error handling /admin/products/edit POST route:', error);
        next(error);
    }
});

// Product Verwijderen
router.post("/admin/products/delete/:id", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const productId = parseInt(req.params.id);
        const productToDelete = await getProductById(productId);

        if (!productToDelete) {
            res.status(404).send('Product niet gevonden om te verwijderen.');
            return; // Expliciet return na res.send
        }

        await deleteProduct(productId);

        res.redirect('/admin/products');
        return; // Expliciet return na res.redirect
    } catch (error) {
        console.error('Error handling /admin/products/delete POST route:', error);
        next(error);
    }
});

export default router;