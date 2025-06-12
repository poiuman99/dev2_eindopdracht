// server/controllers/productController.ts

import { Request, Response, NextFunction } from 'express';
// Pas de importnamen aan naar de daadwerkelijke namen in imageService
import { uploadAndOptimizeImage, deleteImageFromStorage } from '../services/imageService'; // <-- PAS DIT PAD AAN
import db from '../services/db'; // <-- PAS DIT PAD AAN

// Functie om de pagina te tonen voor het toevoegen van een product
export const getAddProductPage = (req: Request, res: Response) => {
    res.render('admin/addProduct', { title: 'Product Toevoegen' });
};

// Functie om een nieuw product toe te voegen
export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, price, description, category_id, options } = req.body;

        let imageUrl: string | null = null;
        if (req.file) {
            const bucketName = process.env.SUPABASE_BUCKET_NAME as string;
            if (!bucketName) {
                throw new Error("SUPABASE_BUCKET_NAME is niet geconfigureerd.");
            }
            imageUrl = await uploadAndOptimizeImage(req.file.buffer, req.file.originalname, bucketName);
        }

        // --- AANPASSING HIER ---
        // Gebruik de 'postgres' library syntax met template literals
        const result = await db`
            INSERT INTO products (name, price, description, category_id, image_url, options)
            VALUES (${name}, ${price}, ${description}, ${category_id}, ${imageUrl}, ${options ? JSON.parse(options) : null})
            RETURNING *
        `;

        res.redirect('/admin/products');
    } catch (error) {
        console.error('Fout bij aanmaken product:', error);
        next(error);
    }
};

// Functie om een product te bewerken
export const getEditProductPage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const productId = req.params.id;

        // --- AANPASSING HIER ---
        const productResult = await db`
            SELECT * FROM products WHERE id = ${productId}
        `;
        const product = productResult[0]; // postgres returns an array of rows, not .rows property

        if (!product) {
            return res.status(404).render('error', { message: 'Product niet gevonden' });
        }

        res.render('admin/editProduct', {
            title: `Product Bewerken: ${product.name}`,
            product: product
        });

    } catch (error) {
        console.error('Fout bij ophalen product voor bewerking:', error);
        next(error);
    }
};


export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { name, price, description, category_id, existing_image_url, options } = req.body;

        let imageUrl: string | null = existing_image_url;

        if (req.file) {
            const bucketName = process.env.SUPABASE_BUCKET_NAME as string;
            if (!bucketName) {
                throw new Error("SUPABASE_BUCKET_NAME is niet geconfigureerd.");
            }

            if (existing_image_url && typeof existing_image_url === 'string' && existing_image_url.startsWith('http')) {
                const deleted = await deleteImageFromStorage(existing_image_url, bucketName);
                if (!deleted) {
                    console.warn(`Kon oude afbeelding ${existing_image_url} niet verwijderen.`);
                }
            }
            imageUrl = await uploadAndOptimizeImage(req.file.buffer, req.file.originalname, bucketName);
        }

        // --- AANPASSING HIER ---
        const result = await db`
            UPDATE products
            SET name = ${name}, price = ${price}, description = ${description}, category_id = ${category_id},
                image_url = ${imageUrl}, options = ${options ? JSON.parse(options) : null}
            WHERE id = ${id}
            RETURNING *
        `;

        res.redirect('/admin/products');
    } catch (error) {
        console.error('Fout bij bijwerken product:', error);
        next(error);
    }
};

// Functie om een product te verwijderen
export const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const productId = req.params.id;

        // --- AANPASSING HIER ---
        const productResult = await db`
            SELECT image_url FROM products WHERE id = ${productId}
        `;
        const imageUrlToDelete = productResult[0]?.image_url; // postgres returns an array

        // --- AANPASSING HIER ---
        await db`
            DELETE FROM products WHERE id = ${productId}
        `;

        if (imageUrlToDelete && typeof imageUrlToDelete === 'string' && imageUrlToDelete.startsWith('http')) {
            const bucketName = process.env.SUPABASE_BUCKET_NAME as string;
            if (bucketName) {
                const deleted = await deleteImageFromStorage(imageUrlToDelete, bucketName);
                if (!deleted) {
                    console.warn(`Kon afbeelding ${imageUrlToDelete} niet verwijderen na product delete.`);
                }
            } else {
                console.warn("SUPABASE_BUCKET_NAME niet geconfigureerd, kan afbeelding niet verwijderen.");
            }
        }

        res.redirect('/admin/products');
    } catch (error) {
        console.error('Fout bij verwijderen product:', error);
        next(error);
    }
};


// Functie om alle producten te tonen (bijv. /admin/products)
export const getProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // --- AANPASSING HIER ---
        const products = await db`
            SELECT p.*, c.name as category_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            ORDER BY p.name ASC
        `;

        res.render('admin/products', {
            title: 'Producten Beheer',
            products: products // 'postgres' library geeft direct een array van rijen terug
        });
    } catch (error) {
        console.error('Fout bij ophalen producten:', error);
        next(error);
    }
};