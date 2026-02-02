/**
 * Alibaba Web Scraper Service
 * Scrapes alibaba.com directly for product and supplier information
 * Focuses on extracting supplier ratings and quality metrics
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { createLogger } from '../utils/logger';

const logger = createLogger('AlibabaScraper');

export interface ScrapedProduct {
  id: string;
  title: string;
  description?: string;
  price?: number;
  minOrder?: number;
  image_url?: string;
  url?: string;
  supplierId?: string;
  supplierName: string;
  supplierRating?: number; // 0-5
  supplierResponseRate?: number; // 0-100
  supplierTransactionLevel?: string; // Gold, Silver, etc.
  supplierYearsInBusiness?: number;
  source: 'alibaba';
}

class AlibabaScraper {
  private browser: Browser | null = null;

  /**
   * Initialize browser instance with error handling
   */
  private async initBrowser(): Promise<Browser> {
    if (!this.browser) {
      try {
        console.log('[AlibabaScraper] Launching Puppeteer browser...');
        this.browser = await puppeteer.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-extensions',
            '--disable-accelerated-2d-canvas'
          ],
        });
        console.log('[AlibabaScraper] Browser launched successfully');
        logger.debug('BROWSER_INITIALIZED', 'Puppeteer browser initialized');
      } catch (error) {
        console.error('[AlibabaScraper] Failed to launch browser:', error);
        logger.error('BROWSER_INIT_ERROR', 'Failed to initialize browser', error as Error);
        throw error;
      }
    }
    return this.browser;
  }

  /**
   * Close browser instance
   */
  async closeBrowser(): Promise<void> {
    if (this.browser) {
      try {
        await this.browser.close();
        this.browser = null;
        logger.debug('BROWSER_CLOSED', 'Browser closed');
      } catch (error) {
        logger.error('BROWSER_CLOSE_ERROR', 'Failed to close browser', error as Error);
      }
    }
  }

  /**
   * Search Alibaba for products
   */
  async searchProducts(query: string, limit: number = 10): Promise<ScrapedProduct[]> {
    const startTime = Date.now();
    let page: Page | null = null;

    try {
      logger.info('ALIBABA_SCRAPE_START', `Scraping Alibaba for: "${query}"`, undefined, {
        query,
        limit,
      });

      const browser = await this.initBrowser();
      page = await browser.newPage();

      // Set user agent to avoid blocking
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      // Block images and unnecessary resources for speed
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
          req.abort();
        } else {
          req.continue();
        }
      });

      // Navigate to search
      const searchUrl = `https://www.alibaba.com/trade/search?SearchText=${encodeURIComponent(query)}`;
      logger.debug('NAVIGATION_START', `Navigating to ${searchUrl}`);
      console.log(`[AlibabaScraper] Navigating to: ${searchUrl}`);

      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
      console.log('[AlibabaScraper] Page loaded, waiting for content...');

      // Wait a bit for JavaScript to render
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Try multiple selectors for products
      const selectors = [
        '.fy23-search-card',
        '[class*="search-card"]',
        '.organic-list-offer',
        '[data-content="productList"]',
        '.list-gallery',
      ];

      let foundSelector = null;
      for (const sel of selectors) {
        try {
          await page.waitForSelector(sel, { timeout: 2000 });
          foundSelector = sel;
          console.log(`[AlibabaScraper] Found selector: ${sel}`);
          break;
        } catch {
          // Try next selector
        }
      }

      if (!foundSelector) {
        console.log('[AlibabaScraper] No product selectors found, trying generic approach...');
      }

      // Extract product data - note: code inside evaluate() runs in browser context
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const products: any[] = await page.evaluate((maxLimit) => {
        const items: any[] = [];
        
        // Try multiple selector patterns
        const productSelectors = [
          '.fy23-search-card',
          '[class*="search-card"]',
          '.organic-list-offer',
          '[class*="offer-item"]',
          '.list-gallery .item',
        ];
        
        // @ts-ignore - browser context types
        let productElements: any = null;
        for (const sel of productSelectors) {
          // @ts-ignore
          const found = document.querySelectorAll(sel);
          if (found && found.length > 0) {
            productElements = found;
            break;
          }
        }
        
        if (!productElements || productElements.length === 0) {
          return items;
        }

        // @ts-ignore - forEach and el are browser context
        productElements.forEach((el: any, index: number) => {
          if (index >= maxLimit) return;

          try {
            const titleEl = el.querySelector('h2 a, .search-card-e-title-wrapper a');
            const priceEl = el.querySelector('[class*="price"]');
            const supplierEl = el.querySelector('[class*="company"]');
            const ratingEl = el.querySelector('[class*="rating"]');
            const imageEl = el.querySelector('img[data-src], img[src]');
            const linkEl = el.querySelector('a[href*="com/trade/"]');

            items.push({
              title: titleEl?.textContent?.trim() || '',
              price: priceEl?.textContent?.trim() || '',
              supplier: supplierEl?.textContent?.trim() || '',
              rating: ratingEl?.textContent?.trim() || '',
              image: imageEl?.getAttribute('data-src') || imageEl?.getAttribute('src') || '',
              url: linkEl?.getAttribute('href') || '',
            });
          } catch (err) {
            // Silent catch in browser context
          }
        });

        return items;
      }, limit);

      const duration = Date.now() - startTime;
      console.log(`[AlibabaScraper] Scraped ${products.length} raw products in ${duration}ms`);

      logger.info('ALIBABA_SCRAPE_SUCCESS', `Scraped ${products.length} products`, duration, {
        query,
        resultsCount: products.length,
      });

      // Process and normalize products
      const normalized = this.normalizeScrapedProducts(products, query);
      console.log(`[AlibabaScraper] Normalized ${normalized.length} products`);

      return normalized.slice(0, limit);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('[AlibabaScraper] Error during scraping:', error);
      logger.error('ALIBABA_SCRAPE_ERROR', 'Alibaba scraping failed', error as Error, {
        query,
        duration,
      });
      return [];
    } finally {
      if (page) {
        await page.close().catch(() => {});
      }
    }
  }

  /**
   * Normalize scraped products to SourceScout format
   */
  private normalizeScrapedProducts(rawProducts: any[], query: string): ScrapedProduct[] {
    return rawProducts
      .map((product, index) => {
        try {
          const price = this.parsePrice(product.price);
          const rating = this.parseRating(product.rating);
          const responseRate = this.parseResponseRate(product.rating);

          const normalized: ScrapedProduct = {
            id: `alibaba-${Date.now()}-${index}`,
            title: product.title,
            price,
            minOrder: this.parseMinOrder(product.price),
            image_url: product.image,
            url: product.url,
            supplierName: product.supplier,
            supplierRating: rating,
            supplierResponseRate: responseRate,
            supplierTransactionLevel: this.parseTransactionLevel(product.supplier),
            source: 'alibaba',
          };
          return normalized;
        } catch (err) {
          logger.debug('PRODUCT_PARSE_ERROR', 'Failed to parse product', {
            title: product.title,
            error: (err as Error).message,
          });
          return null;
        }
      })
      .filter((product): product is ScrapedProduct => product !== null);
  }

  /**
   * Parse price string (e.g., "$5.00-$10.00 / Piece")
   */
  private parsePrice(priceStr?: string): number | undefined {
    if (!priceStr) return undefined;

    // Extract numbers
    const numbers = priceStr.match(/[\d.]+/g);
    if (!numbers) return undefined;

    const prices = numbers.map(n => parseFloat(n)).filter(n => !isNaN(n));
    if (prices.length === 0) return undefined;

    // Return average if range
    return prices.length > 1 ? (prices[0] + prices[prices.length - 1]) / 2 : prices[0];
  }

  /**
   * Parse minimum order from price string
   */
  private parseMinOrder(priceStr?: string): number {
    if (!priceStr) return 1;

    const match = priceStr.match(/(\d+)\s*Piece/i);
    return match ? parseInt(match[1], 10) : 1;
  }

  /**
   * Parse supplier rating from rating string
   * Alibaba shows ratings like "4.8/5" or percentage
   */
  private parseRating(ratingStr?: string): number | undefined {
    if (!ratingStr) return undefined;

    const match = ratingStr.match(/([\d.]+)(?:\/5|%)?/);
    if (!match) return undefined;

    let rating = parseFloat(match[1]);
    if (isNaN(rating)) return undefined;

    // Normalize to 0-5 scale
    if (rating > 5) rating = (rating / 100) * 5; // If percentage
    return Math.min(Math.max(rating, 0), 5);
  }

  /**
   * Parse response rate from rating string
   */
  private parseResponseRate(ratingStr?: string): number | undefined {
    if (!ratingStr) return undefined;

    // Look for percentage like "98.5%"
    const match = ratingStr.match(/([\d.]+)%/);
    if (!match) return undefined;

    const rate = parseFloat(match[1]);
    return isNaN(rate) ? undefined : Math.min(Math.max(rate, 0), 100);
  }

  /**
   * Determine transaction level from supplier string
   */
  private parseTransactionLevel(supplierStr?: string): string | undefined {
    if (!supplierStr) return undefined;

    if (supplierStr.includes('Gold')) return 'Gold';
    if (supplierStr.includes('Silver')) return 'Silver';
    if (supplierStr.includes('Assessed')) return 'Assessed';
    if (supplierStr.includes('Premium')) return 'Premium';

    return undefined;
  }
}

// Singleton instance
let instance: AlibabaScraper | null = null;

export function getAlibabaScraper(): AlibabaScraper {
  if (!instance) {
    instance = new AlibabaScraper();
  }
  return instance;
}

export default AlibabaScraper;
