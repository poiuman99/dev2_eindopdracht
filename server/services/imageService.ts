// server/services/imageService.ts

import sharp from 'sharp';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase URL of Anon Key is niet geconfigureerd in .env. Afbeelding upload zal niet werken.");
}

const supabase: SupabaseClient = createClient(supabaseUrl as string, supabaseAnonKey as string);

/**
 * Uploadt een afbeelding naar Supabase Storage na optimalisatie met Sharp.
 * @param fileBuffer De binaire data van de afbeelding (van Multer).
 * @param originalFileName De originele bestandsnaam van de afbeelding.
 * @param bucketName De naam van de Supabase Storage bucket.
 * @returns De publieke URL van de geüploade afbeelding, of null als er een fout optreedt.
 */
export async function uploadAndOptimizeImage(fileBuffer: Buffer, originalFileName: string, bucketName: string): Promise<string | null> {
    // ... (rest van deze functie code zoals eerder besproken) ...
    if (!fileBuffer || !bucketName) {
        console.error("Missing file buffer or bucket name for image upload.");
        return null;
    }

    const fileExtension = originalFileName.split('.').pop();
    const fileNameWithoutExt = originalFileName.substring(0, originalFileName.lastIndexOf('.'));
    const uniqueFileName = `${fileNameWithoutExt}-${Date.now()}.webp`;

    try {
        const optimizedBuffer = await sharp(fileBuffer)
            .resize(800)
            .webp({ quality: 80 })
            .toBuffer();

        const { data, error } = await supabase.storage
            .from(bucketName)
            .upload(uniqueFileName, optimizedBuffer, {
                cacheControl: '3600',
                upsert: true,
                contentType: 'image/webp'
            });

        if (error) {
            console.error('Fout bij uploaden geoptimaliseerde afbeelding:', error.message);
            return null;
        }

        const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(data.path);
        return publicUrlData.publicUrl;

    } catch (error: any) {
        console.error('Fout bij verwerken of uploaden afbeelding:', error.message || error);
        return null;
    }
}

/**
 * Verwijdert een afbeelding uit Supabase Storage.
 * @param imageUrl De volledige URL van de afbeelding die verwijderd moet worden.
 * @param bucketName De naam van de Supabase Storage bucket.
 * @returns true als de verwijdering succesvol was, anders false.
 */
export async function deleteImageFromStorage(imageUrl: string, bucketName: string): Promise<boolean> {
    // ... (rest van deze functie code zoals eerder besproken) ...
    if (!imageUrl || !bucketName) {
        console.error("Missing image URL or bucket name for image deletion.");
        return false;
    }

    try {
        const pathSegments = imageUrl.split('/');
        const fileName = pathSegments[pathSegments.length - 1];

        if (!fileName) {
            console.error("Could not extract file name from URL:", imageUrl);
            return false;
        }

        const { error } = await supabase.storage.from(bucketName).remove([fileName]);

        if (error) {
            console.error('Fout bij verwijderen afbeelding uit Storage:', error.message);
            return false;
        }

        return true;
    } catch (error: any) {
        console.error('Fout bij verwerken verwijdering afbeelding:', error.message || error);
        return false;
    }
}