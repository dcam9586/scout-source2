/**
 * UpgradeModal Component
 * Shows pricing tiers and prompts user to upgrade their subscription
 * Integrated with Stripe and PayPal payment providers
 */

import React, { useState } from 'react';
import useAppStore from '../store/appStore';
import { usePayments, PaymentProvider } from '../hooks/usePayments';
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
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(null);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  
  const { checkout, isLoading, error } = usePayments();
  
  const { showUpgradeModal, upgradeFeature, tier: currentTier } = subscription;
  const tiers = getAllTiers();
  
  if (!showUpgradeModal) return null;

  const featureToHighlight = highlightedFeature || upgradeFeature;

  const handleUpgrade = (tier: SubscriptionTier) => {
    if (tier === 'free') {
      // Free tier - no payment needed
      hideUpgradeModal();
      return;
    }
    setSelectedTier(tier);
    setShowPaymentOptions(true);
  };

  const handlePaymentSelect = async (provider: PaymentProvider) => {
    if (!selectedTier || selectedTier === 'free') return;
    
    try {
      await checkout({
        tier: selectedTier,
        billingPeriod,
        provider,
      });
      // User will be redirected to payment provider
    } catch (err) {
      console.error('Payment error:', err);
    }
  };

  const handleClosePaymentOptions = () => {
    setShowPaymentOptions(false);
    setSelectedTier(null);
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
                  disabled={isCurrentPlan || isLoading}
                >
                  {isLoading && selectedTier === tier.id 
                    ? 'Processing...' 
                    : isCurrentPlan 
                      ? 'Current Plan' 
                      : tier.price === 0 
                        ? 'Get Started' 
                        : 'Upgrade'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Payment Provider Selection Overlay */}
        {showPaymentOptions && selectedTier && (
          <div className="upgrade-modal__payment-overlay">
            <div className="upgrade-modal__payment-options">
              <button 
                className="upgrade-modal__payment-close"
                onClick={handleClosePaymentOptions}
              >
                ×
              </button>
              <h3>Choose Payment Method</h3>
              <p>
                Subscribing to <strong>{selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1)}</strong> plan
                ({billingPeriod === 'yearly' ? 'Yearly' : 'Monthly'})
              </p>
              
              {error && (
                <div className="upgrade-modal__payment-error">
                  {error}
                </div>
              )}
              
              <div className="upgrade-modal__payment-buttons">
                <button
                  className="upgrade-modal__payment-btn upgrade-modal__payment-btn--stripe"
                  onClick={() => handlePaymentSelect('stripe')}
                  disabled={isLoading}
                >
                  <svg viewBox="0 0 60 25" width="60" height="25" xmlns="http://www.w3.org/2000/svg">
                    <path fill="currentColor" d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a10.89 10.89 0 0 1-4.56.93c-4.67 0-7.38-2.72-7.38-6.95 0-4.06 2.76-6.91 6.72-6.91 3.83 0 6.18 2.63 6.18 6.76 0 .63-.05 1.06-.15 1.25zm-4.53-5.73c-.86 0-1.94.47-2.1 2.18h4.05c-.08-1.48-.93-2.18-1.95-2.18zm-12.4 9.2V6.51h4.43v11.24h-4.43zm-4.48-4.85c0-.96-.71-1.54-2.07-1.54-.88 0-2.02.39-3.04 1.03l-1.32-2.84c1.46-.92 3.35-1.49 5.36-1.49 3.5 0 5.52 1.8 5.52 4.47 0 4.19-5.04 3.5-5.04 5.37 0 .54.47.76 1.29.76.96 0 2.33-.43 3.6-1.2l1.25 2.96c-1.61.97-3.54 1.46-5.39 1.46-3.6 0-5.56-1.71-5.56-4.37 0-4.34 5.4-3.64 5.4-5.61zm-14.06 4.85V6.51h4.43v11.24h-4.43zm-4.89-5.6c0-3.66 2.78-5.84 6.72-5.84 1.13 0 2.15.22 2.93.55V3.46l4.48-.77v15.06h-4.48v-.73c-.72.62-1.74.97-2.93.97-3.95 0-6.72-2.18-6.72-5.85zm4.43-.13c0 1.67 1.18 2.65 2.67 2.65.8 0 1.55-.26 2.1-.67V10.06c-.55-.35-1.3-.55-2.1-.55-1.48 0-2.67 1-2.67 2.59zM6.05 6.4c.64-.45 1.44-.69 2.3-.69 1.7 0 3.07 1.03 3.07 2.8 0 1.88-1.53 2.87-3.07 2.87-.85 0-1.66-.24-2.3-.7v3.37c.77.37 1.67.56 2.65.56 3.78 0 6.93-2.44 6.93-6.04 0-3.6-3.15-6.09-6.93-6.09-.98 0-1.88.19-2.65.56v3.36z"/>
                  </svg>
                  Pay with Card
                </button>
                
                <button
                  className="upgrade-modal__payment-btn upgrade-modal__payment-btn--paypal"
                  onClick={() => handlePaymentSelect('paypal')}
                  disabled={isLoading}
                >
                  <svg viewBox="0 0 101 32" width="80" height="26" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#253B80" d="M12.237 2.4H4.437c-.52 0-.963.387-1.044.906L.514 22.064c-.061.38.233.723.618.723h3.735c.52 0 .962-.387 1.043-.906l.806-5.208c.08-.52.523-.907 1.043-.907h2.403c5.012 0 7.905-2.458 8.666-7.332.343-2.133.014-3.81-.977-4.985C16.777 2.18 14.85 1.5 12.237 2.4z"/>
                    <path fill="#179BD7" d="M39.5 2.4h-7.8c-.52 0-.963.387-1.044.906L27.78 22.064c-.061.38.232.723.617.723h4.034c.363 0 .673-.27.73-.633l.887-5.656c.08-.52.523-.907 1.043-.907h2.403c5.012 0 7.905-2.458 8.666-7.332.343-2.133.014-3.81-.977-4.985C44.11 2.18 42.112 1.5 39.5 2.4z"/>
                    <path fill="#253B80" d="M67.668 9.62c-.337 2.24-2.028 2.24-3.665 2.24h-.93l.653-4.19c.04-.253.255-.44.512-.44h.427c1.114 0 2.167 0 2.71.643.325.383.424.952.293 1.747zm-.707-5.903h-6.177c-.425 0-.786.316-.852.74l-2.5 16.107c-.05.318.19.605.511.605h3.158c.297 0 .55-.221.596-.52l.711-4.576c.066-.425.427-.74.852-.74h1.966c4.096 0 6.461-2.012 7.08-6.001.279-1.745.011-3.116-.795-4.076-.886-1.057-2.457-1.539-4.55-1.539z"/>
                  </svg>
                  Pay with PayPal
                </button>
              </div>
              
              <p className="upgrade-modal__payment-secure">
                🔒 Your payment is secured with industry-standard encryption
              </p>
            </div>
          </div>
        )}

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
