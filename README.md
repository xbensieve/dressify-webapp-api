
# E-Commerce API & Backend Services

**Fashion E-Commerce API** is a production-grade, highly scalable backend architecture engineered to power modern digital commerce ecosystems. Built on a robust **Node.js/TypeScript** foundation and implementing a **Modular Monolith** design pattern, the system delivers high-performance data processing, secure transactional integrity, and seamless third-party integrations.

---

## 🏛 Architectural Pillars

### 1. Transactional Integrity & Core Commerce

* **ACID-Compliant Transactions:** Utilizes MongoDB Replica Sets to guarantee data integrity across critical distributed operations (e.g., inventory deduction and order processing).
* **Payment Processing Orchestration:** Secure payment URL generation and cryptographic response verification integrated with **VNPay**.
* **Advanced Catalog Management:** Comprehensive multi-variation tracking (size, color, SKU), dynamic stock verification, and optimized search query indexing.

### 2. Performance & Asynchronous Operations

* **Distributed Background Processing:** Headless worker nodes powered by **BullMQ** and **Redis** for asynchronous task execution (email delivery, notifications, and analytics aggregation).
* **Real-Time Gateway:** Scalable **WebSocket** architecture utilizing Redis Pub/Sub for live bi-directional messaging and event broadcasting.
* **Optimized Media Delivery:** Seamless integration with Cloudinary for high-performance media upload and delivery.

### 3. Enterprise Security Posture

* **Advanced Authentication:** Stateless JWT-based authentication featuring refresh token rotation, Redis-backed token blacklisting, and Google OAuth2 integration.
* **Threat Mitigation:** Comprehensive protection layers including HTTP Parameter Pollution (HPP) prevention, Express Helmet headers (XSS/Clickjacking defense), and `mongo-sanitize` for NoSQL injection prevention.
* **Traffic Control:** Distributed, Redis-backed rate limiting to safeguard critical endpoints against abuse and DDoS attempts.

### 4. AI & Observability

* **Conversational AI Commerce:** Integrated personal shopping assistant powered by the **Gemini API**, maintaining context via Redis-cached user session history.
* **Deep Observability:** Structured JSON logging via **Pino**, implementing `X-Request-ID` context tracking for efficient distributed request tracing.

---

## 🛠 Technology Stack

| Category | Technology |
| --- | --- |
| **Runtime Environment** | Node.js (v20+ / v22 recommended) |
| **Language** | TypeScript (Strict mode, ES2022) |
| **Web Framework** | Express.js |
| **Primary Database** | MongoDB (Mongoose ODM) |
| **In-Memory Store & Broker** | Redis |
| **Queue Orchestration** | BullMQ |
| **Schema Validation** | Zod |
| **Testing Engine** | Vitest, Supertest, MongoMemoryReplSet |
| **API Documentation** | OpenAPI 3.0 (Swagger UI) & Postman |

---

## 📂 System Architecture

The codebase strictly adheres to **Clean Architecture** principles within a Modular Monolith structure. Domain logic is isolated into distinct modules to enforce clear boundaries and maintainability.

```text
src/
├── infrastructure/     # External services (DB, Redis, Queue, Cloudinary, Mailer)
├── shared/             # Cross-cutting concerns (Middlewares, Loggers, Error Handling)
├── workers/            # BullMQ background job processor definitions
├── app.ts              # Express application bootstrap & middleware registration
├── server.ts           # HTTP & WebSocket server initialization
└── modules/            # Isolated Domain Modules
    ├── addresses/      # Delivery Address Management
    ├── admin/          # Business Intelligence & Operations
    ├── ai-chat/        # AI conversation & Redis history state
    ├── auth/           # Identity & Access Management (IAM)
    ├── cart/           # Shopping Cart state management
    ├── catalog/        # Product view history & recommendations
    ├── orders/         # Order lifecycle management
    ├── payment/        # Payment gateway webhooks & processing
    ├── products/       # Inventory & Catalog logic
    └── users/          # User profile management

```

---

## 🚀 Infrastructure & Deployment

### Docker Containerization (Recommended)

The backend utilizes optimized, multi-stage Docker builds for consistent deployments across environments.

To provision the entire micro-infrastructure (API, Worker, MongoDB, Redis, and Nginx proxy) locally:

```bash
docker-compose up -d --build

```

Monitor system logs in real-time:

```bash
docker-compose logs -f api

```

### Local Development Setup

1. **Clone & Install:**
```bash
npm install

```


2. **Environment Configuration:**
```bash
cp .env.example .env
# Configure your MongoDB, Redis, Cloudinary, Gemini, and VNPay credentials

```


3. **Initialize Services:**
Run the main HTTP/WebSocket server:
```bash
npm run dev

```


Initialize the background queue worker (in a separate terminal):
```bash
npm run worker

```



---

## 🧪 Quality Assurance & Testing

The testing suite is powered by **Vitest** for concurrent execution. Critical transactional flows (Checkout, Payments) are tested against an in-memory replica set (`MongoMemoryReplSet`) to ensure ACID compliance without mutating production databases.

* `npm test` - Execute the full suite (Unit, Integration, E2E).
* `npm run test:watch` - Run in active development mode.
* `npm run test:coverage` - Generate comprehensive HTML coverage reports.

**Current QA Metrics:**

* **180+** automated tests passing consistently.
* **100% statement coverage** across mission-critical domains: *Cart, Orders, Payment, Addresses, and AI-chat*.

---

## 📚 API Documentation & Tooling

### Interactive Swagger UI

Explore the full OpenAPI 3.0 specification via the interactive portal (available when the server is running):
👉 **[http://localhost:5000/api/docs](http://localhost:5000/api/docs)**

### Postman Workspace Integration

A pre-configured Postman Collection is provided in the repository root (`ecommerce_api_postman_collection.json`).

* Pre-organized domain folders.
* **Automated Authentication:** Login endpoints automatically extract and inject the JWT into global variables (`{{token}}`) for subsequent authenticated requests.

---

## 📄 License

This enterprise solution is distributed under the ISC License.
