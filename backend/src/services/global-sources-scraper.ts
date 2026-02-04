/**
 * Global Sources Web Scraper Service
 * Scrapes globalsources.com for product and supplier information
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { createLogger } from '../utils/logger';

const logger = createLogger('GlobalSourcesScraper');

export interface GlobalSourcesProduct {
  id: string;
  title: string;
  description?: string;
  price?: number;
  minOrder?: number;
  image_url?: string;
  url?: string;
  supplierId?: string;
  supplierName: string;
  supplierRating?: number;
  supplierResponseRate?: number;
  supplierTransactionLevel?: string;
  supplierYearsInBusiness?: number;
  source: 'global-sources';
}

class GlobalSourcesScraper {
  private browser: Browser | null = null;

  private async initBrowser(): Promise<Browser> {
    if (!this.browser) {
      try {
        this.browser = await puppeteer.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
          ],
        });
        logger.debug('BROWSER_INITIALIZED', 'Global Sources browser initialized');
      } catch (error) {
        logger.error('BROWSER_INIT_ERROR', 'Failed to initialize browser', error as Error);
        throw error;
      }
    }
    return this.browser;
  }

  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async searchProducts(query: string, limit: number = 10): Promise<GlobalSourcesProduct[]> {
    const startTime = Date.now();
    let page: Page | null = null;

    try {
      logger.info('GLOBAL_SOURCES_SCRAPE_START', `Scraping Global Sources for: "${query}"`, undefined, {
        query,
        limit,
      });

      const browser = await this.initBrowser();
      page = await browser.newPage();

      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      // Block heavy resources
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
          req.abort();
        } else {
          req.continue();
        }
      });

      const searchUrl = `https://www.globalsources.com/searchList/products?query=${encodeURIComponent(query)}`;
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // Wait for product listings
      await page.waitForSelector('.product-item, .search-result-item, [class*="product"]', { timeout: 10000 }).catch(() => {});

      const products = await page.evaluate((maxResults: number) => {
        const items: GlobalSourcesProduct[] = [];
        
        // Try multiple selectors for product items
        const productElements = document.querySelectorAll('.product-item, .search-result-item, [class*="productCard"]');
        
        productElements.forEach((el, index) => {
          if (index >= maxResults) return;
          
          const titleEl = el.querySelector('h2, h3, .product-title, [class*="title"]');
          const priceEl = el.querySelector('[class*="price"], .price');
          const imageEl = el.querySelector('img');
          const linkEl = el.querySelector('a[href*="/product/"], a[href*="/p/"]');
          const supplierEl = el.querySelector('[class*="supplier"], [class*="company"]');
          
          if (titleEl) {
            const title = titleEl.textContent?.trim() || '';
            const priceText = priceEl?.textContent?.trim() || '';
            const priceMatch = priceText.match(/[\d,.]+/);
            
            items.push({
              id: `gs-${Date.now()}-${index}`,
              title,
              price: priceMatch ? parseFloat(priceMatch[0].replace(',', '')) : undefined,
              image_url: imageEl?.src || imageEl?.getAttribute('data-src') || undefined,
              url: linkEl ? (linkEl as HTMLAnchorElement).href : undefined,
              supplierName: supplierEl?.textContent?.trim() || 'Global Sources Supplier',
              source: 'global-sources' as const,
            });
          }
        });
        
        return items;
      }, limit);

      const duration = Date.now() - startTime;
      logger.info('GLOBAL_SOURCES_SCRAPE_SUCCESS', `Found ${products.length} products`, duration, {
        query,
        count: products.length,
      });

      return products;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('GLOBAL_SOURCES_SCRAPE_ERROR', 'Scraping failed', error as Error, {
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
}

// Singleton instance
let scraperInstance: GlobalSourcesScraper | null = null;

export function getGlobalSourcesScraper(): GlobalSourcesScraper {
  if (!scraperInstance) {
    scraperInstance = new GlobalSourcesScraper();
  }
  return scraperInstance;
}

export default GlobalSourcesScraper;
