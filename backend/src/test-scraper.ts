/**
 * Test script for Alibaba scraper
 * Run with: npx ts-node src/test-scraper.ts
 */

import { getAlibabaScraper } from './services/alibaba-scraper';

async function main() {
  console.log('Testing Alibaba Scraper...\n');
  
  const scraper = getAlibabaScraper();
  
  try {
    console.log('Searching for "icemaker"...');
    const products = await scraper.searchProducts('icemaker', 3);
    
    console.log(`\nFound ${products.length} products:\n`);
    
    products.forEach((p, i) => {
      console.log(`${i + 1}. ${p.title}`);
      console.log(`   Supplier: ${p.supplierName}`);
      console.log(`   Price: $${p.price || 'N/A'}`);
      console.log(`   Rating: ${p.supplierRating || 'N/A'}`);
      console.log(`   URL: ${p.url || 'N/A'}`);
      console.log('');
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await scraper.closeBrowser();
    console.log('Browser closed. Done.');
    process.exit(0);
  }
}

main();
