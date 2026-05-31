import type { OpenAPIV3 } from 'openapi-types';

export const swaggerSpec: OpenAPIV3.Document = {
  openapi: '3.0.3',
  info: {
    title: 'Ecommerce API',
    version: '2.0.0',
    description: 'Ecommerce API',
    contact: { name: 'Xbensieve Team', email: 'origamitobichii2801@gmail.com' },
  },
  servers: [
    { url: 'http://localhost:5000', description: 'Development' },
    { url: '#', description: 'Production' },
  ],
  tags: [
    { name: 'Auth', description: 'Authentication & registration' },
    { name: 'Users', description: 'User profile' },
    { name: 'Products', description: 'Product catalog' },
    { name: 'Categories', description: 'Product categories' },
    { name: 'Cart', description: 'Shopping cart' },
    { name: 'Orders', description: 'Order management' },
    { name: 'Payment', description: 'VNPay payment gateway' },
    { name: 'Addresses', description: 'Delivery addresses' },
    { name: 'Transactions', description: 'Transaction history' },
    { name: 'Admin', description: 'Admin operations' },
    { name: 'Health', description: 'System health' },
    { name: 'Catalog', description: 'Catalog history and recently viewed products' },
    { name: 'Promotions', description: 'Vouchers and flash sales' },
    { name: 'Logistics', description: 'Inbound logistics status updates' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your access token',
      },
    },
    schemas: {
      SuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          code: { type: 'string', example: 'UNAUTHORIZED' },
          message: { type: 'string' },
        },
      },
      ValidationError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          code: { type: 'string', example: 'VALIDATION_ERROR' },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
      RegisterRequest: {
        type: 'object',
        required: ['username', 'first_name', 'last_name', 'password', 'phone', 'email', 'dob'],
        properties: {
          username: { type: 'string', minLength: 8, example: 'johndoe01' },
          first_name: { type: 'string', example: 'John' },
          last_name: { type: 'string', example: 'Doe' },
          password: { type: 'string', minLength: 8, example: 'password123' },
          phone: { type: 'string', example: '0123456789' },
          email: { type: 'string', format: 'email', example: 'john@example.com' },
          dob: { type: 'string', format: 'date', example: '2000-01-15' },
          role: { type: 'string', enum: ['customer', 'seller', 'admin'], default: 'customer' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string', example: 'johndoe01' },
          password: { type: 'string', example: 'password123' },
        },
      },
      TokenResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          access_token: { type: 'string' },
          refresh_token: { type: 'string' },
        },
      },
      User: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          username: { type: 'string' },
          first_name: { type: 'string' },
          last_name: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
          avatar: { type: 'string', nullable: true },
          role: { type: 'string', enum: ['customer', 'seller', 'admin'] },
          status: { type: 'string', enum: ['active', 'inactive'] },
          isConfirmed: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Product: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          price: { type: 'number' },
          category_id: { type: 'string' },
          seller_id: { type: 'string' },
          variations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                size: { type: 'string' },
                color: { type: 'string' },
                price: { type: 'number' },
                stock_quantity: { type: 'integer' },
              },
            },
          },
          images: {
            type: 'array',
            items: { type: 'object', properties: { imageUrl: { type: 'string' }, isPrimary: { type: 'boolean' } } },
          },
        },
      },
      Category: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string', example: 'T-Shirts' },
          description: { type: 'string' },
        },
      },
      Address: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          full_name: { type: 'string' },
          phone: { type: 'string' },
          address_line: { type: 'string' },
          city: { type: 'string' },
          district: { type: 'string' },
          ward: { type: 'string' },
          is_default: { type: 'boolean' },
        },
      },
      Order: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          order_status: { type: 'string', enum: ['pending', 'completed', 'cancelled'] },
          total_amount: { type: 'number' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      PaginatedResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'array', items: {} },
          pagination: {
            type: 'object',
            properties: {
              page: { type: 'integer' },
              limit: { type: 'integer' },
              totalItems: { type: 'integer' },
              totalPages: { type: 'integer' },
            },
          },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: 'Missing or invalid token',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
      },
      NotFound: {
        description: 'Resource not found',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
      },
      ValidationError: {
        description: 'Validation failed',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidationError' } } },
      },
      TooManyRequests: {
        description: 'Rate limit exceeded',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        responses: { '200': { description: 'Server is healthy' } },
      },
    },
    '/api/users/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } } } },
        responses: {
          '201': { description: 'Registered — confirmation email sent' },
          '400': { $ref: '#/components/responses/ValidationError' },
          '409': { description: 'Username / email / phone already exists' },
          '429': { $ref: '#/components/responses/TooManyRequests' },
        },
      },
    },
    '/api/users/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login with username & password',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } } },
        responses: {
          '200': { description: 'Login successful', content: { 'application/json': { schema: { $ref: '#/components/schemas/TokenResponse' } } } },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '429': { $ref: '#/components/responses/TooManyRequests' },
        },
      },
    },
    '/api/users/login-google': {
      post: {
        tags: ['Auth'],
        summary: 'Login with Google OAuth token',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { token: { type: 'string' } } } } } },
        responses: {
          '200': { description: 'Login successful', content: { 'application/json': { schema: { $ref: '#/components/schemas/TokenResponse' } } } },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/users/refresh-token': {
      post: {
        tags: ['Auth'],
        summary: 'Rotate refresh token and get new access token',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { refresh_token: { type: 'string' } } } } } },
        responses: {
          '200': { description: 'New access token returned' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/users/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout and blacklist tokens',
        security: [{ bearerAuth: [] }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { refresh_token: { type: 'string' } } } } } },
        responses: { '200': { description: 'Logged out' }, '401': { $ref: '#/components/responses/Unauthorized' } },
      },
    },
    '/api/users/activate': {
      get: {
        tags: ['Auth'],
        summary: 'Activate account via email link',
        parameters: [
          { name: 'email', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'code', in: 'query', required: true, schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Account activated' }, '400': { description: 'Invalid or expired code' } },
      },
    },
    '/api/users/me': {
      get: {
        tags: ['Users'],
        summary: 'Get current user profile',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'User profile', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/products/search': {
      get: {
        tags: ['Products'],
        summary: 'Search & filter products',
        parameters: [
          { name: 'keyword', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['latest', 'price_asc', 'price_des'] } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'minPrice', in: 'query', schema: { type: 'number' } },
          { name: 'maxPrice', in: 'query', schema: { type: 'number' } },
        ],
        responses: {
          '200': { description: 'Paginated products', content: { 'application/json': { schema: { $ref: '#/components/schemas/PaginatedResponse' } } } },
        },
      },
    },
    '/api/products': {
      post: {
        tags: ['Products'],
        summary: 'Add a new product (seller only)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  product: { type: 'string', description: 'JSON stringified product data' },
                  variations: { type: 'string', description: 'JSON stringified variations array' },
                  images: { type: 'array', items: { type: 'string', format: 'binary' } },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Product created' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { description: 'Forbidden — seller role required' },
        },
      },
    },
    '/api/products/{id}': {
      put: {
        tags: ['Products'],
        summary: 'Update a product',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } } },
        responses: { '200': { description: 'Updated' }, '401': { $ref: '#/components/responses/Unauthorized' }, '404': { $ref: '#/components/responses/NotFound' } },
      },
      delete: {
        tags: ['Products'],
        summary: 'Soft-delete a product',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Deleted' }, '404': { $ref: '#/components/responses/NotFound' } },
      },
    },
    '/api/categories': {
      get: {
        tags: ['Categories'],
        summary: 'List all categories',
        responses: { '200': { description: 'Categories list' } },
      },
      post: {
        tags: ['Categories'],
        summary: 'Create a category (admin only)',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Category' } } } },
        responses: { '201': { description: 'Created' }, '409': { description: 'Name already exists' } },
      },
    },
    '/api/categories/{id}': {
      get: { tags: ['Categories'], summary: 'Get category by ID', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Category' }, '404': { $ref: '#/components/responses/NotFound' } } },
      put: { tags: ['Categories'], summary: 'Update category', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Category' } } } }, responses: { '200': { description: 'Updated' } } },
      delete: { tags: ['Categories'], summary: 'Delete category', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Deleted' } } },
    },
    '/api/carts': {
      get: { tags: ['Cart'], summary: 'Get current user cart', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Cart contents' }, '401': { $ref: '#/components/responses/Unauthorized' } } },
    },
    '/api/carts/add': {
      post: {
        tags: ['Cart'],
        summary: 'Add item to cart',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['productId', 'variationId', 'quantity'], properties: { productId: { type: 'string' }, variationId: { type: 'string' }, quantity: { type: 'integer', minimum: 1 } } } } } },
        responses: { '200': { description: 'Item added' }, '404': { $ref: '#/components/responses/NotFound' } },
      },
    },
    '/api/carts/{cartItemId}': {
      put: { tags: ['Cart'], summary: 'Update cart item quantity', security: [{ bearerAuth: [] }], parameters: [{ name: 'cartItemId', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { quantity: { type: 'integer' } } } } } }, responses: { '200': { description: 'Updated' } } },
      delete: { tags: ['Cart'], summary: 'Remove item from cart', security: [{ bearerAuth: [] }], parameters: [{ name: 'cartItemId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Removed' } } },
    },
    '/api/orders': {
      post: { tags: ['Orders'], summary: 'Create order from product list', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { products: { type: 'array', items: { type: 'object', properties: { _id: { type: 'string' }, product_id: { type: 'string' }, price: { type: 'number' }, quantity: { type: 'integer' } } } } } } } } }, responses: { '200': { description: 'Order created' }, '400': { description: 'Insufficient stock or no default address' } } },
    },
    '/api/orders/from-cart': {
      post: { tags: ['Orders'], summary: 'Create order from selected cart items', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { cartItemIds: { type: 'array', items: { type: 'string' } } } } } } }, responses: { '200': { description: 'Order created, cart items removed' } } },
    },
    '/api/orders/my-orders': {
      get: { tags: ['Orders'], summary: 'Get paginated order history', security: [{ bearerAuth: [] }], parameters: [{ name: 'page', in: 'query', schema: { type: 'integer' } }, { name: 'limit', in: 'query', schema: { type: 'integer' } }], responses: { '200': { description: 'Order list with details and images' } } },
    },
    '/api/vnpay/create-payment-url': {
      post: { tags: ['Payment'], summary: 'Generate VNPay payment URL', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { orderId: { type: 'string' } } } } } }, responses: { '200': { description: 'Payment URL returned' } } },
    },
    '/api/vnpay/handle-payment-response': {
      get: { tags: ['Payment'], summary: 'VNPay callback — redirects to frontend', parameters: [{ name: 'vnp_ResponseCode', in: 'query', schema: { type: 'string' } }, { name: 'vnp_TxnRef', in: 'query', schema: { type: 'string' } }], responses: { '302': { description: 'Redirects to success or failure page' } } },
    },
    '/api/addresses': {
      get: { tags: ['Addresses'], summary: 'List user addresses', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Address list' } } },
      post: { tags: ['Addresses'], summary: 'Add a new address', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Address' } } } }, responses: { '201': { description: 'Address created' } } },
    },
    '/api/addresses/{id}': {
      put: { tags: ['Addresses'], summary: 'Update address', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Address' } } } }, responses: { '200': { description: 'Updated' } } },
      delete: { tags: ['Addresses'], summary: 'Delete address', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Deleted' } } },
    },
    '/api/addresses/{id}/default': {
      patch: { tags: ['Addresses'], summary: 'Set address as default', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Default updated' } } },
    },
    '/api/transactions/my': {
      get: { tags: ['Transactions'], summary: 'Get user transaction history', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Transaction list' } } },
    },
    '/api/admin/users': {
      get: { tags: ['Admin'], summary: 'List all users', security: [{ bearerAuth: [] }], responses: { '200': { description: 'User list' }, '403': { description: 'Admin only' } } },
    },
    '/api/admin/users/{id}/status': {
      patch: { tags: ['Admin'], summary: 'Activate or deactivate a user', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', enum: ['active', 'inactive'] } } } } } }, responses: { '200': { description: 'Status updated' } } },
    },
    '/api/admin/orders': {
      get: { tags: ['Admin'], summary: 'List all orders', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Orders' } } },
    },
    '/api/admin/orders/{id}/status': {
      patch: { tags: ['Admin'], summary: 'Update order status', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { order_status: { type: 'string', enum: ['pending', 'completed', 'cancelled'] } } } } } }, responses: { '200': { description: 'Updated' } } },
    },
    '/api/admin/statistics': {
      get: { tags: ['Admin'], summary: 'Platform statistics', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Stats: users, orders, revenue, products' } } },
    },
    '/api/admin/export/orders': {
      get: {
        tags: ['Admin'],
        summary: 'Stream all orders as a CSV file (Admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'completed', 'cancelled'] }, description: 'Filter by order status' },
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date-time' }, description: 'Filter by start date (ISO 8601)' },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date-time' }, description: 'Filter by end date (ISO 8601)' },
          { name: 'sellerId', in: 'query', schema: { type: 'string' }, description: 'Filter by seller ID' }
        ],
        responses: {
          '200': {
            description: 'CSV stream initiated',
            headers: {
              'Content-Type': { schema: { type: 'string', example: 'text/csv' } },
              'Content-Disposition': { schema: { type: 'string', example: 'attachment; filename="orders_export_xyz.csv"' } }
            }
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { description: 'Forbidden — Admin only' }
        }
      }
    },
    '/api/catalog/recently-viewed': {
      post: {
        tags: ['Catalog'],
        summary: 'Record product view in history',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['productId'],
                properties: {
                  productId: { type: 'string', example: '60c72b2f9b1d8e123456789a' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Product view recorded',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Product view recorded' }
                  }
                }
              }
            }
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '401': { $ref: '#/components/responses/Unauthorized' }
        }
      },
      get: {
        tags: ['Catalog'],
        summary: 'Get recently viewed products',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 20, default: 20 },
            description: 'Number of items to retrieve (max 20)'
          }
        ],
        responses: {
          '200': {
            description: 'List of recently viewed products',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Product' }
                    },
                    total: { type: 'integer', example: 1 }
                  }
                }
              }
            }
          },
          '401': { $ref: '#/components/responses/Unauthorized' }
        }
      },
      delete: {
        tags: ['Catalog'],
        summary: 'Clear recently viewed history',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'History cleared',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Recently viewed history cleared' }
                  }
                }
              }
            }
          },
          '401': { $ref: '#/components/responses/Unauthorized' }
        }
      }
    },
    '/api/promotions/vouchers/apply': {
      post: {
        tags: ['Promotions'],
        summary: 'Apply a voucher discount to an order',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['code', 'orderAmount'],
                properties: {
                  code: { type: 'string', example: 'SAVE20' },
                  orderAmount: { type: 'number', minimum: 0.01, example: 150 }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Voucher applied successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        code: { type: 'string', example: 'SAVE20' },
                        discountType: { type: 'string', enum: ['percentage', 'fixed'], example: 'percentage' },
                        discountValue: { type: 'number', example: 20 },
                        calculatedDiscount: { type: 'number', example: 30 },
                        finalAmount: { type: 'number', example: 120 }
                      }
                    }
                  }
                }
              }
            }
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '401': { $ref: '#/components/responses/Unauthorized' }
        }
      }
    },
    '/api/promotions/flash-sales/reserve': {
      post: {
        tags: ['Promotions'],
        summary: 'Reserve flash sale stock for a product variation',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['variationId', 'quantity'],
                properties: {
                  variationId: { type: 'string', example: '60c72b2f9b1d8e123456789b' },
                  quantity: { type: 'integer', minimum: 1, maximum: 100, example: 2 }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Inventory reserved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        variationId: { type: 'string', example: '60c72b2f9b1d8e123456789b' },
                        quantity: { type: 'integer', example: 2 },
                        remaining: { type: 'integer', example: 8 },
                        salePrice: { type: 'number', example: 80 }
                      }
                    }
                  }
                }
              }
            }
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' }
        }
      }
    },
    '/api/v1/webhooks/shipment-status': {
      post: {
        tags: ['Logistics'],
        summary: 'Receive carrier shipment tracking updates',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['event_id', 'order_id', 'tracking_number', 'status', 'carrier_code', 'event_timestamp'],
                properties: {
                  event_id: { type: 'string', example: 'EVT-100234' },
                  order_id: { type: 'string', example: '60c72b2f9b1d8e123456789c' },
                  tracking_number: { type: 'string', example: 'VNPOST123456' },
                  status: { type: 'string', enum: ['pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed_attempt', 'returned', 'cancelled'], example: 'in_transit' },
                  carrier_code: { type: 'string', example: 'VNPOST' },
                  description: { type: 'string', example: 'Departed from Hanoi hub' },
                  location: { type: 'string', example: 'Hanoi' },
                  event_timestamp: { type: 'string', format: 'date-time', example: '2026-05-31T14:05:00Z' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Webhook processed successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        event_id: { type: 'string', example: 'EVT-100234' },
                        duplicate: { type: 'boolean', example: false }
                      }
                    }
                  }
                }
              }
            }
          },
          '400': { $ref: '#/components/responses/ValidationError' }
        }
      }
    }
  },
};
