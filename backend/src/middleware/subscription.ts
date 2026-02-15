/**
 * Subscription Feature Gate Middleware
 * Controls access to features based on user's subscription tier
 */

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { 
  SubscriptionTier, 
  getTierConfig, 
  hasFeature, 
  isWithinLimit, 
  TierFeatures, 
  TierLimits,
  getAvailableSources
} from '../config/subscriptions';
import { getPool } from '../config/database';
import { createLogger } from '../utils/logger';

const logger = createLogger('SubscriptionMiddleware');

/**
 * Get current usage for a user in the current billing period
 */
export async function getUserUsage(userId: number): Promise<{
  searches: number;
  savedItems: number;
  pushToShopify: number;
  comparisons: number;
  bossModeSearchesToday: number;
}> {
  const pool = getPool();
  
  try {
    // Get usage from users table (quick counts)
    const userResult = await pool.query(
      `SELECT 
        searches_used, 
        saved_items_count, 
        push_to_shopify_count,
        searches_reset_date,
        push_reset_date,
        COALESCE(boss_mode_searches_today, 0) as boss_mode_searches_today,
        COALESCE(boss_mode_reset_date, NOW()) as boss_mode_reset_date
      FROM users WHERE id = $1`,
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return { searches: 0, savedItems: 0, pushToShopify: 0, comparisons: 0, bossModeSearchesToday: 0 };
    }
    
    const user = userResult.rows[0];
    
    // Check if we need to reset monthly counters
    const now = new Date();
    const searchResetDate = new Date(user.searches_reset_date);
    const pushResetDate = new Date(user.push_reset_date);
    const bossModeResetDate = new Date(user.boss_mode_reset_date);
    
    let searches = user.searches_used || 0;
    let pushToShopify = user.push_to_shopify_count || 0;
    let bossModeSearchesToday = user.boss_mode_searches_today || 0;
    
    // Reset search count if a month has passed
    if (now.getTime() - searchResetDate.getTime() > 30 * 24 * 60 * 60 * 1000) {
      await pool.query(
        'UPDATE users SET searches_used = 0, searches_reset_date = NOW() WHERE id = $1',
        [userId]
      );
      searches = 0;
    }
    
    // Reset push count if a month has passed
    if (now.getTime() - pushResetDate.getTime() > 30 * 24 * 60 * 60 * 1000) {
      await pool.query(
        'UPDATE users SET push_to_shopify_count = 0, push_reset_date = NOW() WHERE id = $1',
        [userId]
      );
      pushToShopify = 0;
    }
    
    // Reset Boss Mode count if a day has passed
    const oneDayMs = 24 * 60 * 60 * 1000;
    if (now.getTime() - bossModeResetDate.getTime() > oneDayMs) {
      await pool.query(
        'UPDATE users SET boss_mode_searches_today = 0, boss_mode_reset_date = NOW() WHERE id = $1',
        [userId]
      );
      bossModeSearchesToday = 0;
    }
    
    // Get saved items count
    const savedResult = await pool.query(
      'SELECT COUNT(*) as count FROM saved_items WHERE user_id = $1',
      [userId]
    );
    
    // Get comparisons count
    const comparisonsResult = await pool.query(
      'SELECT COUNT(*) as count FROM comparisons WHERE user_id = $1',
      [userId]
    );
    
    return {
      searches,
      savedItems: parseInt(savedResult.rows[0].count) || 0,
      pushToShopify,
      comparisons: parseInt(comparisonsResult.rows[0].count) || 0,
      bossModeSearchesToday,
    };
  } catch (error) {
    logger.error('GET_USAGE_ERROR', 'Failed to get user usage', error as Error);
    return { searches: 0, savedItems: 0, pushToShopify: 0, comparisons: 0, bossModeSearchesToday: 0 };
  }
}

/**
 * Increment a usage counter for a user
 */
export async function incrementUsage(
  userId: number, 
  type: 'searches' | 'savedItems' | 'pushToShopify' | 'bossModeSearches'
): Promise<void> {
  const pool = getPool();
  
  const columnMap: Record<string, string> = {
    searches: 'searches_used',
    savedItems: 'saved_items_count',
    pushToShopify: 'push_to_shopify_count',
    bossModeSearches: 'boss_mode_searches_today',
  };
  
  const column = columnMap[type];
  
  try {
    await pool.query(
      `UPDATE users SET ${column} = ${column} + 1, updated_at = NOW() WHERE id = $1`,
      [userId]
    );
  } catch (error) {
    logger.error('INCREMENT_USAGE_ERROR', `Failed to increment ${type}`, error as Error);
  }
}

/**
 * Middleware to check if user has access to a specific feature
 */
export function requireFeature(feature: keyof TierFeatures) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as AuthRequest;
    
    if (!authReq.user) {
      res.status(401).json({ 
        error: 'Authentication required',
        upgrade: false 
      });
      return;
    }
    
    const tier = (authReq.user.subscription_tier || 'free') as SubscriptionTier;
    
    if (!hasFeature(tier, feature)) {
      const config = getTierConfig(tier);
      
      logger.info('FEATURE_BLOCKED', `User blocked from ${feature}`, undefined, {
        userId: authReq.user.id,
        tier,
        feature,
      });
      
      res.status(403).json({
        error: 'Feature not available in your plan',
        feature,
        currentTier: tier,
        requiredTier: getRequiredTierForFeature(feature),
        upgrade: true,
        message: `Upgrade to access ${formatFeatureName(feature)}`,
      });
      return;
    }
    
    next();
  };
}

