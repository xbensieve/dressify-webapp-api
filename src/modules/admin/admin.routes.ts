import { Router } from 'express';
import { verifyToken, requireAdmin } from '@shared/middleware/auth.middleware';
import * as adminController from './admin.controller';

const router = Router();

router.use(verifyToken, requireAdmin);

router.get('/users', adminController.getAllUsers);
router.patch('/users/:id/status', adminController.updateUserStatus);
router.get('/orders', adminController.getAllOrders);
router.patch('/orders/:id/status', adminController.updateOrderStatus);
router.get('/statistics', adminController.getStatistics);

export default router;
