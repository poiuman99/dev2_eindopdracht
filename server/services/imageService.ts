// server/services/imageService.ts

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv'; // Voor toegang tot omgevingsvariabelen

dotenv.config(); // Laad omgevingsvariabelen vanuit .env

// Controleer of de omgevingsvariabelen bestaan
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
// Standaard bucket naam, pas dit aan naar je daadwerkelijke bucket naam in Supabase Storage
const supabaseBucket = process.env.SUPABASE_BUCKET_NAME || 'frietkot_images'; // <-- Pas deze naam aan als je bucket anders heet!

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env file.");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Uploadt een afbeelding naar Supabase Storage.
 * @param fileBuffer De buffer van het bestand.
 * @param fileName De originele bestandsnaam (voor extensie en unieke naam).
 * @param mimetype Het MIME-type van het bestand (e.g., 'image/jpeg').
 * @returns De openbare URL van de geüploade afbeelding.
 */
export async function uploadImage(fileBuffer: Buffer, fileName: string, mimetype: string): Promise<string> {
    // Genereer een unieke bestandsnaam om conflicten te voorkomen
    // Bijvoorbeeld: 1678888888888-abcdefg-original_name.jpg
    const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${fileName}`;
    const filePath = `public/${uniqueFileName}`; // Pad binnen de bucket (mappenstructuur)

    try {
        const { data, error } = await supabase.storage
            .from(supabaseBucket)
            .upload(filePath, fileBuffer, {
                contentType: mimetype,
                upsert: false // Niet overschrijven als bestand al bestaat
            });

        if (error) {
            console.error('Supabase upload error:', error);
            throw new Error(`Afbeelding uploaden mislukt: ${error.message}`);
        }

        // De openbare URL van de geüploade afbeelding ophalen
        const { data: publicUrlData } = supabase.storage
            .from(supabaseBucket)
            .getPublicUrl(filePath);

        if (!publicUrlData || !publicUrlData.publicUrl) {
            throw new Error("Kon geen publieke URL voor de geüploade afbeelding krijgen.");
        }

        console.log(`Afbeelding succesvol geüpload: ${publicUrlData.publicUrl}`);
        return publicUrlData.publicUrl;
    } catch (error: any) {
        console.error('Error in uploadImage:', error);
        throw new Error('Fout bij uploaden afbeelding: ' + (error.message || error));
    }
}

/**
 * Verwijdert een afbeelding uit Supabase Storage.
 * @param imageUrl De volledige URL van de afbeelding die moet worden verwijderd.
 */
export async function deleteImage(imageUrl: string): Promise<void> {
    try {
        // Controleer of het een geldige Supabase Storage URL is
        if (!imageUrl || !imageUrl.includes('supabase.co/storage/v1/object/public/')) {
            console.warn(`Skipping image deletion: URL does not appear to be a Supabase Storage URL: ${imageUrl}`);
            return; // Ga verder zonder te proberen een niet-Supabase URL te verwijderen
        }

        // Extraheer het pad van de afbeelding uit de URL
        // De URL is typisch van de vorm: https://[project_id].supabase.co/storage/v1/object/public/[bucket_name]/[path/to/file.ext]
        // We moeten het deel na de bucket naam hebben.
        const urlParts = imageUrl.split(supabaseBucket + '/');
        if (urlParts.length < 2) {
            console.warn(`Could not parse image URL for deletion: ${imageUrl}. Skipping deletion.`);
            return;
        }
        const filePathInBucket = urlParts[1]; // Dit is het 'path/to/file.ext' deel

        const { error } = await supabase.storage
            .from(supabaseBucket)
            .remove([filePathInBucket]); // Verwacht een array van paden

        if (error) {
            // "Object not found" is geen echte fout bij verwijderen als het bestand er al niet is
            if (error.message === "Object not found") {
                console.warn(`Image to delete not found in bucket: ${filePathInBucket}. Continuing anyway.`);
            } else {
                console.error('Supabase delete error:', error);
                throw new Error(`Afbeelding verwijderen mislukt: ${error.message}`);
            }
        } else {
            console.log(`Afbeelding succesvol verwijderd: ${imageUrl}`);
        }
    } catch (error: any) {
        console.error('Error in deleteImage:', error);
        throw new Error('Fout bij verwijderen afbeelding: ' + (error.message || error));
    }
}