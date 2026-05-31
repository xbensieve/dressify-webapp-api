import { Router } from 'express';
import { verifyToken } from '@shared/middleware/auth.middleware';
import * as cartController from './cart.controller';

const router = Router();

router.use(verifyToken);
router.get('/', cartController.getCart);
router.post('/add', cartController.addToCart);
router.put('/:cartItemId', cartController.updateCartItem);
router.delete('/:cartItemId', cartController.deleteCartItem);

export default router;
