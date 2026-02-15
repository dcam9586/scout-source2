/**
 * Subscription Tiers Configuration (Frontend)
 * Mirror of backend config for client-side feature gating
 */

export type SubscriptionTier = 'free' | 'starter' | 'pro' | 'enterprise';

export interface TierLimits {
  searchesPerMonth: number;
  resultsPerSearch: number;
  savedItems: number;
  maxCompareItems: number;
  pushToShopifyPerMonth: number;
  bossModeSearchesPerDay: number;
}

export interface TierFeatures {
  allSources: boolean;
  showSourceNames: boolean;
  apiAccess: boolean;
  bossMode: boolean;
  exportCsv: boolean;
  moqFilter: boolean;
  locationFilter: boolean;
  supplierTypeFilter: boolean;
  certificationsFilter: boolean;
  hsCodeSearch: boolean;
  incotermsFilter: boolean;
  responseRateRanking: boolean;
  transactionHistory: boolean;
  supplierVerification: boolean;
  tariffCalculator: boolean;
}

export interface SubscriptionTierConfig {
  id: SubscriptionTier;
  name: string;
  description: string;
  price: number;
  yearlyPrice: number;
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
      bossModeSearchesPerDay: 0,
    },
    features: {
      allSources: false,
      showSourceNames: false,
      apiAccess: false,
      bossMode: false,
      exportCsv: false,
      moqFilter: false,
      locationFilter: false,
      supplierTypeFilter: false,
      certificationsFilter: false,
      hsCodeSearch: false,
      incotermsFilter: false,
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
    yearlyPrice: 190,
    limits: {
      searchesPerMonth: 100,
      resultsPerSearch: 25,
      savedItems: 100,
      maxCompareItems: 5,
      pushToShopifyPerMonth: 5,
      bossModeSearchesPerDay: 0,
    },
    features: {
      allSources: true,
      showSourceNames: false,
      apiAccess: false,
      bossMode: false,
      exportCsv: true,
      moqFilter: true,
      locationFilter: true,
      supplierTypeFilter: false,
      certificationsFilter: false,
      hsCodeSearch: false,
      incotermsFilter: false,
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
    yearlyPrice: 470,
    limits: {
      searchesPerMonth: -1,
      resultsPerSearch: 50,
      savedItems: -1,
      maxCompareItems: 10,
      pushToShopifyPerMonth: -1,
      bossModeSearchesPerDay: 3,
    },
    features: {
      allSources: true,
      showSourceNames: true,
      apiAccess: false,
      bossMode: true,
      exportCsv: true,
      moqFilter: true,
      locationFilter: true,
      supplierTypeFilter: true,
      certificationsFilter: true,
      hsCodeSearch: true,
      incotermsFilter: false,
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
    yearlyPrice: 1428,
    limits: {
      searchesPerMonth: -1,
      resultsPerSearch: 100,
      savedItems: -1,
      maxCompareItems: -1,
      pushToShopifyPerMonth: -1,
      bossModeSearchesPerDay: -1,
    },
    features: {
      allSources: true,
      showSourceNames: true,
      apiAccess: true,
      bossMode: true,
      exportCsv: true,
      moqFilter: true,
      locationFilter: true,
      supplierTypeFilter: true,
      certificationsFilter: true,
      hsCodeSearch: true,
      incotermsFilter: true,
      responseRateRanking: true,
      transactionHistory: true,
      supplierVerification: true,
      tariffCalculator: true,
    },
    supportLevel: 'dedicated',
    badge: 'Full Power',
  },
};

export function getTierConfig(tier: SubscriptionTier): SubscriptionTierConfig {
  return SUBSCRIPTION_TIERS[tier] || SUBSCRIPTION_TIERS.free;
}

export function hasFeature(tier: SubscriptionTier, feature: keyof TierFeatures): boolean {
  const config = getTierConfig(tier);
  return config.features[feature] === true;
}

export function isWithinLimit(tier: SubscriptionTier, limit: keyof TierLimits, currentUsage: number): boolean {
  const config = getTierConfig(tier);
  const maxAllowed = config.limits[limit];
  if (maxAllowed === -1) return true;
  return currentUsage < maxAllowed;
}

export function getRemainingUsage(tier: SubscriptionTier, limit: keyof TierLimits, currentUsage: number): number | 'unlimited' {
  const config = getTierConfig(tier);
  const maxAllowed = config.limits[limit];
  if (maxAllowed === -1) return 'unlimited';
  return Math.max(0, maxAllowed - currentUsage);
}

export function getAllTiers(): SubscriptionTierConfig[] {
  return Object.values(SUBSCRIPTION_TIERS);
}

export function getRequiredTierForFeature(feature: keyof TierFeatures): SubscriptionTier {
  const tierOrder: SubscriptionTier[] = ['free', 'starter', 'pro', 'enterprise'];
  for (const tier of tierOrder) {
    if (hasFeature(tier, feature)) {
      return tier;
    }
  }
  return 'enterprise';
}

export function formatLimit(limit: number): string {
  if (limit === -1) return 'Unlimited';
  return limit.toLocaleString();
}
