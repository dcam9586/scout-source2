import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export async function initializeDatabase(): Promise<void> {
  const client: PoolClient = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        shop_name VARCHAR(255) UNIQUE NOT NULL,
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        token_expires_at TIMESTAMP,
        subscription_tier VARCHAR(50) DEFAULT 'free',
        searches_used INT DEFAULT 0,
        searches_reset_date TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create SavedItems table
    await client.query(`
      CREATE TABLE IF NOT EXISTS saved_items (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        supplier_name VARCHAR(255),
        supplier_rating DECIMAL(3,2),
        moq INT,
        price DECIMAL(10,2),
        source VARCHAR(50),
        source_url TEXT,
        product_image_url TEXT,
        description TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Create SearchLogs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS search_logs (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL,
        search_query VARCHAR(255) NOT NULL,
        results_count INT,
        sources_searched VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Create Comparisons table
    await client.query(`
      CREATE TABLE IF NOT EXISTS comparisons (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        alibaba_item_id VARCHAR(255),
        made_in_china_item_id VARCHAR(255),
        alibaba_price DECIMAL(10,2),
        made_in_china_price DECIMAL(10,2),
        alibaba_moq INT,
        made_in_china_moq INT,
        alibaba_supplier VARCHAR(255),
        made_in_china_supplier VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Create pushed_products table to track Shopify products
    await client.query(`
      CREATE TABLE IF NOT EXISTS pushed_products (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        saved_item_id INTEGER REFERENCES saved_items(id) ON DELETE SET NULL,
        shopify_product_id VARCHAR(255) NOT NULL,
        shopify_product_handle VARCHAR(255),
        source_url TEXT,
        push_status VARCHAR(50) DEFAULT 'draft',
        pushed_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT unique_user_shopify_product UNIQUE(user_id, shopify_product_id)
      );
    `);

    // Create partner_connections table for API integrations
    await client.query(`
      CREATE TABLE IF NOT EXISTS partner_connections (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        partner_name VARCHAR(50) NOT NULL,
        api_key TEXT,
        api_secret TEXT,
        access_token TEXT,
        refresh_token TEXT,
        token_expires_at TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT unique_user_partner UNIQUE(user_id, partner_name)
      );
    `);

    // Add shopify tracking columns to saved_items if not exists
    await client.query(`
      ALTER TABLE saved_items 
      ADD COLUMN IF NOT EXISTS shopify_product_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS push_status VARCHAR(50);
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_shop_name ON users(shop_name);
      CREATE INDEX IF NOT EXISTS idx_saved_items_user_id ON saved_items(user_id);
      CREATE INDEX IF NOT EXISTS idx_search_logs_user_id ON search_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_comparisons_user_id ON comparisons(user_id);
      CREATE INDEX IF NOT EXISTS idx_pushed_products_user_id ON pushed_products(user_id);
      CREATE INDEX IF NOT EXISTS idx_pushed_products_status ON pushed_products(push_status);
      CREATE INDEX IF NOT EXISTS idx_partner_connections_user_id ON partner_connections(user_id);
      CREATE INDEX IF NOT EXISTS idx_saved_items_shopify_product ON saved_items(shopify_product_id);
    `);

    await client.query('COMMIT');
    console.log('✓ Database initialized successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    client.release();
  }
}

export function getPool(): Pool {
  return pool;
}

export async function closeDatabase(): Promise<void> {
  await pool.end();
  console.log('✓ Database connection closed');
}
