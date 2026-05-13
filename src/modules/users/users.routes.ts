import { Router } from 'express';
import { verifyToken } from '@shared/middleware/auth.middleware';
import * as usersController from './users.controller';

const router = Router();

router.get('/me', verifyToken, usersController.getProfile);

export default router;
