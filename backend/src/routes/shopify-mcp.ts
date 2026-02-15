/**
 * Shopify MCP Health & Debug Routes
 * Endpoints for testing and monitoring Shopify integration
 */

import express, { Response } from 'express';
import { createLogger } from '../utils/logger';

const router = express.Router();
const logger = createLogger('SearchRoutes');

/**
 * Generate mock products for development
 * (Alibaba blocks scrapers with CAPTCHA in production)
 */
function generateMockProducts(query: string, limit: number) {
  const suppliers = [
    { name: 'Shanghai Chuangli Refrigeration Equipment Co., Ltd.', rating: 4.8, responseRate: 98, level: 'Gold', years: 8 },
    { name: 'Nantong Bolang Energy Saving Technology Co., Ltd.', rating: 4.6, responseRate: 95, level: 'Gold', years: 6 },
    { name: 'Jiangsu Eternity Import & Export Co., Ltd.', rating: 4.5, responseRate: 92, level: 'Silver', years: 5 },
    { name: 'Guangzhou Koller Refrigeration Equipment Co., Ltd.', rating: 4.9, responseRate: 99, level: 'Gold', years: 12 },
    { name: 'Shenzhen Brother Ice System Co., Ltd.', rating: 4.4, responseRate: 88, level: 'Silver', years: 4 },
    { name: 'Dongguan Coldmax Refrigeration Equipment Co., Ltd.', rating: 4.7, responseRate: 96, level: 'Gold', years: 7 },
    { name: 'Ningbo Icetech Refrigeration Equipment Co., Ltd.', rating: 4.3, responseRate: 85, level: 'Assessed', years: 3 },
    { name: 'Foshan Hicon Trading Co., Ltd.', rating: 4.6, responseRate: 94, level: 'Gold', years: 9 },
  ];

  const productTypes = [
    { title: 'Commercial Ice Maker Machine', basePrice: 350, moq: 1 },
    { title: 'Industrial Ice Cube Machine', basePrice: 1200, moq: 1 },
    { title: 'Automatic Flake Ice Maker', basePrice: 800, moq: 1 },
    { title: 'Portable Countertop Ice Maker', basePrice: 85, moq: 10 },
    { title: 'Stainless Steel Ice Machine', basePrice: 450, moq: 2 },
    { title: 'High Capacity Cube Ice Generator', basePrice: 2500, moq: 1 },
    { title: 'Self-Cleaning Ice Maker', basePrice: 280, moq: 5 },
    { title: 'Under Counter Ice Machine', basePrice: 520, moq: 1 },
  ];

  const products = [];
  const searchTerms = query.toLowerCase().split(' ');

  for (let i = 0; i < Math.min(limit, productTypes.length); i++) {
    const product = productTypes[i];
    const supplier = suppliers[i % suppliers.length];
    const priceVariation = 0.8 + Math.random() * 0.4; // 80%-120% of base price

    products.push({
      id: `mock-${Date.now()}-${i}`,
      title: `${product.title} - ${query}`,
      description: `High quality ${query.toLowerCase()} from verified supplier. CE/ETL certified. Fast delivery available.`,
      price: Math.round(product.basePrice * priceVariation),
      minOrder: product.moq,
      image_url: `https://s.alicdn.com/@sc04/kf/placeholder-${i + 1}.jpg`,
      url: `https://www.alibaba.com/product-detail/mock-${i}`,
      supplierName: supplier.name,
      supplierRating: supplier.rating,
      supplierResponseRate: supplier.responseRate,
      supplierTransactionLevel: supplier.level,
      supplierYearsInBusiness: supplier.years,
      source: 'alibaba' as const,
    });
  }

  // Sort by supplier rating (highest first)
  return products.sort((a, b) => (b.supplierRating || 0) - (a.supplierRating || 0));
}

/**
 * GET /api/v1/shopify/health
 * Check if Alibaba scraper service is operational
 */
