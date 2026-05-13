import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import swaggerUi from 'swagger-ui-express';
import { env } from '@shared/config/env';
import { requestIdMiddleware } from '@shared/middleware/requestId.middleware';
import { apiLimiter } from '@shared/middleware/rateLimiter';
import { errorHandler } from '@shared/middleware/errorHandler';
import { swaggerSpec } from '@shared/docs/swagger.spec';

// Route imports
import authRoutes from '@modules/auth/auth.routes';
import usersRoutes from '@modules/users/users.routes';
import productsRoutes from '@modules/products/products.routes';
import categoriesRoutes from '@modules/categories/categories.routes';
import cartRoutes from '@modules/cart/cart.routes';
import ordersRoutes from '@modules/orders/orders.routes';
import paymentRoutes from '@modules/payment/payment.routes';
import transactionsRoutes from '@modules/transactions/transactions.routes';
import addressesRoutes from '@modules/addresses/addresses.routes';
import adminRoutes from '@modules/admin/admin.routes';

export const createApp = () => {
  const app = express();

  // ── Security headers ────────────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: env.NODE_ENV === 'production',
      crossOriginEmbedderPolicy: env.NODE_ENV === 'production',
    }),
  );

  // ── CORS ─────────────────────────────────────────────────────────────────
  app.use(
    cors({
      origin: env.NODE_ENV === 'production' ? env.FRONTEND_URL : true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
      exposedHeaders: ['X-Request-ID'],
    }),
  );

  // ── Body parsing ─────────────────────────────────────────────────────────
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ── HPP (HTTP Parameter Pollution) protection ────────────────────────────
  app.use(hpp());

  // ── Request ID ───────────────────────────────────────────────────────────
  app.use(requestIdMiddleware);

  // ── Health check (before rate limiting) ─────────────────────────────────
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ── Swagger API docs ─────────────────────────────────────────────────────
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: 'Xbensieve API Docs',
      customCss: '.swagger-ui .topbar { background: #1a1a2e } .swagger-ui .topbar-wrapper img { display:none } .swagger-ui .topbar-wrapper::before { content:"dressify-vesti-api"; color:#fff; font-size:1.2rem; font-weight:700; padding-left:1rem; }',
      swaggerOptions: { persistAuthorization: true, docExpansion: 'none', filter: true },
    }),
  );

  // ── Landing page redirect ─────────────────────────────────────────────────
  app.get('/', (_req, res) => {
    res.redirect('/api/docs');
  });

  // ── API rate limiting ────────────────────────────────────────────────────
  app.use('/api', apiLimiter);

  // ── Routes ───────────────────────────────────────────────────────────────
  app.use('/api/users', authRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/products', productsRoutes);
  app.use('/api/categories', categoriesRoutes);
  app.use('/api/carts', cartRoutes);
  app.use('/api/orders', ordersRoutes);
  app.use('/api/vnpay', paymentRoutes);
  app.use('/api/transactions', transactionsRoutes);
  app.use('/api/addresses', addressesRoutes);
  app.use('/api/admin', adminRoutes);

  // ── 404 handler ──────────────────────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Route not found' });
  });

  // ── Centralized error handler ────────────────────────────────────────────
  app.use(errorHandler);

  return app;
};
