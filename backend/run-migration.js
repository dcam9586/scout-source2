/**
 * Quick migration runner - runs the payment subscription migration
 * Usage: node run-migration.js
 * 
 * Set DATABASE_URL environment variable or it will use the default
 */

const { Pool } = require('pg');
require('dotenv').config();

const migrationSQL = `
-- Add subscription-related columns to users table for payment tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_provider VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS paypal_customer_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS paypal_subscription_id VARCHAR(255);

-- Add indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription ON users(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_users_paypal_subscription ON users(paypal_subscription_id);
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);
`;

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    console.log('Set it via: $env:DATABASE_URL = "your-connection-string"');
    process.exit(1);
  }

  console.log('🔄 Connecting to database...');
  
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('railway') ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🔄 Running payment subscription migration...\n');
    
    await pool.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    console.log('   Added columns:');
    console.log('   - subscription_status');
    console.log('   - subscription_provider');
    console.log('   - subscription_current_period_end');
    console.log('   - subscription_cancel_at_period_end');
    console.log('   - stripe_customer_id');
    console.log('   - stripe_subscription_id');
    console.log('   - paypal_customer_id');
    console.log('   - paypal_subscription_id');
    console.log('   + 4 indexes created');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
