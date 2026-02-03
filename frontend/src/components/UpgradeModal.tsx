/**
 * UpgradeModal Component
 * Shows pricing tiers and prompts user to upgrade their subscription
 */

import React, { useState } from 'react';
import useAppStore from '../store/appStore';
import { 
  getAllTiers, 
  SubscriptionTierConfig, 
  formatLimit,
  TierFeatures,
  SubscriptionTier 
} from '../config/subscriptions';
import '../styles/components.css';

interface UpgradeModalProps {
  highlightedFeature?: string | null;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({ highlightedFeature }) => {
  const subscription = useAppStore((state) => state.subscription);
  const hideUpgradeModal = useAppStore((state) => state.hideUpgradeModal);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  
  const { showUpgradeModal, upgradeFeature, tier: currentTier } = subscription;
  const tiers = getAllTiers();
  
  if (!showUpgradeModal) return null;

  const featureToHighlight = highlightedFeature || upgradeFeature;

  const handleUpgrade = (tier: SubscriptionTier) => {
    // TODO: Integrate with Stripe/PayPal
    console.log('Upgrade to:', tier, 'Billing:', billingPeriod);
    alert(`Payment integration coming soon! You selected: ${tier} (${billingPeriod})`);
  };

  const getPrice = (tier: SubscriptionTierConfig) => {
    if (tier.price === 0) return 'Free';
    const price = billingPeriod === 'yearly' 
      ? Math.round(tier.yearlyPrice / 12) 
      : tier.price;
    return `$${price}`;
  };

  const getSavings = (tier: SubscriptionTierConfig) => {
    if (tier.price === 0) return null;
    const yearlySavings = (tier.price * 12) - tier.yearlyPrice;
    if (yearlySavings <= 0) return null;
    return Math.round((yearlySavings / (tier.price * 12)) * 100);
  };

  return (
    <div className="upgrade-modal-overlay" onClick={hideUpgradeModal}>
      <div className="upgrade-modal" onClick={(e) => e.stopPropagation()}>
        <button className="upgrade-modal__close" onClick={hideUpgradeModal}>
          ×
        </button>
        
        <div className="upgrade-modal__header">
          <h2 className="upgrade-modal__title">
            {featureToHighlight 
              ? 'Upgrade to Unlock This Feature' 
              : 'Choose Your Plan'}
          </h2>
          <p className="upgrade-modal__subtitle">
            {featureToHighlight 
              ? `Upgrade your plan to access ${formatFeatureName(featureToHighlight as keyof TierFeatures)}`
              : 'Find the perfect plan for your sourcing needs'}
          </p>
          
          {/* Billing Toggle */}
          <div className="upgrade-modal__billing-toggle">
            <button 
              className={`upgrade-modal__billing-btn ${billingPeriod === 'monthly' ? 'upgrade-modal__billing-btn--active' : ''}`}
              onClick={() => setBillingPeriod('monthly')}
            >
              Monthly
            </button>
            <button 
              className={`upgrade-modal__billing-btn ${billingPeriod === 'yearly' ? 'upgrade-modal__billing-btn--active' : ''}`}
              onClick={() => setBillingPeriod('yearly')}
            >
              Yearly
              <span className="upgrade-modal__billing-save">Save 20%</span>
            </button>
          </div>
        </div>

        <div className="upgrade-modal__tiers">
          {tiers.map((tier) => {
            const isCurrentPlan = tier.id === currentTier;
            const savings = getSavings(tier);
            
            return (
              <div 
                key={tier.id} 
                className={`upgrade-modal__tier ${tier.popular ? 'upgrade-modal__tier--popular' : ''} ${isCurrentPlan ? 'upgrade-modal__tier--current' : ''}`}
              >
                {tier.badge && (
                  <div className="upgrade-modal__tier-badge">{tier.badge}</div>
                )}
                
                <h3 className="upgrade-modal__tier-name">{tier.name}</h3>
                <p className="upgrade-modal__tier-description">{tier.description}</p>
                
                <div className="upgrade-modal__tier-price">
                  <span className="upgrade-modal__tier-amount">{getPrice(tier)}</span>
                  {tier.price > 0 && (
                    <span className="upgrade-modal__tier-period">/mo</span>
                  )}
                </div>
                
                {billingPeriod === 'yearly' && savings && (
                  <div className="upgrade-modal__tier-savings">
                    Save {savings}% annually
                  </div>
                )}

                <ul className="upgrade-modal__tier-features">
                  <li>
                    <span className="upgrade-modal__feature-icon">✓</span>
                    {formatLimit(tier.limits.searchesPerMonth)} searches/month
                  </li>
                  <li>
                    <span className="upgrade-modal__feature-icon">✓</span>
                    {formatLimit(tier.limits.resultsPerSearch)} results per search
                  </li>
                  <li>
                    <span className="upgrade-modal__feature-icon">✓</span>
                    {formatLimit(tier.limits.savedItems)} saved items
                  </li>
                  <li>
                    <span className="upgrade-modal__feature-icon">✓</span>
                    {formatLimit(tier.limits.pushToShopifyPerMonth)} Shopify pushes/month
                  </li>
                  {tier.features.showSourceNames && (
                    <li>
                      <span className="upgrade-modal__feature-icon">✓</span>
                      See supplier sources
                    </li>
                  )}
                  {tier.features.exportCsv && (
                    <li>
                      <span className="upgrade-modal__feature-icon">✓</span>
                      Export to CSV
                    </li>
                  )}
                  {tier.features.hsCodeSearch && (
                    <li>
                      <span className="upgrade-modal__feature-icon">✓</span>
                      HS Code Search
                    </li>
                  )}
                  {tier.features.certificationsFilter && (
                    <li>
                      <span className="upgrade-modal__feature-icon">✓</span>
                      Certification Filters
                    </li>
                  )}
                  {tier.features.tariffCalculator && (
                    <li>
                      <span className="upgrade-modal__feature-icon">✓</span>
                      Tariff Calculator
                    </li>
                  )}
                </ul>

                <button
                  className={`upgrade-modal__tier-btn ${tier.popular ? 'upgrade-modal__tier-btn--primary' : ''}`}
                  onClick={() => handleUpgrade(tier.id)}
                  disabled={isCurrentPlan}
                >
                  {isCurrentPlan ? 'Current Plan' : tier.price === 0 ? 'Get Started' : 'Upgrade'}
                </button>
              </div>
            );
          })}
        </div>

        <div className="upgrade-modal__footer">
          <p>🔒 Secure payment · Cancel anytime · 7-day money-back guarantee</p>
        </div>
      </div>
    </div>
  );
};

function formatFeatureName(feature: keyof TierFeatures | string): string {
  const names: Record<string, string> = {
    allSources: 'All Supplier Sources',
    showSourceNames: 'Source Visibility',
    apiAccess: 'API Access',
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
    searchesPerMonth: 'More Monthly Searches',
    savedItems: 'More Saved Items',
    pushToShopifyPerMonth: 'More Shopify Pushes',
  };
  return names[feature] || feature;
}

export default UpgradeModal;
