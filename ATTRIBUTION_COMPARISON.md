# Revenue Attribution: Code-Based vs Event-Based

## Quick Comparison

| Aspect | Code-Based | Event-Based |
|--------|------------|-------------|
| **Tracking Method** | Unique discount code | Session/email matching |
| **Confidence** | ⭐⭐⭐⭐⭐ High | ⭐⭐⭐ Medium |
| **Coverage** | ⭐⭐⭐ Medium | ⭐⭐⭐⭐⭐ High |
| **Implementation** | ⭐⭐⭐⭐ Easy | ⭐⭐⭐ Moderate |
| **Privacy Concerns** | ⭐⭐⭐⭐⭐ Minimal | ⭐⭐ High |
| **Best For** | ROI proof | Full journey |

## Flow Diagrams

### Code-Based Attribution Flow

```
┌─────────────┐
│   Visitor   │
│   arrives   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Email popup │
│   appears   │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌──────────────┐
│   Enters    │────▶│  Generate    │
│   email     │     │ discount code│
└─────────────┘     │ EMAIL-A1B2C3 │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ Show code to │
                    │   customer   │
                    └──────┬───────┘
                           │
       ┌───────────────────┴────────────────┐
       │                                    │
       ▼                                    ▼
┌─────────────┐                    ┌──────────────┐
│  Customer   │                    │  Customer    │
│  uses code  │                    │ doesn't use  │
│ at checkout │                    │    code      │
└──────┬──────┘                    └──────────────┘
       │                                    │
       ▼                                    ▼
┌─────────────┐                    ┌──────────────┐
│   ORDER     │                    │   ORDER      │
│ ATTRIBUTED  │                    │ NOT TRACKED  │
│     ✅      │                    │      ❌      │
└─────────────┘                    └──────────────┘
```

**Result:** High confidence but undercounts conversions

### Event-Based Attribution Flow

```
┌─────────────┐
│   Visitor   │
│   arrives   │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌──────────────┐
│ Email popup │────▶│     Store    │
│   appears   │     │ - Email      │
└─────────────┘     │ - Session ID │
       │            │ - Fingerprint│
       ▼            └──────────────┘
┌─────────────┐
│   Enters    │
│   email     │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Track events throughout journey:   │
│  - Page views                       │
│  - Add to cart                      │
│  - Checkout started                 │
└──────────────┬──────────────────────┘
               │
               ▼
       ┌───────────────┐
       │  Order placed │
       └───────┬───────┘
               │
               ▼
       ┌───────────────────────────┐
       │   Match order to capture  │
       │   by email/session/fp     │
       └────────┬──────────────────┘
                │
       ┌────────┴─────────┐
       │                  │
       ▼                  ▼
┌─────────────┐    ┌─────────────┐
│   MATCH     │    │  NO MATCH   │
│   FOUND     │    │   FOUND     │
│     ✅      │    │      ❌      │
└─────────────┘    └─────────────┘
```

**Result:** Better coverage but less precise

## Real-World Example

### Scenario: 100 Email Captures

**Code-Based Results:**
- 100 discount codes generated
- 35 codes used at checkout
- 35 orders attributed
- **Attribution Rate: 35%**
- Revenue: $3,500

**Event-Based Results:**
- 100 emails captured with tracking
- 52 orders matched by email/session
- 52 orders attributed
- **Attribution Rate: 52%**
- Revenue: $5,200

**Gap Analysis:**
- 17 orders attributed by both methods (used code + matched session)
- 18 orders only code-based (used code, no session match)
- 35 orders only event-based (no code used, but matched session)
- **True Impact: Somewhere between $3,500 - $5,200**

## When to Use Each Method

### Use Code-Based When:
- ✅ You need to prove ROI to stakeholders
- ✅ You want high-confidence attribution
- ✅ You're offering discount incentives anyway
- ✅ You need simple, explainable metrics
- ✅ Privacy concerns are minimal

### Use Event-Based When:
- ✅ You want to understand full customer journey
- ✅ You need higher coverage of conversions
- ✅ You can implement proper cookie consent
- ✅ You're optimizing for long-term value
- ✅ You have analytics infrastructure

### Use Both When:
- ✅ You want the most complete picture (recommended!)
- ✅ You can compare and validate methods
- ✅ You want to understand attribution gaps
- ✅ You're data-driven in decision making

## Implementation in This PR

### Database Models
```typescript
EmailCapture {
  email: string
  attributionMethod: "code" | "event"
  discountCode: string?
  sessionId: string?
  browserFingerprint: string?
}

Order {
  orderId: string
  totalPrice: float
  emailCaptureId: string? // Links to attribution
}

AttributionEvent {
  eventType: "page_view" | "add_to_cart" | ...
  emailCaptureId: string
  sessionId: string?
}
```

### API Endpoints
1. `POST /api/email-capture` - Capture with method selection
2. `POST /api/track-event` - Track user journey
3. `POST /api/process-order` - Attribute revenue

### Analytics Dashboard
View at: `/app/attribution`

Shows:
- Total captures by method
- Orders attributed by method
- Revenue by method
- Attribution rates
- Recent captures with revenue

## Best Practices

### Code-Based
1. Make codes easy to remember and type
2. Set reasonable expiration dates
3. Track code generation vs usage rate
4. A/B test discount amounts

### Event-Based
1. Implement proper cookie consent
2. Set attribution windows (30-90 days)
3. Use multiple identifiers (email + session + fingerprint)
4. Consider privacy regulations (GDPR, CCPA)
5. Track event progression to identify drop-offs

### Both
1. Monitor attribution rates over time
2. Identify gaps between methods
3. Test different incentives
4. Iterate based on data
5. Be transparent about limitations

## Expected Results

After 30 days of using both methods, you'll see:

**Typical Attribution Rates:**
- Code-based: 25-40% of captures convert
- Event-based: 40-60% of captures convert
- Gap: 15-20% difference

**This gap represents:**
- Customers who convert but don't use the code
- Organic conversions from email subscribers
- Long-tail conversions after initial touchpoint

**Recommendation:**
- Use code-based for ROI reports
- Use event-based for optimization
- Report both numbers with context
- Focus on improving the gap over time

## Success Metrics

Track these KPIs:

**Code-Based:**
- Code generation rate (% of popups that convert)
- Code usage rate (% of codes that are used)
- Average order value with code
- Revenue per capture

**Event-Based:**
- Capture rate (% of visitors who provide email)
- Attribution rate (% of captures that convert)
- Time to conversion
- Events per conversion

**Combined:**
- Total revenue attributed
- Blended attribution rate
- Incremental revenue from email capture
- ROI of widget implementation

## Conclusion

**What I Shipped:**
A hybrid system that tracks revenue using both methods, giving you:
- High-confidence numbers for reporting (code-based)
- Full-picture understanding for optimization (event-based)
- Data to make informed decisions
- Flexibility to adjust strategy over time

**What I Learned:**
- No single method is perfect
- Combining both gives the best insights
- Privacy matters and should be respected
- Attribution is an art and a science
- Let data guide your strategy, not assumptions

**Next Steps:**
1. Deploy to production
2. Collect 30 days of data
3. Analyze attribution gaps
4. Optimize based on learnings
5. Iterate and improve
