/**
 * CJ Dropshipping API Routes
 * Provides endpoints for searching and retrieving CJ products
 */

import express, { Request, Response } from 'express';
import { getCJDropshippingService, CJSearchParams } from '../services/cj-dropshipping';
import { createLogger } from '../utils/logger';

const router = express.Router();
const logger = createLogger('CJRoutes');

/**
 * GET /api/v1/cj/search
 * Search for products on CJ Dropshipping
 */
router.get('/search', async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  const requestId = `cj-search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    const {
      q,
      keyword,
      page = '1',
      limit = '20',
      category,
      warehouse,
      minPrice,
      maxPrice,
      freeShipping,
      productType,
      sortBy,
      sortOrder,
    } = req.query;

    const searchKeyword = (q || keyword) as string;

    if (!searchKeyword || typeof searchKeyword !== 'string' || searchKeyword.trim().length === 0) {
      logger.warn('CJ_SEARCH_VALIDATION_FAILED', 'Invalid search query provided');
      res.status(400).json({ 
        error: 'Search query is required',
        code: 'INVALID_QUERY',
        requestId,
      });
      return;
    }

    const cjService = getCJDropshippingService();

    // Check if CJ is configured
    if (!cjService.isConfigured()) {
      logger.warn('CJ_NOT_CONFIGURED', 'CJ API key not configured');
      res.status(503).json({
        error: 'CJ Dropshipping integration not configured',
        code: 'NOT_CONFIGURED',
        requestId,
      });
      return;
    }

    const searchParams: CJSearchParams = {
      keyword: searchKeyword.trim(),
      page: parseInt(page as string, 10) || 1,
      pageSize: Math.min(parseInt(limit as string, 10) || 20, 100), // Max 100
    };

    // Optional filters
    if (category) searchParams.categoryId = category as string;
    if (warehouse) searchParams.countryCode = warehouse as string;
    if (minPrice) searchParams.minPrice = parseFloat(minPrice as string);
    if (maxPrice) searchParams.maxPrice = parseFloat(maxPrice as string);
    if (freeShipping === 'true') searchParams.freeShipping = true;
    if (productType) searchParams.productType = productType as 'trending' | 'new' | 'video';
    if (sortBy) searchParams.sortBy = sortBy as CJSearchParams['sortBy'];
    if (sortOrder) searchParams.sortOrder = sortOrder as 'asc' | 'desc';

    logger.info('CJ_SEARCH_REQUEST', `Searching CJ for: "${searchKeyword}"`, undefined, {
      ...searchParams,
      requestId,
    });

    const products = await cjService.searchProducts(searchParams);

    const duration = Date.now() - startTime;
    logger.info('CJ_SEARCH_COMPLETE', `Found ${products.length} CJ products`, duration, {
      query: searchKeyword,
      count: products.length,
      requestId,
    });

    res.json({
      success: true,
      query: searchKeyword,
      source: 'cj-dropshipping',
      products,
      pagination: {
        page: searchParams.page,
        limit: searchParams.pageSize,
        count: products.length,
      },
      filters: {
        category: searchParams.categoryId,
        warehouse: searchParams.countryCode,
        minPrice: searchParams.minPrice,
        maxPrice: searchParams.maxPrice,
        freeShipping: searchParams.freeShipping,
        productType: searchParams.productType,
      },
      meta: {
        requestId,
        duration,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('CJ_SEARCH_ERROR', 'CJ search failed', error as Error, {
      query: req.query.q || req.query.keyword,
      duration,
      requestId,
    });

    res.status(500).json({
      error: 'Failed to search CJ Dropshipping',
      message: (error as Error).message,
      code: 'SEARCH_ERROR',
      requestId,
    });
  }
});

/**
 * GET /api/v1/cj/product/:id
 * Get details for a specific CJ product
 */
router.get('/product/:id', async (req: Request, res: Response): Promise<void> => {
  const requestId = `cj-product-${Date.now()}`;

  try {
    const { id } = req.params;

    // Remove 'cj-' prefix if present
    const productId = id.startsWith('cj-') ? id.substring(3) : id;

    const cjService = getCJDropshippingService();

    if (!cjService.isConfigured()) {
      res.status(503).json({
        error: 'CJ Dropshipping integration not configured',
        code: 'NOT_CONFIGURED',
        requestId,
      });
      return;
    }

    const product = await cjService.getProductDetails(productId);

    if (!product) {
      res.status(404).json({
        error: 'Product not found',
        code: 'NOT_FOUND',
        requestId,
      });
      return;
    }

    res.json({
      success: true,
      product,
      requestId,
    });

  } catch (error) {
    logger.error('CJ_PRODUCT_ERROR', 'Failed to get CJ product', error as Error, {
      productId: req.params.id,
      requestId,
    });

    res.status(500).json({
      error: 'Failed to get product details',
      message: (error as Error).message,
      code: 'PRODUCT_ERROR',
      requestId,
    });
  }
});

/**
 * GET /api/v1/cj/categories
 * Get CJ product categories
 */
router.get('/categories', async (req: Request, res: Response): Promise<void> => {
  const requestId = `cj-categories-${Date.now()}`;

  try {
    const cjService = getCJDropshippingService();

    if (!cjService.isConfigured()) {
      res.status(503).json({
        error: 'CJ Dropshipping integration not configured',
        code: 'NOT_CONFIGURED',
        requestId,
      });
      return;
    }

    const categories = await cjService.getCategories();

    res.json({
      success: true,
      categories,
      requestId,
    });

  } catch (error) {
    logger.error('CJ_CATEGORIES_ERROR', 'Failed to get CJ categories', error as Error, { requestId });

    res.status(500).json({
      error: 'Failed to get categories',
      message: (error as Error).message,
      code: 'CATEGORIES_ERROR',
      requestId,
    });
  }
});

/**
 * GET /api/v1/cj/warehouses
 * Get CJ global warehouse list
 */
router.get('/warehouses', async (req: Request, res: Response): Promise<void> => {
  const requestId = `cj-warehouses-${Date.now()}`;

  try {
    const cjService = getCJDropshippingService();

    if (!cjService.isConfigured()) {
      res.status(503).json({
        error: 'CJ Dropshipping integration not configured',
        code: 'NOT_CONFIGURED',
        requestId,
      });
      return;
    }

    const warehouses = await cjService.getWarehouses();

    res.json({
      success: true,
      warehouses,
      requestId,
    });

  } catch (error) {
    logger.error('CJ_WAREHOUSES_ERROR', 'Failed to get CJ warehouses', error as Error, { requestId });

    res.status(500).json({
      error: 'Failed to get warehouses',
      message: (error as Error).message,
      code: 'WAREHOUSES_ERROR',
      requestId,
    });
  }
});

/**
 * GET /api/v1/cj/inventory/:variantId
 * Check inventory for a product variant
 */
router.get('/inventory/:variantId', async (req: Request, res: Response): Promise<void> => {
  const requestId = `cj-inventory-${Date.now()}`;

  try {
    const { variantId } = req.params;

    const cjService = getCJDropshippingService();

    if (!cjService.isConfigured()) {
      res.status(503).json({
        error: 'CJ Dropshipping integration not configured',
        code: 'NOT_CONFIGURED',
        requestId,
      });
      return;
    }

    const inventory = await cjService.checkInventory(variantId);

    res.json({
      success: true,
      variantId,
      inventory,
      requestId,
    });

  } catch (error) {
    logger.error('CJ_INVENTORY_ERROR', 'Failed to check inventory', error as Error, {
      variantId: req.params.variantId,
      requestId,
    });

    res.status(500).json({
      error: 'Failed to check inventory',
      message: (error as Error).message,
      code: 'INVENTORY_ERROR',
      requestId,
    });
  }
});

/**
 * GET /api/v1/cj/status
 * Check CJ integration status
 */
router.get('/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const cjService = getCJDropshippingService();
    const isConfigured = cjService.isConfigured();

    res.json({
      success: true,
      configured: isConfigured,
      source: 'cj-dropshipping',
      features: {
        search: isConfigured,
        productDetails: isConfigured,
        categories: isConfigured,
        warehouses: isConfigured,
        inventory: isConfigured,
      },
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to check CJ status',
      configured: false,
    });
  }
});

export default router;
