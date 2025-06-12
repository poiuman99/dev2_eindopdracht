// Voorbeeld in je product router (bijv. server/routes/productRouter.ts)
import express from 'express';
import { uploadSingleImage } from '../middleware/uploadMiddleware'; // <-- CORRECT
import * as productController from '../controllers/productController'; // <-- CORRECT

const router = express.Router();

router.post('/admin/products/add', uploadSingleImage, productController.createProduct);
router.post('/admin/products/edit/:id', uploadSingleImage, productController.updateProduct);