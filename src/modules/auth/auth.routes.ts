import { Router } from 'express';
import { validate } from '@shared/middleware/validate.middleware';
import { verifyToken } from '@shared/middleware/auth.middleware';
import { authLimiter } from '@shared/middleware/rateLimiter';
import {
  registerSchema,
  loginSchema,
  googleLoginSchema,
  refreshTokenSchema,
  activateAccountSchema,
} from './auth.validator';
import * as authController from './auth.controller';

const router = Router();

router.post('/register', authLimiter, validate({ body: registerSchema }), authController.register);
router.post('/login', authLimiter, validate({ body: loginSchema }), authController.login);
router.post('/login-google', authLimiter, validate({ body: googleLoginSchema }), authController.loginGoogle);
router.get('/activate', validate({ query: activateAccountSchema }), authController.activate);
router.post('/refresh-token', validate({ body: refreshTokenSchema }), authController.refreshToken);
router.post('/logout', verifyToken, authController.logout);

export default router;
