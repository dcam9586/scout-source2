# SourceScout Dropshipping Enhancement Plan

## Executive Summary

Enhance SourceScout from a **product discovery tool** to a **complete dropshipping workflow platform** by implementing the Alibaba 5-step workflow, while maintaining flexibility through partner integrations.

**Strategic Approach**: Hybrid (Option C)
- ✅ Keep current strengths: Search, Save, Compare
- ✅ **IMPLEMENTED**: Push to Shopify (create draft products)
- 🔜 Next: Export to partner platforms (Dropified, Syncee)
- 🔮 Future: Order automation

---

## ✅ Phase 1 Implementation Complete (January 30, 2026)

### Files Created/Modified:

#### Backend
| File | Status | Description |
|------|--------|-------------|
| `backend/src/services/shopify-product.ts` | ✅ Created | Shopify Admin API product service |
| `backend/src/routes/shopify-products.ts` | ✅ Created | REST endpoints for push operations |
| `backend/src/models/PushedProduct.ts` | ✅ Created | Track pushed products in database |
| `backend/src/models/SavedItem.ts` | ✅ Updated | Added shopify_product_id, push_status |
| `backend/src/index.ts` | ✅ Updated | Registered new routes |
| `backend/prisma/migrations/20260130_add_pushed_products/migration.sql` | ✅ Created | Database schema changes |

#### Frontend
| File | Status | Description |
|------|--------|-------------|
| `frontend/src/components/PushToShopifyModal.tsx` | ✅ Created | Modal for editing before push |
| `frontend/src/components/SavedItems.tsx` | ✅ Updated | Added push buttons and bulk push |
| `frontend/src/components/SavedPage.tsx` | ✅ Updated | Integrated push hook |
| `frontend/src/hooks/usePushToShopify.ts` | ✅ Created | API hook for push operations |
| `frontend/src/types/index.ts` | ✅ Updated | Added push-related types |
| `frontend/src/styles/components.css` | ✅ Updated | Push button styling |

### API Endpoints Added:
```
POST   /api/v1/shopify/products          - Push single product
POST   /api/v1/shopify/products/batch    - Batch push products
GET    /api/v1/shopify/products          - List pushed products
PUT    /api/v1/shopify/products/:id/status - Update status
DELETE /api/v1/shopify/products/:id      - Delete from Shopify
POST   /api/v1/shopify/products/preview  - Preview before push
```

### Database Migration Required:
```bash
# Run when Docker/PostgreSQL is available:
psql -U postgres -d sourcescout -f backend/prisma/migrations/20260130_add_pushed_products/migration.sql
```

---

## Current State Analysis

### What We Have
| Component | Status | Location |
|-----------|--------|----------|
| Product Search (Alibaba/MIC/Shopify) | ✅ Complete | `backend/src/routes/shopify-mcp.ts` |
| Save Products | ✅ Complete | `backend/src/routes/savedItems.ts` |
| Compare Products | ✅ Complete | `backend/src/routes/comparisons.ts` |
| User Authentication | ✅ Complete | `backend/src/middleware/auth.ts` |
| Shopify OAuth Tokens | ✅ Stored | `backend/src/models/User.ts` |

### Gap Analysis vs. Alibaba Workflow
| Step | Alibaba Workflow | SourceScout | Action Needed |
|------|------------------|-------------|---------------|
| 1 | Select Product | ✅ Search & Save | None |
| 2 | Choose Partner | ❌ Missing | Add partner selection UI |
| 3 | Transfer to Import List | ⚠️ Partial | Enhance SavedItems as Import List |
| 4 | Push to Store | ❌ Missing | Add Shopify Product Create API |
| 5 | Automate Orders | ❌ Future | Phase 3 implementation |

---

## Implementation Phases

## Phase 1: Push to Shopify (Week 1-2)

### 1.1 Backend: Shopify Product Service

**New File**: `backend/src/services/shopify-product.ts`

```typescript
// Core functionality to implement:
class ShopifyProductService {
  // Create draft product in merchant's Shopify store
  async createDraftProduct(savedItem: ISavedItem, shopDomain: string): Promise<ShopifyProductResponse>
  
  // Create multiple products at once
  async batchCreateProducts(items: ISavedItem[], shopDomain: string): Promise<BatchResult>
  
  // Update existing product
  async updateProduct(productId: string, updates: ProductUpdate): Promise<ShopifyProductResponse>
  
  // Check if product already exists (by source URL)
  async findExistingProduct(sourceUrl: string, shopDomain: string): Promise<string | null>
}
```

