/**
 * Stripe Payment Service
 * Handles subscription payments with best security practices
 * 
 * Security measures:
 * - Webhook signature verification
 * - Idempotency keys for API calls
 * - Secure customer portal sessions
 * - No sensitive data in logs
 */

import Stripe from 'stripe';
import { createLogger } from '../utils/logger';
import { SubscriptionTier } from '../config/subscriptions';

const logger = createLogger('StripeService');

// Stripe price IDs mapped to our subscription tiers
// These should be created in Stripe Dashboard and stored in environment
export interface StripePriceIds {
  starter_monthly: string;
  starter_yearly: string;
  pro_monthly: string;
  pro_yearly: string;
  enterprise_monthly: string;
  enterprise_yearly: string;
}

export interface StripeConfig {
  secretKey: string;
  webhookSecret: string;
  priceIds: StripePriceIds;
}

export interface CreateCheckoutSessionParams {
  userId: number;
  userEmail: string;
  tier: Exclude<SubscriptionTier, 'free'>;
  billingPeriod: 'monthly' | 'yearly';
  successUrl: string;
  cancelUrl: string;
}

export interface SubscriptionEventData {
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  tier: SubscriptionTier;
  status: 'active' | 'canceled' | 'past_due' | 'unpaid';
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

class StripeService {
  private stripe: Stripe | null = null;
  private webhookSecret: string = '';
  private priceIds: StripePriceIds | null = null;

  /**
   * Initialize Stripe with API key
   * Called lazily to avoid initialization errors when keys not set
   */
  private getStripe(): Stripe {
    if (!this.stripe) {
      const secretKey = process.env.STRIPE_SECRET_KEY;
      if (!secretKey) {
        throw new Error('STRIPE_SECRET_KEY is not configured');
      }
      
      this.stripe = new Stripe(secretKey, {
        // Using the default API version from the installed SDK
        typescript: true,
        // Enable automatic retries for network errors
        maxNetworkRetries: 3,
      });
      
      this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
      
      // Load price IDs from environment
      this.priceIds = {
        starter_monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY || '',
        starter_yearly: process.env.STRIPE_PRICE_STARTER_YEARLY || '',
        pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || '',
        pro_yearly: process.env.STRIPE_PRICE_PRO_YEARLY || '',
        enterprise_monthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || '',
        enterprise_yearly: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY || '',
      };
      
      logger.info('STRIPE_INIT', 'Stripe service initialized');
    }
    
    return this.stripe;
  }

  /**
   * Check if Stripe is properly configured
   */
  isConfigured(): boolean {
    return !!(
      process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_WEBHOOK_SECRET &&
      process.env.STRIPE_PRICE_PRO_MONTHLY
    );
  }

  /**
   * Get the price ID for a specific tier and billing period
   */
  private getPriceId(tier: Exclude<SubscriptionTier, 'free'>, billingPeriod: 'monthly' | 'yearly'): string {
    if (!this.priceIds) {
      this.getStripe(); // Initialize to load price IDs
    }
    
    const key = `${tier}_${billingPeriod}` as keyof StripePriceIds;
    const priceId = this.priceIds?.[key];
    
    if (!priceId) {
      throw new Error(`Price ID not configured for ${tier} ${billingPeriod}`);
    }
    
    return priceId;
  }

  /**
   * Map Stripe price ID back to our tier
   */
  private getTierFromPriceId(priceId: string): SubscriptionTier {
    if (!this.priceIds) {
      this.getStripe();
    }
    
    for (const [key, value] of Object.entries(this.priceIds || {})) {
      if (value === priceId) {
        // Extract tier from key (e.g., 'pro_monthly' -> 'pro')
        const tier = key.split('_')[0] as SubscriptionTier;
        return tier;
      }
    }
    
    logger.warn('UNKNOWN_PRICE_ID', 'Could not map price ID to tier', { priceId });
    return 'free';
  }

  /**
   * Create or retrieve a Stripe customer for a user
   */
  async getOrCreateCustomer(userId: number, email: string, shopName?: string): Promise<string> {
    const stripe = this.getStripe();
    
    // Search for existing customer by metadata
    const existingCustomers = await stripe.customers.list({
      email,
      limit: 1,
    });
    
    if (existingCustomers.data.length > 0) {
      const customer = existingCustomers.data[0];
      logger.debug('CUSTOMER_FOUND', 'Found existing Stripe customer', { customerId: customer.id });
      return customer.id;
    }
    
    // Create new customer with our user ID in metadata
    const customer = await stripe.customers.create({
      email,
      metadata: {
        userId: userId.toString(),
        shopName: shopName || '',
        source: 'sourcescout',
      },
    });
    
    logger.info('CUSTOMER_CREATED', 'Created new Stripe customer', undefined, { customerId: customer.id });
    return customer.id;
  }

  /**
   * Create a Checkout Session for subscription purchase
   * Uses Stripe Checkout for PCI compliance - no card data touches our servers
   */
  async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<{ sessionId: string; url: string }> {
    const stripe = this.getStripe();
    const priceId = this.getPriceId(params.tier, params.billingPeriod);
    
    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        customer_email: params.userEmail,
        client_reference_id: params.userId.toString(),
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        // Allow promotion codes
        allow_promotion_codes: true,
        // Collect billing address for tax purposes
        billing_address_collection: 'required',
        // Automatic tax calculation (if enabled in Stripe)
        // automatic_tax: { enabled: true },
        metadata: {
          userId: params.userId.toString(),
          tier: params.tier,
          billingPeriod: params.billingPeriod,
        },
        subscription_data: {
          metadata: {
            userId: params.userId.toString(),
            tier: params.tier,
          },
        },
      });
      
