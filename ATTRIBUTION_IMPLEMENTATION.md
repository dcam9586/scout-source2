# Email Capture Widget with Revenue Attribution

This implementation provides a comprehensive solution for capturing emails on your storefront and attributing revenue back to those captures using two different methods.

## Overview

The solution supports two attribution methods:

### 1. Code-Based Attribution
- **How it works**: Generate a unique discount code for each email capture
- **Attribution**: Revenue is attributed when that specific code is used at checkout
- **Pros**: 
  - High confidence attribution
  - Clear, direct correlation between capture and order
  - Easy to explain ROI to stakeholders
- **Cons**: 
  - Undercounts revenue (customers don't always use codes)
  - Misses organic conversions from captured emails
  - Requires discount code management in Shopify

### 2. Event-Based Attribution
- **How it works**: Track user sessions, browser fingerprints, and match to orders via email/session
- **Attribution**: Revenue is attributed by matching customer email, session ID, or browser fingerprint
- **Pros**: 
  - Higher coverage - captures more conversions
  - Tracks full customer journey
  - Works without requiring discount codes
- **Cons**: 
  - Less precise matching (fuzzy attribution)
  - Privacy constraints (GDPR, cookie consent)
  - Harder to explain attribution logic

## Implementation

### Database Schema

The solution adds three new Prisma models:

1. **EmailCapture**: Stores email captures with attribution method and optional discount code
2. **Order**: Stores order data and links to email captures
3. **AttributionEvent**: Tracks user events for event-based attribution

### API Endpoints

#### 1. `/api/email-capture` (POST)
Capture an email with optional discount code generation.

**Request:**
```json
{
  "email": "customer@example.com",
  "attributionMethod": "code", // or "event"
  "generateDiscountCode": true,
  "sessionId": "session-123",
  "browserFingerprint": "fp-abc",
  "referrer": "https://example.com"
}
```

**Response:**
```json
{
  "success": true,
  "captureId": "uuid",
  "discountCode": "EMAIL-A1B2C3D4",
  "attributionMethod": "code",
  "message": "Email captured! Use code EMAIL-A1B2C3D4 for your discount."
}
```

#### 2. `/api/track-event` (POST)
Track attribution events for event-based attribution.

**Request:**
```json
{
  "email": "customer@example.com",
  "eventType": "page_view", // or "add_to_cart", "checkout_started", "order_placed"
  "sessionId": "session-123",
  "browserFingerprint": "fp-abc",
  "metadata": {}
}
```

#### 3. `/api/process-order` (POST)
Process an order and attribute revenue (called by order webhook).

**Request:**
```json
{
  "orderId": "shopify-order-123",
  "customerEmail": "customer@example.com",
  "discountCode": "EMAIL-A1B2C3D4",
  "totalPrice": 99.99,
  "currency": "USD",
  "orderNumber": "1001",
  "sessionId": "session-123",
  "browserFingerprint": "fp-abc"
}
```

### Admin Dashboard

Access the attribution analytics at `/app/attribution` to view:

- Total email captures (by method)
- Order attribution rates
- Revenue by attribution method
- Comparison of code-based vs event-based performance
- Recent captures with revenue details

## Integration Guide

### Step 1: Set up the widget on your storefront

Add the widget HTML to your theme's liquid files (e.g., in a section or snippet):

```html
<div id="email-capture-widget">
  <h3>Get 10% Off Your First Order!</h3>
  <form id="email-form">
    <input type="email" id="email-input" placeholder="Enter your email" required>
    <button type="submit">Get Discount</button>
  </form>
  <div id="result-message"></div>
</div>

<script>
  document.getElementById('email-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email-input').value;
    
    const response = await fetch('/apps/proxy/email-capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        attributionMethod: 'code', // or 'event'
        generateDiscountCode: true,
        sessionId: getSessionId(),
        browserFingerprint: getBrowserFingerprint(),
        referrer: document.referrer,
      })
    });
    
    const data = await response.json();
    if (data.success) {
      document.getElementById('result-message').textContent = data.message;
    }
  });
</script>
```

### Step 2: Set up order webhook

Configure a webhook in Shopify to call `/api/process-order` when orders are created:

1. Go to Settings > Notifications > Webhooks
2. Create webhook for "Order creation"
3. Point to your app's `/api/process-order` endpoint
4. Include order details, customer email, discount codes used

### Step 3: Track events (for event-based attribution)

Add event tracking throughout the customer journey:

```javascript
// Track page views
trackEvent('page_view', { page: window.location.pathname });

// Track add to cart
document.querySelector('.add-to-cart').addEventListener('click', () => {
  trackEvent('add_to_cart', { product: productId });
});

// Track checkout
trackEvent('checkout_started', { cartTotal: cartValue });
```

## What I Shipped and What I Learned

### What I Shipped
A **hybrid approach** that supports both attribution methods, allowing merchants to:
- Choose their preferred attribution method
- Compare the performance of both methods side-by-side
- Make data-driven decisions about which method works best for their business

### What I Learned

1. **Use code-based for direct ROI proof**: When you need to prove direct impact to stakeholders, code-based attribution is clearer and more convincing.

2. **Use event-based for understanding the full journey**: Event-based gives you better coverage and helps you understand how email captures influence purchases, even when codes aren't used.

3. **Combine both methods**: The most complete picture comes from using both:
   - Code-based gives you the conservative, high-confidence number
   - Event-based gives you the upper bound and helps you understand the full impact

4. **Privacy matters**: Event-based attribution requires careful consideration of privacy laws. Always get consent for tracking and be transparent about data collection.

5. **Attribution is imperfect**: No single method captures 100% of the impact. The best approach is to use multiple methods and understand their trade-offs.

### What I'd Do Differently

- Implement attribution windows (e.g., 30-day window for matching)
- Add more sophisticated matching logic (IP address + email + time proximity)
- Build A/B testing into the widget to test different copy and incentives
- Add real-time notifications when high-value conversions are attributed
- Implement multi-touch attribution for users who interact multiple times

## Testing

View the demo widget at: `/widget-demo.html` (served from `/public`)

The demo shows both attribution methods side-by-side with their pros/cons clearly explained.

## Next Steps

1. Deploy the app to production
2. Set up Shopify discount code creation via GraphQL API
3. Configure order webhooks
4. Add the widget to your storefront theme
5. Monitor attribution analytics and iterate on the strategy
