import helmet from 'helmet';
import cors from 'cors';
import { Express, Request, Response, NextFunction } from 'express';
import { config } from '../config/config';

/**
 * Security Middleware Configuration
 * Implements best practices for production security
 */

// Allowed origins for CORS
const getAllowedOrigins = (): string[] => {
  const origins: string[] = [];
  
  // Always allow the configured app URL
  if (config.shopify.appUrl) {
    origins.push(config.shopify.appUrl);
  }
  
  // Development origins
  if (config.server.nodeEnv === 'development') {
    origins.push(
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:3002'
    );
  }
  
  // Allow additional origins from environment
  const additionalOrigins = process.env.CORS_ALLOWED_ORIGINS;
  if (additionalOrigins) {
    origins.push(...additionalOrigins.split(',').map(o => o.trim()));
  }
  
  return origins;
};

// CORS configuration
export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();
    
    // Allow requests with no origin (mobile apps, Postman, etc.) in development
    if (!origin && config.server.nodeEnv === 'development') {
      return callback(null, true);
    }
    
    // Check if origin is in the allowed list
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  maxAge: 86400, // 24 hours
};

// Helmet configuration for security headers
export const helmetConfig = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", 'https://developers.cjdropshipping.com', 'https://*.myshopify.com'],
      frameSrc: ["'self'", 'https://*.myshopify.com'],
      frameAncestors: ["'self'", 'https://*.myshopify.com', 'https://admin.shopify.com'],
    },
  },
  // Cross-Origin settings for Shopify embedded app
  crossOriginEmbedderPolicy: false, // Required for Shopify embedding
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  // Other security headers
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'sameorigin' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
});

// Request ID middleware for tracing
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = req.headers['x-request-id'] as string || 
    `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  
  next();
};

// Request size limiter
export const requestSizeLimiter = {
  json: { limit: '10mb' },
  urlencoded: { limit: '10mb', extended: true },
};

// Security error handler
export const securityErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err.message.includes('CORS')) {
    res.status(403).json({
      error: 'Forbidden',
      message: 'Cross-origin request blocked',
      requestId: req.headers['x-request-id'],
    });
    return;
  }
  next(err);
};

// Apply all security middleware to Express app
export function applySecurityMiddleware(app: Express): void {
  // Request ID first for tracing
  app.use(requestIdMiddleware);
  
  // Helmet security headers
  app.use(helmetConfig);
  
  // CORS with restricted origins
  app.use(cors(corsOptions));
  
  // Trust proxy for accurate IP detection behind load balancers
  if (config.server.nodeEnv === 'production') {
    app.set('trust proxy', 1);
  }
  
  // Security error handler
  app.use(securityErrorHandler);
}

export default applySecurityMiddleware;
