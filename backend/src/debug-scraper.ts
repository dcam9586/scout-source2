/**
 * Debug script - saves screenshot of Alibaba search page
 * Run: npx ts-node src/debug-scraper.ts
 */

import puppeteer from 'puppeteer';

async function debug() {
  console.log('Launching browser...');
  
  const browser = await puppeteer.launch({
    headless: false, // Show browser window for debugging
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  const page = await browser.newPage();
  
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );
  
  const searchUrl = 'https://www.alibaba.com/trade/search?SearchText=ice+maker';
  console.log(`Navigating to: ${searchUrl}`);
  
  await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  
  console.log('Page loaded. Waiting 5 seconds for JS to render...');
  await new Promise(r => setTimeout(r, 5000));
  
  // Save screenshot
  await page.screenshot({ path: 'alibaba-debug.png', fullPage: true });
  console.log('Screenshot saved to alibaba-debug.png');
  
  // Get page HTML for analysis
  const html = await page.content();
  console.log('\n--- Checking for product elements ---');
  
  // Check various selectors
  const selectors = [
    '.fy23-search-card',
    '[class*="search-card"]',
    '.organic-list-offer',
    '[class*="offer-item"]',
    '.list-gallery .item',
    '.J-offer-wrapper',
    '[data-content="productList"]',
    '.organic-gallery-offer',
    '.organic-offer-wrapper',
  ];
  
  for (const sel of selectors) {
    const count = await page.$$eval(sel, els => els.length).catch(() => 0);
    console.log(`  ${sel}: ${count} elements`);
  }
  
  // Try to find any product-like elements
  const allClasses: string[] = await page.evaluate(() => {
    const classes = new Set<string>();
    // @ts-ignore
    document.querySelectorAll('*').forEach((el: any) => {
      if (el.classList) {
        el.classList.forEach((c: string) => {
          if (c.includes('product') || c.includes('offer') || c.includes('card') || c.includes('gallery')) {
            classes.add(c);
          }
        });
      }
    });
    return Array.from(classes).slice(0, 30);
  });
  
  console.log('\n--- Relevant class names found ---');
  console.log(allClasses.join(', '));
  
  console.log('\nKeeping browser open for 30 seconds so you can inspect...');
  await new Promise(r => setTimeout(r, 30000));
  
  await browser.close();
  console.log('Done.');
}

debug().catch(console.error);
