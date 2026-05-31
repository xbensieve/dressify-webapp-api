import { Router } from 'express';
import { verifyToken } from '@shared/middleware/auth.middleware';
import * as paymentController from './payment.controller';

const router = Router();

router.post('/create-payment-url', verifyToken, paymentController.generatePaymentUrl);
router.get('/handle-payment-response', paymentController.handlePaymentResponse);

export default router;
