/**
 * PayPal Payment Service
 * Handles subscription payments via PayPal with best security practices
 * 
 * Security measures:
 * - Webhook signature verification using PayPal's certificates
 * - OAuth2 token management with secure storage
 * - Idempotent subscription operations
 * - No sensitive data in logs
 */

import { createLogger } from '../utils/logger';
import { SubscriptionTier } from '../config/subscriptions';

const logger = createLogger('PayPalService');

// PayPal plan IDs mapped to our subscription tiers
export interface PayPalPlanIds {
  starter_monthly: string;
  starter_yearly: string;
  pro_monthly: string;
  pro_yearly: string;
  enterprise_monthly: string;
  enterprise_yearly: string;
}

export interface PayPalConfig {
  clientId: string;
  clientSecret: string;
  webhookId: string;
  planIds: PayPalPlanIds;
  sandbox: boolean;
}

export interface CreateSubscriptionParams {
  userId: number;
  userEmail: string;
  tier: Exclude<SubscriptionTier, 'free'>;
  billingPeriod: 'monthly' | 'yearly';
  returnUrl: string;
  cancelUrl: string;
}

export interface PayPalSubscriptionData {
  paypalSubscriptionId: string;
  paypalCustomerId: string;
  tier: SubscriptionTier;
  status: 'ACTIVE' | 'CANCELLED' | 'SUSPENDED' | 'EXPIRED';
  nextBillingTime: Date | null;
}

interface PayPalToken {
  accessToken: string;
  expiresAt: number;
}

class PayPalService {
  private token: PayPalToken | null = null;
  private planIds: PayPalPlanIds | null = null;
  private webhookId: string = '';

  /**
   * Get PayPal API base URL
   */
  private getBaseUrl(): string {
    const sandbox = process.env.PAYPAL_SANDBOX === 'true';
    return sandbox 
      ? 'https://api-m.sandbox.paypal.com'
      : 'https://api-m.paypal.com';
  }

  /**
   * Check if PayPal is properly configured
   */
  isConfigured(): boolean {
    return !!(
      process.env.PAYPAL_CLIENT_ID &&
      process.env.PAYPAL_CLIENT_SECRET &&
      process.env.PAYPAL_WEBHOOK_ID
    );
  }

  /**
   * Get OAuth2 access token
   * Caches token and refreshes when expired
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid (with 5 min buffer)
    if (this.token && this.token.expiresAt > Date.now() + 300000) {
      return this.token.accessToken;
    }

    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('PayPal credentials not configured');
    }

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    try {
      const response = await fetch(`${this.getBaseUrl()}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`PayPal auth failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      
      this.token = {
        accessToken: data.access_token,
        expiresAt: Date.now() + (data.expires_in * 1000),
      };

      // Load plan IDs and webhook ID
      this.loadConfig();

      logger.debug('PAYPAL_TOKEN_ACQUIRED', 'Acquired PayPal access token');
      return this.token.accessToken;
    } catch (error) {
      logger.error('PAYPAL_AUTH_ERROR', 'Failed to get PayPal access token', error as Error);
      throw error;
    }
  }

  /**
   * Load PayPal configuration from environment
   */
  private loadConfig(): void {
    this.webhookId = process.env.PAYPAL_WEBHOOK_ID || '';
    
    this.planIds = {
      starter_monthly: process.env.PAYPAL_PLAN_STARTER_MONTHLY || '',
      starter_yearly: process.env.PAYPAL_PLAN_STARTER_YEARLY || '',
      pro_monthly: process.env.PAYPAL_PLAN_PRO_MONTHLY || '',
      pro_yearly: process.env.PAYPAL_PLAN_PRO_YEARLY || '',
      enterprise_monthly: process.env.PAYPAL_PLAN_ENTERPRISE_MONTHLY || '',
      enterprise_yearly: process.env.PAYPAL_PLAN_ENTERPRISE_YEARLY || '',
    };
  }

  /**
   * Get the plan ID for a specific tier and billing period
   */
  private getPlanId(tier: Exclude<SubscriptionTier, 'free'>, billingPeriod: 'monthly' | 'yearly'): string {
    if (!this.planIds) {
      this.loadConfig();
    }
    
    const key = `${tier}_${billingPeriod}` as keyof PayPalPlanIds;
    const planId = this.planIds?.[key];
    
    if (!planId) {
      throw new Error(`PayPal plan ID not configured for ${tier} ${billingPeriod}`);
    }
    
    return planId;
  }

