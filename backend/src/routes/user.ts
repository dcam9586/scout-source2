import express, { Request, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { User } from '../models/User';
import { getRedis } from '../config/redis';
import crypto from 'crypto';

const router = express.Router();

// Simple encryption for API keys (in production, use a proper secrets manager)
const ENCRYPTION_KEY = process.env.API_KEY_ENCRYPTION_SECRET || 'sourcescout-dev-key-32chars!!';

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText: string): string {
  const [ivHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * GET /api/user/profile
 * Get authenticated user profile
 */
router.get('/profile', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const shopName = req.shopName;

    if (!userId || !shopName) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const user = await User.findByShop(shopName);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Don't send sensitive tokens to frontend
    const { access_token, refresh_token, ...safeUser } = user;
    res.json({ user: safeUser });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/user/usage
 * Get user's API usage and quota
 */
router.get('/usage', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const shopName = req.shopName;

    if (!userId || !shopName) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const user = await User.findByShop(shopName);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const now = new Date();
    const resetDate = new Date(user.searches_reset_date);
    const nextResetDate = new Date(resetDate);
    nextResetDate.setMonth(nextResetDate.getMonth() + 1);

    const isPremium = user.subscription_tier === 'premium';
    const limit = isPremium ? -1 : 10; // -1 means unlimited
    const remaining = isPremium ? -1 : Math.max(0, limit - user.searches_used);

    res.json({
      tier: user.subscription_tier,
      searchesUsed: user.searches_used,
      searchLimit: limit,
      searchesRemaining: remaining,
      resetDate: nextResetDate,
    });
  } catch (error) {
    console.error('Error fetching user usage:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/user/api-keys
 * Get list of configured API platforms (not the actual keys)
 */
router.get('/api-keys', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const redis = getRedis();
    const keys = await redis.keys(`apikeys:${userId}:*`);
    const configuredPlatforms = keys.map(key => key.split(':')[2]);

    res.json({ configuredPlatforms });
  } catch (error) {
    console.error('Error fetching API keys:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/user/api-keys
 * Save API keys for a platform
 */
router.post('/api-keys', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { platform, apiKey, apiSecret } = req.body;

    if (!platform || !apiKey) {
      res.status(400).json({ error: 'Platform and API key are required' });
      return;
    }

    const validPlatforms = ['alibaba', 'aliexpress', 'amazon', 'cjdropshipping'];
    if (!validPlatforms.includes(platform)) {
      res.status(400).json({ error: 'Invalid platform' });
      return;
    }

    // Encrypt and store in Redis
    const redis = getRedis();
    const encryptedData = JSON.stringify({
      apiKey: encrypt(apiKey),
      apiSecret: apiSecret ? encrypt(apiSecret) : null,
      updatedAt: new Date().toISOString(),
    });

    await redis.set(`apikeys:${userId}:${platform}`, encryptedData);

    res.json({ success: true, platform });
  } catch (error) {
    console.error('Error saving API keys:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/v1/user/api-keys/:platform
 * Remove API keys for a platform
 */
router.delete('/api-keys/:platform', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { platform } = req.params;
    const redis = getRedis();
    await redis.del(`apikeys:${userId}:${platform}`);

    res.json({ success: true });
  } catch (error) {
    console.error('Error removing API keys:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Internal: Get decrypted API keys for a user/platform
 */
export async function getUserApiKeys(userId: string, platform: string): Promise<{ apiKey: string; apiSecret?: string } | null> {
  try {
    const redis = getRedis();
    const data = await redis.get(`apikeys:${userId}:${platform}`);
    
    if (!data) return null;

    const parsed = JSON.parse(data);
    return {
      apiKey: decrypt(parsed.apiKey),
      apiSecret: parsed.apiSecret ? decrypt(parsed.apiSecret) : undefined,
    };
  } catch (error) {
    console.error('Error getting API keys:', error);
    return null;
  }
}

export default router;
