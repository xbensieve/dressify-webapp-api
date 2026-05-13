# dressify-vesti-api

A production-grade, highly scalable e-commerce backend API. Built with Node.js, Express, TypeScript, MongoDB, and Redis. Features a modular monolith architecture, queue-based background processing, real-time WebSockets, and comprehensive security middleware.

## Features

- **Robust Authentication:** JWT-based auth with refresh token rotation, blacklisting, and Google OAuth integration.
- **Product & Inventory Management:** Variations (size, color), stock tracking, and Cloudinary image uploads.
- **Cart & Order Processing:** Transactions, cart management, and MongoDB ACID transactions for checkout integrity.
- **Payment Gateway Integration:** Integrated with VNPay for secure transactions.
- **Background Processing:** BullMQ & Redis for async tasks (emails, analytics, image processing).
- **Real-time Capabilities:** Native WebSocket gateway for live updates.
- **Enterprise Security:** Helmet, HPP (HTTP Parameter Pollution prevention), advanced rate-limiting, CORS, and MongoDB query sanitization.
- **Observability:** Structured JSON logging via Pino, ready for GCP Cloud Logging/Datadog.
- **API Documentation:** Interactive OpenAPI 3.0 (Swagger) UI.

## Tech Stack

| Category | Technology |
|---|---|
| **Runtime** | Node.js (v20+ / v22 recommended) |
| **Language** | TypeScript (Strict mode, ES2022) |
| **Framework** | Express.js |
| **Database** | MongoDB (Mongoose) |
| **Cache & Queues** | Redis, BullMQ |
| **Validation** | Zod |
| **Testing** | Vitest, Supertest, MongoDB Memory Server |
| **Tooling** | ESLint, Prettier, tsx, tsc-alias |

## Architecture Overview

This project implements a **Modular Monolith** using **Clean Architecture** principles.

- **`src/modules/`**: Feature-based slices (e.g., Auth, Products, Orders, Cart). Each module contains:
  - `*.routes.ts` (Express routing)
  - `*.controller.ts` (HTTP request/response handling)
  - `*.service.ts` (Core business logic)
  - `*.repository.ts` (Database interaction abstraction)
  - `*.schema.ts` (Mongoose models)
  - `*.validator.ts` (Zod schemas)
- **`src/infrastructure/`**: External services setup (MongoDB, Redis, BullMQ, WebSockets, Cloudinary, Mailer).
- **`src/shared/`**: Global utilities (Error handling, Logger, Rate Limiters, Types).
- **`src/workers/`**: BullMQ consumer logic executed in a separate process/container.

## Installation

### Prerequisites
- Node.js >= 20
- MongoDB instance (local or Atlas)
- Redis server
- Cloudinary Account
- Google OAuth Client ID
- VNPay Sandbox Credentials

### Setup Steps
1. Clone the repository and install dependencies:
```bash
npm install
```
2. Copy the environment variables:
```bash
cp .env.example .env
```

## Environment Variables

Configure the `.env` file with your credentials:

| Variable | Description |
|---|---|
| `NODE_ENV` | `development`, `production`, or `test` |
| `PORT` | API Server port (Default: 5000) |
| `BACKEND_URL` | Base URL for backend (e.g., `http://localhost:5000`) |
| `FRONTEND_URL` | Frontend URL for CORS configuration |
| `MONGO_URI` | MongoDB connection string |
| `REDIS_HOST` / `PORT` / `USERNAME` / `PASSWORD` | Redis connection details |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | 32+ character secrets for token signing |
| `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | Token lifespans (e.g., `15m`, `7d`) |
| `CLOUDINARY_*` | Credentials for image storage |
| `ADMIN_EMAIL` / `PASSWORD` | Gmail SMTP credentials for sending emails |
| `GOOGLE_CLIENT_ID` | OAuth2 Client ID |
| `GEMINI_API_KEY` | Key for AI features (if applicable) |
| `VNP_*` | VNPay integration credentials & endpoint configuration |
| `TIMEZONE` | e.g., `Asia/Ho_Chi_Minh` |

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts API in dev mode using `tsx` (auto-kills dangling port 5000 first) |
| `npm run build` | Compiles TS to JS into `dist/` and resolves path aliases |
| `npm start` | Runs the compiled production server (`dist/server.js`) |
| `npm run worker` | Starts the BullMQ background worker process |
| `npm run typecheck` | Validates TypeScript without emitting files |
| `npm run lint` / `lint:fix` | Runs ESLint / Fixes auto-fixable issues |
| `npm run format` | Formats code with Prettier |
| `npm test` | Runs the Vitest test suite |
| `npm run test:e2e` | Runs End-to-End tests |

## Running Locally

To run the API server in watch mode:
```bash
npm run dev
```

To run the background workers (in a separate terminal):
```bash
npm run worker
```

## Build Instructions

The project uses `tsc` coupled with `tsc-alias` to resolve `@modules/*`, `@shared/*` imports mapped in `tsconfig.json`.

```bash
npm run build
```
Build output is generated in the `dist/` directory.

## API Documentation

Once the server is running, the interactive **Swagger/OpenAPI UI** is available at:

👉 `http://localhost:5000/api/docs`

The root path (`/`) automatically redirects to this documentation.

## Authentication & Security

- **Flow**: Stateless JWT. Short-lived Access Tokens (passed via `Bearer` header) and long-lived Refresh Tokens.
- **Middleware**:
  - `verifyToken`: Validates JWT and injects user context.
  - `requireSeller` / `requireAdmin`: Role-based access control (RBAC).
  - `apiLimiter` / `authLimiter` / `uploadLimiter`: Distributed Redis-backed rate limiting.

## Request/Response Format

The API enforces strict JSON responses structured globally via the `errorHandler` middleware.

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message"
}
```

**Error Response:**
```json
{
  "success": false,
  "code": "UNAUTHORIZED",
  "message": "Invalid token"
}
```

## Testing

The project uses **Vitest** and **Supertest**. Tests are categorized into `unit`, `integration`, and `e2e`. An in-memory MongoDB (`mongodb-memory-server`) is spun up for database tests.

```bash
# Run all tests
npm test

# Run tests with coverage report
npm run test:coverage

# Run specific E2E suite
npm run test:e2e
```

## Linting & Formatting

Code quality is enforced using **ESLint** (with TypeScript plugins) and **Prettier**.
```bash
npm run lint
npm run format
```

## Docker Usage

The project includes a multi-stage `Dockerfile` optimized for production, separating dependencies, build, and runner stages, executing as a non-root user.

A `docker-compose.yml` is provided for full stack orchestration.

```bash
# Start the entire stack (API, Worker, MongoDB, Redis, Nginx)
docker-compose up -d --build

# View logs
docker-compose logs -f api
```

### Docker Compose Architecture
- **api**: Main Express backend on port 5000.
- **worker**: Headless process processing BullMQ jobs.
- **mongodb**: Stateful database container.
- **redis**: Cache and PubSub broker.
- **nginx**: Reverse proxy exposing the API on ports 80/443.

## Security Practices

- **Helmet**: Secures Express apps by setting various HTTP headers.
- **HPP**: Protects against HTTP Parameter Pollution attacks.
- **Mongo-Sanitize**: Prevents NoSQL injection by stripping forbidden characters (`$`, `.`) from inputs.
- **CORS**: Strictly restricted to `FRONTEND_URL` in production.
- **Rate Limiting**: Distributed across instances via `rate-limit-redis`.
- **Secrets**: No secrets checked into source control; managed entirely via `.env`.

## License

ISC License.