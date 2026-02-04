/**
 * Boss Mode Service
 * Orchestrates multiple scraping sources for comprehensive product discovery
 * Available for Pro and Enterprise tiers
 * 
 * Strategy:
 * 1. Run Puppeteer scrapers first (fast results)
 * 2. Run JigsawStack in parallel for enhanced data
 * 3. Merge results, dedupe, and enrich
 */

import { ScrapedProduct, getAlibabaScraper } from './alibaba-scraper';
import { getMadeInChinaScraper, MICScrapedProduct } from './made-in-china-scraper';
import { getJigsawStackService, JigsawScrapedProduct } from './jigsawstack-service';
import { createLogger } from '../utils/logger';

const logger = createLogger('BossModeService');

export interface BossModeProduct {
  id: string;
  title: string;
  description?: string;
  price?: number;
  priceMin?: number;
  priceMax?: number;
  priceDisplay?: string;
  minOrder?: number;
  moqDisplay?: string;
  imageUrl?: string;
  productUrl?: string;
  supplierId?: string;
  supplierName: string;
  supplierRating?: number;
  supplierRatingDisplay?: string;
  supplierResponseRate?: number;
  supplierTransactionLevel?: string;
  supplierYearsInBusiness?: number;
  source: 'alibaba' | 'made-in-china' | 'cj-dropshipping';
  scrapedBy: 'puppeteer' | 'jigsawstack' | 'merged';
  bossMode: boolean;
  enrichedFields?: string[];
}

export interface BossModeSearchResult {
  query: string;
  bossMode: boolean;
  totalResults: number;
  sources: {
    puppeteer: { count: number; elapsed: number };
    jigsawstack: { count: number; elapsed: number };
  };
  products: BossModeProduct[];
  elapsed: number;
}

interface SearchOptions {
  query: string;
  sources: string[];
  limit: number;
  bossMode: boolean;
}

class BossModeService {
  /**
   * Execute a Boss Mode search across all sources
   */
  async search(options: SearchOptions): Promise<BossModeSearchResult> {
    const { query, sources, limit, bossMode } = options;
    const startTime = Date.now();

    logger.info('BOSS_MODE_SEARCH_START', `Boss Mode search for "${query}"`, undefined, {
      sources,
      limit,
      bossMode,
    });

    const result: BossModeSearchResult = {
      query,
      bossMode,
      totalResults: 0,
      sources: {
        puppeteer: { count: 0, elapsed: 0 },
        jigsawstack: { count: 0, elapsed: 0 },
      },
      products: [],
      elapsed: 0,
    };

    // Phase 1: Run Puppeteer scrapers (primary)
    const puppeteerStart = Date.now();
    const puppeteerResults = await this.runPuppeteerScrapers(query, sources, limit);
    result.sources.puppeteer.elapsed = Date.now() - puppeteerStart;
    result.sources.puppeteer.count = puppeteerResults.length;

    // Convert to BossModeProduct format
    let products: BossModeProduct[] = puppeteerResults.map(p => this.convertToBossModeProduct(p, 'puppeteer'));

    // Phase 2: If Boss Mode enabled, run JigsawStack in parallel
    if (bossMode) {
      const jigsawStart = Date.now();
      const jigsawResults = await this.runJigsawStackScrapers(query, sources, limit);
      result.sources.jigsawstack.elapsed = Date.now() - jigsawStart;
      result.sources.jigsawstack.count = jigsawResults.length;

      // Merge and enrich results
      products = this.mergeAndEnrich(products, jigsawResults);
    }

    // Mark all products with boss mode flag
    products.forEach(p => {
      p.bossMode = bossMode;
    });

    result.products = products.slice(0, limit);
    result.totalResults = result.products.length;
    result.elapsed = Date.now() - startTime;

    logger.info('BOSS_MODE_SEARCH_COMPLETE', `Found ${result.totalResults} products in ${result.elapsed}ms`, undefined, {
      puppeteerCount: result.sources.puppeteer.count,
      jigsawCount: result.sources.jigsawstack.count,
      merged: result.totalResults,
    });

    return result;
  }

