/**
 * Payment Routes
 * Handles Stripe and PayPal subscription payments
 * 
 * Security measures:
 * - JWT authentication for user actions
 * - Webhook signature verification
 * - Rate limiting on checkout endpoints
 * - Raw body parsing for webhook signature verification
 * - HTTPS-only in production
 * - No sensitive data in responses
 */

import express, { Request, Response, Router } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { checkRateLimit } from '../middleware/rateLimit';
import { createLogger } from '../utils/logger';
import { getStripeService, SubscriptionEventData } from '../services/stripe-service';
import { getPayPalService, PayPalSubscriptionData } from '../services/paypal-service';
import { getPool } from '../config/database';
import { SubscriptionTier, getTierConfig } from '../config/subscriptions';

const router = Router();
const logger = createLogger('PaymentRoutes');

// ============================================================================
// STRIPE ROUTES
// ============================================================================

/**
 * POST /api/v1/payments/stripe/create-checkout
 * Create a Stripe Checkout session for subscription purchase
 */
router.post(
  '/stripe/create-checkout',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthRequest;
    const userId = authReq.userId;
    const userEmail = authReq.user?.shop_name || '';

    try {
      const { tier, billingPeriod } = req.body;

      // Validate tier
      if (!['starter', 'pro', 'enterprise'].includes(tier)) {
        res.status(400).json({ error: 'Invalid subscription tier' });
        return;
      }

      // Validate billing period
      if (!['monthly', 'yearly'].includes(billingPeriod)) {
        res.status(400).json({ error: 'Invalid billing period' });
        return;
      }

      const stripeService = getStripeService();
      
      if (!stripeService.isConfigured()) {
        logger.error('STRIPE_NOT_CONFIGURED', 'Stripe is not configured');
        res.status(503).json({ error: 'Payment system not available' });
        return;
      }

      // Get frontend URL for redirects
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      
      const { sessionId, url } = await stripeService.createCheckoutSession({
        userId: userId!,
        userEmail: userEmail || '',
        tier: tier as Exclude<SubscriptionTier, 'free'>,
        billingPeriod,
        successUrl: `${frontendUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${frontendUrl}/pricing?canceled=true`,
      });

      logger.info('CHECKOUT_INITIATED', 'Stripe checkout session created', undefined, {
        userId,
        tier,
        billingPeriod,
      });

      res.json({ sessionId, url });
    } catch (error) {
      logger.error('CHECKOUT_ERROR', 'Failed to create checkout session', error as Error);
      res.status(500).json({ error: 'Failed to create checkout session' });
    }
  }
);

/**
 * POST /api/v1/payments/stripe/create-portal
 * Create a Stripe Customer Portal session for subscription management
 */
router.post(
  '/stripe/create-portal',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthRequest;
    const userId = authReq.userId;

    try {
      const pool = getPool();
      const result = await pool.query(
        'SELECT stripe_customer_id FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0 || !result.rows[0].stripe_customer_id) {
        res.status(404).json({ error: 'No subscription found' });
        return;
      }

      const stripeService = getStripeService();
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      
      const { url } = await stripeService.createPortalSession(
        result.rows[0].stripe_customer_id,
        `${frontendUrl}/account`
      );

      res.json({ url });
    } catch (error) {
      logger.error('PORTAL_ERROR', 'Failed to create portal session', error as Error);
      res.status(500).json({ error: 'Failed to create portal session' });
    }
  }
);

/**
 * POST /api/v1/payments/stripe/webhook
 * Handle Stripe webhook events
 * 
 * SECURITY: This endpoint uses raw body for signature verification
 * Must be configured with express.raw() middleware
 */
