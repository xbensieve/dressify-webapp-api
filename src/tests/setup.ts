import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { beforeAll, afterAll, afterEach, vi } from 'vitest';

let mongod: MongoMemoryReplSet;

// Mock environment before imports
vi.mock('@shared/config/env.js', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: 5001,
    MONGO_URI: 'mongodb://localhost:27017/test',
    REDIS_HOST: 'localhost',
    REDIS_PORT: 6379,
    REDIS_USERNAME: 'default',
    JWT_SECRET: 'test_secret_min_16_chars_long',
    JWT_REFRESH_SECRET: 'test_refresh_secret_min_16_chars',
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
    CLOUDINARY_CLOUD_NAME: 'test',
    CLOUDINARY_API_KEY: 'test',
    CLOUDINARY_API_SECRET: 'test',
    ADMIN_EMAIL: 'test@test.com',
    ADMIN_PASSWORD: 'testpass',
    GOOGLE_CLIENT_ID: 'test',
    GEMINI_API_KEY: 'test',
    VNP_TMN_CODE: 'test',
    VNP_HASH_SECRET: 'test_hash_secret',
    VNP_BASEURL: 'https://sandbox.vnpayment.vn',
    VNP_RETURN_URL: 'http://localhost:5001/api/vnpay/handle-payment-response',
    VNP_COMMAND: 'pay',
    VNP_CURRCODE: 'VND',
    VNP_VERSION: '2.1.0',
    VNP_LOCALE: 'vn',
    TIMEZONE: 'Asia/Ho_Chi_Minh',
    BACKEND_URL: 'http://localhost:5001',
    FRONTEND_URL: 'http://localhost:3000',
  },
}));

// Mock Redis / cache service
vi.mock('@infrastructure/cache/cache.service.js', () => ({
  cacheService: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    del: vi.fn().mockResolvedValue(undefined),
    exists: vi.fn().mockResolvedValue(false),
    expire: vi.fn().mockResolvedValue(undefined),
    blacklistToken: vi.fn().mockResolvedValue(undefined),
    invalidateByPattern: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock mailer
vi.mock('@infrastructure/mailer/mailer.js', () => ({
  sendMail: vi.fn().mockResolvedValue(undefined),
  sendMailDirect: vi.fn().mockResolvedValue(undefined),
}));

beforeAll(async () => {
  mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = mongod.getUri();
  await mongoose.connect(uri);
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  await Promise.all(Object.values(collections).map((col) => col.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});
