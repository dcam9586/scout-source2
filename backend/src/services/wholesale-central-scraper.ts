/**
 * Wholesale Central Web Scraper Service
 * Scrapes wholesalecentral.com for US wholesale products
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { createLogger } from '../utils/logger';

const logger = createLogger('WholesaleCentralScraper');

export interface WholesaleCentralProduct {
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
  source: 'wholesale-central';
}

class WholesaleCentralScraper {
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
        logger.debug('BROWSER_INITIALIZED', 'Wholesale Central browser initialized');
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

  async searchProducts(query: string, limit: number = 10): Promise<WholesaleCentralProduct[]> {
    const startTime = Date.now();
    let page: Page | null = null;

    try {
      logger.info('WHOLESALE_SCRAPE_START', `Scraping Wholesale Central for: "${query}"`, undefined, {
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

      const searchUrl = `https://www.wholesalecentral.com/c/search.php?q=${encodeURIComponent(query)}`;
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

      await page.waitForSelector('.product, .listing, [class*="item"]', { timeout: 10000 }).catch(() => {});

      const products = await page.evaluate((maxResults: number) => {
        const items: WholesaleCentralProduct[] = [];
        
        const productElements = document.querySelectorAll('.product, .listing-item, [class*="productCard"], .search-result');
        
        productElements.forEach((el, index) => {
          if (index >= maxResults) return;
          
          const titleEl = el.querySelector('h2, h3, h4, .title, [class*="name"]');
          const priceEl = el.querySelector('[class*="price"], .price');
          const imageEl = el.querySelector('img');
          const linkEl = el.querySelector('a[href]');
          const supplierEl = el.querySelector('[class*="company"], [class*="seller"], [class*="vendor"]');
          const descEl = el.querySelector('[class*="desc"], p');
          
          if (titleEl) {
            const title = titleEl.textContent?.trim() || '';
            const priceText = priceEl?.textContent?.trim() || '';
            const priceMatch = priceText.match(/[\d,.]+/);
            
            items.push({
              id: `wc-${Date.now()}-${index}`,
              title,
              description: descEl?.textContent?.trim() || undefined,
              price: priceMatch ? parseFloat(priceMatch[0].replace(',', '')) : undefined,
              image_url: imageEl?.src || imageEl?.getAttribute('data-src') || undefined,
              url: linkEl ? (linkEl as HTMLAnchorElement).href : undefined,
              supplierName: supplierEl?.textContent?.trim() || 'US Wholesaler',
              supplierCountry: 'United States',
              source: 'wholesale-central' as const,
            });
          }
        });
        
        return items;
      }, limit);

      const duration = Date.now() - startTime;
      logger.info('WHOLESALE_SCRAPE_SUCCESS', `Found ${products.length} products`, duration, {
        query,
        count: products.length,
      });

      return products;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('WHOLESALE_SCRAPE_ERROR', 'Scraping failed', error as Error, {
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

let scraperInstance: WholesaleCentralScraper | null = null;

export function getWholesaleCentralScraper(): WholesaleCentralScraper {
  if (!scraperInstance) {
    scraperInstance = new WholesaleCentralScraper();
  }
  return scraperInstance;
}

export default WholesaleCentralScraper;