  /**
   * Run Puppeteer scrapers for specified sources
   */
  private async runPuppeteerScrapers(
    query: string,
    sources: string[],
    limit: number
  ): Promise<(ScrapedProduct | MICScrapedProduct)[]> {
    const results: (ScrapedProduct | MICScrapedProduct)[] = [];
    const promises: Promise<void>[] = [];

    if (sources.includes('alibaba')) {
      promises.push(
        (async () => {
          try {
            const scraper = getAlibabaScraper();
            const products = await scraper.searchProducts(query, limit);
            results.push(...products);
          } catch (error) {
            logger.warn('PUPPETEER_ALIBABA_FAILED', 'Alibaba scraper failed', { error: (error as Error).message });
          }
        })()
      );
    }

    if (sources.includes('made-in-china')) {
      promises.push(
        (async () => {
          try {
            const scraper = getMadeInChinaScraper();
            const products = await scraper.searchProducts(query, limit);
            results.push(...products);
          } catch (error) {
            logger.warn('PUPPETEER_MIC_FAILED', 'Made-in-China scraper failed', { error: (error as Error).message });
          }
        })()
      );
    }

    await Promise.allSettled(promises);
    return results;
  }

  /**
   * Run JigsawStack scrapers for specified sources
   */
  private async runJigsawStackScrapers(
    query: string,
    sources: string[],
    limit: number
  ): Promise<JigsawScrapedProduct[]> {
    const jigsawService = getJigsawStackService();
    
    if (!jigsawService.isEnabled()) {
      logger.warn('JIGSAWSTACK_NOT_AVAILABLE', 'JigsawStack not configured, skipping Boss Mode enhancement');
      return [];
    }

    const results: JigsawScrapedProduct[] = [];
    const promises: Promise<void>[] = [];

    // Made-in-China works better with JigsawStack
    if (sources.includes('made-in-china')) {
      promises.push(
        (async () => {
          try {
            const products = await jigsawService.scrapeMadeInChina(query, limit);
            results.push(...products);
          } catch (error) {
            logger.warn('JIGSAWSTACK_MIC_FAILED', 'JigsawStack MIC failed', { error: (error as Error).message });
          }
        })()
      );
    }

    // Alibaba has lower success rate with JigsawStack but try anyway
    if (sources.includes('alibaba')) {
      promises.push(
        (async () => {
          try {
            const products = await jigsawService.scrapeAlibaba(query, limit);
            results.push(...products);
          } catch (error) {
            logger.warn('JIGSAWSTACK_ALIBABA_FAILED', 'JigsawStack Alibaba failed', { error: (error as Error).message });
          }
        })()
      );
    }

    await Promise.allSettled(promises);
    return results;
  }

  /**
   * Merge Puppeteer and JigsawStack results, enriching where possible
   */
  private mergeAndEnrich(
    puppeteerProducts: BossModeProduct[],
    jigsawProducts: JigsawScrapedProduct[]
  ): BossModeProduct[] {
    const merged: BossModeProduct[] = [...puppeteerProducts];
    const existingTitles = new Set(puppeteerProducts.map(p => this.normalizeTitle(p.title)));

    for (const jp of jigsawProducts) {
      const normalizedTitle = this.normalizeTitle(jp.title);
      
      // Check if this product already exists (by similar title)
      const existingIndex = puppeteerProducts.findIndex(
        p => this.isSimilarProduct(p, jp)
      );

      if (existingIndex >= 0) {
        // Enrich existing product with JigsawStack data
        merged[existingIndex] = this.enrichProduct(merged[existingIndex], jp);
      } else if (!existingTitles.has(normalizedTitle)) {
        // Add new product from JigsawStack
        merged.push(this.convertJigsawToBossModeProduct(jp));
        existingTitles.add(normalizedTitle);
      }
    }

    return merged;
  }