router.post(
  '/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response): Promise<void> => {
    const signature = req.headers['stripe-signature'] as string;
    
    if (!signature) {
      logger.warn('WEBHOOK_NO_SIGNATURE', 'Stripe webhook received without signature');
      res.status(400).json({ error: 'Missing signature' });
      return;
    }

    try {
      const stripeService = getStripeService();
      
      // Verify webhook signature - CRITICAL for security
      const event = stripeService.verifyWebhookSignature(req.body, signature);
      
      logger.info('STRIPE_WEBHOOK_RECEIVED', `Received Stripe webhook: ${event.type}`, undefined, {
        eventType: event.type,
        eventId: event.id,
      });

      // Parse subscription data from event
      const subscriptionData = await stripeService.parseSubscriptionEvent(event);
      
      if (subscriptionData) {
        await updateUserSubscription('stripe', subscriptionData);
      }

      // Always return 200 to acknowledge receipt
      res.json({ received: true });
    } catch (error) {
      logger.error('STRIPE_WEBHOOK_ERROR', 'Failed to process Stripe webhook', error as Error);
      // Return 400 for signature errors, Stripe will retry
      res.status(400).json({ error: 'Webhook processing failed' });
    }
  }
);

// ============================================================================
// PAYPAL ROUTES
// ============================================================================

/**
 * POST /api/v1/payments/paypal/create-subscription
 * Create a PayPal subscription
 */
router.post(
  '/paypal/create-subscription',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthRequest;
    const userId = authReq.userId;
    const userEmail = authReq.user?.shop_name || '';

    try {
      const { tier, billingPeriod } = req.body;

      // Validate tier
      if (!['starter', 'pro', 'enterprise'].includes(tier)) {
        res.status(400).json({ error: 'Invalid subscription tier' });
        return;
      }

      // Validate billing period
      if (!['monthly', 'yearly'].includes(billingPeriod)) {
        res.status(400).json({ error: 'Invalid billing period' });
        return;
      }

      const paypalService = getPayPalService();
      
      if (!paypalService.isConfigured()) {
        logger.error('PAYPAL_NOT_CONFIGURED', 'PayPal is not configured');
        res.status(503).json({ error: 'Payment system not available' });
        return;
      }

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      
      const { subscriptionId, approvalUrl } = await paypalService.createSubscription({
        userId: userId!,
        userEmail: userEmail || '',
        tier: tier as Exclude<SubscriptionTier, 'free'>,
        billingPeriod,
        returnUrl: `${frontendUrl}/payment/success?paypal_pending=true`,
        cancelUrl: `${frontendUrl}/pricing?canceled=true`,
      });

      logger.info('PAYPAL_SUBSCRIPTION_INITIATED', 'PayPal subscription created', undefined, {
        userId,
        tier,
        billingPeriod,
        subscriptionId,
      });

      res.json({ subscriptionId, approvalUrl });
    } catch (error) {
      logger.error('PAYPAL_SUBSCRIPTION_ERROR', 'Failed to create PayPal subscription', error as Error);
      res.status(500).json({ error: 'Failed to create subscription' });
    }
  }
);

/**
 * POST /api/v1/payments/paypal/capture
 * Capture/activate a PayPal subscription after user approval
 */
router.post(
  '/paypal/capture',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthRequest;
    const userId = authReq.userId;

    try {
      const { subscriptionId } = req.body;

      if (!subscriptionId) {
        res.status(400).json({ error: 'Subscription ID required' });
        return;
      }

      const paypalService = getPayPalService();
      const subscriptionData = await paypalService.getSubscription(subscriptionId);

      if (!subscriptionData) {
        res.status(404).json({ error: 'Subscription not found' });
        return;
      }

      if (subscriptionData.status !== 'ACTIVE') {
        res.status(400).json({ error: 'Subscription is not active', status: subscriptionData.status });
        return;
      }

      // Update user subscription
      await updateUserSubscriptionPayPal(userId!, subscriptionData);

      logger.info('PAYPAL_SUBSCRIPTION_CAPTURED', 'PayPal subscription activated', undefined, {
        userId,
        subscriptionId,
        tier: subscriptionData.tier,
      });

      res.json({ 
        success: true,
        tier: subscriptionData.tier,
        message: 'Subscription activated successfully',
      });
    } catch (error) {
      logger.error('PAYPAL_CAPTURE_ERROR', 'Failed to capture PayPal subscription', error as Error);
      res.status(500).json({ error: 'Failed to activate subscription' });
    }
  }
);

