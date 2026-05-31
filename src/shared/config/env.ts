import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  BACKEND_URL: z.string().url().default('http://localhost:5000'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),

  // MongoDB
  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),

  // Redis
  REDIS_USERNAME: z.string().default('default'),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_HOST: z.string().min(1, 'REDIS_HOST is required'),
  REDIS_PORT: z.coerce.number().default(6379),

  // JWT
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().min(1, 'CLOUDINARY_CLOUD_NAME is required'),
  CLOUDINARY_API_KEY: z.string().min(1, 'CLOUDINARY_API_KEY is required'),
  CLOUDINARY_API_SECRET: z.string().min(1, 'CLOUDINARY_API_SECRET is required'),

  // Email
  ADMIN_EMAIL: z.string().email('ADMIN_EMAIL must be a valid email'),
  ADMIN_PASSWORD: z.string().min(1, 'ADMIN_PASSWORD is required'),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID is required'),

  // Gemini AI
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),

  // VNPay
  VNP_TMN_CODE: z.string().min(1, 'VNP_TMN_CODE is required'),
  VNP_HASH_SECRET: z.string().min(1, 'VNP_HASH_SECRET is required'),
  VNP_BASEURL: z.string().url().default('https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'),
  VNP_RETURN_URL: z.string().url(),
  VNP_COMMAND: z.string().default('pay'),
  VNP_CURRCODE: z.string().default('VND'),
  VNP_VERSION: z.string().default('2.1.0'),
  VNP_LOCALE: z.string().default('vn'),

  // Timezone
  TIMEZONE: z.string().default('Asia/Ho_Chi_Minh'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
