/**
 * JigsawStack AI Scraper Test
 * Tests Alibaba scraping to compare with existing Puppeteer approach
 */

import dotenv from 'dotenv';
dotenv.config();

const JIGSAWSTACK_API_KEY = process.env.JIGSAWSTACK_API_KEY;
const BASE_URL = 'https://api.jigsawstack.com/v1';

interface JigsawScrapeResponse {
  success: boolean;
  context?: Record<string, string[]>;
  selectors?: Record<string, string[]>;
  data?: Array<{
    key: string;
    selector: string;
    results: Array<{
      text: string;
      html: string;
      attributes?: Array<{ name: string; value: string }>;
    }>;
  }>;
  error?: string;
}

async function testMadeInChinaScrape(searchQuery: string): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 JigsawStack AI Scraper Test - Made-in-China');
  console.log('='.repeat(60));
  console.log(`\n📦 Search Query: "${searchQuery}"`);
  
  // Test 1: Search Results Page
  console.log('\n--- Test 1: Scraping Made-in-China Search Results ---\n');
  
  const searchUrl = `https://www.made-in-china.com/products-search/hot-china-products/${encodeURIComponent(searchQuery)}.html`;
  console.log(`URL: ${searchUrl}`);
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${BASE_URL}/ai/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': JIGSAWSTACK_API_KEY!,
        'x-jigsaw-no-request-log': 'true', // Privacy: don't log request payload
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
    console.log(`⏱️  Response time: ${elapsed}ms`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ HTTP Error: ${response.status}`);
      console.error(errorText);
      return;
    }

    const result: JigsawScrapeResponse = await response.json();
    
    if (result.success) {
      console.log('\n✅ Scrape Successful!\n');
      
      // Display extracted context
      if (result.context) {
        console.log('📊 Extracted Data:');
        for (const [key, values] of Object.entries(result.context)) {
          console.log(`\n  ${key}: (${values.length} items)`);
          // Show first 5 items
          values.slice(0, 5).forEach((val, i) => {
            const truncated = val.length > 80 ? val.substring(0, 80) + '...' : val;
            console.log(`    ${i + 1}. ${truncated}`);
          });
          if (values.length > 5) {
            console.log(`    ... and ${values.length - 5} more`);
          }
        }
      }

      // Show detected selectors
      if (result.selectors) {
        console.log('\n🎯 Auto-detected CSS Selectors:');
        for (const [key, selectors] of Object.entries(result.selectors)) {
          console.log(`  ${key}: ${selectors.join(', ')}`);
        }
      }
      
      // Count total items found
      const totalItems = result.context 
        ? Math.max(...Object.values(result.context).map(arr => arr.length))
        : 0;
      console.log(`\n📈 Total products found: ~${totalItems}`);
      
    } else {
      console.error('❌ Scrape failed:', result.error);
    }

  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`\n❌ Error after ${elapsed}ms:`, error);
  }
}

async function testMICProductDetailPage(): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 Test 2: Scraping Made-in-China Product Detail Page');
  console.log('='.repeat(60));
  
  // Using a Made-in-China product URL
  const productUrl = 'https://www.made-in-china.com/showroom/clorisaccessory/product-detailEevmFVHOWYku/China-Wholesale-Fashion-Jewelry-925-Sterling-Silver-Freshwater-Pearl-Earring.html';
  console.log(`\nURL: ${productUrl}`);
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${BASE_URL}/ai/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': JIGSAWSTACK_API_KEY!,
        'x-jigsaw-no-request-log': 'true',
      },
      body: JSON.stringify({
        url: productUrl,
        element_prompts: [
          'product_title',
          'price_range',
          'minimum_order_quantity',
          'supplier_company_name',
          'supplier_rating'
        ],
      }),
    });

    const elapsed = Date.now() - startTime;
    console.log(`⏱️  Response time: ${elapsed}ms`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ HTTP Error: ${response.status}`);
      console.error(errorText);
      return;
    }

    const result: JigsawScrapeResponse = await response.json();
    
    if (result.success) {
      console.log('\n✅ Product Detail Scrape Successful!\n');
      
      if (result.context) {
        console.log('📊 Product Details:');
        for (const [key, values] of Object.entries(result.context)) {
          const value = values[0] || 'N/A';
          const truncated = value.length > 100 ? value.substring(0, 100) + '...' : value;
          console.log(`  ${key}: ${truncated}`);
        }
      }
    } else {
      console.error('❌ Scrape failed:', result.error);
    }

  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`\n❌ Error after ${elapsed}ms:`, error);
  }
}

async function main(): Promise<void> {
  console.log('\n🚀 Starting JigsawStack AI Scraper Tests');
  console.log('Testing against Made-in-China.com\n');
  
  if (!JIGSAWSTACK_API_KEY) {
    console.error('❌ JIGSAWSTACK_API_KEY not found in environment variables');
    process.exit(1);
  }
  
  console.log('✅ API Key loaded from .env');
  
  // Test 1: Search results page
  await testMadeInChinaScrape('wireless earbuds');
  
  // Wait a bit between tests
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 2: Product detail page
  await testMICProductDetailPage();
  
  console.log('\n' + '='.repeat(60));
  console.log('🏁 Tests Complete');
  console.log('='.repeat(60));
  console.log('\n💡 Compare these results with your Puppeteer scraper output');
  console.log('   Run: npm run dev, then test search endpoint\n');
}

main().catch(console.error);
