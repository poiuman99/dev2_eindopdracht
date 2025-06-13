// server/routes.ts

import express, { Request, Response, Router, NextFunction } from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import sharp from "sharp";
import rimraf from "rimraf";

const router: Router = express.Router();

import {
    getProductsByCategoryName,
    getAllCategories,
    getAllProductsWithCategoryName,
    getProductById,
    addProduct,
    updateProduct,
    deleteProduct
} from "./services/menuService";

// Importeer functies uit orderService
import {
    getDailyOrderCounts,
    getMonthlyOrderStats,
    getYearlyRevenueStats,
    addOrder // <-- VOEG addOrder HIER TOE
} from "./services/orderService";

// Importeer MenuItem interface (alleen nodig als je deze elders direct gebruikt in routes.ts)
import { MenuItem } from "./services/interfaces"; // Zorg dat deze is bijgewerkt

// --- Multer Configuratie voor Afbeelding Uploads ---
// ... (Multer configuratie blijft hetzelfde) ...
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Max 5MB
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = /image\/(jpeg|jpg|png|gif|webp)/;
        const allowedExtNames = /\.(jpeg|jpg|png|gif|webp)$/;

        const mimetypeIsValid = allowedMimeTypes.test(file.mimetype);
        const extnameIsValid = allowedExtNames.test(path.extname(file.originalname).toLowerCase());

        if (mimetypeIsValid && extnameIsValid) {
            return cb(null, true);
        }
        cb(new Error("Error: Alleen afbeeldingen (jpeg, jpg, png, gif, webp) zijn toegestaan!"));
    }
});
// --- Einde Multer Configuratie ---

// --- Lokale Afbeelding Opslag Configuratie en Functies ---
// ... (deze functies blijven hetzelfde) ...
const UPLOADS_DIR = path.join(__dirname, '..', 'public', 'images');

async function ensureUploadsDir() {
    try {
        await fs.mkdir(UPLOADS_DIR, { recursive: true });
        console.log(`Uploads directory ${UPLOADS_DIR} ensured.`);
    } catch (error) {
        console.error('Error ensuring uploads directory:', error);
    }
}
ensureUploadsDir();

async function deleteLocalImage(imageUrl: string | null): Promise<boolean> {
    if (!imageUrl) return false;
    const filename = path.basename(imageUrl);
    const imagePath = path.join(UPLOADS_DIR, filename);
    try {
        await fs.unlink(imagePath);
        console.log(`Afbeelding lokaal verwijderd: ${imagePath}`);
        return true;
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            console.warn(`Afbeelding niet gevonden om te verwijderen (was mogelijk al weg): ${imagePath}`);
            return false;
        }
        console.error(`Fout bij verwijderen lokale afbeelding ${imagePath}:`, error);
        return false;
    }
}
// --- Einde Lokale Afbeelding Opslag Configuratie en Functies ---


// =========================================================================
// ALGEMEEN TOEGANKELIJKE ROUTES (Frontend)
// =========================================================================
// ... (je bestaande frontend routes blijven hetzelfde) ...
router.get("/admin/stats", async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Haal de statistieken op
        const dailyStats = await getDailyOrderCounts();
        const monthlyStats = await getMonthlyOrderStats();
        const yearlyStats = await getYearlyRevenueStats();

        res.render("admin/stats", { // <-- Render nu stats.ejs
            title: "Overzicht Statistieken",
            message: "Bekijk hier de belangrijke bedrijfsstatistieken.",
            dailyStats: dailyStats,       // Geef dailyStats mee
            monthlyStats: monthlyStats,   // Geef monthlyStats mee
            yearlyStats: yearlyStats      // Geef yearlyStats mee
        });
        return;
    } catch (error) {
        console.error('Error rendering admin stats page:', error);
        next(error); // Geef de fout door
    }
});
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const categories = await getAllCategories();
        const products = await getAllProductsWithCategoryName();
        res.render("index", {
            title: "Welkom bij Frietkot",
            categories: categories,
            products: products
        });
        return;
    } catch (error) {
        console.error('Error handling / route:', error);
        next(error);
    }
});