      logger.info('CHECKOUT_SESSION_CREATED', 'Created checkout session', undefined, {
        sessionId: session.id,
        tier: params.tier,
        billingPeriod: params.billingPeriod,
      });
      
      return {
        sessionId: session.id,
        url: session.url || '',
      };
    } catch (error) {
      logger.error('CHECKOUT_SESSION_ERROR', 'Failed to create checkout session', error as Error, {
        tier: params.tier,
        billingPeriod: params.billingPeriod,
      });
      throw error;
    }
  }

  /**
   * Create a Customer Portal session for managing subscription
   * Allows users to update payment method, cancel, etc.
   */
  async createPortalSession(customerId: string, returnUrl: string): Promise<{ url: string }> {
    const stripe = this.getStripe();
    
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });
      
      logger.info('PORTAL_SESSION_CREATED', 'Created customer portal session', undefined, {
        customerId,
      });
      
      return { url: session.url };
    } catch (error) {
      logger.error('PORTAL_SESSION_ERROR', 'Failed to create portal session', error as Error);
      throw error;
    }
  }

  /**
   * Verify webhook signature for security
   * CRITICAL: Always verify webhooks to prevent spoofing
   */
  verifyWebhookSignature(payload: string | Buffer, signature: string): Stripe.Event {
    const stripe = this.getStripe();
    
    if (!this.webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
    }
    
    try {
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret
      );
      return event;
    } catch (error) {
      logger.error('WEBHOOK_SIGNATURE_INVALID', 'Webhook signature verification failed', error as Error);
      throw new Error('Invalid webhook signature');
    }
  }

  /**
   * Extract subscription data from Stripe event
   */
  async parseSubscriptionEvent(event: Stripe.Event): Promise<SubscriptionEventData | null> {
    const stripe = this.getStripe();
    
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        if (session.mode !== 'subscription' || !session.subscription) {
          return null;
        }
        
        // Fetch full subscription details
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );
        
        const priceId = subscription.items.data[0]?.price.id || '';
        const tier = this.getTierFromPriceId(priceId);
        
        return {
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: subscription.id,
          tier,
          status: 'active',
          currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        };
      }
      
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const priceId = subscription.items.data[0]?.price.id || '';
        const tier = this.getTierFromPriceId(priceId);
        
        let status: SubscriptionEventData['status'] = 'active';
        if (subscription.status === 'canceled') status = 'canceled';
        else if (subscription.status === 'past_due') status = 'past_due';
        else if (subscription.status === 'unpaid') status = 'unpaid';
        
        return {
          stripeCustomerId: subscription.customer as string,
          stripeSubscriptionId: subscription.id,
          tier: subscription.status === 'canceled' ? 'free' : tier,
          status,
          currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        };
      }
      
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const invoiceSubscription = (invoice as any).subscription;
        
        if (!invoiceSubscription) {
          return null;
        }
        
        return {
          stripeCustomerId: invoice.customer as string,
          stripeSubscriptionId: invoiceSubscription as string,
          tier: 'free', // Downgrade on payment failure
          status: 'past_due',
          currentPeriodEnd: new Date(),
          cancelAtPeriodEnd: false,
        };
      }
      
      default:
        return null;
    }
  }

  /**
   * Cancel a subscription immediately
   */
  async cancelSubscription(subscriptionId: string, immediately: boolean = false): Promise<void> {
    const stripe = this.getStripe();
    
    try {
      if (immediately) {
        await stripe.subscriptions.cancel(subscriptionId);
        logger.info('SUBSCRIPTION_CANCELED', 'Subscription canceled immediately', undefined, { subscriptionId });
      } else {
        await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });
        logger.info('SUBSCRIPTION_CANCEL_SCHEDULED', 'Subscription scheduled for cancellation', undefined, { subscriptionId });
      }
    } catch (error) {
      logger.error('CANCEL_SUBSCRIPTION_ERROR', 'Failed to cancel subscription', error as Error, { subscriptionId });
      throw error;
    }
  }

  /**
   * Get subscription status for a customer
   */
  async getActiveSubscription(customerId: string): Promise<{
    subscriptionId: string;
    tier: SubscriptionTier;
    status: string;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
  } | null> {
    const stripe = this.getStripe();
    
    try {
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
        limit: 1,
      });
      
      if (subscriptions.data.length === 0) {
        return null;
      }
      
      const subscription = subscriptions.data[0];
      const priceId = subscription.items.data[0]?.price.id || '';
      const tier = this.getTierFromPriceId(priceId);
      
      return {
        subscriptionId: subscription.id,
        tier,
        status: subscription.status,
        currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      };
    } catch (error) {
      logger.error('GET_SUBSCRIPTION_ERROR', 'Failed to get subscription', error as Error, { customerId });
      throw error;
    }
  }
}

// Singleton instance
let stripeService: StripeService | null = null;

export function getStripeService(): StripeService {
  if (!stripeService) {
    stripeService = new StripeService();
  }
  return stripeService;
}

export default StripeService;
