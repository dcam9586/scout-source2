import { Pool } from 'pg';
import { getPool } from '../config/database';

export interface ISavedItem {
  id: number;
  user_id: number;
  product_name: string;
  supplier_name?: string;
  supplier_rating?: number;
  moq?: number;
  price?: number;
  source: string;
  source_url: string;
  product_image_url?: string;
  description?: string;
  notes?: string;
  shopify_product_id?: string;
  push_status?: 'draft' | 'active' | 'archived' | null;
  created_at: Date;
  updated_at: Date;
}

export class SavedItem {
  static async create(
    userId: number,
    item: Omit<ISavedItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ): Promise<ISavedItem> {
    const pool: Pool = getPool();
    const result = await pool.query(
      `INSERT INTO saved_items 
       (user_id, product_name, supplier_name, supplier_rating, moq, price, source, source_url, product_image_url, description, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        userId,
        item.product_name,
        item.supplier_name,
        item.supplier_rating,
        item.moq,
        item.price,
        item.source,
        item.source_url,
        item.product_image_url,
        item.description,
        item.notes,
      ]
    );
    return result.rows[0];
  }

  static async findByUserId(userId: number): Promise<ISavedItem[]> {
    const pool: Pool = getPool();
    const result = await pool.query(
      'SELECT * FROM saved_items WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows;
  }

  static async findById(id: number, userId: number): Promise<ISavedItem | null> {
    const pool: Pool = getPool();
    const result = await pool.query(
      'SELECT * FROM saved_items WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return result.rows[0] || null;
  }

  static async update(
    id: number,
    userId: number,
    updates: Partial<ISavedItem>
  ): Promise<ISavedItem> {
    const pool: Pool = getPool();
    const allowedFields = [
      'product_name',
      'supplier_name',
      'supplier_rating',
      'moq',
      'price',
      'description',
      'notes',
    ];
    const setClause = Object.keys(updates)
      .filter((key) => allowedFields.includes(key))
      .map((key, index) => `${key} = $${index + 1}`)
      .join(', ');

    const values = Object.keys(updates)
      .filter((key) => allowedFields.includes(key))
      .map((key) => updates[key as keyof typeof updates]);

    const result = await pool.query(
      `UPDATE saved_items 
       SET ${setClause}, updated_at = NOW()
       WHERE id = $${values.length + 1} AND user_id = $${values.length + 2}
       RETURNING *`,
      [...values, id, userId]
    );
    return result.rows[0];
  }

  static async delete(id: number, userId: number): Promise<boolean> {
    const pool: Pool = getPool();
    const result = await pool.query(
      'DELETE FROM saved_items WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return result.rowCount ? result.rowCount > 0 : false;
  }

  /**
   * Find multiple saved items by their IDs
   */
  static async findByIds(userId: number, ids: number[]): Promise<ISavedItem[]> {
    if (ids.length === 0) return [];
    
    const pool: Pool = getPool();
    const placeholders = ids.map((_, i) => `$${i + 2}`).join(', ');
    const result = await pool.query(
      `SELECT * FROM saved_items WHERE user_id = $1 AND id IN (${placeholders}) ORDER BY created_at DESC`,
      [userId, ...ids]
    );
    return result.rows;
  }

  /**
   * Update Shopify product ID after pushing to store
   */
  static async updateShopifyProduct(
    id: number,
    userId: number,
    shopifyProductId: string,
    pushStatus: 'draft' | 'active' | 'archived'
  ): Promise<ISavedItem | null> {
    const pool: Pool = getPool();
    const result = await pool.query(
      `UPDATE saved_items 
       SET shopify_product_id = $1, push_status = $2, updated_at = NOW()
       WHERE id = $3 AND user_id = $4
       RETURNING *`,
      [shopifyProductId, pushStatus, id, userId]
    );
    return result.rows[0] || null;
  }
}
