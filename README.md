# Dressify E-Commerce

Welcome to the **Dressify E-Commerce**, a robust backend solution for managing an e-commerce platform. This API provides endpoints for user authentication, product management, order processing, payment integration, and more. Built with scalability and security in mind, it serves as the backbone for modern e-commerce applications.

---

## Table of Contents

- [Introduction](#introduction)
- [Technologies Used](#technologies-used)
- [Features](#features)
- [Setup Instructions](#setup-instructions)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [License](#license)

---

## Introduction

The **Xbensieve E-Commerce API** is designed to handle the backend operations of an online store. It supports user registration, login (including Google OAuth), product and category management, order creation, and payment processing via VNPAY. The API is built using modern technologies to ensure performance, reliability, and security.

---

## Technologies Used

- **Node.js**: JavaScript runtime for building scalable server-side applications.
- **Express.js**: Web framework for building RESTful APIs.
- **MongoDB**: NoSQL database for storing application data.
- **Mongoose**: ODM library for MongoDB.
- **JWT**: For secure user authentication and authorization.
- **Nodemailer**: For sending transactional emails.
- **Google OAuth**: For social login functionality.
- **Helmet**: For securing HTTP headers.
- **Express Rate Limit**: To prevent abuse and DDoS attacks.
- **Cloudinary**: For managing and storing product images.
- **VNPAY**: For payment gateway integration.

---

## Features

- User authentication (JWT-based) and Google OAuth login.
- Product and category management.
- Order creation and management.
- Payment integration with VNPAY.
- Email notifications for user registration and order updates.
- Pagination and filtering for product listings.
- Secure API with rate limiting and input validation.

---

## Setup Instructions

Follow these steps to set up the project locally:

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/xbensieve/dressify-webapp-server.git
   cd selling-clothes-webapp/BE
2. Install Dependencies:
   ```bash
   npm install
3. Set Up Environment Variables: Create a .env file in the root directory and configure the required variables (see Environment Variables).
4. Start MongoDB: Ensure MongoDB is running locally or provide a connection string in the .env file.
5. Run the Application:
   ``bash
   npm run dev
>The server will start at http://localhost:5000.

Environment Variables

The application requires the following environment variables to be set in a .env file:
- MONGO_URI=your-mongodb-connection-string
- JWT_SECRET=your-jwt-secret
- JWT_REFRESH_SECRET=your-jwt-refresh-secret
- ADMIN_EMAIL=your-admin-email
- ADMIN_PASSWORD=your-email-password
- GOOGLE_CLIENT_ID=your-google-client-id
- VNP_TMN_CODE=your-vnpay-tmn-code
- VNP_HASH_SECRET=your-vnpay-hash-secret
- VNP_RETURN_URL=your-vnpay-return-url
- CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
- CLOUDINARY_API_KEY=your-cloudinary-api-key
- CLOUDINARY_API_SECRET=your-cloudinary-api-secret

---

## API Endpoints

### General

* **GET /**: Welcome page with API documentation.

### User

* **POST /api/users/register**: Register a new user.
* **POST /api/users/login**: Login with username and password.
* **POST /api/users/login-google**: Login with Google OAuth.
* **POST /api/users/refresh-token**: Refresh access token.

### Products

* **GET /api/products**: Get all products (supports pagination).
* **GET /api/products/\:id**: Get product by ID.
* **POST /api/products**: Add a new product.
* **PUT /api/products/\:id**: Update a product.
* **DELETE /api/products/\:id**: Delete a product.

### Categories

* **GET /api/categories**: Get all categories.
* **GET /api/categories/\:id**: Get category by ID.
* **POST /api/categories**: Create a new category.
* **PUT /api/categories/\:id**: Update a category.
* **DELETE /api/categories/\:id**: Delete a category.

### Orders

* **POST /api/orders**: Create a new order.

### VNPAY

* **POST /api/vnpay/generate-payment-url**: Generate a payment URL.
* **GET /api/vnpay/handle-payment-response**: Handle payment response.

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request for any improvements or bug fixes.

## Contact

For any inquiries or support, please contact the XBensieve Support Team at [bennguyen.contact@gmail.com](mailto:bennguyen.contact@gmail.com).

---

This version organizes the information clearly and concisely, making it easy to understand and navigate.

