/**
 * PaymentSuccessPage Component
 * Handles successful payment redirects from Stripe and PayPal
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePayments } from '../hooks/usePayments';
import useAppStore from '../store/appStore';
import { getTierConfig } from '../config/subscriptions';
import '../styles/pages.css';

const PaymentSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  
  const { capturePayPalSubscription, getSubscriptionStatus } = usePayments();
  const subscription = useAppStore((state) => state.subscription);

  useEffect(() => {
    const processPayment = async () => {
      // Check for Stripe success
      const sessionId = searchParams.get('session_id');
      if (sessionId) {
        // Stripe webhook will handle the subscription update
        // Just refresh the subscription status
        try {
          await getSubscriptionStatus();
          setStatus('success');
          setMessage('Your subscription has been activated!');
        } catch {
          // Might take a moment for webhook to process
          setTimeout(async () => {
            await getSubscriptionStatus();
            setStatus('success');
            setMessage('Your subscription has been activated!');
          }, 2000);
        }
        return;
      }

      // Check for PayPal success
      const paypalSubscriptionId = searchParams.get('paypal_subscription_id');
      if (paypalSubscriptionId) {
        const result = await capturePayPalSubscription(paypalSubscriptionId);
        if (result.success) {
          setStatus('success');
          setMessage(result.message || 'Your subscription has been activated!');
        } else {
          setStatus('error');
          setMessage(result.message || 'Failed to activate subscription');
        }
        return;
      }

      // No valid params
      setStatus('error');
      setMessage('Invalid payment session');
    };

    processPayment();
  }, [searchParams, capturePayPalSubscription, getSubscriptionStatus]);

  const tierConfig = getTierConfig(subscription.tier);

  return (
    <div className="payment-success-page">
      <div className="payment-success-page__container">
        {status === 'loading' && (
          <div className="payment-success-page__loading">
            <div className="payment-success-page__spinner"></div>
            <h2>Processing your payment...</h2>
            <p>Please wait while we activate your subscription.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="payment-success-page__success">
            <div className="payment-success-page__icon payment-success-page__icon--success">
              <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            
            <h1>Welcome to {tierConfig.name}!</h1>
            <p className="payment-success-page__message">{message}</p>
            
            <div className="payment-success-page__features">
              <h3>Your new benefits:</h3>
              <ul>
                <li>✓ {tierConfig.limits.searchesPerMonth === -1 ? 'Unlimited' : tierConfig.limits.searchesPerMonth} searches per month</li>
                <li>✓ {tierConfig.limits.resultsPerSearch} results per search</li>
                {tierConfig.features.allSources && <li>✓ Access to all supplier sources</li>}
                {tierConfig.features.showSourceNames && <li>✓ Full source visibility</li>}
                {tierConfig.features.bossMode && <li>✓ Boss Mode AI-enhanced search</li>}
                {tierConfig.features.exportCsv && <li>✓ CSV export</li>}
              </ul>
            </div>

            <div className="payment-success-page__actions">
              <button 
                className="payment-success-page__btn payment-success-page__btn--primary"
                onClick={() => navigate('/search')}
              >
                Start Searching
              </button>
              <button 
                className="payment-success-page__btn payment-success-page__btn--secondary"
                onClick={() => navigate('/account')}
              >
                View Account
              </button>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="payment-success-page__error">
            <div className="payment-success-page__icon payment-success-page__icon--error">
              <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            
            <h1>Payment Issue</h1>
            <p className="payment-success-page__message">{message}</p>
            
            <div className="payment-success-page__actions">
              <button 
                className="payment-success-page__btn payment-success-page__btn--primary"
                onClick={() => navigate('/pricing')}
              >
                Try Again
              </button>
              <button 
                className="payment-success-page__btn payment-success-page__btn--secondary"
                onClick={() => navigate('/support')}
              >
                Contact Support
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