router.get("/menu", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const categories = await getAllCategories();
        const products = await getAllProductsWithCategoryName();

        res.render("category_menu", {
            title: "Ons Menu",
            categories: categories,
            products: products,
            selectedCategory: null,
            introText: "Ontdek al onze heerlijke producten hieronder!"
        });
        return;
    } catch (error) {
        console.error('Error handling /menu route:', error);
        next(error);
    }
});

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
            introText: `Bekijk hier alle producten in de categorie "${categoryName}".`
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

// NIEUWE ROUTE: Toon Test Bestelling Toevoegen Formulier
router.get("/admin/test-order/add", async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Haal alle producten op om de dropdown te vullen
        const products = await getAllProductsWithCategoryName();

        res.render("admin/add_order_test_form", {
            title: "Test Bestelling Plaatsen",
            message: "Gebruik dit formulier om snel een testbestelling toe te voegen.",
            products: products // <-- Geef de producten mee aan de EJS-template
        });
        return;
    } catch (error) {
        console.error('Error rendering test order form:', error);
        next(error);
    }
});

router.post("/admin/test-order/add", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { customerName, totalPrice, status, notes, selectedProductId, productName1, quantity1, unitPrice1 } = req.body;

        // --- Validatie en Sanering van de hoofd bestelgegevens ---
        const parsedTotalPrice = parseFloat(totalPrice);
        if (isNaN(parsedTotalPrice)) {
            return res.status(400).send('Ongeldige totale prijs opgegeven.');
        }
        if (!status) {
            return res.status(400).send('Status is verplicht.');
        }

        const newOrderData = {
            total_price: parsedTotalPrice,
            status: status,
            customer_name: customerName || null, // Converteert lege string of undefined naar null
            notes: notes || null                // Converteert lege string of undefined naar null
        };

        // --- Validatie en Sanering van de bestelitem gegevens ---
        const parsedSelectedProductId = parseInt(selectedProductId);
        // product_id is nullable in de DB, dus NaN wordt null
        const itemProductId = isNaN(parsedSelectedProductId) ? null : parsedSelectedProductId;

        // product_name is NOT NULL in de DB, dus zorg voor een standaardwaarde als leeg
        const itemProductName = productName1 ? String(productName1).trim() : 'Onbekend Product';
        if (itemProductName === '') { // Zorg dat het geen lege string is als het NIET NULL is
            return res.status(400).send('Productnaam voor het item is verplicht.');
        }

        const parsedQuantity = parseInt(quantity1);
        // quantity is NOT NULL in de DB, dus zorg voor een geldige numerieke waarde
        const itemQuantity = isNaN(parsedQuantity) || parsedQuantity < 1 ? 1 : parsedQuantity;

        const parsedUnitPrice = parseFloat(unitPrice1);
        // unit_price is NOT NULL in de DB, dus zorg voor een geldige numerieke waarde
        const itemUnitPrice = isNaN(parsedUnitPrice) ? 0.00 : parsedUnitPrice; // Gebruik 0.00 als standaard bij invalid

        // Extra check: als geen product geselecteerd is en de productnaam standaard is, return error.
        // Dit vangt gevallen af waarin de "-- Selecteer een product --" optie wordt geselecteerd.
        if (itemProductId === null && itemProductName === 'Onbekend Product') {
            return res.status(400).send('Selecteer alstublieft een geldig product voor de bestelling.');
        }


        const items = [{
            product_id: itemProductId,
            product_name: itemProductName,
            quantity: itemQuantity,
            unit_price: itemUnitPrice
        }];

        await addOrder(newOrderData, items); // Deze aanroep zou nu correct moeten zijn

        res.redirect('/admin');
        return;
    } catch (error) {
        console.error('Error processing test order:', error);
        next(error); // Geef de fout door aan de Express error handler
    }
});

// Admin Dashboard / Hoofdpagina Admin
router.get("/admin", async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Haal de statistieken op
        const dailyStats = await getDailyOrderCounts();
        const monthlyStats = await getMonthlyOrderStats();
        const yearlyStats = await getYearlyRevenueStats();

        res.render("admin/dashboard", {
            title: "Admin Dashboard",
            message: "Welkom op het administratiepaneel!",
            dailyStats: dailyStats,
            monthlyStats: monthlyStats,
            yearlyStats: yearlyStats
        });
        return;
    } catch (error) {
        console.error('Error rendering admin dashboard:', error);
        next(error); // Geef de fout door
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
        return;
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
        return;
    } catch (error) {
        console.error('Error handling /admin/products/add GET route:', error);
        next(error);
    }
});