**API Endpoints to Add**: `backend/src/routes/shopify-products.ts`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/shopify/products` | POST | Create draft product from saved item |
| `/api/v1/shopify/products/batch` | POST | Create multiple draft products |
| `/api/v1/shopify/products/:id` | PUT | Update pushed product |
| `/api/v1/shopify/products/:id` | DELETE | Remove product from Shopify |

**Shopify Admin API Required Scopes**:
```
write_products
read_products
write_inventory
read_inventory
```

### 1.2 Database: Track Pushed Products

**New Migration**: `prisma/migrations/add_shopify_products/migration.sql`

```sql
-- Track products pushed to Shopify
CREATE TABLE pushed_products (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  saved_item_id INTEGER REFERENCES saved_items(id) ON DELETE SET NULL,
  shopify_product_id VARCHAR(255) NOT NULL,
  shopify_product_handle VARCHAR(255),
  push_status VARCHAR(50) DEFAULT 'draft', -- draft, active, archived
  pushed_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, shopify_product_id)
);

-- Add shopify_product_id to saved_items for quick lookup
ALTER TABLE saved_items ADD COLUMN shopify_product_id VARCHAR(255);
ALTER TABLE saved_items ADD COLUMN push_status VARCHAR(50);
```

### 1.3 Frontend: Push to Shopify UI

**Update**: `frontend/src/components/SavedItems.tsx`

Add "Push to Shopify" button with:
- Single item push
- Bulk push (multi-select)
- Push status indicators (draft/active/synced)
- Edit before push modal

**New Component**: `frontend/src/components/PushToShopifyModal.tsx`

```tsx
// Modal for editing product before pushing:
- Title editing
- Description editor (rich text)
- Price markup calculator
- Category/tag selection
- Variant options
- Preview of Shopify listing
```

### 1.4 Data Mapping: SavedItem → Shopify Product

```typescript
interface ShopifyProductInput {
  title: string;           // from saved_item.product_name
  body_html: string;       // from saved_item.description (enhanced)
  vendor: string;          // from saved_item.supplier_name
  product_type: string;    // user-selected category
  status: 'draft';         // always create as draft first
  images: [{
    src: string;           // from saved_item.product_image_url
  }];
  variants: [{
    price: string;         // saved_item.price * markup
    sku: string;           // generated from source
    inventory_quantity: number;
    inventory_management: 'shopify';
  }];
  metafields: [{
    namespace: 'sourcescout',
    key: 'source_url',
    value: string;         // saved_item.source_url
    type: 'url'
  }, {
    namespace: 'sourcescout',
    key: 'supplier_rating',
    value: string;
    type: 'number_decimal'
  }];
}
```

---

## Phase 2: Partner Integrations (Week 3-4)

### 2.1 Dropified Integration

**Research Required**:
- Dropified API documentation
- OAuth flow for connecting accounts
- Product import format

**New File**: `backend/src/services/dropified.ts`

```typescript
class DropifiedService {
  // Connect user's Dropified account
  async authorize(userId: number, code: string): Promise<void>
  
  // Export saved item to Dropified import list
  async exportProduct(savedItem: ISavedItem): Promise<DropifiedResponse>
  
  // Batch export
  async batchExport(items: ISavedItem[]): Promise<BatchResult>
  
  // Check sync status
  async getSyncStatus(productId: string): Promise<SyncStatus>
}
```

### 2.2 Syncee Integration

**Research Required**:
- Syncee API documentation
- Partnership/affiliate program
- Data format requirements

**New File**: `backend/src/services/syncee.ts`

```typescript
class SynceeService {
  async authorize(userId: number, code: string): Promise<void>
  async exportProduct(savedItem: ISavedItem): Promise<SynceeResponse>
  async batchExport(items: ISavedItem[]): Promise<BatchResult>
  async checkConnection(): Promise<boolean>
}
```

### 2.3 Frontend: Partner Selection UI

**New Component**: `frontend/src/components/ExportModal.tsx`

```tsx
// Export destination selector:
- "Push to Shopify" (direct)
- "Export to Dropified"
- "Export to Syncee"
- "Download CSV" (manual)
```

### 2.4 Database: Partner Connections

```sql
-- Store partner API credentials
CREATE TABLE partner_connections (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  partner VARCHAR(50) NOT NULL, -- 'dropified', 'syncee'
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,
  connected_at TIMESTAMP DEFAULT NOW(),
  last_sync_at TIMESTAMP,
  
  UNIQUE(user_id, partner)
);
```

---

## Phase 3: Order Automation (Week 5-8) [Future]

### 3.1 Shopify Webhook Listeners

**Webhooks to Register**:
- `orders/create` - New order placed
- `orders/paid` - Order payment confirmed
- `orders/fulfilled` - Order marked fulfilled
- `orders/cancelled` - Order cancelled

**New File**: `backend/src/routes/webhooks.ts`

```typescript
// Handle incoming order webhooks
router.post('/webhooks/orders/create', async (req, res) => {
  // 1. Validate HMAC signature
  // 2. Parse order data
  // 3. Match line items to pushed products
  // 4. Queue supplier order job
});
```

### 3.2 Supplier Order Queue

**New File**: `backend/src/jobs/supplier-orders.ts`

```typescript
// Bull queue for processing supplier orders
const orderQueue = new Bull('supplier-orders');

