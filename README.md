# Xbensieve E-Commerce API

Welcome to the Xbensieve E-Commerce API! This is a backend RESTful API and WebSocket server for an e-commerce platform focused on selling clothes, accessories, and lifestyle products. The project is built with Node.js, Express, MongoDB, and integrates with services like Cloudinary, Redis, Google OAuth, and VNPAY.

---

## Features

- **User Authentication & Registration**
  - JWT-based authentication (access & refresh tokens)
  - Email confirmation for new users
  - Google OAuth login
  - Role-based access (customer, admin, seller)
  - TK: User12345
  - MK: User12345@
- **Product Management**
  - CRUD for products, categories, and product variations
  - Product image uploads (Cloudinary)
  - Product search with filtering, sorting, and pagination
- **Cart & Order Management**
  - Add, update, and remove items in cart
  - Create orders from cart or direct product selection
  - View order history and order details
- **Address Management**
  - Add, edit, delete, and set default shipping addresses
- **Payment Integration**
  - VNPAY payment gateway for order checkout
  - Transaction tracking
- **Admin Features**
  - View transaction details (admin only)
  - TK: OAdmin2801
  - MK: Admin123
- **AI Chatbot**
  - WebSocket-based Gemini AI chatbot with Redis-powered chat history
- **Security**
  - Rate limiting, CORS, Helmet for HTTP headers
  - Secure password hashing (bcrypt)
- **Other Integrations**
  - Nodemailer for transactional emails
  - Redis for caching/chat history

---

## Project Structure

```
.
├── config/           # Configuration for DB, Redis, Cloudinary
├── controllers/      # Route handlers for business logic
├── middlewares/      # Express middlewares (auth, etc.)
├── models/           # Mongoose models (User, Product, Order, etc.)
├── routes/           # Express route definitions
├── services/         # External service integrations (AI, Google Auth)
├── utils/            # Utility functions (mailer, token, cloudinary)
├── uploads/          # Uploaded files (temporary, gitignored)
├── server.js         # Main entry point (Express + WebSocket)
├── package.json
├── .env
└── .gitignore
```

---

## Getting Started

### 1. Prerequisites

- Node.js v16+
- MongoDB instance
- Redis instance
- Cloudinary account
- Gmail account for sending emails
- Google Cloud OAuth credentials
- VNPAY sandbox credentials

### 2. Installation

Clone the repository and install dependencies:

```sh
git clone https://github.com/xbensieve/dressify-webapp-api.git
cd dressify-webapp-api
npm install
```

### 3. Environment Variables

Create a `.env` file in the root directory with the following variables:

```
PORT=5000
MONGO_URI=your_mongodb_connection_string

JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_jwt_refresh_secret

CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

ADMIN_EMAIL=your_gmail_address
ADMIN_PASSWORD=your_gmail_app_password

GOOGLE_CLIENT_ID=your_google_client_id

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_USERNAME=default
REDIS_PASSWORD=your_redis_password

GEMINI_API_KEY=your_gemini_api_key

VNP_TMN_CODE=your_vnpay_tmn_code
VNP_HASH_SECRET=your_vnpay_hash_secret
VNP_RETURN_URL=https://your-frontend.com/payment-callback

BACKEND_URL=http://localhost:5000
```

### 4. Running the Server

Start the development server:

```sh
npm run dev
```

- Express API: `http://localhost:5000`
- WebSocket: `ws://localhost:5000`

---

## API Endpoints

See [routes/general.route.js](routes/general.route.js) for a pretty HTML overview.

### Main Endpoints

- `POST /api/users/register` — Register a new user
- `POST /api/users/login` — Login with username/password
- `POST /api/users/login-google` — Login with Google OAuth
- `GET /api/users/me` — Get user profile (auth required)
- `GET /api/products/search` — Search products
- `POST /api/products` — Add product (admin/seller only)
- `PUT /api/products/:id` — Update product
- `DELETE /api/products/:id` — Delete product
- `GET /api/categories` — List categories
- `POST /api/orders` — Create order
- `POST /api/orders/from-cart` — Create order from cart
- `GET /api/orders` — List user orders
- `POST /api/carts/items` — Add to cart
- `GET /api/carts/items` — Get cart items
- `PUT /api/carts/items/:cartItemId` — Update cart item
- `DELETE /api/carts/items/:cartItemId` — Remove cart item
- `POST /api/vnpay/generate-payment-url` — Get VNPAY payment URL
- `GET /api/vnpay/handle-payment-response` — VNPAY callback

### WebSocket (AI Chatbot)

- Connect to `ws://localhost:5000?userId=your_user_id`
- Send messages as JSON: `{ "type": "message", "text": "your question" }`
- Special types: `"init"` (get chat history), `"clear"` (clear chat)

---

## Development Notes

- **MongoDB Models:** See [models/](models/) for all data schemas.
- **Authentication:** JWT tokens required for most endpoints. Use the `Authorization: Bearer <token>` header.
- **Image Uploads:** Product images are uploaded to Cloudinary.
- **Email:** Uses Gmail SMTP via Nodemailer for account confirmation.
- **Payments:** VNPAY integration for payment processing.
- **AI Chatbot:** Uses Google Gemini API, chat history stored in Redis.

---

## Contributing

Pull requests and issues are welcome! Please open an issue for bugs or feature requests.

---

## License

This project is licensed under the ISC License.

---

## Contact

For questions or support, contact [bennguyen.contact@gmail.com](mailto: bennguyen.contact@gmail.com).
