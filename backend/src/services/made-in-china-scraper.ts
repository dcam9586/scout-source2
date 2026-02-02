/**
 * Made-in-China Web Scraper Service
 * Scrapes made-in-china.com for product and supplier information
 * Similar to Alibaba scraper but for Made-in-China platform
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { createLogger } from '../utils/logger';

const logger = createLogger('MadeInChinaScraper');

export interface MICScrapedProduct {
  id: string;
  title: string;
  description?: string;
  price?: number;
  priceRange?: string;
  minOrder?: number;
  image_url?: string;
  url?: string;
  supplierId?: string;
  supplierName: string;
  supplierRating?: number;
  supplierVerified?: boolean;
  supplierYearsInBusiness?: number;
  supplierLocation?: string;
  source: 'made-in-china';
}

class MadeInChinaScraper {
  private browser: Browser | null = null;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 2000;

  /**
   * Initialize browser instance with error handling
   */
  private async initBrowser(): Promise<Browser> {
    if (!this.browser) {
      try {
        console.log('[MadeInChinaScraper] Launching Puppeteer browser...');
        this.browser = await puppeteer.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-extensions',
            '--disable-accelerated-2d-canvas',
            '--window-size=1920,1080',
          ],
        });
        console.log('[MadeInChinaScraper] Browser launched successfully');
        logger.debug('BROWSER_INITIALIZED', 'Puppeteer browser initialized');
      } catch (error) {
        console.error('[MadeInChinaScraper] Failed to launch browser:', error);
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
   * Wait with exponential backoff
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Search Made-in-China for products
   */
  async searchProducts(query: string, limit: number = 10): Promise<MICScrapedProduct[]> {
    const startTime = Date.now();
    let page: Page | null = null;
    let retryCount = 0;

    while (retryCount < this.MAX_RETRIES) {
      try {
        logger.info('MIC_SCRAPE_START', `Scraping Made-in-China for: "${query}"`, undefined, {
          query,
          limit,
          attempt: retryCount + 1,
        });

        const browser = await this.initBrowser();
        page = await browser.newPage();

        // Set viewport and user agent
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent(
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );

        // Block unnecessary resources for speed
        await page.setRequestInterception(true);
        page.on('request', (req) => {
          const blockedTypes = ['image', 'stylesheet', 'font', 'media'];
          if (blockedTypes.includes(req.resourceType())) {
            req.abort();
          } else {
            req.continue();
          }
        });

        // Set extra headers
        await page.setExtraHTTPHeaders({
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        });

        // Navigate to search page
        const searchUrl = `https://www.made-in-china.com/productdirectory.do?word=${encodeURIComponent(query)}&subaction=hunt&style=b&mode=and&comession=S&code=0&order=0`;
        
        logger.debug('MIC_NAVIGATE', `Navigating to: ${searchUrl}`);
        
        await page.goto(searchUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 30000,
        });

        // Wait for product listings to load
        await this.delay(2000);

        // Try to wait for product elements
        try {
          await page.waitForSelector('.product-list, .product-item, .prod-list, .pro-item', { timeout: 10000 });
        } catch {
          logger.warn('MIC_NO_RESULTS', 'No product elements found, trying alternative selectors');
        }

        // Extract products from the page
        const products = await page.evaluate((maxProducts: number) => {
          const items: any[] = [];
          
          // Multiple selector strategies for Made-in-China's varying HTML structure
          const selectors = [
            '.product-item',
            '.prod-list .prod-item',
            '.pro-info',
            '.product-info',
            '[data-product-id]',
            '.search-result-item',
          ];

          let productElements: Element[] = [];
          for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
              productElements = Array.from(elements);
              break;
            }
          }

          // If still no products, try a more generic approach
          if (productElements.length === 0) {
            // Look for any container with product-like structure
            const allLinks = document.querySelectorAll('a[href*="/product/"]');
            const seenProducts = new Set<string>();
            
            allLinks.forEach((link: any) => {
              const href = link.getAttribute('href');
              if (href && !seenProducts.has(href)) {
                seenProducts.add(href);
                const container = link.closest('div, li, article');
                if (container) {
                  productElements.push(container);
                }
              }
            });
          }

          for (let i = 0; i < Math.min(productElements.length, maxProducts); i++) {
            const element = productElements[i];

            try {
              // Extract title
              const titleEl = element.querySelector('h2, h3, .title, .pro-name, .product-name, a[title]');
              const title = titleEl?.textContent?.trim() || 
                           (titleEl as HTMLAnchorElement)?.title || 
                           element.querySelector('a')?.title || '';

              if (!title || title.length < 3) continue;

              // Extract URL
              const linkEl = element.querySelector('a[href*="/product/"], a[href*="made-in-china.com"]');
              const url = (linkEl as HTMLAnchorElement)?.href || '';

              // Extract ID from URL or generate one
              const idMatch = url.match(/\/product\/([^\/\?]+)/);
              const id = idMatch ? idMatch[1] : `mic-${Date.now()}-${i}`;

              // Extract price
              const priceEl = element.querySelector('.price, .pro-price, .product-price, [class*="price"]');
              let priceText = priceEl?.textContent?.trim() || '';
              let price: number | undefined;
              let priceRange: string | undefined;
              
              const priceMatch = priceText.match(/\$?\s*([\d,.]+)\s*(?:-|~)?\s*\$?\s*([\d,.]+)?/);
              if (priceMatch) {
                price = parseFloat(priceMatch[1].replace(/,/g, ''));
                if (priceMatch[2]) {
                  priceRange = `$${priceMatch[1]} - $${priceMatch[2]}`;
                }
              }

              // Extract MOQ
              const moqEl = element.querySelector('.moq, .min-order, [class*="moq"], [class*="min"]');
              let moqText = moqEl?.textContent?.trim() || '';
              let minOrder: number | undefined;
              const moqMatch = moqText.match(/(\d+)/);
              if (moqMatch) {
                minOrder = parseInt(moqMatch[1]);
              }

              // Extract image
              const imgEl = element.querySelector('img[src], img[data-src]');
              const imageUrl = (imgEl as HTMLImageElement)?.src || 
                              imgEl?.getAttribute('data-src') || '';

              // Extract supplier info
              const supplierEl = element.querySelector('.company, .supplier, .factory, .manufacturer, [class*="company"]');
              const supplierName = supplierEl?.textContent?.trim() || 'Made-in-China Supplier';

              // Check for verified status
              const verifiedEl = element.querySelector('.verified, .gold, .audited, [class*="verified"], [class*="audit"]');
              const supplierVerified = !!verifiedEl;

              items.push({
                id,
                title,
                url,
                price,
                priceRange,
                minOrder,
                image_url: imageUrl,
                supplierName,
                supplierVerified,
                source: 'made-in-china',
              });
            } catch (err) {
              console.error('Error parsing product element:', err);
            }
          }

          return items;
        }, limit);

        // Close page
        await page.close();
        page = null;

        const duration = Date.now() - startTime;
        logger.info('MIC_SCRAPE_SUCCESS', `Found ${products.length} products on Made-in-China`, duration, {
          query,
          count: products.length,
        });

        return products as MICScrapedProduct[];

      } catch (error) {
        retryCount++;
        const errorMessage = (error as Error).message;
        
        logger.warn('MIC_SCRAPE_RETRY', `Scrape attempt ${retryCount} failed: ${errorMessage}`, {
          query,
          retryCount,
        });

        if (page) {
          try {
            await page.close();
          } catch {}
          page = null;
        }

        if (retryCount >= this.MAX_RETRIES) {
          const duration = Date.now() - startTime;
          logger.error('MIC_SCRAPE_FAILED', `Failed after ${this.MAX_RETRIES} attempts`, error as Error, {
            query,
            duration,
          });
          return [];
        }

        // Wait before retrying with exponential backoff
        await this.delay(this.RETRY_DELAY * retryCount);
      }
    }

    return [];
  }

  /**
   * Get supplier details from product page
   */
  async getSupplierDetails(productUrl: string): Promise<Partial<MICScrapedProduct>> {
    let page: Page | null = null;

    try {
      const browser = await this.initBrowser();
      page = await browser.newPage();

      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      await page.goto(productUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      await this.delay(2000);

      const details = await page.evaluate(() => {
        // Extract more detailed supplier info from product page
        const supplierEl = document.querySelector('.company-info, .supplier-info, [class*="company"]');
        const ratingEl = document.querySelector('.rating, .score, [class*="rating"]');
        const yearsEl = document.querySelector('[class*="year"], .business-type');
        const locationEl = document.querySelector('.location, .address, [class*="location"]');

        let supplierRating: number | undefined;
        const ratingMatch = ratingEl?.textContent?.match(/(\d+\.?\d*)/);
        if (ratingMatch) {
          supplierRating = parseFloat(ratingMatch[1]);
          // Normalize to 5-star scale if needed
          if (supplierRating > 5) {
            supplierRating = supplierRating / 20; // Assuming 100-point scale
          }
        }

        let yearsInBusiness: number | undefined;
        const yearsMatch = yearsEl?.textContent?.match(/(\d+)\s*year/i);
        if (yearsMatch) {
          yearsInBusiness = parseInt(yearsMatch[1]);
        }

        return {
          supplierName: supplierEl?.textContent?.trim() || undefined,
          supplierRating,
          supplierYearsInBusiness: yearsInBusiness,
          supplierLocation: locationEl?.textContent?.trim() || undefined,
        };
      });

      await page.close();
      return details;

    } catch (error) {
      logger.error('MIC_SUPPLIER_DETAILS_ERROR', 'Failed to get supplier details', error as Error, {
        productUrl,
      });
      if (page) {
        try {
          await page.close();
        } catch {}
      }
      return {};
    }
  }
}

// Singleton instance
let scraperInstance: MadeInChinaScraper | null = null;

export function getMadeInChinaScraper(): MadeInChinaScraper {
  if (!scraperInstance) {
    scraperInstance = new MadeInChinaScraper();
  }
  return scraperInstance;
}

export async function closeMadeInChinaScraper(): Promise<void> {
  if (scraperInstance) {
    await scraperInstance.closeBrowser();
    scraperInstance = null;
  }
}

export { MadeInChinaScraper };