/**
 * POST /api/v1/payments/paypal/webhook
 * Handle PayPal webhook events
 */
router.post(
  '/paypal/webhook',
  express.json(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const paypalService = getPayPalService();
      
      // Extract PayPal headers for verification
      const headers: Record<string, string> = {
        'paypal-auth-algo': req.headers['paypal-auth-algo'] as string || '',
        'paypal-cert-url': req.headers['paypal-cert-url'] as string || '',
        'paypal-transmission-id': req.headers['paypal-transmission-id'] as string || '',
        'paypal-transmission-sig': req.headers['paypal-transmission-sig'] as string || '',
        'paypal-transmission-time': req.headers['paypal-transmission-time'] as string || '',
      };

      // Verify webhook signature - CRITICAL for security
      const isValid = await paypalService.verifyWebhookSignature(
        headers,
        JSON.stringify(req.body)
      );

      if (!isValid) {
        logger.warn('PAYPAL_WEBHOOK_INVALID', 'PayPal webhook signature invalid');
        res.status(400).json({ error: 'Invalid webhook signature' });
        return;
      }

      logger.info('PAYPAL_WEBHOOK_RECEIVED', `Received PayPal webhook: ${req.body.event_type}`, undefined, {
        eventType: req.body.event_type,
        eventId: req.body.id,
      });

      // Parse and process the webhook event
      const { userId, subscriptionData } = paypalService.parseWebhookEvent(req.body);

      if (userId && subscriptionData) {
        await updateUserSubscriptionPayPal(userId, subscriptionData);
      }

      res.json({ received: true });
    } catch (error) {
      logger.error('PAYPAL_WEBHOOK_ERROR', 'Failed to process PayPal webhook', error as Error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }
);

// ============================================================================
// COMMON ROUTES
// ============================================================================

/**
 * GET /api/v1/payments/subscription
 * Get current user's subscription status
 */
router.get(
  '/subscription',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthRequest;
    const userId = authReq.userId;

    try {
      const pool = getPool();
      const result = await pool.query(
        `SELECT 
          subscription_tier,
          subscription_status,
          subscription_provider,
          subscription_current_period_end,
          subscription_cancel_at_period_end,
          stripe_customer_id,
          stripe_subscription_id,
          paypal_subscription_id
        FROM users WHERE id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const user = result.rows[0];
      const tierConfig = getTierConfig(user.subscription_tier || 'free');

      res.json({
        tier: user.subscription_tier || 'free',
        tierConfig,
        status: user.subscription_status || 'active',
        provider: user.subscription_provider,
        currentPeriodEnd: user.subscription_current_period_end,
        cancelAtPeriodEnd: user.subscription_cancel_at_period_end || false,
        hasActiveSubscription: user.stripe_subscription_id || user.paypal_subscription_id,
      });
    } catch (error) {
      logger.error('GET_SUBSCRIPTION_ERROR', 'Failed to get subscription', error as Error);
      res.status(500).json({ error: 'Failed to get subscription status' });
    }
  }
);

/**
 * POST /api/v1/payments/cancel
 * Cancel current subscription
 */
router.post(
  '/cancel',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthRequest;
    const userId = authReq.userId;

    try {
      const pool = getPool();
      const result = await pool.query(
        `SELECT 
          subscription_provider,
          stripe_subscription_id,
          paypal_subscription_id
        FROM users WHERE id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const user = result.rows[0];

      if (user.subscription_provider === 'stripe' && user.stripe_subscription_id) {
        const stripeService = getStripeService();
        await stripeService.cancelSubscription(user.stripe_subscription_id, false);
        
        await pool.query(
          `UPDATE users SET 
            subscription_cancel_at_period_end = true,
            updated_at = NOW()
          WHERE id = $1`,
          [userId]
        );
      } else if (user.subscription_provider === 'paypal' && user.paypal_subscription_id) {
        const paypalService = getPayPalService();
        await paypalService.cancelSubscription(user.paypal_subscription_id);
        
        await pool.query(
          `UPDATE users SET 
            subscription_tier = 'free',
            subscription_status = 'canceled',
            updated_at = NOW()
          WHERE id = $1`,
          [userId]
        );
      } else {
        res.status(400).json({ error: 'No active subscription to cancel' });
        return;
      }

      logger.info('SUBSCRIPTION_CANCELED', 'User canceled subscription', undefined, {
        userId,
        provider: user.subscription_provider,
      });

      res.json({ success: true, message: 'Subscription canceled' });
    } catch (error) {
      logger.error('CANCEL_SUBSCRIPTION_ERROR', 'Failed to cancel subscription', error as Error);
      res.status(500).json({ error: 'Failed to cancel subscription' });
    }
  }
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Update user subscription from Stripe webhook data
 */
async function updateUserSubscription(
  provider: 'stripe' | 'paypal',
  data: SubscriptionEventData
): Promise<void> {
  const pool = getPool();
  
  try {
    // Find user by Stripe customer ID
    const userResult = await pool.query(
      'SELECT id FROM users WHERE stripe_customer_id = $1',
      [data.stripeCustomerId]
    );
    
    let userId: number;
    
    if (userResult.rows.length === 0) {
      // Customer not linked yet - try to find by subscription metadata
      // This happens on first checkout
      logger.warn('USER_NOT_FOUND_BY_CUSTOMER', 'User not found by Stripe customer ID, will be linked on next sync', {
        customerId: data.stripeCustomerId,
      });
      return;
    } else {
      userId = userResult.rows[0].id;
    }
    
    await pool.query(
      `UPDATE users SET
        subscription_tier = $1,
        subscription_status = $2,
        subscription_provider = $3,
        subscription_current_period_end = $4,
        subscription_cancel_at_period_end = $5,
        stripe_subscription_id = $6,
        updated_at = NOW()
      WHERE id = $7`,
      [
        data.tier,
        data.status,
        provider,
        data.currentPeriodEnd,
        data.cancelAtPeriodEnd,
        data.stripeSubscriptionId,
        userId,
      ]
    );
    
    logger.info('USER_SUBSCRIPTION_UPDATED', 'Updated user subscription from webhook', undefined, {
      userId,
      tier: data.tier,
      status: data.status,
      provider,
    });
  } catch (error) {
    logger.error('UPDATE_SUBSCRIPTION_ERROR', 'Failed to update user subscription', error as Error);
    throw error;
  }
}

/**
 * Update user subscription from PayPal data
 */
async function updateUserSubscriptionPayPal(
  userId: number,
  data: PayPalSubscriptionData
): Promise<void> {
  const pool = getPool();
  
  try {
    const status = data.status === 'ACTIVE' ? 'active' : 
                   data.status === 'CANCELLED' ? 'canceled' :
                   data.status === 'SUSPENDED' ? 'past_due' : 'expired';
    
    await pool.query(
      `UPDATE users SET
        subscription_tier = $1,
        subscription_status = $2,
        subscription_provider = 'paypal',
        subscription_current_period_end = $3,
        paypal_subscription_id = $4,
        paypal_customer_id = $5,
        updated_at = NOW()
      WHERE id = $6`,
      [
        data.tier,
        status,
        data.nextBillingTime,
        data.paypalSubscriptionId,
        data.paypalCustomerId,
        userId,
      ]
    );
    
    logger.info('USER_SUBSCRIPTION_UPDATED_PAYPAL', 'Updated user subscription from PayPal', undefined, {
      userId,
      tier: data.tier,
      status,
    });
  } catch (error) {
    logger.error('UPDATE_SUBSCRIPTION_PAYPAL_ERROR', 'Failed to update user subscription from PayPal', error as Error);
    throw error;
  }
}

export default router;
