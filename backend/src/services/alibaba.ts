/**
 * Alibaba Product Discovery Service
 * Exports the web scraper for supplier discovery
 * Web scraper directly extracts data from Alibaba.com
 */

export { getAlibabaScraper, default as AlibabaScraper } from './alibaba-scraper';
export type { ScrapedProduct as AlibabaProduct } from './alibaba-scraper';
