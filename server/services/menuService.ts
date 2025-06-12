// server/services/menuService.ts

import sql from "./db";
import { MenuItem, Category } from "./interfaces";

// FUNCTIE 1: Haal producten op per categorienaam (case-insensitive)
export async function getProductsByCategoryName(categoryName: string): Promise<MenuItem[]> {
    try {
        const products = await sql`
            SELECT
                p.id,
                p.name,
                p.price,
                p.description,
                p.image_url,
                p.options,
                c.name AS category_name,
                p.category_id
                -- p.cost_price -- <-- VERWIJDER DEZE REGEL
            FROM
                products p
            JOIN
                categories c ON p.category_id = c.id
            WHERE
                LOWER(c.name) = LOWER(${categoryName})
            ORDER BY
                p.name;
        `;

        return products.map((item: any) => ({
            id: item.id,
            name: item.name,
            price: parseFloat(item.price),
            description: item.description || null,
            imageUrl: item.image_url || null,
            options: item.options || [],
            categoryName: item.category_name,
            categoryId: item.category_id
            // cost_price: parseFloat(item.cost_price) // <-- VERWIJDER DEZE REGEL
        }));
    } catch (error: any) {
        console.error(`Error fetching products for category '${categoryName}':`, error);
        throw new Error(`Could not fetch products for category '${categoryName}': ` + (error.message || error));
    }
}

// FUNCTIE 2: Haal alle categorieën op
export async function getAllCategories(): Promise<Category[]> {
    try {
        const categories = await sql`SELECT id, name FROM categories ORDER BY name;`;
        return categories.map(cat => ({ id: cat.id, name: cat.name }));
    } catch (error: any) {
        console.error('Error fetching categories:', error);
        throw new Error('Could not fetch categories: ' + (error.message || error));
    }
}

// FUNCTIE 3: Haal alle producten op met hun categorienaam (voor admin lijst)
export async function getAllProductsWithCategoryName(): Promise<MenuItem[]> {
    try {
        const products = await sql`
            SELECT
                p.id,
                p.name,
                p.price,
                p.description,
                p.image_url,
                p.options,
                c.name AS category_name,
                p.category_id
                -- p.cost_price -- <-- VERWIJDER DEZE REGEL
            FROM
                products p
            JOIN
                categories c ON p.category_id = c.id
            ORDER BY
                p.name;
        `;

        return products.map((item: any) => ({
            id: item.id,
            name: item.name,
            price: parseFloat(item.price),
            description: item.description || null,
            imageUrl: item.image_url || null,
            options: item.options || [],
            categoryName: item.category_name,
            categoryId: item.category_id
            // cost_price: parseFloat(item.cost_price) // <-- VERWIJDER DEZE REGEL
        }));
    } catch (error: any) {
        console.error('Error fetching all products with category name:', error);
        throw new Error('Could not fetch all products with category name: ' + (error.message || error));
    }
}

// FUNCTIE 4: Haal één product op basis van ID
export async function getProductById(id: number): Promise<MenuItem | null> {
    try {
        const [product] = await sql`
            SELECT
                id,
                name,
                price,
                description,
                image_url,
                options,
                category_id
                -- cost_price -- <-- VERWIJDER DEZE REGEL
            FROM
                products
            WHERE
                id = ${id};
        `;

        if (!product) {
            return null;
        }

        return {
            id: product.id,
            name: product.name,
            price: parseFloat(product.price),
            description: product.description || null,
            imageUrl: product.image_url || null,
            options: product.options || [],
            categoryId: product.category_id
            // cost_price: parseFloat(product.cost_price) // <-- VERWIJDER DEZE REGEL
        };
    } catch (error: any) {
        console.error(`Error fetching product by ID ${id}:`, error);
        throw new Error(`Could not fetch product by ID ${id}: ` + (error.message || error));
    }
}

// FUNCTIE 5: Product Toevoegen
export async function addProduct(
    name: string,
    price: number,
    description: string | null,
    categoryId: number,
    imageUrl: string | null,
    options: any | null // JSONB type
    // cost_price: number // <-- VERWIJDER DEZE PARAMETER
): Promise<MenuItem> {
    try {
        const [newProduct] = await sql`
            INSERT INTO products (name, price, description, category_id, image_url, options)
            VALUES (${name}, ${price}, ${description}, ${categoryId}, ${imageUrl}, ${sql.json(options)})
            RETURNING id, name, price, description, image_url, options, category_id;
            -- RETURNING id, name, price, description, image_url, options, category_id, cost_price; -- <-- VERWIJDER cost_price HIER
        `;

        return {
            id: newProduct.id,
            name: newProduct.name,
            price: parseFloat(newProduct.price),
            description: newProduct.description || null,
            imageUrl: newProduct.image_url || null,
            options: newProduct.options || [],
            categoryId: newProduct.category_id
            // cost_price: parseFloat(newProduct.cost_price) // <-- VERWIJDER DEZE REGEL
        };
    } catch (error: any) {
        console.error('Error adding product:', error);
        throw new Error('Could not add product: ' + (error.message || error));
    }
}

// FUNCTIE 6: Product Bijwerken
export async function updateProduct(
    id: number,
    name: string,
    price: number,
    description: string | null,
    categoryId: number,
    imageUrl: string | null,
    options: any | null // JSONB type
    // cost_price: number // <-- VERWIJDER DEZE PARAMETER
): Promise<MenuItem | null> {
    try {
        const [updatedProduct] = await sql`
            UPDATE products
            SET
                name = ${name},
                price = ${price},
                description = ${description},
                category_id = ${categoryId},
                image_url = ${imageUrl},
                options = ${sql.json(options)}
            WHERE
                id = ${id}
            RETURNING id, name, price, description, image_url, options, category_id;
            -- RETURNING id, name, price, description, image_url, options, category_id, cost_price; -- <-- VERWIJDER cost_price HIER
        `;

        if (!updatedProduct) {
            return null;
        }

        return {
            id: updatedProduct.id,
            name: updatedProduct.name,
            price: parseFloat(updatedProduct.price),
            description: updatedProduct.description || null,
            imageUrl: updatedProduct.image_url || null,
            options: updatedProduct.options || [],
            categoryId: updatedProduct.category_id
            // cost_price: parseFloat(updatedProduct.cost_price) // <-- VERWIJDER DEZE REGEL
        };
    } catch (error: any) {
        console.error(`Error updating product ${id}:`, error);
        throw new Error(`Could not update product ${id}: ` + (error.message || error));
    }
}

// FUNCTIE 7: Product Verwijderen
export async function deleteProduct(id: number): Promise<void> {
    try {
        await sql`
            DELETE FROM products
            WHERE id = ${id};
        `;
    } catch (error: any) {
        console.error(`Error deleting product ${id}:`, error);
        throw new Error(`Could not delete product ${id}: ` + (error.message || error));
    }
}