/**
 * Subscription Tiers Configuration
 * Central source of truth for all subscription-related limits and features
 */

export type SubscriptionTier = 'free' | 'starter' | 'pro' | 'enterprise';

export interface TierLimits {
  searchesPerMonth: number;
  resultsPerSearch: number;
  savedItems: number;
  maxCompareItems: number;
  pushToShopifyPerMonth: number;
  bossModeSearchesPerDay: number; // Boss Mode daily limit (-1 = unlimited)
}

export interface TierFeatures {
  // Sources
  allSources: boolean;
  showSourceNames: boolean;
  apiAccess: boolean;
  
  // Boss Mode - Enhanced AI-powered scraping
  bossMode: boolean;
  
  // Basic Features
  exportCsv: boolean;
  
  // Advanced Filters
  moqFilter: boolean;
  locationFilter: boolean;
  supplierTypeFilter: boolean;
  certificationsFilter: boolean;
  hsCodeSearch: boolean;
  incotermsFilter: boolean;
  
  // Insights
  responseRateRanking: boolean;
  transactionHistory: boolean;
  supplierVerification: boolean;
  tariffCalculator: boolean;
}

export interface SubscriptionTierConfig {
  id: SubscriptionTier;
  name: string;
  description: string;
  price: number; // Monthly price in USD
  yearlyPrice: number; // Yearly price in USD (with discount)
  limits: TierLimits;
  features: TierFeatures;
  supportLevel: 'community' | 'email' | 'priority' | 'dedicated';
  badge?: string;
  popular?: boolean;
}

export const SUBSCRIPTION_TIERS: Record<SubscriptionTier, SubscriptionTierConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Get started with basic product sourcing',
    price: 0,
    yearlyPrice: 0,
    limits: {
      searchesPerMonth: 5,
      resultsPerSearch: 5,
      savedItems: 10,
      maxCompareItems: 2,
      pushToShopifyPerMonth: 0,
      bossModeSearchesPerDay: 0, // No Boss Mode for free tier
    },
    features: {
      // Sources - Limited
      allSources: false, // CJ Dropshipping only
      showSourceNames: false, // Hide where products come from
      apiAccess: false,
      
      // Boss Mode - Not available
      bossMode: false,
      
      // Basic Features
      exportCsv: false,
      
      // Advanced Filters - None
      moqFilter: false,
      locationFilter: false,
      supplierTypeFilter: false,
      certificationsFilter: false,
      hsCodeSearch: false,
      incotermsFilter: false,
      
      // Insights - None
      responseRateRanking: false,
      transactionHistory: false,
      supplierVerification: false,
      tariffCalculator: false,
    },
    supportLevel: 'community',
  },
  
  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'For growing merchants exploring suppliers',
    price: 19,
    yearlyPrice: 190, // ~17% discount
    limits: {
      searchesPerMonth: 100,
      resultsPerSearch: 25,
      savedItems: 100,
      maxCompareItems: 5,
      pushToShopifyPerMonth: 5,
      bossModeSearchesPerDay: 0, // No Boss Mode for starter tier
    },
    features: {
      // Sources - All but hidden
      allSources: true,
      showSourceNames: false, // Still hide source names
      apiAccess: false,
      
      // Boss Mode - Not available
      bossMode: false,
      
      // Basic Features
      exportCsv: true,
      
      // Advanced Filters - Basic
      moqFilter: true,
      locationFilter: true,
      supplierTypeFilter: false,
      certificationsFilter: false,
      hsCodeSearch: false,
      incotermsFilter: false,
      
      // Insights - None
      responseRateRanking: false,
      transactionHistory: false,
      supplierVerification: false,
      tariffCalculator: false,
    },
    supportLevel: 'email',
  },
  
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'Full power for serious sourcing professionals',
    price: 49,
    yearlyPrice: 470, // ~20% discount
    limits: {
      searchesPerMonth: -1, // Unlimited
      resultsPerSearch: 50,
      savedItems: -1, // Unlimited
      maxCompareItems: 10,
      pushToShopifyPerMonth: -1, // Unlimited
      bossModeSearchesPerDay: 3, // 3 Boss Mode searches per day
    },
    features: {
      // Sources - Full visibility
      allSources: true,
      showSourceNames: true, // Show source names
      apiAccess: false,
      
      // Boss Mode - Available with daily limit
      bossMode: true,
      
      // Basic Features
      exportCsv: true,
      
      // Advanced Filters - All except enterprise
      moqFilter: true,
      locationFilter: true,
      supplierTypeFilter: true,
      certificationsFilter: true,
      hsCodeSearch: true,
      incotermsFilter: false,
      
      // Insights - Full
      responseRateRanking: true,
      transactionHistory: true,
      supplierVerification: true,
      tariffCalculator: false,
    },
    supportLevel: 'priority',
    badge: 'Most Popular',
    popular: true,
  },
  
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Custom solutions for large-scale operations',
    price: 149,
    yearlyPrice: 1428, // ~20% discount
    limits: {
      searchesPerMonth: -1, // Unlimited
      resultsPerSearch: 100,
      savedItems: -1, // Unlimited
      maxCompareItems: -1, // Unlimited
      pushToShopifyPerMonth: -1, // Unlimited
      bossModeSearchesPerDay: -1, // Unlimited Boss Mode
    },
    features: {
      // Sources - Everything
      allSources: true,
      showSourceNames: true,
      apiAccess: true,
      
      // Boss Mode - Unlimited
      bossMode: true,
      
      // Basic Features
      exportCsv: true,
      
      // Advanced Filters - Everything
      moqFilter: true,
      locationFilter: true,
      supplierTypeFilter: true,
      certificationsFilter: true,
      hsCodeSearch: true,
      incotermsFilter: true,
      
      // Insights - Everything
      responseRateRanking: true,
      transactionHistory: true,
      supplierVerification: true,
      tariffCalculator: true,
    },
    supportLevel: 'dedicated',
    badge: 'Full Power',
  },
};

