import { Router } from 'express';
import { verifyToken } from '@shared/middleware/auth.middleware';
import * as transactionsController from './transactions.controller';

const router = Router();

router.get('/my', verifyToken, transactionsController.getMyTransactions);

export default router;
