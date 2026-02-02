/**
 * PushedProduct Model
 * Tracks products pushed from SourceScout to Shopify stores
 */

import { Pool } from 'pg';
import { getPool } from '../config/database';

export interface IPushedProduct {
  id: number;
  user_id: number;
  saved_item_id?: number;
  shopify_product_id: string;
  shopify_product_handle?: string;
  source_url?: string;
  push_status: 'draft' | 'active' | 'archived' | 'deleted';
  pushed_at: Date;
  updated_at: Date;
  // Joined fields
  product_name?: string;
  supplier_name?: string;
  cost_price?: number;
}

export class PushedProduct {
  /**
   * Create a new pushed product record
   */
  static async create(
    userId: number,
    data: {
      savedItemId?: number;
      shopifyProductId: string;
      shopifyProductHandle?: string;
      sourceUrl?: string;
      pushStatus?: string;
    }
  ): Promise<IPushedProduct> {
    const pool: Pool = getPool();
    const result = await pool.query(
      `INSERT INTO pushed_products 
       (user_id, saved_item_id, shopify_product_id, shopify_product_handle, source_url, push_status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        userId,
        data.savedItemId,
        data.shopifyProductId,
        data.shopifyProductHandle,
        data.sourceUrl,
        data.pushStatus || 'draft',
      ]
    );
    return result.rows[0];
  }

  /**
   * Find all pushed products for a user
   */
  static async findByUserId(
    userId: number,
    options: { includeDeleted?: boolean } = {}
  ): Promise<IPushedProduct[]> {
    const pool: Pool = getPool();
    const whereClause = options.includeDeleted
      ? 'WHERE pp.user_id = $1'
      : "WHERE pp.user_id = $1 AND pp.push_status != 'deleted'";

    const result = await pool.query(
      `SELECT pp.*, 
              si.product_name, 
              si.supplier_name, 
              si.price as cost_price
       FROM pushed_products pp
       LEFT JOIN saved_items si ON pp.saved_item_id = si.id
       ${whereClause}
       ORDER BY pp.pushed_at DESC`,
      [userId]
    );
    return result.rows;
  }

  /**
   * Find by Shopify product ID
   */
  static async findByShopifyId(
    userId: number,
    shopifyProductId: string
  ): Promise<IPushedProduct | null> {
    const pool: Pool = getPool();
    const result = await pool.query(
      `SELECT pp.*, 
              si.product_name, 
              si.supplier_name, 
              si.price as cost_price
       FROM pushed_products pp
       LEFT JOIN saved_items si ON pp.saved_item_id = si.id
       WHERE pp.user_id = $1 AND pp.shopify_product_id = $2`,
      [userId, shopifyProductId]
    );
    return result.rows[0] || null;
  }

  /**
   * Find by source URL (to check for duplicates)
   */
  static async findBySourceUrl(
    userId: number,
    sourceUrl: string
  ): Promise<IPushedProduct | null> {
    const pool: Pool = getPool();
    const result = await pool.query(
      `SELECT * FROM pushed_products 
       WHERE user_id = $1 AND source_url = $2 AND push_status != 'deleted'`,
      [userId, sourceUrl]
    );
    return result.rows[0] || null;
  }

  /**
   * Update push status
   */
  static async updateStatus(
    userId: number,
    shopifyProductId: string,
    status: 'draft' | 'active' | 'archived' | 'deleted'
  ): Promise<IPushedProduct | null> {
    const pool: Pool = getPool();
    const result = await pool.query(
      `UPDATE pushed_products 
       SET push_status = $1, updated_at = NOW()
       WHERE user_id = $2 AND shopify_product_id = $3
       RETURNING *`,
      [status, userId, shopifyProductId]
    );
    return result.rows[0] || null;
  }

  /**
   * Get push statistics for a user
   */
  static async getStats(userId: number): Promise<{
    total: number;
    draft: number;
    active: number;
    archived: number;
  }> {
    const pool: Pool = getPool();
    const result = await pool.query(
      `SELECT 
         COUNT(*) FILTER (WHERE push_status != 'deleted') as total,
         COUNT(*) FILTER (WHERE push_status = 'draft') as draft,
         COUNT(*) FILTER (WHERE push_status = 'active') as active,
         COUNT(*) FILTER (WHERE push_status = 'archived') as archived
       FROM pushed_products
       WHERE user_id = $1`,
      [userId]
    );
    
    const row = result.rows[0];
    return {
      total: parseInt(row.total) || 0,
      draft: parseInt(row.draft) || 0,
      active: parseInt(row.active) || 0,
      archived: parseInt(row.archived) || 0,
    };
  }

  /**
   * Delete record (soft delete by setting status)
   */
  static async delete(userId: number, shopifyProductId: string): Promise<boolean> {
    const pool: Pool = getPool();
    const result = await pool.query(
      `UPDATE pushed_products 
       SET push_status = 'deleted', updated_at = NOW()
       WHERE user_id = $1 AND shopify_product_id = $2`,
      [userId, shopifyProductId]
    );
    return result.rowCount ? result.rowCount > 0 : false;
  }
}