orderQueue.process(async (job) => {
  const { order, supplierInfo } = job.data;
  // 1. Format order for supplier
  // 2. Send via supplier's preferred method
  // 3. Update order status
  // 4. Store tracking info
});
```

### 3.3 Order Tracking Dashboard

**New Component**: `frontend/src/components/OrdersPage.tsx`

- View pending supplier orders
- Track fulfillment status
- Sync tracking numbers to Shopify
- Handle order issues/disputes

---

## Technical Requirements

### Environment Variables to Add

```env
# Shopify Admin API (already have OAuth tokens per user)
SHOPIFY_API_VERSION=2024-01

# Dropified Integration
DROPIFIED_CLIENT_ID=xxx
DROPIFIED_CLIENT_SECRET=xxx
DROPIFIED_REDIRECT_URI=https://yourdomain.com/auth/dropified/callback

# Syncee Integration
SYNCEE_API_KEY=xxx
SYNCEE_PARTNER_ID=xxx

# Webhooks
WEBHOOK_SECRET=xxx
```

### Shopify App Scopes Update

Update `shopify.app.toml`:
```toml
[access_scopes]
scopes = [
  "read_products",
  "write_products",      # NEW
  "read_inventory",
  "write_inventory",     # NEW
  "read_orders",         # NEW (Phase 3)
  "read_fulfillments",   # NEW (Phase 3)
  "write_fulfillments"   # NEW (Phase 3)
]

[webhooks]
  [[webhooks.subscriptions]]
  topics = ["orders/create", "orders/paid"]
  uri = "/webhooks"
```

---

## File Structure After Implementation

```
backend/src/
├── services/
│   ├── alibaba-scraper.ts      # Existing
│   ├── shopify-mcp.ts          # Existing
│   ├── shopify-product.ts      # NEW: Push to Shopify
│   ├── dropified.ts            # NEW: Dropified integration
│   └── syncee.ts               # NEW: Syncee integration
├── routes/
│   ├── savedItems.ts           # Existing (enhanced)
│   ├── shopify-mcp.ts          # Existing
│   ├── shopify-products.ts     # NEW: Product management
│   ├── partner-connections.ts  # NEW: OAuth callbacks
│   └── webhooks.ts             # NEW: Order webhooks
├── jobs/
│   └── supplier-orders.ts      # NEW: Order processing
└── models/
    ├── SavedItem.ts            # Enhanced with push status
    ├── PushedProduct.ts        # NEW: Track Shopify products
    └── PartnerConnection.ts    # NEW: Partner credentials

frontend/src/components/
├── SavedItems.tsx              # Enhanced with push buttons
├── PushToShopifyModal.tsx      # NEW: Edit before push
├── ExportModal.tsx             # NEW: Partner selection
├── PartnerConnections.tsx      # NEW: Settings page
└── OrdersPage.tsx              # NEW: Phase 3
```

---

## Development Timeline

### Week 1: Foundation
- [ ] Create `shopify-product.ts` service
- [ ] Add database migration for `pushed_products`
- [ ] Implement single product push endpoint
- [ ] Update SavedItem model with push tracking

### Week 2: Push UI
- [ ] Create `PushToShopifyModal` component
- [ ] Add push buttons to `SavedItems` component
- [ ] Implement bulk push functionality
- [ ] Add push status indicators

### Week 3: Dropified
- [ ] Research Dropified API
- [ ] Implement OAuth flow
- [ ] Create export service
- [ ] Add to ExportModal

### Week 4: Syncee + Polish
- [ ] Research Syncee API
- [ ] Implement export service
- [ ] Create partner settings page
- [ ] End-to-end testing

### Week 5-8: Order Automation (Phase 3)
- [ ] Webhook infrastructure
- [ ] Order processing queue
- [ ] Tracking sync
- [ ] Orders dashboard

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Push to Shopify success rate | > 95% | API success/failure logs |
| Time to push product | < 5 seconds | Performance monitoring |
| Partner export adoption | 20% of users | Usage analytics |
| Order automation rate | 80% of orders | Phase 3 metric |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Shopify API rate limits | Implement queue with rate limiting |
| Partner API changes | Abstract partner services, monitor changelogs |
| Image hosting issues | Use Shopify's image upload, not hotlinking |
| Duplicate products | Check by source_url metafield before creating |

---

## Next Steps

1. **Approve this plan** - Confirm scope and timeline
2. **Start Phase 1** - Begin with Shopify product service
3. **Request Shopify scope expansion** - Update app permissions
4. **Research partner APIs** - Gather Dropified/Syncee documentation

---

*Plan created: January 30, 2026*
*Author: GitHub Copilot*
*Version: 1.0*
