import { Pool } from 'pg';
import { getPool } from '../config/database';

export interface ISearchLog {
  id: number;
  user_id: number;
  search_query: string;
  results_count: number;
  sources_searched: string;
  created_at: Date;
}

export class SearchLog {
  static async create(
    userId: number,
    searchQuery: string,
    resultsCount: number,
    sourcesSearched: string[] = ['alibaba', 'made-in-china']
  ): Promise<ISearchLog> {
    const pool: Pool = getPool();
    const sources = sourcesSearched.join(',');
    const result = await pool.query(
      `INSERT INTO search_logs (user_id, search_query, results_count, sources_searched)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, searchQuery, resultsCount, sources]
    );
    return result.rows[0];
  }

  static async findByUserId(
    userId: number,
    limit: number = 50
  ): Promise<ISearchLog[]> {
    const pool: Pool = getPool();
    const result = await pool.query(
      'SELECT * FROM search_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
      [userId, limit]
    );
    return result.rows;
  }

  static async getSearchStats(userId: number, days: number = 30): Promise<any> {
    const pool: Pool = getPool();
    const result = await pool.query(
      `SELECT 
        COUNT(*) as total_searches,
        SUM(results_count) as total_results,
        AVG(results_count) as avg_results_per_search,
        MAX(created_at) as last_search
       FROM search_logs 
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'`,
      [userId]
    );
    return result.rows[0];
  }
}
