// server/middleware/uploadMiddleware.ts

import multer from 'multer';
import { Request } from 'express';

const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            // Pas HIER aan: Cast de Error naar 'any'
            cb(new Error('Ongeldig bestandstype. Alleen afbeeldingen (JPEG, PNG, GIF, WebP) zijn toegestaan.') as any, false);
        }
    }
});

export const uploadSingleImage = upload.single('productImage');