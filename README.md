# 🛒 Dressify Vesti E-Commerce Backend API

A production-grade, highly scalable e-commerce backend API built with **Node.js**, **Express**, **TypeScript**, **MongoDB**, and **Redis**. Designed with a modular monolith architecture, queue-based background processing, real-time WebSockets, and comprehensive enterprise security.

---

## 🌟 Key Features

- 🔐 **Robust Authentication:** stateless JWT-based authentication with Refresh Token rotation, token blacklisting via Redis, and Google OAuth2 integration.
- 📦 **Product & Inventory Management:** Multi-variation tracking (size, color), stock verification, search query indexing, and Cloudinary-integrated media uploads.
- 🛍️ **Cart & Order Processing:** ACID transactions via MongoDB replica sets ensuring checkout and inventory count integrity.
- 💳 **Payment Gateway Integration:** Secure payment URL generation and response verification using **VNPay Sandbox**.
- 🤖 **AI Chat Assistant:** Personal shopping assistant powered by the **Gemini API** with Redis-cached user chat history.
- 🚀 **Background Processing:** Headless background worker powered by **BullMQ** & **Redis** processing emails, notifications, and analytics.
- 🔌 **Real-time Gateway:** Horizontal scaling-ready **WebSocket** gateway using Redis Pub/Sub for live messaging.
- 🛡️ **Enterprise Security:** Secure HTTP headers via Helmet, parameter pollution protection (HPP), Redis-backed distributed rate limiting, and NoSQL query sanitization.
- 📊 **High Observability:** Structured JSON logger via Pino with context tracking (X-Request-ID).
- 📝 **Interactive API Docs & Tooling:** Full OpenAPI 3.0 (Swagger) interactive UI and pre-configured Postman Collection.

---

## 🛠️ Technology Stack

| Category | Technology |
|---|---|
| **Runtime Environment** | Node.js (v20+ / v22 recommended) |
| **Language** | TypeScript (Strict mode, ES2022) |
| **Web Framework** | Express.js |
| **Primary Database** | MongoDB (Mongoose ODM) |
| **Cache & Message Broker** | Redis |
| **Queue Manager** | BullMQ |
| **Schema Validation** | Zod |
| **Testing Engine** | Vitest, Supertest, MongoDB Memory Server (Replica Set) |
| **API Documentation** | OpenAPI 3.0 (Swagger UI) & Postman |

---

## 📂 Architecture & Directory Structure

This project follows **Modular Monolith** and **Clean Architecture** patterns. Business logic is segregated into feature-based modules to preserve clean boundaries.

```
src/
├── infrastructure/     # Database, Redis, Queue, Cloudinary, Mailer connections
├── shared/             # Global Middlewares, Error classes, Loggers, Pagination utilities
├── workers/            # BullMQ background job processor logic
├── app.ts              # Express App setup, middlewares, and route registrations
├── server.ts           # HTTP & WebSocket servers initialization
└── modules/            # Domain Modules
    ├── addresses/      # Delivery Address Management
    ├── admin/          # Statistics & Operations (including order export stream)
    ├── ai-chat/        # AI conversation & Redis history
    ├── auth/           # Login, registration, token rotations
    ├── cart/           # Shopping Cart logic
    ├── catalog/        # Product view history & recommendations
    ├── categories/     # Category CRUD
    ├── logistics/      # Shipping webhook listener
    ├── orders/         # Order creation & processing
    ├── payment/        # VNPay integration
    ├── products/       # Product variations & inventory
    ├── transactions/   # Customer transaction logs
    └── users/          # User profiles
```

---

## ⚡ Quick Start

### Prerequisites
- Node.js >= 20.x
- MongoDB (Local or Atlas)
- Redis server
- Cloudinary, Google OAuth, Gemini API, and VNPay credentials

### Installation
1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```
2. Copy the sample environment file and configure your credentials:
   ```bash
   cp .env.example .env
   ```

### Running Locally

Run the main HTTP/WebSocket API server:
```bash
npm run dev
```

In a separate terminal, start the background queue worker:
```bash
npm run worker
```

---

## 📝 API Documentation & Postman

### Interactive Swagger UI
Once the server is running, you can explore, test, and view all documented endpoints at:
👉 **[http://localhost:5000/api/docs](http://localhost:5000/api/docs)**

*(Note: The root URL `/` automatically redirects here).*

### Postman Collection
A fully-configured Postman Collection is included in the root directory:
👉 **[ecommerce_api_postman_collection.json](./ecommerce_api_postman_collection.json)**

- Features organized folders for all API domains.
- Automatically handles token management: logging in saves the JWT into a `{{token}}` variable, authorizing all subsequent requests automatically.

---

## 🧪 Testing

The testing suite utilizes **Vitest** for fast, concurrent execution. For database-sensitive services (such as checkout and payment), an in-memory replica set (`MongoMemoryReplSet`) is initialized to mock ACID transactions safely.

```bash
# Run all unit, integration, and E2E tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests and generate a detailed HTML coverage report
npm run test:coverage
```

Current test suite achievements:
- **180 automated tests** passing successfully.
- **100% statement coverage** on critical modules: Cart, Orders, Payment, Addresses, and AI-chat.

---

## 🐳 Docker Deployment

For easy deployments, the backend utilizes optimized multi-stage builds.

Start the entire system locally (API, Worker, MongoDB, Redis, and Nginx proxy):
```bash
docker-compose up -d --build
```

View the live logs:
```bash
docker-compose logs -f api
```

---

## 🔒 Security Best Practices

- **Helmet:** Express headers configuration protecting against clickjacking, XSS, and sniff attacks.
- **HPP:** Blocks HTTP Parameter Pollution exploits.
- **Query Sanitization:** `mongo-sanitize` middleware prevents NoSQL injection attacks.
- **CORS:** Strictly scoped to the `FRONTEND_URL` in production environments.
- **Redis Rate Limiting:** Enforces limits on key endpoints using `rate-limit-redis`.

---

## 📄 License

This project is licensed under the ISC License.