/**
 * usePayments Hook
 * Handles payment operations for Stripe and PayPal subscriptions
 */

import { useState, useCallback } from 'react';
import api from '../store/api';
import useAppStore from '../store/appStore';
import { SubscriptionTier, getTierConfig } from '../config/subscriptions';

export type PaymentProvider = 'stripe' | 'paypal';

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  tierConfig: ReturnType<typeof getTierConfig>;
  status: 'active' | 'canceled' | 'past_due' | 'unpaid';
  provider: PaymentProvider | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  hasActiveSubscription: boolean;
}

export interface CheckoutParams {
  tier: Exclude<SubscriptionTier, 'free'>;
  billingPeriod: 'monthly' | 'yearly';
  provider: PaymentProvider;
}

export function usePayments() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setSubscriptionTier = useAppStore((state) => state.setSubscriptionTier);

  /**
   * Initiate checkout with Stripe
   */
  const checkoutWithStripe = useCallback(async (
    tier: Exclude<SubscriptionTier, 'free'>,
    billingPeriod: 'monthly' | 'yearly'
  ): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post<{ sessionId: string; url: string }>(
        '/api/v1/payments/stripe/create-checkout',
        { tier, billingPeriod }
      );

      // Redirect to Stripe Checkout
      if (response.data.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start checkout';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Initiate checkout with PayPal
   */
  const checkoutWithPayPal = useCallback(async (
    tier: Exclude<SubscriptionTier, 'free'>,
    billingPeriod: 'monthly' | 'yearly'
  ): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post<{ subscriptionId: string; approvalUrl: string }>(
        '/api/v1/payments/paypal/create-subscription',
        { tier, billingPeriod }
      );

      // Redirect to PayPal for approval
      if (response.data.approvalUrl) {
        window.location.href = response.data.approvalUrl;
      } else {
        throw new Error('No approval URL returned');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start checkout';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Generic checkout function that routes to the correct provider
   */
  const checkout = useCallback(async (params: CheckoutParams): Promise<void> => {
    if (params.provider === 'stripe') {
      await checkoutWithStripe(params.tier, params.billingPeriod);
    } else {
      await checkoutWithPayPal(params.tier, params.billingPeriod);
    }
  }, [checkoutWithStripe, checkoutWithPayPal]);

  /**
   * Capture PayPal subscription after user approval
   */
  const capturePayPalSubscription = useCallback(async (subscriptionId: string): Promise<{
    success: boolean;
    tier?: SubscriptionTier;
    message?: string;
  }> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post<{ success: boolean; tier: SubscriptionTier; message: string }>(
        '/api/v1/payments/paypal/capture',
        { subscriptionId }
      );

      if (response.data.success) {
        // Update local subscription state
        setSubscriptionTier(response.data.tier);
      }

      return response.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to activate subscription';
      setError(message);
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  }, [setSubscriptionTier]);

  /**
   * Open Stripe Customer Portal for subscription management
   */
  const openCustomerPortal = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post<{ url: string }>(
        '/api/v1/payments/stripe/create-portal'
      );

      if (response.data.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error('No portal URL returned');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to open portal';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get current subscription status
   */
  const getSubscriptionStatus = useCallback(async (): Promise<SubscriptionStatus | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.get<SubscriptionStatus>('/api/v1/payments/subscription');
      
      // Update local store with subscription data
      if (response.data.tier) {
        setSubscriptionTier(response.data.tier);
      }

      return response.data;
    } catch (err) {
      // Not an error if user has no subscription
      console.log('No subscription found or not logged in');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [setSubscriptionTier]);

  /**
   * Cancel subscription
   */
  const cancelSubscription = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post<{ success: boolean; message: string }>(
        '/api/v1/payments/cancel'
      );

      if (response.data.success) {
        // Refresh subscription status
        await getSubscriptionStatus();
      }

      return response.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel subscription';
      setError(message);
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  }, [getSubscriptionStatus]);

  return {
    // State
    isLoading,
    error,
    
    // Checkout functions
    checkout,
    checkoutWithStripe,
    checkoutWithPayPal,
    
    // PayPal-specific
    capturePayPalSubscription,
    
    // Subscription management
    getSubscriptionStatus,
    openCustomerPortal,
    cancelSubscription,
    
    // Utility
    clearError: () => setError(null),
  };
}

export default usePayments;
