import express, { Request, Response } from 'express';
import { SearchLog } from '../models/SearchLog';
import { authenticateToken, AuthRequest, optionalAuth } from '../middleware/auth';
import { checkRateLimit } from '../middleware/rateLimit';
import { createLogger } from '../utils/logger';
import { getAlibabaScraper } from '../services/alibaba-scraper';
import { getMadeInChinaScraper } from '../services/made-in-china-scraper';
import { getCJDropshippingService } from '../services/cj-dropshipping';
import { getGlobalSourcesScraper } from '../services/global-sources-scraper';
import { getTradeKoreaScraper } from '../services/tradekorea-scraper';
import { getWholesaleCentralScraper } from '../services/wholesale-central-scraper';
import { getBossModeService } from '../services/boss-mode-service';
import { 
  filterSourcesByTier, 
  checkLimit, 
  incrementUsage, 
  getUserUsage,
  attachSubscriptionInfo 
} from '../middleware/subscription';
import { 
  SubscriptionTier, 
  getTierConfig, 
  hasFeature,
  getAvailableSources 
} from '../config/subscriptions';

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
  optionalAuth, // Allow both authenticated and guest searches
  filterSourcesByTier, // Filter sources based on subscription tier
  async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = `search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    const tier = (authReq.user?.subscription_tier || 'free') as SubscriptionTier;
    const tierConfig = getTierConfig(tier);

    try {
      const { 
        query, 
        sources = ['alibaba', 'cj-dropshipping'], 
        bossMode = false,
        moq,
        verifiedOnly = false,
        minRating,
        excludeNoAddress = false,
        page = 1,
        limit = 20
      } = req.body;

      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        logger.warn('SEARCH_VALIDATION_FAILED', 'Invalid search query provided', { query });
        res.status(400).json({ error: 'Search query is required' });
        return;
      }

      // Check if user is trying to use Boss Mode
      const canUseBossMode = hasFeature(tier, 'bossMode');
      const requestedBossMode = bossMode && canUseBossMode;
      
      // Check Boss Mode daily limit
      if (requestedBossMode && userId) {
        const usage = await getUserUsage(userId);
        const bossModeLimit = tierConfig.limits.bossModeSearchesPerDay;
        
        if (bossModeLimit !== -1 && (usage.bossModeSearchesToday || 0) >= bossModeLimit) {
          res.status(403).json({
            error: 'Daily Boss Mode limit reached',
            currentUsage: usage.bossModeSearchesToday || 0,
            limit: bossModeLimit,
            currentTier: tier,
            message: `You've used all ${bossModeLimit} Boss Mode searches today. Try again tomorrow or upgrade for more!`,
          });
          return;
        }
      }

      // Check search limits for authenticated users
      if (userId) {
        const usage = await getUserUsage(userId);
        const limit = tierConfig.limits.searchesPerMonth;
        
        if (limit !== -1 && usage.searches >= limit) {
          res.status(403).json({
            error: 'Monthly search limit reached',
            currentUsage: usage.searches,
            limit,
            currentTier: tier,
            upgrade: true,
            message: `You've used all ${limit} searches this month. Upgrade for more!`,
          });
          return;
        }
      }

      logger.info('SEARCH_STARTED', `Searching for: "${query}"`, undefined, {
        query,
        sources,
        userId,
        tier,
        bossMode: requestedBossMode,
      });

      // ==================== BOSS MODE SEARCH ====================
      // When Boss Mode is enabled, use the BossModeService for enhanced results
      if (requestedBossMode) {
        logger.info('BOSS_MODE_ACTIVATED', `Boss Mode search for "${query}"`, undefined, { tier, userId });
        
        const bossModeService = getBossModeService();
        const bossModeResults = await bossModeService.search({
          query,
          sources: sources as ('alibaba' | 'made-in-china' | 'cj-dropshipping')[],
          limit: tierConfig.limits.resultsPerSearch === -1 ? 50 : tierConfig.limits.resultsPerSearch,
          bossMode: true,
        });
        
        // Filter Boss Mode results
        let filteredBossProducts = bossModeResults.products;

        if (moq !== undefined) {
          filteredBossProducts = filteredBossProducts.filter(p => !p.minOrder || p.minOrder <= moq);
        }
        if (verifiedOnly) {
          filteredBossProducts = filteredBossProducts.filter(p => (p as any).supplierVerified !== false);
        }
        if (minRating !== undefined) {
          filteredBossProducts = filteredBossProducts.filter(p => !p.supplierRating || p.supplierRating >= minRating);
        }
        if (excludeNoAddress) {
          filteredBossProducts = filteredBossProducts.filter(p => !!p.supplierAddress);
        }

        // Increment Boss Mode usage
        if (userId) {
          await incrementUsage(userId, 'bossModeSearches');
          await incrementUsage(userId, 'searches');
          
          // Log the search
          try {
            await SearchLog.create(
              userId,
              query,
              bossModeResults.totalResults,
              sources
            );
          } catch (logError) {
            logger.warn('SEARCH_LOG_FAILED', 'Failed to log search', { error: logError });
          }
        }
        
        const duration = Date.now() - startTime;
        const shouldShowSources = hasFeature(tier, 'showSourceNames');
        
        // Mark all products with boss mode flag
        filteredBossProducts.forEach(p => {
          p.bossMode = true;
        });

        // Apply pagination to Boss Mode results
        const bossStartIndex = (page - 1) * limit;
        const bossEndIndex = page * limit;
        const paginatedBossProducts = filteredBossProducts.slice(bossStartIndex, bossEndIndex);

        // Process Boss Mode results - hide source info for lower tiers if needed
        const processedResults: Record<string, any[]> = {
          alibaba: [],
          'made-in-china': [],
          'cj-dropshipping': [],
        };
        
        // All products come from the unified products array
        for (const product of paginatedBossProducts) {
          const source = product.source || 'alibaba';
          if (!shouldShowSources) {
            processedResults[source].push({
              ...product,
              source: 'supplier',
              supplier: 'Verified Supplier',
              productUrl: product.productUrl ? `${product.productUrl.split('?')[0]}` : undefined,
            });
          } else {
            processedResults[source].push({
              ...product,
              enhanced: product.enrichedFields && product.enrichedFields.length > 0,
            });
          }
        }
        
        const totalFilteredResults = filteredBossProducts.length;
        
        logger.info('BOSS_MODE_COMPLETED', `Boss Mode search for "${query}" completed`, duration, {
          query,
          totalResults: totalFilteredResults,
          puppeteerCount: bossModeResults.sources.puppeteer.count,
          jigsawCount: bossModeResults.sources.jigsawstack.count,
          sources,
          tier,
          userId,
        });
        
        res.json({
          query,
          results: processedResults,
          timestamp: new Date(),
          requestId,
          duration,
          page,
          limit,
          totalResults: totalFilteredResults,
          bossMode: true,
          sources: shouldShowSources ? {
            alibaba: processedResults.alibaba.length,
            'made-in-china': processedResults['made-in-china'].length,
            'cj-dropshipping': processedResults['cj-dropshipping'].length,
            total: totalFilteredResults,
          } : {
            total: totalFilteredResults,
          },
          subscription: userId ? {
            tier,
            resultsLimit: tierConfig.limits.resultsPerSearch,
            showSources: shouldShowSources,
            bossMode: true,
          } : undefined,
          enhancement: {
            puppeteerResults: bossModeResults.sources.puppeteer.count,
            jigsawEnhancements: bossModeResults.sources.jigsawstack.count,
            message: 'Results enhanced with AI-powered web scraping',
          },
        });
        return;
      }
      
      // ==================== STANDARD SEARCH ====================
      const results: Record<string, any[]> = {
        alibaba: [],
        'made-in-china': [],
        'cj-dropshipping': [],
        'global-sources': [],
        'tradekorea': [],
        'wholesale-central': [],
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

      // Search Global Sources
      if (sources.includes('global-sources')) {
        searchPromises.push(
          (async () => {
            logger.debug('GLOBAL_SOURCES_SEARCH', `Querying Global Sources for "${query}"`);
            try {
              const scraper = getGlobalSourcesScraper();
              const gsProducts = await scraper.searchProducts(query, 10);
              results['global-sources'] = gsProducts;
              logger.info('GLOBAL_SOURCES_RESULTS', `Found ${gsProducts.length} products on Global Sources`);
            } catch (error) {
              logger.warn('GLOBAL_SOURCES_SEARCH_ERROR', 'Global Sources search failed', {
                error: (error as Error).message,
              });
            }
          })()
        );
      }

      // Search TradeKorea
      if (sources.includes('tradekorea')) {
        searchPromises.push(
          (async () => {
            logger.debug('TRADEKOREA_SEARCH', `Querying TradeKorea for "${query}"`);
            try {
              const scraper = getTradeKoreaScraper();
              const tkProducts = await scraper.searchProducts(query, 10);
              results['tradekorea'] = tkProducts;
              logger.info('TRADEKOREA_RESULTS', `Found ${tkProducts.length} products on TradeKorea`);
            } catch (error) {
              logger.warn('TRADEKOREA_SEARCH_ERROR', 'TradeKorea search failed', {
                error: (error as Error).message,
              });
            }
          })()
        );
      }

      // Search Wholesale Central
      if (sources.includes('wholesale-central')) {
        searchPromises.push(
          (async () => {
            logger.debug('WHOLESALE_SEARCH', `Querying Wholesale Central for "${query}"`);
            try {
              const scraper = getWholesaleCentralScraper();
              const wcProducts = await scraper.searchProducts(query, 10);
              results['wholesale-central'] = wcProducts;
              logger.info('WHOLESALE_RESULTS', `Found ${wcProducts.length} products on Wholesale Central`);
            } catch (error) {
              logger.warn('WHOLESALE_SEARCH_ERROR', 'Wholesale Central search failed', {
                error: (error as Error).message,
              });
            }
          })()
        );
      }

      // Wait for all searches to complete
      await Promise.all(searchPromises);

      // Apply tier-based result limits
      const maxResults = tierConfig.limits.resultsPerSearch;
      const shouldShowSources = hasFeature(tier, 'showSourceNames');
      
      // Calculate pagination
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;

      // Limit results per source based on tier
      const limitedResults: Record<string, any[]> = {
        alibaba: [],
        'made-in-china': [],
        'cj-dropshipping': [],
        'global-sources': [],
        'tradekorea': [],
        'wholesale-central': [],
      };
      
      let totalCollected = 0;
      const perSourceLimit = maxResults === -1 ? 100 : Math.ceil(maxResults / sources.length);
      
      for (const source of Object.keys(results)) {
        let sourceResults = results[source];
        
        // Apply filters
        if (moq !== undefined) {
          sourceResults = sourceResults.filter(p => !p.minOrder || p.minOrder <= moq);
        }
        if (verifiedOnly) {
          sourceResults = sourceResults.filter(p => p.supplierVerified !== false);
        }
        if (minRating !== undefined) {
          sourceResults = sourceResults.filter(p => !p.supplierRating || p.supplierRating >= minRating);
        }
        if (excludeNoAddress) {
          sourceResults = sourceResults.filter(p => !!p.supplierAddress);
        }

        // Apply pagination to each source
        const paginatedResults = sourceResults.slice(startIndex, endIndex);
        
        // Process results - hide source info for lower tiers
        limitedResults[source] = paginatedResults.map((product: any) => {
          if (!shouldShowSources) {
            // Hide source-identifying information for Free/Starter tiers
            return {
              ...product,
              source: 'supplier', // Generic label
              supplier: 'Verified Supplier', // Hide actual supplier name
              // Keep URL but obfuscate for conversion tracking
              url: product.url ? `${product.url.split('?')[0]}` : undefined,
            };
          }
          return product;
        });
        
        totalCollected += limitedResults[source].length;
      }

      const totalFilteredResults = Object.values(results).reduce((acc, curr) => acc + curr.length, 0);
      const totalResults = Object.values(limitedResults).reduce((acc, curr) => acc + curr.length, 0);
      const duration = Date.now() - startTime;

      // Increment search usage for authenticated users
      if (userId) {
        await incrementUsage(userId, 'searches');
        
        // Log the search
        try {
          await SearchLog.create(
            userId,
            query,
            totalResults,
            sources
          );
        } catch (logError) {
          logger.warn('SEARCH_LOG_FAILED', 'Failed to log search', { error: logError });
        }
      }

      logger.info('SEARCH_COMPLETED', `Search for "${query}" completed`, duration, {
        query,
        resultsCount: totalResults,
        sources,
        tier,
        userId,
      });

      res.json({
        query,
        results: limitedResults,
        timestamp: new Date(),
        requestId,
        duration,
        page,
        limit,
        totalResults: totalFilteredResults,
        sources: shouldShowSources ? {
          alibaba: results.alibaba.length,
          'made-in-china': results['made-in-china'].length,
          'cj-dropshipping': results['cj-dropshipping'].length,
          'global-sources': results['global-sources'].length,
          'tradekorea': results['tradekorea'].length,
          'wholesale-central': results['wholesale-central'].length,
          total: totalFilteredResults,
        } : {
          total: totalFilteredResults, // Only show total count for lower tiers
        },
        // Include subscription info in response
        subscription: userId ? {
          tier,
          resultsLimit: maxResults,
          showSources: shouldShowSources,
        } : undefined,
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