/**
 * Get tier configuration by tier ID
 */
export function getTierConfig(tier: SubscriptionTier): SubscriptionTierConfig {
  return SUBSCRIPTION_TIERS[tier] || SUBSCRIPTION_TIERS.free;
}

/**
 * Check if a specific feature is available for a tier
 */
export function hasFeature(tier: SubscriptionTier, feature: keyof TierFeatures): boolean {
  const config = getTierConfig(tier);
  return config.features[feature] === true;
}

/**
 * Check if a limit is exceeded (-1 means unlimited)
 */
export function isWithinLimit(tier: SubscriptionTier, limit: keyof TierLimits, currentUsage: number): boolean {
  const config = getTierConfig(tier);
  const maxAllowed = config.limits[limit];
  
  // -1 means unlimited
  if (maxAllowed === -1) return true;
  
  return currentUsage < maxAllowed;
}

/**
 * Get remaining usage for a limit
 */
export function getRemainingUsage(tier: SubscriptionTier, limit: keyof TierLimits, currentUsage: number): number {
  const config = getTierConfig(tier);
  const maxAllowed = config.limits[limit];
  
  // -1 means unlimited
  if (maxAllowed === -1) return -1;
  
  return Math.max(0, maxAllowed - currentUsage);
}

/**
 * Get all tiers as an array (for pricing page)
 */
export function getAllTiers(): SubscriptionTierConfig[] {
  return Object.values(SUBSCRIPTION_TIERS);
}

/**
 * All supported search sources
 */
export const ALL_SOURCES = [
  'alibaba',
  'made-in-china', 
  'cj-dropshipping',
  'global-sources',
  'tradekorea',
  'wholesale-central'
] as const;

export type SearchSource = typeof ALL_SOURCES[number];

/**
 * Sources available per tier
 */
export function getAvailableSources(tier: SubscriptionTier): string[] {
  const config = getTierConfig(tier);
  
  if (config.features.allSources) {
    // Paid tiers get all sources
    return [...ALL_SOURCES];
  }
  
  // Free tier gets basic sources (Alibaba, Made-in-China, CJ)
  // This allows users to test the app functionality
  return ['alibaba', 'made-in-china', 'cj-dropshipping'];
}