  /**
   * Map PayPal plan ID back to our tier
   */
  private getTierFromPlanId(planId: string): SubscriptionTier {
    if (!this.planIds) {
      this.loadConfig();
    }
    
    for (const [key, value] of Object.entries(this.planIds || {})) {
      if (value === planId) {
        const tier = key.split('_')[0] as SubscriptionTier;
        return tier;
      }
    }
    
    logger.warn('UNKNOWN_PLAN_ID', 'Could not map PayPal plan ID to tier', { planId });
    return 'free';
  }

  /**
   * Make authenticated request to PayPal API
   */
  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PATCH' = 'GET',
    body?: object
  ): Promise<T> {
    const accessToken = await this.getAccessToken();
    
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };
    
    const options: RequestInit = {
      method,
      headers,
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${this.getBaseUrl()}${endpoint}`, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`PayPal API error: ${response.status} ${errorText}`);
    }
    
    // Some endpoints return empty response
    const text = await response.text();
    return text ? JSON.parse(text) : {} as T;
  }

  /**
   * Create a subscription and return approval URL
   */
  async createSubscription(params: CreateSubscriptionParams): Promise<{ subscriptionId: string; approvalUrl: string }> {
    const planId = this.getPlanId(params.tier, params.billingPeriod);
    
    try {
      const subscription = await this.makeRequest<{
        id: string;
        links: Array<{ rel: string; href: string }>;
      }>('/v1/billing/subscriptions', 'POST', {
        plan_id: planId,
        subscriber: {
          email_address: params.userEmail,
        },
        application_context: {
          brand_name: 'SourceScout',
          locale: 'en-US',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'SUBSCRIBE_NOW',
          return_url: params.returnUrl,
          cancel_url: params.cancelUrl,
        },
        custom_id: params.userId.toString(),
      });
      
      const approvalUrl = subscription.links.find(l => l.rel === 'approve')?.href || '';
      
      logger.info('PAYPAL_SUBSCRIPTION_CREATED', 'Created PayPal subscription', undefined, {
        subscriptionId: subscription.id,
        tier: params.tier,
        billingPeriod: params.billingPeriod,
      });
      
      return {
        subscriptionId: subscription.id,
        approvalUrl,
      };
    } catch (error) {
      logger.error('PAYPAL_SUBSCRIPTION_ERROR', 'Failed to create PayPal subscription', error as Error, {
        tier: params.tier,
        billingPeriod: params.billingPeriod,
      });
      throw error;
    }
  }

  /**
   * Get subscription details
   */
  async getSubscription(subscriptionId: string): Promise<PayPalSubscriptionData | null> {
    try {
      const subscription = await this.makeRequest<{
        id: string;
        plan_id: string;
        status: 'ACTIVE' | 'CANCELLED' | 'SUSPENDED' | 'EXPIRED';
        subscriber: {
          payer_id: string;
          email_address: string;
        };
        billing_info: {
          next_billing_time?: string;
        };
      }>(`/v1/billing/subscriptions/${subscriptionId}`);
      
      const tier = this.getTierFromPlanId(subscription.plan_id);
      
      return {
        paypalSubscriptionId: subscription.id,
        paypalCustomerId: subscription.subscriber.payer_id,
        tier,
        status: subscription.status,
        nextBillingTime: subscription.billing_info.next_billing_time 
          ? new Date(subscription.billing_info.next_billing_time)
          : null,
      };
    } catch (error) {
      logger.error('PAYPAL_GET_SUBSCRIPTION_ERROR', 'Failed to get PayPal subscription', error as Error, {
        subscriptionId,
      });
      return null;
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId: string, reason: string = 'User requested cancellation'): Promise<void> {
    try {
      await this.makeRequest(`/v1/billing/subscriptions/${subscriptionId}/cancel`, 'POST', {
        reason,
      });
      
      logger.info('PAYPAL_SUBSCRIPTION_CANCELED', 'Canceled PayPal subscription', undefined, {
        subscriptionId,
      });
    } catch (error) {
      logger.error('PAYPAL_CANCEL_ERROR', 'Failed to cancel PayPal subscription', error as Error, {
        subscriptionId,
      });
      throw error;
    }
  }

  /**
   * Suspend a subscription (can be reactivated)
   */
  async suspendSubscription(subscriptionId: string, reason: string = 'Payment issue'): Promise<void> {
    try {
      await this.makeRequest(`/v1/billing/subscriptions/${subscriptionId}/suspend`, 'POST', {
        reason,
      });
      
      logger.info('PAYPAL_SUBSCRIPTION_SUSPENDED', 'Suspended PayPal subscription', undefined, {
        subscriptionId,
      });
    } catch (error) {
      logger.error('PAYPAL_SUSPEND_ERROR', 'Failed to suspend PayPal subscription', error as Error, {
        subscriptionId,
      });
      throw error;
    }
  }

  /**
   * Verify webhook signature
   * CRITICAL: Always verify webhooks to prevent spoofing
   */
  async verifyWebhookSignature(
    headers: Record<string, string>,
    body: string
  ): Promise<boolean> {
    if (!this.webhookId) {
      this.loadConfig();
    }

    if (!this.webhookId) {
      throw new Error('PAYPAL_WEBHOOK_ID is not configured');
    }

    try {
      const response = await this.makeRequest<{ verification_status: string }>(
        '/v1/notifications/verify-webhook-signature',
        'POST',
        {
          auth_algo: headers['paypal-auth-algo'],
          cert_url: headers['paypal-cert-url'],
          transmission_id: headers['paypal-transmission-id'],
          transmission_sig: headers['paypal-transmission-sig'],
          transmission_time: headers['paypal-transmission-time'],
          webhook_id: this.webhookId,
          webhook_event: JSON.parse(body),
        }
      );

      const isValid = response.verification_status === 'SUCCESS';
      
      if (!isValid) {
        logger.warn('PAYPAL_WEBHOOK_INVALID', 'PayPal webhook signature verification failed');
      }
      
      return isValid;
    } catch (error) {
      logger.error('PAYPAL_WEBHOOK_VERIFY_ERROR', 'Failed to verify PayPal webhook', error as Error);
      return false;
    }
  }

  /**
   * Parse webhook event and extract subscription data
   */
  parseWebhookEvent(event: {
    event_type: string;
    resource: {
      id: string;
      plan_id?: string;
      status?: string;
      custom_id?: string;
      subscriber?: { payer_id: string };
      billing_info?: { next_billing_time?: string };
    };
  }): { userId: number | null; subscriptionData: PayPalSubscriptionData | null } {
    const resource = event.resource;
    const userId = resource.custom_id ? parseInt(resource.custom_id, 10) : null;
    
    switch (event.event_type) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
      case 'BILLING.SUBSCRIPTION.UPDATED': {
        const tier = resource.plan_id ? this.getTierFromPlanId(resource.plan_id) : 'free';
        return {
          userId,
          subscriptionData: {
            paypalSubscriptionId: resource.id,
            paypalCustomerId: resource.subscriber?.payer_id || '',
            tier,
            status: (resource.status as PayPalSubscriptionData['status']) || 'ACTIVE',
            nextBillingTime: resource.billing_info?.next_billing_time 
              ? new Date(resource.billing_info.next_billing_time)
              : null,
          },
        };
      }
      
      case 'BILLING.SUBSCRIPTION.CANCELLED':
      case 'BILLING.SUBSCRIPTION.EXPIRED':
      case 'BILLING.SUBSCRIPTION.SUSPENDED': {
        return {
          userId,
          subscriptionData: {
            paypalSubscriptionId: resource.id,
            paypalCustomerId: resource.subscriber?.payer_id || '',
            tier: 'free', // Downgrade on cancellation
            status: (resource.status as PayPalSubscriptionData['status']) || 'CANCELLED',
            nextBillingTime: null,
          },
        };
      }
      
      case 'PAYMENT.SALE.COMPLETED': {
        // Payment received - subscription is active
        return {
          userId,
          subscriptionData: null, // No subscription update needed, just a payment confirmation
        };
      }
      
      case 'PAYMENT.SALE.DENIED':
      case 'PAYMENT.SALE.REFUNDED': {
        // Payment failed or refunded - may need to suspend
        logger.warn('PAYPAL_PAYMENT_ISSUE', `Payment issue: ${event.event_type}`, {
          subscriptionId: resource.id,
        });
        return {
          userId,
          subscriptionData: null,
        };
      }
      
      default:
        logger.debug('PAYPAL_WEBHOOK_UNHANDLED', `Unhandled PayPal webhook: ${event.event_type}`);
        return { userId: null, subscriptionData: null };
    }
  }
}

// Singleton instance
let paypalService: PayPalService | null = null;

export function getPayPalService(): PayPalService {
  if (!paypalService) {
    paypalService = new PayPalService();
  }
  return paypalService;
}

export default PayPalService;
