#!/usr/bin/env node
/**
 * PayPal Products & Plans Setup Script
 * 
 * This script creates subscription products and plans in PayPal
 * for SourceScout subscription tiers.
 * 
 * Usage:
 *   1. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET environment variables
 *   2. Run: node scripts/setup-paypal-products.js
 *   3. Copy the output plan IDs to your Railway environment variables
 */

const https = require('https');

// Subscription tier pricing
const PRODUCTS = [
  {
    name: 'SourceScout Starter',
    description: 'Perfect for new sellers testing product sourcing',
    tier: 'starter',
    monthlyPrice: '19.00',
    yearlyPrice: '190.00',
  },
  {
    name: 'SourceScout Pro',
    description: 'For growing businesses with Boss Mode AI',
    tier: 'pro',
    monthlyPrice: '49.00',
    yearlyPrice: '490.00',
  },
  {
    name: 'SourceScout Enterprise',
    description: 'For high-volume sellers with API access',
    tier: 'enterprise',
    monthlyPrice: '149.00',
    yearlyPrice: '1490.00',
  }
];

async function getAccessToken(clientId, clientSecret, sandbox = true) {
  const baseUrl = sandbox ? 'api-m.sandbox.paypal.com' : 'api-m.paypal.com';
  
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    const options = {
      hostname: baseUrl,
      path: '/v1/oauth2/token',
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const json = JSON.parse(data);
        if (json.access_token) {
          resolve(json.access_token);
        } else {
          reject(new Error(json.error_description || 'Failed to get access token'));
        }
      });
    });

    req.on('error', reject);
    req.write('grant_type=client_credentials');
    req.end();
  });
}

async function paypalRequest(accessToken, method, path, body, sandbox = true) {
  const baseUrl = sandbox ? 'api-m.sandbox.paypal.com' : 'api-m.paypal.com';
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: baseUrl,
      path,
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function setupPayPalProducts() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const sandbox = process.env.PAYPAL_SANDBOX !== 'false';
  
  if (!clientId || !clientSecret) {
    console.error('❌ Error: PayPal credentials not set');
    console.log('\nTo use this script:');
    console.log('  1. Get credentials from https://developer.paypal.com/dashboard/applications');
    console.log('  2. Run: $env:PAYPAL_CLIENT_ID = "..." (PowerShell)');
    console.log('         $env:PAYPAL_CLIENT_SECRET = "..."');
    console.log('  3. Run this script again');
    process.exit(1);
  }

  console.log(`\n🔧 Setting up PayPal Products (${sandbox ? 'SANDBOX' : 'LIVE'})\n`);
  console.log('='.repeat(60));

  // Get access token
  console.log('\n🔐 Authenticating with PayPal...');
  const accessToken = await getAccessToken(clientId, clientSecret, sandbox);
  console.log('   ✓ Authenticated successfully');

  const planIds = {};

  for (const product of PRODUCTS) {
    console.log(`\n📦 Creating product: ${product.name}`);
    
    // Create product
    const productResponse = await paypalRequest(accessToken, 'POST', '/v1/catalogs/products', {
      name: product.name,
      description: product.description,
      type: 'SERVICE',
      category: 'SOFTWARE',
    }, sandbox);
    
    console.log(`   Product ID: ${productResponse.id}`);

    // Create monthly plan
    const monthlyPlan = await paypalRequest(accessToken, 'POST', '/v1/billing/plans', {
      product_id: productResponse.id,
      name: `${product.name} - Monthly`,
      description: `Monthly subscription for ${product.name}`,
      billing_cycles: [
        {
          frequency: { interval_unit: 'MONTH', interval_count: 1 },
          tenure_type: 'REGULAR',
          sequence: 1,
          total_cycles: 0, // Infinite
          pricing_scheme: {
            fixed_price: { value: product.monthlyPrice, currency_code: 'USD' }
          }
        }
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee_failure_action: 'CONTINUE',
        payment_failure_threshold: 3
      }
    }, sandbox);
    
    planIds[`${product.tier}_monthly`] = monthlyPlan.id;
    console.log(`   Monthly Plan: ${monthlyPlan.id} ($${product.monthlyPrice}/mo)`);

    // Create yearly plan
    const yearlyPlan = await paypalRequest(accessToken, 'POST', '/v1/billing/plans', {
      product_id: productResponse.id,
      name: `${product.name} - Yearly`,
      description: `Yearly subscription for ${product.name}`,
      billing_cycles: [
        {
          frequency: { interval_unit: 'YEAR', interval_count: 1 },
          tenure_type: 'REGULAR',
          sequence: 1,
          total_cycles: 0,
          pricing_scheme: {
            fixed_price: { value: product.yearlyPrice, currency_code: 'USD' }
          }
        }
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee_failure_action: 'CONTINUE',
        payment_failure_threshold: 3
      }
    }, sandbox);
    
    planIds[`${product.tier}_yearly`] = yearlyPlan.id;
    console.log(`   Yearly Plan:  ${yearlyPlan.id} ($${product.yearlyPrice}/yr)`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n✅ All PayPal products and plans created!\n');
  
  console.log('📋 Add these environment variables to Railway:\n');
  console.log('PAYPAL_PLAN_STARTER_MONTHLY=' + planIds.starter_monthly);
  console.log('PAYPAL_PLAN_STARTER_YEARLY=' + planIds.starter_yearly);
  console.log('PAYPAL_PLAN_PRO_MONTHLY=' + planIds.pro_monthly);
  console.log('PAYPAL_PLAN_PRO_YEARLY=' + planIds.pro_yearly);
  console.log('PAYPAL_PLAN_ENTERPRISE_MONTHLY=' + planIds.enterprise_monthly);
  console.log('PAYPAL_PLAN_ENTERPRISE_YEARLY=' + planIds.enterprise_yearly);

  console.log('\n📝 JSON format:\n');
  console.log(JSON.stringify(planIds, null, 2));
  console.log('');
}

setupPayPalProducts().catch(console.error);
