import e from "express";
import express from "express";
const router = express.Router();

router.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Xbensieve E-Commerce API</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: linear-gradient(to right, #f0f4ff, #d6e4f0);
          color: #333;
          margin: 0;
          padding: 2rem;
        }
        .container {
          max-width: 800px;
          margin: auto;
          background: white;
          padding: 2.5rem;
          border-radius: 12px;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
        }
        h1 {
          color: #2c3e50;
          text-align: center;
        }
        p {
          font-size: 1.1rem;
          line-height: 1.6;
          text-align: center;
        }
        ul {
          list-style: none;
          padding: 0;
          margin-top: 2rem;
        }
        li {
          margin: 0.8rem 0;
          font-size: 1.05rem;
        }
        a {
          text-decoration: none;
          color: #2980b9;
          font-weight: bold;
        }
        a:hover {
          text-decoration: underline;
        }
        .footer {
          margin-top: 2.5rem;
          text-align: center;
          font-size: 0.9rem;
          color: #888;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🛍️ Xbensieve E-Commerce API</h1>
        <p>Welcome to the official API of Xbensieve — your destination for stylish clothes, premium accessories, and modern lifestyle products.</p>
        
        <h2>🔗 Available Endpoints</h2>
        <ul>
          <li><a href="/api/products">/api/products</a> – Manage products (clothes, accessories, etc.)</li>
          <li><a href="/api/users">/api/users</a> – User registration and authentication</li>
          <li><a href="/api/orders">/api/orders</a> – Customer order management</li>
          <li><a href="/api/vnpay">/api/vnpay</a> – VNPAY payment integration</li>
          <li><a href="/api/categories">/api/categories</a> – Organize products into categories</li>
        </ul>

        <div class="footer">
          © ${new Date().getFullYear()} Xbensieve. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `);
});

export default router;
