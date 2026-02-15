import { Request, Response, NextFunction } from 'express';
import { getRedis } from '../config/redis';
import { config } from '../config/config';
import { User } from '../models/User';
import { AuthRequest } from './auth';

export async function checkRateLimit(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const userId = req.userId;

  if (!userId) {
    res.status(401).json({ error: 'User not authenticated' });
    return;
  }

  try {
    const user = await User.findByShop(req.shopName || '');
    
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Premium users have unlimited searches
    if (user.subscription_tier === 'premium') {
      next();
      return;
    }

    // Check if searches need to be reset (monthly)
    const now = new Date();
    const resetDate = new Date(user.searches_reset_date);
    if (now.getTime() - resetDate.getTime() >= 30 * 24 * 60 * 60 * 1000) {
      await User.resetMonthlySearches(userId);
      user.searches_used = 0;
    }

    // Check free tier limit
    if (user.searches_used >= config.rateLimiting.freeSearchesPerMonth) {
      res.status(429).json({
        error: 'Monthly search limit reached',
        limit: config.rateLimiting.freeSearchesPerMonth,
        used: user.searches_used,
        resetDate: user.searches_reset_date,
        upgrade: 'Please upgrade to premium for unlimited searches',
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Rate limit check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
