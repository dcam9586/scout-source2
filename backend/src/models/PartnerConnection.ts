/**
 * PartnerConnection Model
 * Manages connections to partner platforms (Dropified, Syncee, etc.)
 */

import { Pool } from 'pg';
import { getPool } from '../config/database';

export interface IPartnerConnection {
  id: number;
  user_id: number;
  partner: string;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: Date;
  api_key?: string;
  account_id?: string;
  account_name?: string;
  connection_status: 'pending' | 'connected' | 'disconnected' | 'error';
  last_sync_at?: Date;
  sync_count: number;
  settings: Record<string, any>;
  connected_at: Date;
  updated_at: Date;
}

export interface IExportedProduct {
  id: number;
  user_id: number;
  saved_item_id?: number;
  partner: string;
  partner_product_id?: string;
  export_status: 'pending' | 'exported' | 'synced' | 'error';
  export_data?: Record<string, any>;
  error_message?: string;
  exported_at: Date;
  last_sync_at?: Date;
  updated_at: Date;
}

export interface IExportLog {
  id: number;
  user_id: number;
  partner: string;
  export_type: 'single' | 'batch' | 'csv';
  items_count: number;
  successful_count: number;
  failed_count: number;
  export_data?: Record<string, any>;
  error_log?: Record<string, any>;
  created_at: Date;
}

export class PartnerConnection {
  /**
   * Get all partner connections for a user
   */
  static async findByUserId(userId: number): Promise<IPartnerConnection[]> {
    const pool: Pool = getPool();
    const result = await pool.query(
      'SELECT * FROM partner_connections WHERE user_id = $1 ORDER BY connected_at DESC',
      [userId]
    );
    return result.rows;
  }

  /**
   * Get a specific partner connection
   */
  static async findByUserAndPartner(userId: number, partner: string): Promise<IPartnerConnection | null> {
    const pool: Pool = getPool();
    const result = await pool.query(
      'SELECT * FROM partner_connections WHERE user_id = $1 AND partner = $2',
      [userId, partner]
    );
    return result.rows[0] || null;
  }

  /**
   * Create or update a partner connection
   */
  static async upsert(
    userId: number,
    partner: string,
    data: Partial<IPartnerConnection>
  ): Promise<IPartnerConnection> {
    const pool: Pool = getPool();
    const result = await pool.query(
      `INSERT INTO partner_connections (user_id, partner, access_token, refresh_token, token_expires_at, api_key, account_id, account_name, connection_status, settings)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (user_id, partner) 
       DO UPDATE SET 
         access_token = COALESCE(EXCLUDED.access_token, partner_connections.access_token),
         refresh_token = COALESCE(EXCLUDED.refresh_token, partner_connections.refresh_token),
         token_expires_at = COALESCE(EXCLUDED.token_expires_at, partner_connections.token_expires_at),
         api_key = COALESCE(EXCLUDED.api_key, partner_connections.api_key),
         account_id = COALESCE(EXCLUDED.account_id, partner_connections.account_id),
         account_name = COALESCE(EXCLUDED.account_name, partner_connections.account_name),
         connection_status = COALESCE(EXCLUDED.connection_status, partner_connections.connection_status),
         settings = COALESCE(EXCLUDED.settings, partner_connections.settings),
         updated_at = NOW()
       RETURNING *`,
      [
        userId,
        partner,
        data.access_token || null,
        data.refresh_token || null,
        data.token_expires_at || null,
        data.api_key || null,
        data.account_id || null,
        data.account_name || null,
        data.connection_status || 'pending',
        JSON.stringify(data.settings || {}),
      ]
    );
    return result.rows[0];
  }

  /**
   * Update connection status
   */
  static async updateStatus(
    userId: number,
    partner: string,
    status: IPartnerConnection['connection_status'],
    errorMessage?: string
  ): Promise<IPartnerConnection | null> {
    const pool: Pool = getPool();
    const result = await pool.query(
      `UPDATE partner_connections 
       SET connection_status = $1, updated_at = NOW()
       WHERE user_id = $2 AND partner = $3
       RETURNING *`,
      [status, userId, partner]
    );
    return result.rows[0] || null;
  }

  /**
   * Record a sync operation
   */
  static async recordSync(userId: number, partner: string): Promise<void> {
    const pool: Pool = getPool();
    await pool.query(
      `UPDATE partner_connections 
       SET last_sync_at = NOW(), sync_count = sync_count + 1, updated_at = NOW()
       WHERE user_id = $1 AND partner = $2`,
      [userId, partner]
    );
  }

