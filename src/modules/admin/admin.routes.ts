import { Router } from 'express';
import { verifyToken, requireAdmin } from '@shared/middleware/auth.middleware';
import * as adminController from './admin.controller';
import { exportOrdersCsv } from './admin-export.controller';

const router = Router();

router.use(verifyToken, requireAdmin);

router.get('/users', adminController.getAllUsers);
router.patch('/users/:id/status', adminController.updateUserStatus);
router.get('/orders', adminController.getAllOrders);
router.patch('/orders/:id/status', adminController.updateOrderStatus);
router.get('/statistics', adminController.getStatistics);

/**
 * @route   GET /api/admin/export/orders
 * @desc    Stream all orders as a CSV file (memory-safe, cursor-based)
 * @query   status?, from?, to? (ISO 8601), sellerId?
 * @access  Admin only
 */
router.get('/export/orders', exportOrdersCsv);

export default router;
