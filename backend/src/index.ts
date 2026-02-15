import express, { Express, Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import { initializeDatabase, closeDatabase } from './config/database';
import { getRedis, closeRedis } from './config/redis';
import { config } from './config/config';
import applySecurityMiddleware, { requestSizeLimiter } from './middleware/security';
import { logger } from './utils/logger';

// Routes
import authRoutes from './routes/auth';
import searchRoutes from './routes/search';
import savedItemsRoutes from './routes/savedItems';
import comparisonsRoutes from './routes/comparisons';
import userRoutes from './routes/user';
import shopifyMCPRoutes from './routes/shopify-mcp';
import shopifyProductsRoutes from './routes/shopify-products';
import cjDropshippingRoutes from './routes/cj-dropshipping';
import partnerRoutes from './routes/partners';
import paymentRoutes from './routes/payments';

dotenv.config();

const app: Express = express();

// ============================================
// Security Middleware (helmet, CORS, request ID)
// ============================================
applySecurityMiddleware(app);

// ============================================
// Body Parsing with Size Limits
// ============================================
app.use(express.json(requestSizeLimiter.json));
app.use(express.urlencoded(requestSizeLimiter.urlencoded));

// Health check endpoint
app.get('/health', (req: Request, res: Response): void => {
  res.json({ status: 'ok', timestamp: new Date(), version: 'v1' });
});

// API versioning: v1
const apiV1 = express.Router();

// Routes under /api/v1
apiV1.use('/auth', authRoutes);
apiV1.use('/search', searchRoutes);
apiV1.use('/saved-items', savedItemsRoutes);
apiV1.use('/comparisons', comparisonsRoutes);
apiV1.use('/user', userRoutes);
apiV1.use('/shopify', shopifyMCPRoutes);
apiV1.use('/shopify/products', shopifyProductsRoutes);
apiV1.use('/cj', cjDropshippingRoutes);
apiV1.use('/partners', partnerRoutes);
apiV1.use('/payments', paymentRoutes);

app.use('/api/v1', apiV1);

// Backwards compatibility: keep /api routes pointing to v1
app.use('/api/search', searchRoutes);
app.use('/api/saved-items', savedItemsRoutes);
app.use('/api/comparisons', comparisonsRoutes);
app.use('/api/user', userRoutes);
app.use('/api/shopify', shopifyMCPRoutes);
app.use('/auth', authRoutes);

// 404 handler
app.use((req: Request, res: Response): void => {
  res.status(404).json({ 
    error: 'Not found', 
    path: req.path, 
    version: 'v1',
    requestId: req.headers['x-request-id'],
  });
});

// ============================================
// Global Error Handler (with proper Express signature)
// ============================================
app.use((err: Error, req: Request, res: Response, _next: NextFunction): void => {
  const requestId = req.headers['x-request-id'] as string;
  
  // Log the error with context
  logger.error('UNHANDLED_ERROR', 'Unhandled server error', err, {
    path: req.path,
    method: req.method,
    requestId,
  });
  
  // Don't leak error details in production
  const errorResponse: Record<string, unknown> = {
    error: 'Internal server error',
    version: 'v1',
    requestId,
  };
  
  // Include error message in development
  if (config.server.nodeEnv === 'development') {
    errorResponse.message = err.message;
    errorResponse.stack = err.stack;
  }
  
  res.status(500).json(errorResponse);
});

// Initialize and start server
async function start(): Promise<void> {
  try {
    // Initialize database
    await initializeDatabase();

    // Initialize Redis
    getRedis();

    // Start server
    app.listen(config.server.port, () => {
      console.log(`\n🔒 SourceScout API Server`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`✓ Server running on port ${config.server.port}`);
      console.log(`✓ Environment: ${config.server.nodeEnv}`);
      console.log(`✓ Security: Helmet + CORS enabled`);
      console.log(`✓ Shopify App URL: ${config.shopify.appUrl}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📡 API Endpoints:`);
      console.log(`   http://localhost:${config.server.port}/api/v1`);
      console.log(`   http://localhost:${config.server.port}/api/v1/shopify`);
      console.log(`   http://localhost:${config.server.port}/api/v1/cj`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n✓ Shutting down gracefully...');
  await closeDatabase();
  await closeRedis();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

start();