// Verwerk Product Toevoegen Formulier
router.post("/admin/products/add", upload.single('image'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Verwijder cost_price uit de destructurering
        const { name, price, description, categoryId, options } = req.body;
        const file = req.file;
        let imageUrl: string | null = null;

        // --- Afbeeldingsverwerking ---
        if (file) {
            const filename = `image_${Date.now()}${path.extname(file.originalname).toLowerCase()}`;
            const outputPath = path.join(UPLOADS_DIR, filename);

            try {
                await sharp(file.buffer)
                    .resize(300, 300, {
                        fit: sharp.fit.inside,
                        withoutEnlargement: true
                    })
                    .toFormat("jpeg", { quality: 80 })
                    .toFile(outputPath);
                imageUrl = `/images/${filename}`;
                console.log(`Afbeelding succesvol lokaal opgeslagen als ${outputPath}`);
            } catch (sharpError) {
                console.error("Fout bij verwerken of opslaan afbeelding met sharp:", sharpError);
                next(sharpError);
                return;
            }
        }
        // --- Einde Afbeeldingsverwerking ---

        let parsedOptions = null;
        if (options && options.trim() !== '') {
            try {
                parsedOptions = JSON.parse(options);
            } catch (e) {
                console.warn('Invalid JSON for options:', options);
                res.status(400).send('Ongeldige JSON voor opties.');
                return;
            }
        }

        // Verwijder cost_price uit de aanroep van addProduct
        const newProduct = await addProduct(
            name,
            parseFloat(price),
            description || null,
            parseInt(categoryId),
            imageUrl,
            parsedOptions
        );

        res.redirect('/admin/products');
        return;
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
            return;
        }

        res.render("admin/product_form", {
            title: `Product Bewerken: ${product.name}`,
            message: `Bewerk de details voor ${product.name}.`,
            product: product,
            categories: categories
        });
        return;
    } catch (error) {
        console.error('Error handling /admin/products/edit GET route:', error);
        next(error);
    }
});


// Verwerk Product Bewerken Formulier
router.post("/admin/products/edit/:id", upload.single('image'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const productId = parseInt(req.params.id);
        // Verwijder cost_price uit de destructurering
        const { name, price, description, categoryId, options, currentImageUrl, removeImage } = req.body;
        const file = req.file;
        let imageUrl: string | null = currentImageUrl || null;

        // --- Afbeeldingsverwerking en Oude Verwijderen ---
        if (file) {
            if (currentImageUrl) {
                await deleteLocalImage(currentImageUrl);
            }

            const filename = `image_${Date.now()}${path.extname(file.originalname).toLowerCase()}`;
            const outputPath = path.join(UPLOADS_DIR, filename);

            try {
                await sharp(file.buffer)
                    .resize(300, 300, {
                        fit: sharp.fit.inside,
                        withoutEnlargement: true
                    })
                    .toFormat("jpeg", { quality: 80 })
                    .toFile(outputPath);
                imageUrl = `/images/${filename}`;
                console.log(`Nieuwe afbeelding succesvol lokaal opgeslagen als ${outputPath}`);
            } catch (sharpError) {
                console.error("Fout bij verwerken of opslaan nieuwe afbeelding met sharp:", sharpError);
                next(sharpError);
                return;
            }
        } else if (removeImage === 'true' && currentImageUrl) {
            await deleteLocalImage(currentImageUrl);
            imageUrl = null;
            console.log(`Bestaande afbeelding verwijderd voor product ${productId}.`);
        }
        // --- Einde Afbeeldingsverwerking en Oude Verwijderen ---

        let parsedOptions = null;
        if (options && options.trim() !== '') {
            try {
                parsedOptions = JSON.parse(options);
            } catch (e) {
                console.warn('Invalid JSON for options on update:', options);
                res.status(400).send('Ongeldige JSON voor opties.');
                return;
            }
        }

        // Verwijder cost_price uit de aanroep van updateProduct
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
            return;
        }

        res.redirect('/admin/products');
        return;
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

        if (productToDelete && productToDelete.imageUrl) {
            await deleteLocalImage(productToDelete.imageUrl);
        }

        await deleteProduct(productId);
        res.redirect('/admin/products');
        return;
    } catch (error) {
        console.error('Error deleting product:', error);
        next(error);
    }
});

export default router;