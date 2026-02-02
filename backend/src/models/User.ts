import { Pool } from 'pg';
import { getPool } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export interface IUser {
  id: number;
  shop_name: string;
  access_token: string;
  refresh_token?: string;
  token_expires_at?: Date;
  subscription_tier: 'free' | 'premium';
  searches_used: number;
  searches_reset_date: Date;
  created_at: Date;
  updated_at: Date;
}

export class User {
  static async findByShop(shopName: string): Promise<IUser | null> {
    const pool: Pool = getPool();
    const result = await pool.query(
      'SELECT * FROM users WHERE shop_name = $1',
      [shopName]
    );
    return result.rows[0] || null;
  }

  static async create(
    shopName: string,
    accessToken: string,
    refreshToken?: string
  ): Promise<IUser> {
    const pool: Pool = getPool();
    const result = await pool.query(
      `INSERT INTO users (shop_name, access_token, refresh_token, subscription_tier, searches_reset_date)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [shopName, accessToken, refreshToken, 'free']
    );
    return result.rows[0];
  }

  static async updateAccessToken(
    userId: number,
    accessToken: string,
    expiresAt?: Date
  ): Promise<IUser> {
    const pool: Pool = getPool();
    const result = await pool.query(
      `UPDATE users 
       SET access_token = $1, token_expires_at = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [accessToken, expiresAt, userId]
    );
    return result.rows[0];
  }

  static async incrementSearchUsage(userId: number): Promise<void> {
    const pool: Pool = getPool();
    await pool.query(
      `UPDATE users 
       SET searches_used = searches_used + 1, updated_at = NOW()
       WHERE id = $1`,
      [userId]
    );
  }

  static async resetMonthlySearches(userId: number): Promise<void> {
    const pool: Pool = getPool();
    await pool.query(
      `UPDATE users 
       SET searches_used = 0, searches_reset_date = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [userId]
    );
  }

  static async updateSubscriptionTier(
    userId: number,
    tier: 'free' | 'premium'
  ): Promise<IUser> {
    const pool: Pool = getPool();
    const result = await pool.query(
      `UPDATE users 
       SET subscription_tier = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [tier, userId]
    );
    return result.rows[0];
  }
}
