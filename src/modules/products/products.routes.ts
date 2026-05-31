import { Router } from 'express';
import multer from 'multer';
import { verifyToken, requireSeller } from '@shared/middleware/auth.middleware';
import { uploadLimiter } from '@shared/middleware/rateLimiter';
import * as productsController from './products.controller';

const upload = multer({ dest: 'uploads/' });
const router = Router();

router.get('/search', productsController.search);
router.post('/get', productsController.getById);
router.post('/', verifyToken, requireSeller, uploadLimiter, upload.array('images', 10), productsController.addProduct);
router.put('/:id', verifyToken, requireSeller, productsController.updateProduct);
router.delete('/:id', verifyToken, requireSeller, productsController.deleteProduct);

export default router;