/**
 * Middleware to check if user is within a specific limit
 */
export function checkLimit(limitType: keyof TierLimits) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as AuthRequest;
    
    if (!authReq.user) {
      res.status(401).json({ 
        error: 'Authentication required',
        upgrade: false 
      });
      return;
    }
    
    const tier = (authReq.user.subscription_tier || 'free') as SubscriptionTier;
    const usage = await getUserUsage(authReq.user.id);
    
    // Map limit type to usage type
    const usageMap: Record<keyof TierLimits, number> = {
      searchesPerMonth: usage.searches,
      resultsPerSearch: 0, // Handled differently
      savedItems: usage.savedItems,
      maxCompareItems: usage.comparisons,
      pushToShopifyPerMonth: usage.pushToShopify,
      bossModeSearchesPerDay: usage.bossModeSearchesToday,
    };
    
    const currentUsage = usageMap[limitType];
    
    if (!isWithinLimit(tier, limitType, currentUsage)) {
      const config = getTierConfig(tier);
      const limit = config.limits[limitType];
      
      logger.info('LIMIT_REACHED', `User hit ${limitType} limit`, undefined, {
        userId: authReq.user.id,
        tier,
        limitType,
        currentUsage,
        limit,
      });
      
      res.status(403).json({
        error: 'Usage limit reached',
        limitType,
        currentUsage,
        limit,
        currentTier: tier,
        upgrade: true,
        message: `You've reached your ${formatLimitName(limitType)} limit. Upgrade for more!`,
      });
      return;
    }
    
    // Attach usage info to request for downstream use
    (authReq as any).usage = usage;
    (authReq as any).tierConfig = getTierConfig(tier);
    
    next();
  };
}

/**
 * Middleware to filter sources based on subscription tier
 */
export function filterSourcesByTier(req: Request, res: Response, next: NextFunction): void {
  const authReq = req as AuthRequest;
  
  // For unauthenticated requests, use free tier sources
  const tier = (authReq.user?.subscription_tier || 'free') as SubscriptionTier;
  const allowedSources = getAvailableSources(tier);
  
  // Filter requested sources to only allowed ones
  if (req.body.sources && Array.isArray(req.body.sources)) {
    req.body.sources = req.body.sources.filter((s: string) => allowedSources.includes(s));
    
    // If no valid sources left, use default allowed sources
    if (req.body.sources.length === 0) {
      req.body.sources = allowedSources;
    }
  } else {
    // Default to all allowed sources
    req.body.sources = allowedSources;
  }
  
  next();
}

/**
 * Get the minimum tier required for a feature
 */
function getRequiredTierForFeature(feature: keyof TierFeatures): SubscriptionTier {
  const tierOrder: SubscriptionTier[] = ['free', 'starter', 'pro', 'enterprise'];
  
  for (const tier of tierOrder) {
    if (hasFeature(tier, feature)) {
      return tier;
    }
  }
  
  return 'enterprise';
}

/**
 * Format feature name for user-friendly display
 */
function formatFeatureName(feature: keyof TierFeatures): string {
  const names: Record<keyof TierFeatures, string> = {
    allSources: 'All Supplier Sources',
    showSourceNames: 'Source Visibility',
    apiAccess: 'API Access',
    bossMode: 'Boss Mode (AI Enhanced Search)',
    exportCsv: 'CSV Export',
    moqFilter: 'MOQ Filter',
    locationFilter: 'Location Filter',
    supplierTypeFilter: 'Supplier Type Filter',
    certificationsFilter: 'Certifications Filter',
    hsCodeSearch: 'HS Code Search',
    incotermsFilter: 'Incoterms Filter',
    responseRateRanking: 'Response Rate Insights',
    transactionHistory: 'Transaction History',
    supplierVerification: 'Supplier Verification',
    tariffCalculator: 'Tariff Calculator',
  };
  
  return names[feature] || feature;
}

/**
 * Format limit name for user-friendly display
 */
function formatLimitName(limit: keyof TierLimits): string {
  const names: Record<keyof TierLimits, string> = {
    searchesPerMonth: 'monthly searches',
    resultsPerSearch: 'results per search',
    savedItems: 'saved items',
    maxCompareItems: 'comparison items',
    pushToShopifyPerMonth: 'monthly Shopify pushes',
    bossModeSearchesPerDay: 'daily Boss Mode searches',
  };
  
  return names[limit] || limit;
}

/**
 * Attach subscription info to authenticated requests
 */
export async function attachSubscriptionInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authReq = req as AuthRequest;
  
  if (authReq.user) {
    const tier = (authReq.user.subscription_tier || 'free') as SubscriptionTier;
    const config = getTierConfig(tier);
    const usage = await getUserUsage(authReq.user.id);
    
    (authReq as any).subscription = {
      tier,
      config,
      usage,
      allowedSources: getAvailableSources(tier),
    };
  }
  
  next();
}
