/**
 * TradeKorea Web Scraper Service
 * Scrapes tradekorea.com for Korean manufacturer products
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { createLogger } from '../utils/logger';

const logger = createLogger('TradeKoreaScraper');

export interface TradeKoreaProduct {
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
  supplierCountry?: string;
  source: 'tradekorea';
}

class TradeKoreaScraper {
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
        logger.debug('BROWSER_INITIALIZED', 'TradeKorea browser initialized');
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

  async searchProducts(query: string, limit: number = 10): Promise<TradeKoreaProduct[]> {
    const startTime = Date.now();
    let page: Page | null = null;

    try {
      logger.info('TRADEKOREA_SCRAPE_START', `Scraping TradeKorea for: "${query}"`, undefined, {
        query,
        limit,
      });

      const browser = await this.initBrowser();
      page = await browser.newPage();

      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      await page.setRequestInterception(true);
      page.on('request', (req) => {
        if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
          req.abort();
        } else {
          req.continue();
        }
      });

      const searchUrl = `https://www.tradekorea.com/product/product_search.html?search_text=${encodeURIComponent(query)}`;
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

      await page.waitForSelector('.product-list, .search-result, [class*="product"]', { timeout: 10000 }).catch(() => {});

      const products = await page.evaluate((maxResults: number) => {
        const items: TradeKoreaProduct[] = [];
        
        const productElements = document.querySelectorAll('.product-item, .prd-item, [class*="productCard"]');
        
        productElements.forEach((el, index) => {
          if (index >= maxResults) return;
          
          const titleEl = el.querySelector('h3, h4, .prd-name, [class*="title"]');
          const priceEl = el.querySelector('[class*="price"], .price');
          const imageEl = el.querySelector('img');
          const linkEl = el.querySelector('a[href*="/product/"]');
          const supplierEl = el.querySelector('[class*="company"], [class*="seller"]');
          
          if (titleEl) {
            const title = titleEl.textContent?.trim() || '';
            const priceText = priceEl?.textContent?.trim() || '';
            const priceMatch = priceText.match(/[\d,.]+/);
            
            items.push({
              id: `tk-${Date.now()}-${index}`,
              title,
              price: priceMatch ? parseFloat(priceMatch[0].replace(',', '')) : undefined,
              image_url: imageEl?.src || imageEl?.getAttribute('data-src') || undefined,
              url: linkEl ? (linkEl as HTMLAnchorElement).href : undefined,
              supplierName: supplierEl?.textContent?.trim() || 'Korean Supplier',
              supplierCountry: 'South Korea',
              source: 'tradekorea' as const,
            });
          }
        });
        
        return items;
      }, limit);

      const duration = Date.now() - startTime;
      logger.info('TRADEKOREA_SCRAPE_SUCCESS', `Found ${products.length} products`, duration, {
        query,
        count: products.length,
      });

      return products;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('TRADEKOREA_SCRAPE_ERROR', 'Scraping failed', error as Error, {
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

let scraperInstance: TradeKoreaScraper | null = null;

export function getTradeKoreaScraper(): TradeKoreaScraper {
  if (!scraperInstance) {
    scraperInstance = new TradeKoreaScraper();
  }
  return scraperInstance;
}

export default TradeKoreaScraper;
