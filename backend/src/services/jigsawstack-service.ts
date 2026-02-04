/**
 * JigsawStack AI Scraper Service
 * Uses JigsawStack's AI-powered scraping API for enhanced data extraction
 * Used in "Boss Mode" to supplement Puppeteer scrapers
 */

import { createLogger } from '../utils/logger';

const logger = createLogger('JigsawStackService');

const JIGSAWSTACK_API_KEY = process.env.JIGSAWSTACK_API_KEY;
const BASE_URL = 'https://api.jigsawstack.com/v1';
const DISABLE_LOGGING = process.env.JIGSAWSTACK_DISABLE_LOGGING === 'true';

export interface JigsawScrapedProduct {
  id: string;
  title: string;
  price?: string;
  priceMin?: number;
  priceMax?: number;
  minOrder?: string;
  moqNumber?: number;
  supplierName: string;
  supplierRating?: string;
  ratingNumber?: number;
  imageUrl?: string;
  productUrl?: string;
  source: 'alibaba' | 'made-in-china';
  scrapedBy: 'jigsawstack';
}

interface JigsawScrapeResponse {
  success: boolean;
  context?: Record<string, string[]>;
  selectors?: Record<string, string[]>;
  error?: string;
  _usage?: {
    input_tokens: number;
    output_tokens: number;
    inference_time_tokens: number;
    total_tokens: number;
  };
}

class JigsawStackService {
  private enabled: boolean;

  constructor() {
    this.enabled = !!JIGSAWSTACK_API_KEY;
    if (!this.enabled) {
      logger.warn('JIGSAWSTACK_DISABLED', 'JigsawStack API key not configured');
    }
  }

