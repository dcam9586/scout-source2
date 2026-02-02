import { Pool } from 'pg';
import { getPool } from '../config/database';

export interface IComparison {
  id: number;
  user_id: number;
  product_name: string;
  alibaba_item_id?: string;
  made_in_china_item_id?: string;
  alibaba_price?: number;
  made_in_china_price?: number;
  alibaba_moq?: number;
  made_in_china_moq?: number;
  alibaba_supplier?: string;
  made_in_china_supplier?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export class Comparison {
  static async create(
    userId: number,
    comparison: Omit<IComparison, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ): Promise<IComparison> {
    const pool: Pool = getPool();
    const result = await pool.query(
      `INSERT INTO comparisons 
       (user_id, product_name, alibaba_item_id, made_in_china_item_id, 
        alibaba_price, made_in_china_price, alibaba_moq, made_in_china_moq,
        alibaba_supplier, made_in_china_supplier, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        userId,
        comparison.product_name,
        comparison.alibaba_item_id,
        comparison.made_in_china_item_id,
        comparison.alibaba_price,
        comparison.made_in_china_price,
        comparison.alibaba_moq,
        comparison.made_in_china_moq,
        comparison.alibaba_supplier,
        comparison.made_in_china_supplier,
        comparison.notes,
      ]
    );
    return result.rows[0];
  }

  static async findByUserId(userId: number): Promise<IComparison[]> {
    const pool: Pool = getPool();
    const result = await pool.query(
      'SELECT * FROM comparisons WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows;
  }

  static async findById(id: number, userId: number): Promise<IComparison | null> {
    const pool: Pool = getPool();
    const result = await pool.query(
      'SELECT * FROM comparisons WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return result.rows[0] || null;
  }

  static async update(
    id: number,
    userId: number,
    updates: Partial<IComparison>
  ): Promise<IComparison> {
    const pool: Pool = getPool();
    const allowedFields = [
      'alibaba_price',
      'made_in_china_price',
      'alibaba_moq',
      'made_in_china_moq',
      'alibaba_supplier',
      'made_in_china_supplier',
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
      `UPDATE comparisons 
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
      'DELETE FROM comparisons WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return result.rowCount ? result.rowCount > 0 : false;
  }
}