  /**
   * Delete a partner connection
   */
  static async delete(userId: number, partner: string): Promise<boolean> {
    const pool: Pool = getPool();
    const result = await pool.query(
      'DELETE FROM partner_connections WHERE user_id = $1 AND partner = $2 RETURNING id',
      [userId, partner]
    );
    return result.rowCount ? result.rowCount > 0 : false;
  }
}

export class ExportedProduct {
  /**
   * Get exported products for a user
   */
  static async findByUserId(userId: number, partner?: string): Promise<IExportedProduct[]> {
    const pool: Pool = getPool();
    let query = 'SELECT * FROM exported_products WHERE user_id = $1';
    const params: any[] = [userId];
    
    if (partner) {
      query += ' AND partner = $2';
      params.push(partner);
    }
    
    query += ' ORDER BY exported_at DESC';
    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Create an exported product record
   */
  static async create(data: {
    userId: number;
    savedItemId?: number;
    partner: string;
    partnerProductId?: string;
    exportStatus?: string;
    exportData?: Record<string, any>;
  }): Promise<IExportedProduct> {
    const pool: Pool = getPool();
    const result = await pool.query(
      `INSERT INTO exported_products (user_id, saved_item_id, partner, partner_product_id, export_status, export_data)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        data.userId,
        data.savedItemId || null,
        data.partner,
        data.partnerProductId || null,
        data.exportStatus || 'exported',
        JSON.stringify(data.exportData || {}),
      ]
    );
    return result.rows[0];
  }

  /**
   * Update export status
   */
  static async updateStatus(
    id: number,
    status: IExportedProduct['export_status'],
    partnerProductId?: string,
    errorMessage?: string
  ): Promise<IExportedProduct | null> {
    const pool: Pool = getPool();
    const result = await pool.query(
      `UPDATE exported_products 
       SET export_status = $1, partner_product_id = COALESCE($2, partner_product_id), 
           error_message = $3, last_sync_at = NOW(), updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [status, partnerProductId, errorMessage, id]
    );
    return result.rows[0] || null;
  }
}

export class ExportLog {
  /**
   * Create an export log entry
   */
  static async create(data: {
    userId: number;
    partner: string;
    exportType: 'single' | 'batch' | 'csv';
    itemsCount: number;
    successfulCount?: number;
    failedCount?: number;
    exportData?: Record<string, any>;
    errorLog?: Record<string, any>;
  }): Promise<IExportLog> {
    const pool: Pool = getPool();
    const result = await pool.query(
      `INSERT INTO export_logs (user_id, partner, export_type, items_count, successful_count, failed_count, export_data, error_log)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        data.userId,
        data.partner,
        data.exportType,
        data.itemsCount,
        data.successfulCount || 0,
        data.failedCount || 0,
        JSON.stringify(data.exportData || {}),
        JSON.stringify(data.errorLog || {}),
      ]
    );
    return result.rows[0];
  }

  /**
   * Get recent export logs for a user
   */
  static async findByUserId(userId: number, limit: number = 50): Promise<IExportLog[]> {
    const pool: Pool = getPool();
    const result = await pool.query(
      'SELECT * FROM export_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
      [userId, limit]
    );
    return result.rows;
  }

  /**
   * Get export statistics for a user
   */
  static async getStats(userId: number, days: number = 30): Promise<{
    totalExports: number;
    totalItems: number;
    successRate: number;
    byPartner: Record<string, number>;
  }> {
    const pool: Pool = getPool();
    const result = await pool.query(
      `SELECT 
         COUNT(*) as total_exports,
         SUM(items_count) as total_items,
         SUM(successful_count) as total_successful,
         SUM(failed_count) as total_failed,
         partner,
         COUNT(*) as partner_count
       FROM export_logs 
       WHERE user_id = $1 AND created_at > NOW() - INTERVAL '${days} days'
       GROUP BY partner`,
      [userId]
    );

    const stats = {
      totalExports: 0,
      totalItems: 0,
      successRate: 0,
      byPartner: {} as Record<string, number>,
    };

    let totalSuccessful = 0;
    let totalFailed = 0;

    for (const row of result.rows) {
      stats.totalExports += parseInt(row.partner_count);
      stats.totalItems += parseInt(row.total_items) || 0;
      totalSuccessful += parseInt(row.total_successful) || 0;
      totalFailed += parseInt(row.total_failed) || 0;
      stats.byPartner[row.partner] = parseInt(row.partner_count);
    }

    const total = totalSuccessful + totalFailed;
    stats.successRate = total > 0 ? (totalSuccessful / total) * 100 : 100;

    return stats;
  }
}
