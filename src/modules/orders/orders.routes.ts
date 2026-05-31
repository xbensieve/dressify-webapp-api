import { Router } from 'express';
import { verifyToken } from '@shared/middleware/auth.middleware';
import * as ordersController from './orders.controller';

const router = Router();

router.use(verifyToken);
router.post('/', ordersController.createOrder);
router.post('/from-cart', ordersController.createOrderFromCart);
router.get('/my-orders', ordersController.getMyOrders);

export default router;
