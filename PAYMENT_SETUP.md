# Payment Integration Setup Guide

This guide covers setting up Stripe and PayPal payment processing for SourceScout subscriptions.

## Table of Contents

1. [Overview](#overview)
2. [Stripe Setup](#stripe-setup)
3. [PayPal Setup](#paypal-setup)
4. [Environment Variables](#environment-variables)
5. [Webhook Configuration](#webhook-configuration)
6. [Testing](#testing)
7. [Security Best Practices](#security-best-practices)

---

## Overview

SourceScout supports two payment providers:
- **Stripe** - Primary payment processor with Checkout Sessions
- **PayPal** - Alternative for users who prefer PayPal

Both integrations use:
- **Hosted payment pages** (no card data touches our servers)
- **Webhook verification** for security
- **Subscription management** with automatic renewals

---

## Stripe Setup

### 1. Create Stripe Account

1. Sign up at [stripe.com](https://stripe.com)
2. Complete business verification
3. Access your Dashboard

### 2. Create Products and Prices

In the Stripe Dashboard, create products for each tier:

```
Products to Create:
├── Starter Plan
│   ├── Monthly Price: $19/month
│   └── Yearly Price: $190/year (save ~17%)
├── Pro Plan
│   ├── Monthly Price: $49/month
│   └── Yearly Price: $490/year (save ~17%)
└── Enterprise Plan
    ├── Monthly Price: $99/month
    └── Yearly Price: $990/year (save ~17%)
```

### 3. Get Price IDs

After creating prices, copy each Price ID (starts with `price_`):

| Plan | Period | Price ID Example |
|------|--------|------------------|
| Starter | Monthly | `price_starter_monthly_xxx` |
| Starter | Yearly | `price_starter_yearly_xxx` |
| Pro | Monthly | `price_pro_monthly_xxx` |
| Pro | Yearly | `price_pro_yearly_xxx` |
| Enterprise | Monthly | `price_enterprise_monthly_xxx` |
| Enterprise | Yearly | `price_enterprise_yearly_xxx` |

### 4. Configure Customer Portal

1. Go to **Settings > Billing > Customer Portal**
2. Enable:
   - Cancel subscriptions
   - Update payment methods
   - View billing history
3. Save configuration

### 5. Get API Keys

1. Go to **Developers > API Keys**
2. Copy your **Secret Key** (starts with `sk_live_` or `sk_test_`)
3. Keep this secure - never commit to version control!

---

## PayPal Setup

### 1. Create PayPal Business Account

1. Sign up at [paypal.com/business](https://www.paypal.com/business)
2. Complete business verification

### 2. Create Developer App

1. Go to [developer.paypal.com](https://developer.paypal.com)
2. Create a new REST API app
3. Copy:
   - **Client ID**
   - **Client Secret**

### 3. Create Subscription Plans

Using PayPal's Subscriptions API, create billing plans:

```
Plans to Create:
├── Starter Monthly ($19/month)
├── Starter Yearly ($190/year)
├── Pro Monthly ($49/month)
├── Pro Yearly ($490/year)
├── Enterprise Monthly ($99/month)
└── Enterprise Yearly ($990/year)
```

You can create plans via:
- PayPal Developer Dashboard
- PayPal Subscriptions API

### 4. Get Plan IDs

Copy each Plan ID (e.g., `P-XXXXXXXXXXXXXXXXXXXXXXXX`).

---

## Environment Variables

Add these to your backend `.env` file:

```bash
# ============================================================================
# STRIPE CONFIGURATION
# ============================================================================

# Secret API Key (from Stripe Dashboard > Developers > API Keys)
# Use sk_test_ for testing, sk_live_ for production
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Webhook Signing Secret (from Stripe Dashboard > Developers > Webhooks)
# Used to verify webhook signatures
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Price IDs for each subscription tier and billing period
# Create these in Stripe Dashboard > Products
STRIPE_PRICE_STARTER_MONTHLY=price_xxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_PRICE_STARTER_YEARLY=price_xxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_PRICE_PRO_MONTHLY=price_xxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_PRICE_PRO_YEARLY=price_xxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_PRICE_ENTERPRISE_MONTHLY=price_xxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_PRICE_ENTERPRISE_YEARLY=price_xxxxxxxxxxxxxxxxxxxxxxxx

# ============================================================================
# PAYPAL CONFIGURATION
# ============================================================================

# REST API Credentials (from PayPal Developer Dashboard)
PAYPAL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PAYPAL_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Webhook ID (from PayPal Developer Dashboard > Webhooks)
PAYPAL_WEBHOOK_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Subscription Plan IDs (create via API or Dashboard)
PAYPAL_PLAN_STARTER_MONTHLY=P-xxxxxxxxxxxxxxxxxxxxxxxx
PAYPAL_PLAN_STARTER_YEARLY=P-xxxxxxxxxxxxxxxxxxxxxxxx
PAYPAL_PLAN_PRO_MONTHLY=P-xxxxxxxxxxxxxxxxxxxxxxxx
PAYPAL_PLAN_PRO_YEARLY=P-xxxxxxxxxxxxxxxxxxxxxxxx
PAYPAL_PLAN_ENTERPRISE_MONTHLY=P-xxxxxxxxxxxxxxxxxxxxxxxx
PAYPAL_PLAN_ENTERPRISE_YEARLY=P-xxxxxxxxxxxxxxxxxxxxxxxx

# Set to 'true' for sandbox testing, 'false' or unset for production
PAYPAL_SANDBOX=true

# ============================================================================
# FRONTEND URL (for payment redirects)
# ============================================================================

# URL where users are redirected after payment
FRONTEND_URL=https://sourcescout-frontend.up.railway.app
```

---

## Webhook Configuration

### Stripe Webhooks

1. Go to **Stripe Dashboard > Developers > Webhooks**
2. Add endpoint: `https://your-backend.com/api/v1/payments/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the **Signing Secret** to `STRIPE_WEBHOOK_SECRET`

### PayPal Webhooks

1. Go to **PayPal Developer Dashboard > My Apps > Your App > Webhooks**
2. Add webhook URL: `https://your-backend.com/api/v1/payments/paypal/webhook`
3. Select events:
   - `BILLING.SUBSCRIPTION.CREATED`
   - `BILLING.SUBSCRIPTION.ACTIVATED`
   - `BILLING.SUBSCRIPTION.UPDATED`
   - `BILLING.SUBSCRIPTION.CANCELLED`
   - `BILLING.SUBSCRIPTION.SUSPENDED`
   - `PAYMENT.SALE.COMPLETED`
4. Copy the **Webhook ID** to `PAYPAL_WEBHOOK_ID`

---

## Testing

### Stripe Test Mode

1. Use API keys starting with `sk_test_`
2. Use test card numbers:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - 3D Secure: `4000 0025 0000 3155`

### PayPal Sandbox

1. Set `PAYPAL_SANDBOX=true`
2. Use sandbox credentials from Developer Dashboard
3. Create sandbox buyer/seller accounts for testing

### Local Webhook Testing

For local development, use tunneling:

```bash
# Stripe CLI
stripe listen --forward-to localhost:3001/api/v1/payments/stripe/webhook

# ngrok (for PayPal)
ngrok http 3001
# Then update PayPal webhook URL to ngrok URL
```

---

## Security Best Practices

### Implemented Security Measures

1. **Webhook Signature Verification**
   - All webhooks are cryptographically verified
   - Prevents replay attacks and spoofing

2. **No Card Data on Server**
   - Stripe Checkout and PayPal hosted pages handle sensitive data
   - Full PCI compliance without SAQ burden

3. **JWT Authentication**
   - All user-facing payment endpoints require authentication
   - Prevents unauthorized subscription access

4. **Raw Body Parsing for Webhooks**
   - Stripe webhooks use raw body for signature verification
   - Express middleware configured correctly

5. **Secure Credential Storage**
   - API keys in environment variables only
   - Never logged or exposed in responses

### Additional Recommendations

1. **Enable Stripe Radar** for fraud detection
2. **Set up billing alerts** for failed payments
3. **Implement idempotency** for payment creation (already done)
4. **Regular key rotation** - rotate API keys periodically
5. **Monitor webhook delivery** - set up alerts for failures

---

## Database Migration

Run the migration to add payment columns:

```bash
cd SourceScout/backend
psql $DATABASE_URL -f prisma/migrations/20260204_add_payment_subscriptions/migration.sql
```

This adds:
- `subscription_status` (active, canceled, past_due, unpaid)
- `subscription_provider` (stripe, paypal)
- `subscription_current_period_end`
- `subscription_cancel_at_period_end`
- `stripe_customer_id`
- `stripe_subscription_id`
- `paypal_customer_id`
- `paypal_subscription_id`

---

## API Endpoints

### User Endpoints (require JWT auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/payments/stripe/create-checkout` | Create Stripe checkout session |
| POST | `/api/v1/payments/stripe/create-portal` | Open Stripe customer portal |
| POST | `/api/v1/payments/paypal/create-subscription` | Create PayPal subscription |
| POST | `/api/v1/payments/paypal/capture` | Activate PayPal subscription |
| GET | `/api/v1/payments/subscription` | Get current subscription status |
| POST | `/api/v1/payments/cancel` | Cancel subscription |

### Webhook Endpoints (no auth, signature verified)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/payments/stripe/webhook` | Stripe webhook handler |
| POST | `/api/v1/payments/paypal/webhook` | PayPal webhook handler |

---

## Troubleshooting

### Common Issues

1. **"Payment system not available"**
   - Check that API keys are configured
   - Verify environment variables are loaded

2. **Webhook signature verification failed**
   - Ensure raw body is being used (not parsed JSON)
   - Check webhook secret matches dashboard

3. **Subscription not updating after payment**
   - Verify webhook URL is accessible
   - Check webhook event selection in dashboard
   - Review backend logs for webhook errors

4. **PayPal "AUTHENTICATION_FAILURE"**
   - Verify client ID and secret
   - Check sandbox vs production mode
   - Ensure credentials match environment

### Logging

Check structured logs for payment events:
- `CHECKOUT_INITIATED` - Stripe checkout started
- `PAYPAL_SUBSCRIPTION_INITIATED` - PayPal subscription created
- `STRIPE_WEBHOOK_RECEIVED` - Stripe webhook processed
- `PAYPAL_WEBHOOK_RECEIVED` - PayPal webhook processed
- `USER_SUBSCRIPTION_UPDATED` - Database updated
