#!/usr/bin/env node
/**
 * Stripe Products & Prices Setup Script
 * 
 * This script creates all necessary products and prices in Stripe
 * for SourceScout subscription tiers.
 * 
 * Usage:
 *   1. Set STRIPE_SECRET_KEY environment variable
 *   2. Run: node scripts/setup-stripe-products.js
 *   3. Copy the output price IDs to your Railway environment variables
 */

const Stripe = require('stripe');

// Subscription tier pricing (in cents for Stripe)
const PRODUCTS = [
  {
    name: 'SourceScout Starter',
    description: 'Perfect for new sellers testing product sourcing. 100 searches/month, 3 sources, basic filters.',
    prices: {
      monthly: 1900,  // $19
      yearly: 19000,  // $190 (save ~17%)
    },
    tier: 'starter',
    metadata: { tier: 'starter' }
  },
  {
    name: 'SourceScout Pro',
    description: 'For growing businesses. Unlimited searches, all sources, Boss Mode AI, advanced filters.',
    prices: {
      monthly: 4900,  // $49
      yearly: 49000,  // $490 (save ~17%)
    },
    tier: 'pro',
    metadata: { tier: 'pro' }
  },
  {
    name: 'SourceScout Enterprise',
    description: 'For high-volume sellers. Everything in Pro plus API access, dedicated support, custom integrations.',
    prices: {
      monthly: 14900, // $149
      yearly: 149000, // $1490 (save ~17%)
    },
    tier: 'enterprise',
    metadata: { tier: 'enterprise' }
  }
];

async function setupStripeProducts() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  
  if (!secretKey) {
    console.error('❌ Error: STRIPE_SECRET_KEY environment variable is not set');
    console.log('\nTo use this script:');
    console.log('  1. Get your secret key from https://dashboard.stripe.com/apikeys');
    console.log('  2. Run: $env:STRIPE_SECRET_KEY = "sk_test_..." (PowerShell)');
    console.log('     Or:  export STRIPE_SECRET_KEY="sk_test_..." (Bash)');
    console.log('  3. Run this script again');
    process.exit(1);
  }

  const isTestMode = secretKey.startsWith('sk_test_');
  console.log(`\n🔧 Setting up Stripe Products (${isTestMode ? 'TEST MODE' : 'LIVE MODE'})\n`);
  console.log('='.repeat(60));

  const stripe = new Stripe(secretKey);

  const priceIds = {};

  for (const product of PRODUCTS) {
    console.log(`\n📦 Creating product: ${product.name}`);
    
    // Create the product
    const stripeProduct = await stripe.products.create({
      name: product.name,
      description: product.description,
      metadata: product.metadata,
    });
    
    console.log(`   Product ID: ${stripeProduct.id}`);

    // Create monthly price
    const monthlyPrice = await stripe.prices.create({
      product: stripeProduct.id,
      unit_amount: product.prices.monthly,
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { tier: product.tier, period: 'monthly' },
    });
    
    priceIds[`${product.tier}_monthly`] = monthlyPrice.id;
    console.log(`   Monthly Price: ${monthlyPrice.id} ($${product.prices.monthly / 100}/mo)`);

    // Create yearly price
    const yearlyPrice = await stripe.prices.create({
      product: stripeProduct.id,
      unit_amount: product.prices.yearly,
      currency: 'usd',
      recurring: { interval: 'year' },
      metadata: { tier: product.tier, period: 'yearly' },
    });
    
    priceIds[`${product.tier}_yearly`] = yearlyPrice.id;
    console.log(`   Yearly Price:  ${yearlyPrice.id} ($${product.prices.yearly / 100}/yr)`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n✅ All products and prices created successfully!\n');
  
  console.log('📋 Add these environment variables to Railway:\n');
  console.log('STRIPE_PRICE_STARTER_MONTHLY=' + priceIds.starter_monthly);
  console.log('STRIPE_PRICE_STARTER_YEARLY=' + priceIds.starter_yearly);
  console.log('STRIPE_PRICE_PRO_MONTHLY=' + priceIds.pro_monthly);
  console.log('STRIPE_PRICE_PRO_YEARLY=' + priceIds.pro_yearly);
  console.log('STRIPE_PRICE_ENTERPRISE_MONTHLY=' + priceIds.enterprise_monthly);
  console.log('STRIPE_PRICE_ENTERPRISE_YEARLY=' + priceIds.enterprise_yearly);

  console.log('\n📝 JSON format (for copying):\n');
  console.log(JSON.stringify(priceIds, null, 2));

  console.log('\n🔗 Next steps:');
  console.log('   1. Go to Railway Dashboard → SourceScout → Backend → Variables');
  console.log('   2. Add all STRIPE_PRICE_* variables above');
  console.log('   3. Add STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET');
  console.log('   4. Redeploy the backend service');
  console.log('');
}

// Run the script
setupStripeProducts().catch(console.error);