  /**
   * Check if JigsawStack is available
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Scrape Made-in-China search results
   */
  async scrapeMadeInChina(query: string, limit: number = 20): Promise<JigsawScrapedProduct[]> {
    if (!this.enabled) {
      logger.warn('JIGSAWSTACK_NOT_ENABLED', 'JigsawStack not configured, skipping');
      return [];
    }

    const searchUrl = `https://www.made-in-china.com/products-search/hot-china-products/${encodeURIComponent(query)}.html`;
    
    logger.info('JIGSAWSTACK_MIC_SCRAPE', `Scraping Made-in-China for "${query}"`, undefined, { url: searchUrl });
    const startTime = Date.now();

    try {
      const response = await fetch(`${BASE_URL}/ai/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': JIGSAWSTACK_API_KEY!,
          ...(DISABLE_LOGGING && { 'x-jigsaw-no-request-log': 'true' }),
        },
        body: JSON.stringify({
          url: searchUrl,
          element_prompts: [
            'product_titles',
            'product_prices',
            'minimum_order_quantities',
            'supplier_names',
            'supplier_ratings'
          ],
        }),
      });

      const elapsed = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('JIGSAWSTACK_HTTP_ERROR', `HTTP ${response.status}`, new Error(errorText));
        return [];
      }

      const result: JigsawScrapeResponse = await response.json();

      if (!result.success || !result.context) {
        logger.warn('JIGSAWSTACK_SCRAPE_FAILED', 'Scrape returned no data', { error: result.error });
        return [];
      }

      // Parse and combine the results
      const products = this.parseSearchResults(result.context, 'made-in-china', limit);
      
      logger.info('JIGSAWSTACK_MIC_SUCCESS', `Found ${products.length} products in ${elapsed}ms`, undefined, {
        elapsed,
        tokensUsed: result._usage?.total_tokens,
      });

      return products;

    } catch (error) {
      logger.error('JIGSAWSTACK_MIC_ERROR', 'Failed to scrape Made-in-China', error as Error);
      return [];
    }
  }

  /**
   * Scrape Alibaba search results
   * Note: Alibaba has strong anti-bot measures, success rate may vary
   */
  async scrapeAlibaba(query: string, limit: number = 20): Promise<JigsawScrapedProduct[]> {
    if (!this.enabled) {
      return [];
    }

    const searchUrl = `https://www.alibaba.com/trade/search?SearchText=${encodeURIComponent(query)}`;
    
    logger.info('JIGSAWSTACK_ALIBABA_SCRAPE', `Scraping Alibaba for "${query}"`, undefined, { url: searchUrl });
    const startTime = Date.now();

    try {
      const response = await fetch(`${BASE_URL}/ai/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': JIGSAWSTACK_API_KEY!,
          ...(DISABLE_LOGGING && { 'x-jigsaw-no-request-log': 'true' }),
        },
        body: JSON.stringify({
          url: searchUrl,
          element_prompts: [
            'product_titles',
            'product_prices',
            'minimum_order_quantities',
            'supplier_names',
            'supplier_ratings'
          ],
        }),
      });

      const elapsed = Date.now() - startTime;

      if (!response.ok) {
        logger.warn('JIGSAWSTACK_ALIBABA_HTTP_ERROR', `HTTP ${response.status}`);
        return [];
      }

      const result: JigsawScrapeResponse = await response.json();

      if (!result.success || !result.context) {
        logger.warn('JIGSAWSTACK_ALIBABA_NO_DATA', 'Alibaba scrape returned no data (likely blocked)');
        return [];
      }

      const products = this.parseSearchResults(result.context, 'alibaba', limit);
      
      logger.info('JIGSAWSTACK_ALIBABA_SUCCESS', `Found ${products.length} products in ${elapsed}ms`, undefined, {
        elapsed,
        tokensUsed: result._usage?.total_tokens,
      });

      return products;

    } catch (error) {
      logger.error('JIGSAWSTACK_ALIBABA_ERROR', 'Failed to scrape Alibaba', error as Error);
      return [];
    }
  }

  /**
   * Parse search results from JigsawStack context
   */
  private parseSearchResults(
    context: Record<string, string[]>,
    source: 'alibaba' | 'made-in-china',
    limit: number
  ): JigsawScrapedProduct[] {
    const titles = context.product_titles || [];
    const prices = context.product_prices || [];
    const moqs = context.minimum_order_quantities || [];
    const suppliers = context.supplier_names || [];
    const ratings = context.supplier_ratings || [];

    const products: JigsawScrapedProduct[] = [];
    const maxItems = Math.min(titles.length, limit);

    for (let i = 0; i < maxItems; i++) {
      const title = titles[i];
      if (!title || title.trim().length === 0) continue;

      // Parse price range
      const priceStr = prices[i] || '';
      const { min: priceMin, max: priceMax } = this.parsePriceRange(priceStr);

      // Parse MOQ
      const moqStr = moqs[i] || '';
      const moqNumber = this.parseNumber(moqStr);

      // Parse rating
      const ratingStr = ratings[i] || '';
      const ratingNumber = this.parseRating(ratingStr);

      products.push({
        id: `jigsaw-${source}-${i}-${Date.now()}`,
        title: title.trim(),
        price: priceStr,
        priceMin,
        priceMax,
        minOrder: moqStr,
        moqNumber,
        supplierName: (suppliers[i] || 'Unknown Supplier').trim(),
        supplierRating: ratingStr,
        ratingNumber,
        source,
        scrapedBy: 'jigsawstack',
      });
    }

    return products;
  }

  /**
   * Parse price range from string like "US$7.60 - 7.90" or "$35.99-59.99"
   */
  private parsePriceRange(priceStr: string): { min?: number; max?: number } {
    if (!priceStr) return {};

    // Remove currency symbols and clean up
    const cleaned = priceStr.replace(/US\$|\$|,/g, '').trim();
    
    // Try to find range pattern
    const rangeMatch = cleaned.match(/(\d+\.?\d*)\s*[-–]\s*(\d+\.?\d*)/);
    if (rangeMatch) {
      return {
        min: parseFloat(rangeMatch[1]),
        max: parseFloat(rangeMatch[2]),
      };
    }

    // Single price
    const singleMatch = cleaned.match(/(\d+\.?\d*)/);
    if (singleMatch) {
      const price = parseFloat(singleMatch[1]);
      return { min: price, max: price };
    }

    return {};
  }

  /**
   * Parse number from string like "1,000 Pieces (MOQ)"
   */
  private parseNumber(str: string): number | undefined {
    if (!str) return undefined;
    const match = str.replace(/,/g, '').match(/(\d+)/);
    return match ? parseInt(match[1], 10) : undefined;
  }

  /**
   * Parse rating from string like "4.0/5.0" or "4.7/5.0 (27)"
   */
  private parseRating(str: string): number | undefined {
    if (!str) return undefined;
    const match = str.match(/(\d+\.?\d*)\s*\/\s*5/);
    return match ? parseFloat(match[1]) : undefined;
  }
}

// Singleton instance
let jigsawStackService: JigsawStackService | null = null;

export function getJigsawStackService(): JigsawStackService {
  if (!jigsawStackService) {
    jigsawStackService = new JigsawStackService();
  }
  return jigsawStackService;
}

export { JigsawStackService };
