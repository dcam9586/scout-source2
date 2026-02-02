import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config/config';

export interface AuthRequest extends Request {
  userId?: number;
  shopName?: string;
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
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
}

export function generateToken(userId: number, shopName: string): string {
  return jwt.sign({ userId, shopName }, config.jwt.secret, {
    expiresIn: config.jwt.expiry as any,
  });
}
