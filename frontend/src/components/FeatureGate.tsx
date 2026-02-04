/**
 * FeatureGate Component
 * Conditionally renders content based on user's subscription tier
 * Shows upgrade prompt for locked features
 */

import React from 'react';
import useAppStore from '../store/appStore';
import { 
  TierFeatures, 
  TierLimits, 
  hasFeature, 
  isWithinLimit,
  getRequiredTierForFeature,
  getTierConfig,
  SubscriptionTier
} from '../config/subscriptions';

interface FeatureGateProps {
  /** The feature to check access for */
  feature?: keyof TierFeatures;
  /** The limit to check against */
  limit?: keyof TierLimits;
  /** Current usage count (required if limit is specified) */
  currentUsage?: number;
  /** Content to show when feature is accessible */
  children: React.ReactNode;
  /** Custom fallback content (optional) */
  fallback?: React.ReactNode;
  /** Show a lock icon overlay instead of replacing content */
  showLockOverlay?: boolean;
  /** Custom message for the upgrade prompt */
  upgradeMessage?: string;
}

/**
 * Wraps content that should only be accessible to certain subscription tiers
 */
export const FeatureGate: React.FC<FeatureGateProps> = ({
  feature,
  limit,
  currentUsage = 0,
  children,
  fallback,
  showLockOverlay = false,
  upgradeMessage,
}) => {
  const subscription = useAppStore((state) => state.subscription);
  const showUpgradeModal = useAppStore((state) => state.showUpgradeModal);
  const { tier } = subscription;

  // Check if user has access
  let hasAccess = true;
  let requiredTier: SubscriptionTier = 'free';
  let lockReason = '';

  if (feature) {
    hasAccess = hasFeature(tier, feature);
    requiredTier = getRequiredTierForFeature(feature);
    lockReason = `This feature requires ${getTierConfig(requiredTier).name} plan`;
  }

  if (limit && hasAccess) {
    hasAccess = isWithinLimit(tier, limit, currentUsage);
    if (!hasAccess) {
      lockReason = `You've reached your ${formatLimitName(limit)} limit`;
    }
  }

  // User has access - render children
  if (hasAccess) {
    return <>{children}</>;
  }

  // Custom fallback provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Show lock overlay over the content
  if (showLockOverlay) {
    return (
      <div className="feature-gate feature-gate--locked">
        <div className="feature-gate__content feature-gate__content--blurred">
          {children}
        </div>
        <div className="feature-gate__overlay">
          <div className="feature-gate__lock-icon">🔒</div>
          <p className="feature-gate__message">
            {upgradeMessage || lockReason}
          </p>
          <button 
            className="feature-gate__upgrade-btn"
            onClick={() => showUpgradeModal(feature || limit)}
          >
            Upgrade to {getTierConfig(requiredTier).name}
          </button>
        </div>
      </div>
    );
  }

  // Default: show upgrade prompt
  return (
    <div className="feature-gate feature-gate--prompt">
      <div className="feature-gate__prompt-content">
        <span className="feature-gate__prompt-icon">✨</span>
        <div className="feature-gate__prompt-text">
          <p className="feature-gate__prompt-title">
            {upgradeMessage || lockReason}
          </p>
          <p className="feature-gate__prompt-subtitle">
            Upgrade to unlock this feature
          </p>
        </div>
        <button 
          className="feature-gate__prompt-btn"
          onClick={() => showUpgradeModal(feature || limit)}
        >
          Upgrade
        </button>
      </div>
    </div>
  );
};

/**
 * Hook to check if a feature is available
 */
export function useFeatureAccess(feature: keyof TierFeatures): {
  hasAccess: boolean;
  requiredTier: SubscriptionTier;
  currentTier: SubscriptionTier;
} {
  const subscription = useAppStore((state) => state.subscription);
  const { tier } = subscription;
  
  return {
    hasAccess: hasFeature(tier, feature),
    requiredTier: getRequiredTierForFeature(feature),
    currentTier: tier,
  };
}

/**
 * Hook to check if within usage limits
 */
export function useLimitAccess(limit: keyof TierLimits, currentUsage: number): {
  hasAccess: boolean;
  remaining: number | 'unlimited';
  maxAllowed: number;
  currentTier: SubscriptionTier;
} {
  const subscription = useAppStore((state) => state.subscription);
  const { tier, config } = subscription;
  const maxAllowed = config.limits[limit];
  
  return {
    hasAccess: isWithinLimit(tier, limit, currentUsage),
    remaining: maxAllowed === -1 ? 'unlimited' : Math.max(0, maxAllowed - currentUsage),
    maxAllowed,
    currentTier: tier,
  };
}

/**
 * Format limit name for display
 */
function formatLimitName(limit: keyof TierLimits): string {
  const names: Record<keyof TierLimits, string> = {
    searchesPerMonth: 'monthly search',
    resultsPerSearch: 'results per search',
    savedItems: 'saved items',
    maxCompareItems: 'comparison',
    pushToShopifyPerMonth: 'Shopify push',
    bossModeSearchesPerDay: 'daily Boss Mode search',
  };
  return names[limit] || limit;
}

export default FeatureGate;
