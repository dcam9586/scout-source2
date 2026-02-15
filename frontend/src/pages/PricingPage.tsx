/**
 * PricingPage Component
 * Standalone pricing page showing all subscription tiers
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAppStore from '../store/appStore';
import { usePayments, PaymentProvider } from '../hooks/usePayments';
import { 
  getAllTiers, 
  SubscriptionTierConfig, 
  formatLimit,
  SubscriptionTier 
} from '../config/subscriptions';
import Footer from '../components/Footer';
import '../styles/pages.css';

const PricingPage: React.FC = () => {
  const navigate = useNavigate();
  const token = useAppStore((state) => state.token);
  const subscription = useAppStore((state) => state.subscription);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly');
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider>('stripe');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState<Exclude<SubscriptionTier, 'free'> | null>(null);
  
  const { checkout, isLoading, error, clearError } = usePayments();
  
  const tiers = getAllTiers();
  const currentTier = subscription?.tier || 'free';

  const handleSelectPlan = async (tier: SubscriptionTier) => {
    if (!token) {
      // Not logged in - prompt to sign up
      navigate('/?signup=true');
      return;
    }
    
    if (tier === 'free') {
      navigate('/search');
      return;
    }

    if (tier === currentTier) {
      // Already on this plan
      return;
    }

    // Show payment provider selection modal
    setSelectedTier(tier as Exclude<SubscriptionTier, 'free'>);
    setShowPaymentModal(true);
  };

  const handleCheckout = async () => {
    if (!selectedTier) return;
    
    try {
      await checkout({
        tier: selectedTier,
        billingPeriod,
        provider: selectedProvider,
      });
      // User will be redirected to payment provider
    } catch (err) {
      console.error('Checkout failed:', err);
    }
  };

  const getPrice = (tier: SubscriptionTierConfig) => {
    if (tier.price === 0) return 'Free';
    const price = billingPeriod === 'yearly' 
      ? Math.round(tier.yearlyPrice / 12) 
      : tier.price;
    return `$${price}`;
  };

  const getYearlyTotal = (tier: SubscriptionTierConfig) => {
    if (tier.price === 0) return null;
    return billingPeriod === 'yearly' ? tier.yearlyPrice : tier.price * 12;
  };

  const getSavings = (tier: SubscriptionTierConfig) => {
    if (tier.price === 0) return null;
    const yearlySavings = (tier.price * 12) - tier.yearlyPrice;
    if (yearlySavings <= 0) return null;
    return yearlySavings;
  };

  const featuresList = [
    { key: 'searches', label: 'Searches per month', getValue: (t: SubscriptionTierConfig) => formatLimit(t.limits.searchesPerMonth) },
    { key: 'results', label: 'Results per search', getValue: (t: SubscriptionTierConfig) => formatLimit(t.limits.resultsPerSearch) },
    { key: 'savedItems', label: 'Saved items', getValue: (t: SubscriptionTierConfig) => formatLimit(t.limits.savedItems) },
    { key: 'comparisons', label: 'Compare items', getValue: (t: SubscriptionTierConfig) => formatLimit(t.limits.maxCompareItems) },
    { key: 'pushToShopify', label: 'Push to Shopify', getValue: (t: SubscriptionTierConfig) => formatLimit(t.limits.pushToShopifyPerMonth) },
    { key: 'sources', label: 'All supplier sources', getValue: (t: SubscriptionTierConfig) => t.features.allSources ? '✓' : 'CJ only' },
    { key: 'showSources', label: 'See source names', getValue: (t: SubscriptionTierConfig) => t.features.showSourceNames ? '✓' : '—' },
    { key: 'exportCsv', label: 'Export to CSV', getValue: (t: SubscriptionTierConfig) => t.features.exportCsv ? '✓' : '—' },
    { key: 'moqFilter', label: 'MOQ filter', getValue: (t: SubscriptionTierConfig) => t.features.moqFilter ? '✓' : '—' },
    { key: 'locationFilter', label: 'Location filter', getValue: (t: SubscriptionTierConfig) => t.features.locationFilter ? '✓' : '—' },
    { key: 'supplierType', label: 'Supplier type filter', getValue: (t: SubscriptionTierConfig) => t.features.supplierTypeFilter ? '✓' : '—' },
    { key: 'certifications', label: 'Certification filters', getValue: (t: SubscriptionTierConfig) => t.features.certificationsFilter ? '✓' : '—' },
    { key: 'hsCode', label: 'HS Code search', getValue: (t: SubscriptionTierConfig) => t.features.hsCodeSearch ? '✓' : '—' },
    { key: 'incoterms', label: 'Incoterms filter', getValue: (t: SubscriptionTierConfig) => t.features.incotermsFilter ? '✓' : '—' },
    { key: 'responseRate', label: 'Response rate ranking', getValue: (t: SubscriptionTierConfig) => t.features.responseRateRanking ? '✓' : '—' },
    { key: 'transactionHistory', label: 'Transaction history', getValue: (t: SubscriptionTierConfig) => t.features.transactionHistory ? '✓' : '—' },
    { key: 'verification', label: 'Supplier verification', getValue: (t: SubscriptionTierConfig) => t.features.supplierVerification ? '✓' : '—' },
    { key: 'tariff', label: 'Tariff calculator', getValue: (t: SubscriptionTierConfig) => t.features.tariffCalculator ? '✓' : '—' },
    { key: 'api', label: 'API access', getValue: (t: SubscriptionTierConfig) => t.features.apiAccess ? '✓' : '—' },
    { key: 'support', label: 'Support', getValue: (t: SubscriptionTierConfig) => formatSupport(t.supportLevel) },
  ];

  return (
    <div className="pricing-page">
      <div className="pricing-page__header">
        <h1 className="pricing-page__title">Simple, Transparent Pricing</h1>
        <p className="pricing-page__subtitle">
          Choose the plan that fits your sourcing needs. Upgrade or downgrade anytime.
        </p>
        
        {/* Billing Toggle */}
        <div className="pricing-page__billing-toggle">
          <button 
            className={`pricing-page__billing-btn ${billingPeriod === 'monthly' ? 'pricing-page__billing-btn--active' : ''}`}
            onClick={() => setBillingPeriod('monthly')}
          >
            Monthly
          </button>
          <button 
            className={`pricing-page__billing-btn ${billingPeriod === 'yearly' ? 'pricing-page__billing-btn--active' : ''}`}
            onClick={() => setBillingPeriod('yearly')}
          >
            Yearly
            <span className="pricing-page__billing-save">Save 20%</span>
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="pricing-page__cards">
        {tiers.map((tier) => {
          const isCurrentPlan = !!token && tier.id === currentTier;
          const savings = getSavings(tier);
          const yearlyTotal = getYearlyTotal(tier);
          
          return (
            <div 
              key={tier.id} 
              className={`pricing-card ${tier.popular ? 'pricing-card--popular' : ''} ${isCurrentPlan ? 'pricing-card--current' : ''}`}
            >
              {tier.badge && (
                <div className="pricing-card__badge">{tier.badge}</div>
              )}
              
              <h3 className="pricing-card__name">{tier.name}</h3>
              <p className="pricing-card__description">{tier.description}</p>
              
              <div className="pricing-card__price">
                <span className="pricing-card__amount">{getPrice(tier)}</span>
                {tier.price > 0 && (
                  <span className="pricing-card__period">/month</span>
                )}
              </div>
              
              {billingPeriod === 'yearly' && yearlyTotal && (
                <div className="pricing-card__yearly">
                  ${yearlyTotal} billed annually
                </div>
              )}
              
              {billingPeriod === 'yearly' && savings && (
                <div className="pricing-card__savings">
                  Save ${savings}/year
                </div>
              )}

              <button
                className={`pricing-card__btn ${tier.popular ? 'pricing-card__btn--primary' : ''}`}
                onClick={() => handleSelectPlan(tier.id)}
                disabled={isCurrentPlan}
              >
                {isCurrentPlan ? 'Current Plan' : tier.price === 0 ? 'Get Started Free' : 'Start Free Trial'}
              </button>

              <ul className="pricing-card__features">
                <li className="pricing-card__feature pricing-card__feature--highlight">
                  <span className="pricing-card__feature-icon">🔍</span>
                  {formatLimit(tier.limits.searchesPerMonth)} searches/month
                </li>
                <li className="pricing-card__feature pricing-card__feature--highlight">
                  <span className="pricing-card__feature-icon">📦</span>
                  {formatLimit(tier.limits.resultsPerSearch)} results per search
                </li>
                <li className="pricing-card__feature">
                  <span className="pricing-card__feature-icon">💾</span>
                  {formatLimit(tier.limits.savedItems)} saved items
                </li>
                <li className="pricing-card__feature">
                  <span className="pricing-card__feature-icon">🛒</span>
                  {formatLimit(tier.limits.pushToShopifyPerMonth)} Shopify pushes
                </li>
                {tier.features.showSourceNames && (
                  <li className="pricing-card__feature">
                    <span className="pricing-card__feature-icon">👁️</span>
                    See supplier sources
                  </li>
                )}
                {tier.features.hsCodeSearch && (
                  <li className="pricing-card__feature">
                    <span className="pricing-card__feature-icon">🏷️</span>
                    HS Code search
                  </li>
                )}
                {tier.features.certificationsFilter && (
                  <li className="pricing-card__feature">
                    <span className="pricing-card__feature-icon">✅</span>
                    Certification filters
                  </li>
                )}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Feature Comparison Table */}
      <div className="pricing-page__comparison">
        <h2 className="pricing-page__comparison-title">Compare All Features</h2>
        
        <div className="pricing-page__table-wrapper">
          <table className="pricing-page__table">
            <thead>
              <tr>
                <th>Feature</th>
                {tiers.map((tier) => (
                  <th key={tier.id} className={tier.popular ? 'pricing-page__th--popular' : ''}>
                    {tier.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {featuresList.map((feature) => (
                <tr key={feature.key}>
                  <td className="pricing-page__feature-name">{feature.label}</td>
                  {tiers.map((tier) => (
                    <td 
                      key={tier.id} 
                      className={`pricing-page__feature-value ${tier.popular ? 'pricing-page__td--popular' : ''}`}
                    >
                      {feature.getValue(tier)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="pricing-page__faq">
        <h2 className="pricing-page__faq-title">Frequently Asked Questions</h2>
        
        <div className="pricing-page__faq-grid">
          <div className="pricing-page__faq-item">
            <h3>Can I change plans anytime?</h3>
            <p>Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate your billing.</p>
          </div>
          <div className="pricing-page__faq-item">
            <h3>Is there a free trial?</h3>
            <p>The Free plan lets you explore basic features forever. Paid plans come with a 7-day money-back guarantee.</p>
          </div>
          <div className="pricing-page__faq-item">
            <h3>What payment methods do you accept?</h3>
            <p>We accept all major credit cards, PayPal, and Shopify Billing for seamless integration with your store.</p>
          </div>
          <div className="pricing-page__faq-item">
            <h3>What's the difference between tiers?</h3>
            <p>Higher tiers unlock more searches, advanced filters like HS Code and certifications, and pro features like source visibility.</p>
          </div>
        </div>
      </div>

      <Footer />

      {/* Payment Provider Selection Modal */}
      {showPaymentModal && selectedTier && (
        <div className="payment-modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
            <button 
              className="payment-modal__close" 
              onClick={() => setShowPaymentModal(false)}
              aria-label="Close"
            >
              ×
            </button>
            
            <h2 className="payment-modal__title">
              Complete Your Upgrade
            </h2>
            
            <div className="payment-modal__plan">
              <span className="payment-modal__plan-name">
                {tiers.find(t => t.id === selectedTier)?.name}
              </span>
              <span className="payment-modal__plan-price">
                ${billingPeriod === 'yearly' 
                  ? Math.round((tiers.find(t => t.id === selectedTier)?.yearlyPrice || 0) / 12)
                  : tiers.find(t => t.id === selectedTier)?.price
                }/mo
              </span>
              <span className="payment-modal__plan-billing">
                Billed {billingPeriod}
              </span>
            </div>

            {error && (
              <div className="payment-modal__error">
                {error}
                <button onClick={clearError}>×</button>
              </div>
            )}

            <div className="payment-modal__providers">
              <h3>Select Payment Method</h3>
              
              <label className={`payment-modal__provider ${selectedProvider === 'stripe' ? 'payment-modal__provider--selected' : ''}`}>
                <input
                  type="radio"
                  name="provider"
                  value="stripe"
                  checked={selectedProvider === 'stripe'}
                  onChange={() => setSelectedProvider('stripe')}
                />
                <div className="payment-modal__provider-content">
                  <svg viewBox="0 0 60 25" width="60" height="25" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#635BFF" d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32c-1.14.8-2.84 1.22-4.79 1.22-4.33 0-6.73-2.75-6.73-7.08 0-3.97 2.17-7.14 6.22-7.14 4.05 0 6.2 3.14 6.2 7.08 0 .32 0 .67-.09 1zM53.42 9.06c-1.5 0-2.29 1.22-2.38 2.69h4.69c0-1.47-.71-2.69-2.31-2.69zM40.2 4.86v-.48h-4.42v15.68h4.42v-9.42c.53-1.01 1.68-1.64 3.04-1.64.49 0 1.06.06 1.43.19V5.1c-.37-.06-.74-.13-1.06-.13-1.43 0-2.82.8-3.41 1.89zM34.14 6.27v13.79h-4.42V6.27h4.42zm0-5.4v3.79h-4.42V.87h4.42zM21.42 6.27v1.01c-.93-.74-2.22-1.22-3.58-1.22-3.48 0-6.35 2.88-6.35 7.04 0 4.17 2.87 7.04 6.35 7.04 1.36 0 2.65-.48 3.58-1.22v1.01h4.33V6.27h-4.33zm0 7.68c-.46.93-1.5 1.53-2.61 1.53-1.81 0-2.96-1.38-2.96-3.38 0-1.99 1.15-3.38 2.96-3.38 1.11 0 2.15.6 2.61 1.53v3.7zM5.56 19.99c-.99.5-2.06.73-3.24.73C.86 20.72 0 19.86 0 18.4V6.27h4.42v10.28c0 .62.31.93.8.93.25 0 .56-.06.93-.25l-.59 2.76z"/>
                  </svg>
                  <span>Credit Card</span>
                  <small>Visa, Mastercard, Amex</small>
                </div>
              </label>

              <label className={`payment-modal__provider ${selectedProvider === 'paypal' ? 'payment-modal__provider--selected' : ''}`}>
                <input
                  type="radio"
                  name="provider"
                  value="paypal"
                  checked={selectedProvider === 'paypal'}
                  onChange={() => setSelectedProvider('paypal')}
                />
                <div className="payment-modal__provider-content">
                  <svg viewBox="0 0 100 26" width="80" height="22" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#003087" d="M12.237 3.093H5.413c-.456 0-.845.33-.917.78L1.953 21.04c-.053.334.206.635.545.635h3.257c.456 0 .845-.33.917-.78l.688-4.364c.072-.45.461-.78.917-.78h2.114c4.403 0 6.944-2.131 7.607-6.354.298-1.846.012-3.296-.85-4.312-.946-1.115-2.622-1.732-5.019-1.732"/>
                    <path fill="#009CDE" d="M37.752 3.093h-6.824c-.456 0-.845.33-.917.78l-2.543 16.167c-.053.334.206.635.545.635h3.496c.319 0 .591-.23.642-.546l.723-4.598c.072-.45.461-.78.917-.78h2.114c4.403 0 6.944-2.131 7.607-6.354.298-1.846.012-3.296-.85-4.312-.946-1.115-2.622-1.732-5.019-1.732"/>
                  </svg>
                  <span>PayPal</span>
                  <small>Pay with your PayPal account</small>
                </div>
              </label>
            </div>

            <button 
              className="payment-modal__checkout-btn"
              onClick={handleCheckout}
              disabled={isLoading}
            >
              {isLoading ? (
                <span>Processing...</span>
              ) : (
                <span>Continue to {selectedProvider === 'stripe' ? 'Checkout' : 'PayPal'}</span>
              )}
            </button>

            <p className="payment-modal__secure">
              🔒 Secure payment powered by {selectedProvider === 'stripe' ? 'Stripe' : 'PayPal'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

function formatSupport(level: string): string {
  const labels: Record<string, string> = {
    community: 'Community',
    email: 'Email',
    priority: 'Priority',
    dedicated: 'Dedicated Manager',
  };
  return labels[level] || level;
}

export default PricingPage;