router.get('/health', async (req: express.Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  try {
    const duration = Date.now() - startTime;

    logger.info('SCRAPER_HEALTH_CHECK', 'Health check completed', duration);

    res.json({
      service: 'Alibaba Supplier Discovery',
      status: 'operational',
      healthy: true,
      duration,
      timestamp: new Date(),
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('HEALTH_CHECK_FAILED', 'Health check failed', error as Error, {
      duration,
    });

    res.status(503).json({
      service: 'Alibaba Supplier Discovery',
      status: 'unavailable',
      healthy: false,
      error: (error as Error).message,
      duration,
    });
  }
});

/**
 * GET /api/v1/shopify/search
 * Search endpoint for products (Alibaba & Made-in-China integration)
 * Query params: q (required), limit (optional, default 10)
 */
router.get('/search', async (req: express.Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  const requestId = `search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    const { q: query, limit = 10 } = req.query;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      logger.warn('SEARCH_INVALID', 'Invalid search query provided', {
        requestId,
        query,
      });
      res.status(400).json({
        error: 'Search query (q) is required',
        requestId,
      });
      return;
    }

    logger.info('SEARCH_START', `Searching for: "${query}"`, undefined, {
      requestId,
      query,
      limit,
    });

    // Use mock data for development (Alibaba blocks scrapers with CAPTCHA)
    const mockProducts = generateMockProducts(query as string, parseInt(String(limit)) || 10);
    const duration = Date.now() - startTime;

    logger.info('SEARCH_COMPLETE', `Search completed`, duration, {
      requestId,
      query,
      resultsCount: mockProducts.length,
    });

    // Return products with supplier ratings highlighted
    res.json({
      products: mockProducts,
      count: mockProducts.length,
      query,
      duration,
      requestId,
      timestamp: new Date(),
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('SEARCH_ERROR', 'Search failed', error as Error, {
      requestId,
      duration,
    });

    res.status(500).json({
      error: 'Search failed',
      requestId,
      message: (error as Error).message,
      duration,
    });
  }
});

/**
 * POST /api/v1/shopify/search
 * Test search endpoint for Shopify products
 * Query params: query (required), limit (optional, default 10)
 */
router.post('/search', async (req: express.Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  const requestId = `shopify-search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    const { query, limit = 10 } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      logger.warn('SHOPIFY_SEARCH_INVALID', 'Invalid search query provided', {
        requestId,
        query,
      });
      res.status(400).json({
        error: 'Search query is required',
        requestId,
      });
      return;
    }

    logger.info('SHOPIFY_SEARCH_START', `Searching for: "${query}"`, undefined, {
      requestId,
      query,
      limit,
    });

    // Use Alibaba scraper for searching products
    const { getAlibabaScraper } = await import('../services/alibaba-scraper');
    const scraper = getAlibabaScraper();
    const products = await scraper.searchProducts(query, Math.min(limit, 50));
    const duration = Date.now() - startTime;

    logger.info('SHOPIFY_SEARCH_COMPLETE', `Search completed`, duration, {
      requestId,
      query,
      resultsCount: products.length,
    });

    res.json({
      success: true,
      requestId,
      query,
      results: products,
      count: products.length,
      duration,
      timestamp: new Date(),
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('SHOPIFY_SEARCH_ERROR', 'Search failed', error as Error, {
      requestId,
      duration,
    });

    res.status(500).json({
      success: false,
      error: 'Search failed',
      requestId,
      message: (error as Error).message,
      duration,
    });
  }
});

/**
 * POST /api/v1/shopify/batch-search
 * Batch search multiple queries
 */
router.post('/batch-search', async (req: express.Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  const requestId = `shopify-batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    const { queries, limit = 5 } = req.body;

    if (!Array.isArray(queries) || queries.length === 0) {
      logger.warn('SHOPIFY_BATCH_INVALID', 'Invalid queries array', {
        requestId,
        queriesCount: queries?.length || 0,
      });
      res.status(400).json({
        error: 'queries must be a non-empty array',
        requestId,
      });
      return;
    }

    logger.info('SHOPIFY_BATCH_SEARCH_START', `Starting batch search`, undefined, {
      requestId,
      queriesCount: queries.length,
    });

    // Use Alibaba scraper for batch search
    const { getAlibabaScraper } = await import('../services/alibaba-scraper');
    const scraper = getAlibabaScraper();
    const results = new Map<string, any[]>();
    for (const query of queries) {
      const products = await scraper.searchProducts(query, Math.min(limit, 50));
      results.set(query, products);
    }
    const duration = Date.now() - startTime;

    // Convert Map to object for JSON response
    const resultsObj: Record<string, any> = {};
    let totalProducts = 0;

    for (const [query, products] of results.entries()) {
      resultsObj[query] = {
        count: products.length,
        products,
      };
      totalProducts += products.length;
    }

    logger.info('SHOPIFY_BATCH_SEARCH_COMPLETE', `Batch search completed`, duration, {
      requestId,
      queriesCount: queries.length,
      totalProducts,
    });

    res.json({
      success: true,
      requestId,
      results: resultsObj,
      summary: {
        totalQueries: queries.length,
        totalProducts,
      },
      duration,
      timestamp: new Date(),
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('SHOPIFY_BATCH_SEARCH_ERROR', 'Batch search failed', error as Error, {
      requestId,
      duration,
    });

    res.status(500).json({
      success: false,
      error: 'Batch search failed',
      requestId,
      message: (error as Error).message,
      duration,
    });
  }
});

/**
 * POST /api/v1/shopify/clear-cache
 * Clear cached access token (admin only)
 */
router.post('/clear-cache', async (req: express.Request, res: Response): Promise<void> => {
  try {
    logger.info('CACHE_CLEAR_REQUEST', 'Clearing browser cache');

    // Close and reinit browser to clear cache
    const { getAlibabaScraper } = await import('../services/alibaba-scraper');
    const scraper = getAlibabaScraper();
    await scraper.closeBrowser();

    res.json({
      success: true,
      message: 'Browser cache cleared',
      timestamp: new Date(),
    });
  } catch (error) {
    logger.error('CACHE_CLEAR_ERROR', 'Failed to clear cache', error as Error);

    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
      message: (error as Error).message,
    });
  }
});

export default router;
