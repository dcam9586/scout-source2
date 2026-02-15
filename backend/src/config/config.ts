import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Shopify
  shopify: {
    apiKey: process.env.SHOPIFY_API_KEY || '',
    apiSecret: process.env.SHOPIFY_API_SECRET || '',
    apiScopes: (process.env.SHOPIFY_API_SCOPES || 'read_products,write_products').split(','),
    appUrl: process.env.SHOPIFY_APP_URL || 'http://localhost:3000',
    backendUrl: process.env.BACKEND_URL || 'http://localhost:3001',
  },

  // Database
  database: {
    url: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/sourcescout',
  },

  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // Alibaba API
  alibaba: {
    clientId: process.env.ALIBABA_CLIENT_ID || '',
    clientSecret: process.env.ALIBABA_CLIENT_SECRET || '',
    apiUrl: process.env.ALIBABA_API_URL || 'https://api.alibaba.com',
  },

  // Made-in-China
  madeInChina: {
    url: process.env.MADE_IN_CHINA_URL || 'https://www.made-in-china.com',
  },

  // CJ Dropshipping
  cjDropshipping: {
    apiKey: process.env.CJ_API_KEY || '',
    apiUrl: process.env.CJ_API_URL || 'https://developers.cjdropshipping.com/api2.0/v1',
    sandboxMode: process.env.CJ_SANDBOX_MODE === 'true',
  },

  // Server
  server: {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3001', 10),
  },

  // Rate Limiting
  rateLimiting: {
    freeSearchesPerMonth: parseInt(process.env.FREE_TIER_SEARCHES_PER_MONTH || '10', 10),
    premiumUnlimited: process.env.PREMIUM_TIER_SEARCHES_UNLIMITED === 'true',
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiry: process.env.JWT_EXPIRY || '7d',
  },
};
