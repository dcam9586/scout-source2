import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config/config';
import { getPool } from '../config/database';

export interface AuthRequest extends Request {
  userId?: number;
  shopName?: string;
  user?: {
    id: number;
    shop_name: string;
    subscription_tier: string;
    subscription_status: string;
  };
}

export function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as any;
    req.userId = decoded.userId;
    req.shopName = decoded.shopName;
    
    // Fetch full user data including subscription info
    fetchUserData(decoded.userId).then(user => {
      req.user = user;
      next();
    }).catch(() => {
      next();
    });
  } catch (error) {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Optional authentication - doesn't fail if no token provided
 * Useful for endpoints that work for both authenticated and guest users
 */
export function optionalAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // No token provided - continue as guest
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as any;
    req.userId = decoded.userId;
    req.shopName = decoded.shopName;
    
    // Fetch full user data including subscription info
    fetchUserData(decoded.userId).then(user => {
      req.user = user;
      next();
    }).catch(() => {
      next();
    });
  } catch (error) {
    // Invalid token - continue as guest (don't fail)
    next();
  }
}

/**
 * Fetch user data from database
 */
async function fetchUserData(userId: number): Promise<{
  id: number;
  shop_name: string;
  subscription_tier: string;
  subscription_status: string;
} | undefined> {
  try {
    const pool = getPool();
    const result = await pool.query(
      'SELECT id, shop_name, subscription_tier, subscription_status FROM users WHERE id = $1',
      [userId]
    );
    return result.rows[0];
  } catch (error) {
    return undefined;
  }
}

export function generateToken(userId: number, shopName: string): string {
  return jwt.sign({ userId, shopName }, config.jwt.secret, {
    expiresIn: config.jwt.expiry as any,
  });
}
