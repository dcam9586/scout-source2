import { body, query, param, validationResult, ValidationChain } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

/**
 * Input Validation Middleware
 * Prevents injection attacks and ensures data integrity
 */

// Validation error handler
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: 'path' in err ? err.path : 'unknown',
        message: err.msg,
      })),
      requestId: req.headers['x-request-id'],
    });
    return;
  }
  
  next();
};

// Helper to run validations
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await Promise.all(validations.map(validation => validation.run(req)));
    handleValidationErrors(req, res, next);
  };
};

// ============================================
// Search Validations
// ============================================

export const searchValidation = [
  body('query')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Search query must be between 2 and 200 characters')
    .escape(),
  body('sources')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Sources must be an array with max 10 items'),
  body('sources.*')
    .optional()
    .isIn(['alibaba', 'made-in-china', 'cj-dropshipping', 'shopify'])
    .withMessage('Invalid source specified'),
  body('page')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Page must be between 1 and 100'),
  body('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
];

// ============================================
// Saved Items Validations
// ============================================

export const saveItemValidation = [
  body('productId')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Product ID is required'),
  body('title')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Title is required and must be under 500 characters')
    .escape(),
  body('price')
    .optional()
    .isFloat({ min: 0, max: 1000000 })
    .withMessage('Price must be a positive number'),
  body('source')
    .isIn(['alibaba', 'made-in-china', 'cj-dropshipping', 'shopify'])
    .withMessage('Valid source is required'),
  body('imageUrl')
    .optional()
    .isURL({ protocols: ['http', 'https'] })
    .withMessage('Image URL must be a valid URL'),
  body('supplierUrl')
    .optional()
    .isURL({ protocols: ['http', 'https'] })
    .withMessage('Supplier URL must be a valid URL'),
];

export const savedItemIdValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid item ID is required'),
];

// ============================================
// Shopify Product Validations
// ============================================

export const pushToShopifyValidation = [
  body('savedItemId')
    .isInt({ min: 1 })
    .withMessage('Valid saved item ID is required'),
  body('title')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Title is required and must be under 255 characters'),
  body('description')
    .optional()
    .isLength({ max: 5000 })
    .withMessage('Description must be under 5000 characters'),
  body('price')
    .isFloat({ min: 0.01, max: 1000000 })
    .withMessage('Valid price is required'),
  body('compareAtPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Compare at price must be a positive number'),
  body('markup')
    .optional()
    .isFloat({ min: 0, max: 1000 })
    .withMessage('Markup must be between 0 and 1000 percent'),
];

export const batchPushValidation = [
  body('items')
    .isArray({ min: 1, max: 50 })
    .withMessage('Must provide between 1 and 50 items'),
  body('items.*.savedItemId')
    .isInt({ min: 1 })
    .withMessage('Valid saved item ID is required for each item'),
  body('items.*.title')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Title is required for each item'),
  body('items.*.price')
    .isFloat({ min: 0.01 })
    .withMessage('Valid price is required for each item'),
];

// ============================================
// Partner Export Validations
// ============================================

export const partnerExportValidation = [
  param('partner')
    .isIn(['csv', 'dropified', 'syncee', 'oberlo'])
    .withMessage('Invalid partner specified'),
  body('productIds')
    .isArray({ min: 1, max: 100 })
    .withMessage('Must provide between 1 and 100 product IDs'),
  body('productIds.*')
    .isInt({ min: 1 })
    .withMessage('Product IDs must be valid integers'),
  body('options')
    .optional()
    .isObject()
    .withMessage('Options must be an object'),
  body('options.markup')
    .optional()
    .isFloat({ min: 0, max: 1000 })
    .withMessage('Markup must be between 0 and 1000 percent'),
  body('options.includeImages')
    .optional()
    .isBoolean()
    .withMessage('includeImages must be a boolean'),
];

// ============================================
// User/Auth Validations
// ============================================

export const apiKeyValidation = [
  body('provider')
    .isIn(['alibaba', 'aliexpress', 'amazon', 'cj-dropshipping'])
    .withMessage('Invalid API provider'),
  body('apiKey')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('API key must be between 10 and 500 characters'),
  body('apiSecret')
    .optional()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('API secret must be between 10 and 500 characters'),
];

// ============================================
// Comparison Validations
// ============================================

export const comparisonValidation = [
  body('productIds')
    .isArray({ min: 2, max: 4 })
    .withMessage('Must compare between 2 and 4 products'),
  body('productIds.*')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Product IDs must be non-empty strings'),
];

// ============================================
// Sanitization Helpers
// ============================================

// Sanitize HTML from string inputs
export const sanitizeHtml = (input: string): string => {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// Sanitize object keys (prevent prototype pollution)
export const sanitizeObject = <T extends Record<string, unknown>>(obj: T): T => {
  const sanitized = {} as T;
  
  for (const key of Object.keys(obj)) {
    // Block prototype pollution attempts
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    sanitized[key as keyof T] = obj[key] as T[keyof T];
  }
  
  return sanitized;
};

export default {
  validate,
  handleValidationErrors,
  searchValidation,
  saveItemValidation,
  savedItemIdValidation,
  pushToShopifyValidation,
  batchPushValidation,
  partnerExportValidation,
  apiKeyValidation,
  comparisonValidation,
  sanitizeHtml,
  sanitizeObject,
};
