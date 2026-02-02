import express, { Request, Response } from 'express';
import { SearchLog } from '../models/SearchLog';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { checkRateLimit } from '../middleware/rateLimit';
import { createLogger } from '../utils/logger';
import { getAlibabaScraper } from '../services/alibaba-scraper';
import { getMadeInChinaScraper } from '../services/made-in-china-scraper';
import { getCJDropshippingService } from '../services/cj-dropshipping';

const router = express.Router();
const logger = createLogger('SearchRoute');

/**
 * POST /api/v1/search
 * Search for products across Alibaba, Made-in-China, and CJ Dropshipping
 * @param query - Product search query
 * @param sources - Array of sources to search (alibaba, made-in-china, cj-dropshipping)
 * @returns Search results from specified sources
 */
router.post(
  '/',
  async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = `search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      const { query, sources = ['alibaba', 'cj-dropshipping'] } = req.body;

      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        logger.warn('SEARCH_VALIDATION_FAILED', 'Invalid search query provided', { query });
        res.status(400).json({ error: 'Search query is required' });
        return;
      }

      logger.info('SEARCH_STARTED', `Searching for: "${query}"`, undefined, {
        query,
        sources,
      });

      const results: Record<string, any[]> = {
        alibaba: [],
        'made-in-china': [],
        'cj-dropshipping': [],
      };

      // Search in parallel for better performance
      const searchPromises: Promise<void>[] = [];

      // Search Alibaba
      if (sources.includes('alibaba')) {
        searchPromises.push(
          (async () => {
            logger.debug('ALIBABA_SEARCH', `Querying Alibaba for "${query}"`);
            try {
              const scraper = getAlibabaScraper();
              const alibabaProducts = await scraper.searchProducts(query, 10);
              results.alibaba = alibabaProducts;
              logger.info('ALIBABA_RESULTS', `Found ${alibabaProducts.length} products on Alibaba`);
            } catch (error) {
              logger.warn('ALIBABA_SEARCH_ERROR', 'Alibaba search failed', {
                error: (error as Error).message,
              });
            }
          })()
        );
      }

      // Search CJ Dropshipping
      if (sources.includes('cj-dropshipping')) {
        searchPromises.push(
          (async () => {
            logger.debug('CJ_SEARCH', `Querying CJ Dropshipping for "${query}"`);
            try {
              const cjService = getCJDropshippingService();
              if (cjService.isConfigured()) {
                const cjProducts = await cjService.searchProducts({
                  keyword: query,
                  pageSize: 10,
                });
                results['cj-dropshipping'] = cjProducts;
                logger.info('CJ_RESULTS', `Found ${cjProducts.length} products on CJ Dropshipping`);
              } else {
                logger.debug('CJ_NOT_CONFIGURED', 'CJ Dropshipping API not configured');
              }
            } catch (error) {
              logger.warn('CJ_SEARCH_ERROR', 'CJ Dropshipping search failed', {
                error: (error as Error).message,
              });
            }
          })()
        );
      }

      // Search Made-in-China
      if (sources.includes('made-in-china')) {
        searchPromises.push(
          (async () => {
            logger.debug('MIC_SEARCH', `Querying Made-in-China for "${query}"`);
            try {
              const scraper = getMadeInChinaScraper();
              const micProducts = await scraper.searchProducts(query, 10);
              results['made-in-china'] = micProducts;
              logger.info('MIC_RESULTS', `Found ${micProducts.length} products on Made-in-China`);
            } catch (error) {
              logger.warn('MIC_SEARCH_ERROR', 'Made-in-China search failed', {
                error: (error as Error).message,
              });
            }
          })()
        );
      }

      // Wait for all searches to complete
      await Promise.all(searchPromises);

      const totalResults = results.alibaba.length + results['made-in-china'].length + results['cj-dropshipping'].length;
      const duration = Date.now() - startTime;

      logger.info('SEARCH_COMPLETED', `Search for "${query}" completed`, duration, {
        query,
        resultsCount: totalResults,
        sources,
      });

      res.json({
        query,
        results,
        timestamp: new Date(),
        requestId,
        duration,
        sources: {
          alibaba: results.alibaba.length,
          'made-in-china': results['made-in-china'].length,
          'cj-dropshipping': results['cj-dropshipping'].length,
          total: totalResults,
        },
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('SEARCH_ERROR', 'Search operation failed', error as Error, {
        query: req.body.query,
        duration,
      });
      res.status(500).json({ error: 'Internal server error', requestId });
    }
  }
);

/**
 * GET /api/v1/search/history
 * Get search history for the authenticated user
 * @param limit - Maximum number of results to return (default: 50)
 * @returns Array of previous searches and statistics
 */
router.get('/history', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  const startTime = Date.now();
  const requestId = `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  logger.setRequestId(requestId);

  try {
    const userId = req.userId;
    if (!userId) {
      logger.warn('HISTORY_AUTH_FAILED', 'Unauthorized history request', { userId });
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const limit = parseInt((req.query.limit as string) || '50', 10);
    const history = await SearchLog.findByUserId(userId, limit);
    const stats = await SearchLog.getSearchStats(userId, 30);

    const duration = Date.now() - startTime;
    logger.info('HISTORY_RETRIEVED', 'Search history retrieved successfully', duration, {
      userId,
      historyCount: history.length,
    });

    res.json({
      history,
      stats,
      requestId,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('HISTORY_ERROR', 'Failed to retrieve search history', error as Error, {
      userId: req.userId,
      duration,
    });
    res.status(500).json({ error: 'Internal server error', requestId });
  }
});

export default router;