  /**
   * Check if two products are similar (likely the same product)
   */
  private isSimilarProduct(p1: BossModeProduct, p2: JigsawScrapedProduct): boolean {
    // Same source
    if (p1.source !== p2.source) return false;

    // Similar title (case-insensitive, first 30 chars)
    const title1 = this.normalizeTitle(p1.title).substring(0, 30);
    const title2 = this.normalizeTitle(p2.title).substring(0, 30);
    
    if (title1 === title2) return true;

    // Similar supplier name
    const supplier1 = this.normalizeTitle(p1.supplierName).substring(0, 20);
    const supplier2 = this.normalizeTitle(p2.supplierName).substring(0, 20);
    
    if (title1.substring(0, 15) === title2.substring(0, 15) && supplier1 === supplier2) {
      return true;
    }

    return false;
  }

  /**
   * Enrich a Puppeteer product with JigsawStack data
   */
  private enrichProduct(original: BossModeProduct, jigsaw: JigsawScrapedProduct): BossModeProduct {
    const enriched = { ...original };
    const enrichedFields: string[] = [];

    // Fill missing price data
    if (!enriched.priceMin && jigsaw.priceMin) {
      enriched.priceMin = jigsaw.priceMin;
      enriched.priceMax = jigsaw.priceMax;
      enriched.priceDisplay = jigsaw.price;
      enrichedFields.push('price');
    }

    // Fill missing supplier rating
    if (!enriched.supplierRating && jigsaw.ratingNumber) {
      enriched.supplierRating = jigsaw.ratingNumber;
      enriched.supplierRatingDisplay = jigsaw.supplierRating;
      enrichedFields.push('supplierRating');
    }

    // Fill missing MOQ
    if (!enriched.minOrder && jigsaw.moqNumber) {
      enriched.minOrder = jigsaw.moqNumber;
      enriched.moqDisplay = jigsaw.minOrder;
      enrichedFields.push('minOrder');
    }

    // Use more complete supplier name if available
    if (jigsaw.supplierName && jigsaw.supplierName.length > enriched.supplierName.length) {
      enriched.supplierName = jigsaw.supplierName;
      enrichedFields.push('supplierName');
    }

    if (enrichedFields.length > 0) {
      enriched.scrapedBy = 'merged';
      enriched.enrichedFields = enrichedFields;
    }

    return enriched;
  }

  /**
   * Convert Puppeteer product to BossModeProduct format
   */
  private convertToBossModeProduct(
    product: ScrapedProduct | MICScrapedProduct,
    scrapedBy: 'puppeteer' | 'jigsawstack'
  ): BossModeProduct {
    return {
      id: product.id,
      title: product.title,
      description: product.description,
      price: product.price,
      priceMin: product.price,
      priceMax: product.price,
      minOrder: product.minOrder,
      imageUrl: product.image_url,
      productUrl: product.url,
      supplierId: product.supplierId,
      supplierName: product.supplierName,
      supplierRating: product.supplierRating,
      supplierResponseRate: (product as any).supplierResponseRate,
      supplierTransactionLevel: (product as any).supplierTransactionLevel,
      supplierYearsInBusiness: product.supplierYearsInBusiness,
      source: product.source as 'alibaba' | 'made-in-china',
      scrapedBy,
      bossMode: false,
    };
  }

  /**
   * Convert JigsawStack product to BossModeProduct format
   */
  private convertJigsawToBossModeProduct(product: JigsawScrapedProduct): BossModeProduct {
    return {
      id: product.id,
      title: product.title,
      priceMin: product.priceMin,
      priceMax: product.priceMax,
      priceDisplay: product.price,
      minOrder: product.moqNumber,
      moqDisplay: product.minOrder,
      imageUrl: product.imageUrl,
      productUrl: product.productUrl,
      supplierName: product.supplierName,
      supplierRating: product.ratingNumber,
      supplierRatingDisplay: product.supplierRating,
      source: product.source,
      scrapedBy: 'jigsawstack',
      bossMode: true,
    };
  }

  /**
   * Normalize title for comparison
   */
  private normalizeTitle(title: string): string {
    return title.toLowerCase().replace(/[^a-z0-9]/g, '');
  }
}

// Singleton instance
let bossModeService: BossModeService | null = null;

export function getBossModeService(): BossModeService {
  if (!bossModeService) {
    bossModeService = new BossModeService();
  }
  return bossModeService;
}

export { BossModeService };
