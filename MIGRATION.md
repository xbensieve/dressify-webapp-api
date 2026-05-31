# Migration Guide: JS → TypeScript

## Overview

This guide explains the step-by-step migration from the original flat-file JavaScript backend to the new production-grade TypeScript modular monolith.

## Breaking Changes

> [!WARNING]
> **None for API consumers.** All REST endpoint paths and response shapes are preserved exactly.

> [!IMPORTANT]
> **Refresh token behavior change**: Refresh tokens are now single-use (rotation). Each `/refresh-token` call returns a new refresh token and invalidates the old one. Update your frontend to store and use the new refresh token from each response.

## Step-by-Step Migration

### 1. Install dependencies

```bash
npm install
```

### 2. Copy environment variables

```bash
cp .env.example .env
# Fill in your actual values
```

> [!NOTE]
> New required variables: none (all new vars have defaults).
> Optional new variables: `FRONTEND_URL`, `NODE_ENV`.

### 3. Run TypeScript type check

```bash
npm run typecheck
```

### 4. Start development server

```bash
npm run dev
# Server starts at http://localhost:5000
```

### 5. Start queue workers (separate terminal)

```bash
npm run worker
# Workers process: email, image-processing, analytics queues
```

## File Mapping

| Old File | New Location |
|----------|-------------|
| `server.js` | `src/server.ts` + `src/app.ts` |
| `controllers/user.controller.js` | `src/modules/auth/` + `src/modules/users/` |
| `controllers/product.controller.js` | `src/modules/products/` |
| `controllers/order.controller.js` | `src/modules/orders/` |
| `controllers/cart.controller.js` | `src/modules/cart/` |
| `controllers/vnpay.controller.js` | `src/modules/payment/` |
| `controllers/category.controller.js` | `src/modules/categories/` |
| `controllers/address.controller.js` | `src/modules/addresses/` |
| `controllers/admin.controller.js` | `src/modules/admin/` |
| `controllers/transaction.controller.js` | `src/modules/transactions/` |
| `services/geminiChatBot.js` | `src/modules/ai-chat/` |
| `config/db.js` | `src/infrastructure/database/mongoose.ts` |
| `config/redis.js` | `src/infrastructure/cache/redis.client.ts` |
| `config/cloudinary.js` | `src/infrastructure/storage/cloudinary.ts` |
| `utils/mailer.js` | `src/infrastructure/mailer/mailer.ts` |
| `utils/token.js` | `src/modules/auth/auth.service.ts` |
| `middlewares/authMiddleware.js` | `src/shared/middleware/auth.middleware.ts` |

## Key Architectural Changes

| Old | New |
|-----|-----|
| `console.log` | Pino structured logger |
| Manual `if/else` validation | Zod schema validation |
| Fire-and-forget email | BullMQ email queue (retriable) |
| Stateless refresh tokens | Redis-backed rotation + blacklist |
| Flat middleware | Per-tier rate limiting |
| No tests | Vitest unit + integration + e2e |
| No Docker | Multi-stage Dockerfile + compose |
| No CI/CD | GitHub Actions |
| WebSocket in server.js | WebSocket gateway with Redis pub/sub |

## Running Tests

```bash
npm test
npm run test:coverage
```

## Rollback Plan

The original JS files remain in the old directories. To rollback:

```bash
node server.js  # original entry point still works
```
