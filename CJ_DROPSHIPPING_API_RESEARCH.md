# CJ Dropshipping API Research Report

**Date:** January 31, 2026  
**Purpose:** Full API research for potential SourceScout integration  
**Status:** ✅ Research Complete

---

## Executive Summary

CJ Dropshipping offers a comprehensive REST API that is **highly suitable** for SourceScout integration. Unlike Alibaba (which requires web scraping), CJ provides:

- ✅ **Official API** with OAuth2 authentication
- ✅ **No MOQ (Minimum Order Quantity)** - True dropshipping
- ✅ **Direct fulfillment** - Orders shipped directly to customers
- ✅ **Global warehouses** - US, EU, UK, CN warehouses for faster shipping
- ✅ **Webhook support** - Real-time order/inventory updates
- ✅ **Sandbox environment** - Safe testing before production
- ✅ **Shopify integration ready** - Native platform support

---

## 1. Authentication

### Token Mechanism
| Token Type | Validity | Refresh Method |
|------------|----------|----------------|
| Access Token | 15 days | Use Refresh Token |
| Refresh Token | 180 days | Re-authenticate with API Key |

### Endpoints

```
POST /api2.0/v1/authentication/getAccessToken
POST /api2.0/v1/authentication/refreshAccessToken
POST /api2.0/v1/authentication/logout
```

### Header Format
```
CJ-Access-Token: {your-access-token}
Content-Type: application/json
```

### Rate Limits
- **Base:** 10 requests/second per IP
- **Max:** 30 requests/second for non-login interfaces
- **getAccessToken:** Once every 5 minutes
- **refreshAccessToken:** 5 times per minute

### User Level Limits
| Level | Requests/Second |
|-------|-----------------|
| Free/V1 | 1 req/s |
| Plus/V2 | 2 req/s |
| Prime/V3 | 4 req/s |
| Advanced/V4-V5 | 6 req/s |

---

## 2. Product API

### 2.1 Product Search (V2 - Recommended)
```
GET /api2.0/v1/product/listV2
```

**Key Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| keyWord | string | Search keyword |
| page | int | Page number (1-1000) |
| size | int | Results per page (1-100) |
| categoryId | string | Filter by category |
| countryCode | string | Filter by warehouse country (CN, US, GB, etc.) |
| startSellPrice | decimal | Minimum price filter |
| endSellPrice | decimal | Maximum price filter |
| addMarkStatus | int | 0=paid shipping, 1=free shipping |
| productType | int | 4=Supplier, 10=Video, 11=Non-video |
| productFlag | int | 0=Trending, 1=New, 2=Video, 3=Slow-moving |
| zonePlatform | string | Suggested for: shopify, ebay, amazon, tiktok, etsy |
| sort | string | desc/asc |
| orderBy | int | 0=best match, 1=listing count, 2=price, 3=create time, 4=inventory |
| features | array | enable_description, enable_category, enable_combine, enable_video |

**Response Fields:**
| Field | Description |
|-------|-------------|
| id | Unique product ID |
| nameEn | English product name |
| sku | Product SKU |
| bigImage | Main product image URL |
| sellPrice | Regular price (USD) |
| nowPrice | Discounted price (USD) |
| discountPrice | Best discount price |
| discountPriceRate | Discount percentage |
| listedNum | Times listed on platform |
| categoryId | Category ID |
| threeCategoryName | Category name |
| addMarkStatus | Free shipping status |
| warehouseInventoryNum | Total inventory |
| deliveryCycle | Delivery time in days |

### 2.2 Product Details
```
GET /api2.0/v1/product/query?pid={productId}
```

**Returns:**
- Full product description
- All variants with dimensions/weight
- Inventory per warehouse
- Suggested retail price
- HS code for customs
- Material/packaging info
- Product videos (if features=enable_video)

### 2.3 Category List
```
GET /api2.0/v1/product/getCategory
```

Returns 3-level category hierarchy (First > Second > Third)

### 2.4 Global Warehouses
```
GET /api2.0/v1/product/globalWarehouseList
```

**Available Warehouses:**
- 🇨🇳 China Warehouse (CN)
- 🇺🇸 US Warehouse (US)
- 🇬🇧 UK Warehouse (GB)
- 🇩🇪 Germany Warehouse (DE)
- 🇫🇷 France Warehouse (FR)
- And more...

### 2.5 Inventory Check
```
GET /api2.0/v1/product/stock/queryByVid?vid={variantId}
GET /api2.0/v1/product/stock/queryBySku?sku={sku}
GET /api2.0/v1/product/stock/getInventoryByPid?pid={productId}
```

**Returns per warehouse:**
- totalInventoryNum
- cjInventoryNum (CJ managed)
- factoryInventoryNum (Factory managed)
- verifiedWarehouse (1=verified, 2=unverified)

### 2.6 Product Reviews
```
GET /api2.0/v1/product/productComments?pid={productId}
```

Returns: comments, ratings, images, country of reviewer

### 2.7 Add to My Products
```
POST /api2.0/v1/product/addToMyProduct
Body: { "productId": "{productId}" }
```

### 2.8 My Products List
```
GET /api2.0/v1/product/myProduct/query
```

---

## 3. Variant API

### 3.1 Get All Variants
```
GET /api2.0/v1/product/variant/query?pid={productId}
```

### 3.2 Get Variant by ID
```
GET /api2.0/v1/product/variant/queryByVid?vid={variantId}
```

**Variant Fields:**
| Field | Description |
|-------|-------------|
| vid | Variant ID |
| variantNameEn | English name |
| variantSku | Variant SKU |
| variantKey | Attribute key (e.g., "Black") |
| variantLength/Width/Height | Dimensions (mm) |
| variantWeight | Weight (g) |
| variantSellPrice | Price (USD) |
| variantSugSellPrice | Suggested retail price |

---

## 4. Shopping/Order API

### 4.1 Create Order (V2 - Recommended)
```
POST /api2.0/v1/shopping/order/createOrderV2
```

**Required Fields:**
| Field | Description |
|-------|-------------|
| orderNumber | Your unique order ID |
| shippingCountryCode | 2-letter country code |
| shippingCountry | Country name |
| shippingProvince | Province/State |
| shippingCity | City |
| shippingCustomerName | Customer name |
| shippingAddress | Full address |
| logisticName | Shipping method |
| fromCountryCode | Warehouse country |
| products | Array of {vid, quantity} |

**Optional Fields:**
- shippingPhone, email, taxId
- payType: 2=Balance Payment, 3=No Balance Payment
- platform: "shopify" (for better recommendations)
- iossType: For EU tax handling

### 4.2 Order Flow
```
1. Create Order → POST /order/createOrderV2
2. Add to Cart → POST /order/addCart
3. Confirm Cart → POST /order/addCartConfirm
4. Generate Parent Order → POST /order/saveGenerateParentOrder
5. Pay with Balance → POST /pay/payBalance
```

### 4.3 Order Status Values
| Status | Description |
|--------|-------------|
| CREATED | Order created, waiting confirm |
| IN_CART | In cart, waiting confirm |
| UNPAID | Confirmed, CJ order number created |
| UNSHIPPED | Paid, waiting to ship |
| SHIPPED | In transit, has tracking |
| DELIVERED | Customer received |
| CANCELLED | Order cancelled |

### 4.4 List Orders
```
GET /api2.0/v1/shopping/order/list?status={status}&pageNum=1&pageSize=20
```

### 4.5 Get Order Details
```
GET /api2.0/v1/shopping/order/getOrderDetail?orderId={orderId}
```

### 4.6 Delete Order
```
DELETE /api2.0/v1/shopping/order/deleteOrder?orderId={orderId}
```

---

## 5. Payment API

### 5.1 Check Balance
```
GET /api2.0/v1/shopping/pay/getBalance
```

Returns: amount, bonusAmount, frozenAmount (USD)

### 5.2 Pay with Balance
```
POST /api2.0/v1/shopping/pay/payBalance
Body: { "orderId": "{orderId}" }
```

---

## 6. Logistics API

### 6.1 Calculate Shipping
```
POST /api2.0/v1/logistic/freightCalculate
Body: {
    "startCountryCode": "CN",
    "endCountryCode": "US",
    "products": [{ "vid": "{variantId}", "quantity": 1 }]
}
```

**Returns:**
| Field | Description |
|-------|-------------|
| logisticName | Carrier name |
| logisticPrice | Cost in USD |
| logisticAging | Delivery time (e.g., "2-5") |

### 6.2 Advanced Freight Calculation
```
POST /api2.0/v1/logistic/freightCalculateTip
```

More detailed pricing with taxes, customs fees, etc.

### 6.3 Get Tracking Info
```
GET /api2.0/v1/logistic/trackInfo?trackNumber={trackingNumber}
```

**Returns:**
- trackingNumber
- logisticName
- trackingFrom / trackingTo
- deliveryDay
- deliveryTime
- trackingStatus
- lastMileCarrier
- lastTrackNumber

---

## 7. Webhook API

### 7.1 Configure Webhooks
```
POST /api2.0/v1/webhook/set
```

**Webhook Types:**
| Type | Events |
|------|--------|
| product | Product changes |
| stock | Inventory updates |
| order | Order status changes |
| logistics | Shipping updates |

**Requirements:**
- HTTPS only (TLS 1.2/1.3)
- Respond within 3 seconds
- Return 200 OK on success

**Example Configuration:**
```json
{
    "product": {
        "type": "ENABLE",
        "callbackUrls": ["https://your-domain.com/webhooks/cj/product"]
    },
    "stock": {
        "type": "ENABLE",
        "callbackUrls": ["https://your-domain.com/webhooks/cj/stock"]
    },
    "order": {
        "type": "ENABLE",
        "callbackUrls": ["https://your-domain.com/webhooks/cj/order"]
    },
    "logistics": {
        "type": "ENABLE",
        "callbackUrls": ["https://your-domain.com/webhooks/cj/logistics"]
    }
}
```

---

## 8. Storage/Warehouse API

### 8.1 Get Warehouse Details
```
GET /api2.0/v1/warehouse/detail?id={storageId}
```

**Returns:**
- name, address, city, province
- areaCountryCode
- phone
- logisticsBrandList (supported carriers like USPS, FedEx, UPS, DHL)

---

## 9. Product Sourcing API

### 9.1 Create Sourcing Request
```
POST /api2.0/v1/product/sourcing/create
Body: {
    "productName": "Product name",
    "productImage": "URL to image",
    "productUrl": "URL to source product",
    "remark": "Notes",
    "price": 10.00
}
```

Request CJ to source a specific product not in their catalog.

### 9.2 Query Sourcing Status
```
POST /api2.0/v1/product/sourcing/query
Body: { "sourceIds": ["{sourcingId}"] }
```

---

## 10. Integration Architecture for SourceScout

### Phase 1: CJ as Search Source
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   SourceScout   │────▶│  CJ API Service │────▶│  CJ Dropshipping│
│    Frontend     │     │   (Backend)     │     │      API        │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │
         │                       ▼
         │              ┌─────────────────┐
         └─────────────▶│   Product List  │
                        │   (Normalized)  │
                        └─────────────────┘
```

### Phase 2: Full Integration (Order Automation)
```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Shopify    │───▶│  SourceScout │───▶│  CJ Service  │───▶│ CJ Dropship  │
│    Store     │    │   Backend    │    │              │    │     API      │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
       ▲                   │                    │                   │
       │                   │                    │                   │
       │    ┌──────────────┴──────────────┐    │                   │
       │    │         Webhooks            │◀───┴───────────────────┘
       │    │  - Order status updates     │
       │    │  - Tracking numbers         │
       │    │  - Inventory changes        │
       │    └─────────────────────────────┘
       │                   │
       └───────────────────┘
        (Update fulfillment)
```

---

## 11. Comparison: CJ vs Alibaba

| Feature | CJ Dropshipping | Alibaba |
|---------|-----------------|---------|
| **API** | ✅ Official REST API | ❌ Web scraping required |
| **MOQ** | ✅ No MOQ (1 unit) | ❌ Often 10-1000+ units |
| **Fulfillment** | ✅ Direct to customer | ❌ Bulk to you first |
| **Warehouses** | ✅ US, EU, UK, CN | ❌ China only |
| **Shipping** | 2-7 days (US warehouse) | 15-45 days |
| **Returns** | ✅ CJ handles | ❌ You handle |
| **Branding** | ✅ Custom packaging | Limited |
| **Payment** | Balance/PayPal/Card | Alibaba Trade Assurance |
| **Webhooks** | ✅ Full support | ❌ None |

---

## 12. Implementation Recommendation

### Recommended Approach: Full CJ Integration

**Rationale:**
1. CJ is purpose-built for dropshipping (unlike Alibaba)
2. Official API = no scraping maintenance
3. Webhooks enable true order automation
4. US warehouses = faster shipping for American customers
5. No MOQ = perfect for testing products

### Implementation Phases

#### Phase 1: CJ as Search Source (2-3 days)
- [ ] Create `cj-dropshipping.ts` service
- [ ] Implement token management with auto-refresh
- [ ] Add product search with filters
- [ ] Add CJ to search sources dropdown
- [ ] Normalize CJ products to SourceScout format
- [ ] Display CJ-specific fields (warehouse, delivery time)

#### Phase 2: Product Import (1-2 days)
- [ ] Add to My Products functionality
- [ ] Sync CJ products to saved items
- [ ] Show real-time inventory status
- [ ] Display shipping estimates

#### Phase 3: Order Automation (3-5 days)
- [ ] Create order service
- [ ] Implement Shopify webhook listener
- [ ] Auto-create CJ orders on Shopify purchase
- [ ] Handle payment (balance check/auto-pay)
- [ ] Sync tracking numbers back to Shopify

#### Phase 4: Inventory Sync (2 days)
- [ ] Set up CJ inventory webhooks
- [ ] Update Shopify stock levels
- [ ] Alert on low inventory
- [ ] Auto-pause out-of-stock products

---

## 13. Environment Setup

### Required Credentials
```env
# CJ Dropshipping
CJ_API_KEY=your-cj-api-key
CJ_ACCESS_TOKEN=auto-managed
CJ_REFRESH_TOKEN=auto-managed

# Optional: Sandbox for testing
CJ_SANDBOX_MODE=true
CJ_SANDBOX_API_KEY=sandbox-key
```

### API Base URLs
```
Production: https://developers.cjdropshipping.com/api2.0/v1/
Sandbox: https://sandbox.cjdropshipping.com/api2.0/v1/
```

---

## 14. Data Mapping: CJ → SourceScout

```typescript
interface CJProduct {
  id: string;           // → sourceId
  nameEn: string;       // → title
  sku: string;          // → sku
  bigImage: string;     // → imageUrl
  sellPrice: string;    // → supplierPrice
  nowPrice: string;     // → discountPrice (if lower)
  listedNum: number;    // → popularity
  categoryId: string;   // → category
  addMarkStatus: 1|0;   // → freeShipping
  warehouseInventoryNum: number; // → stock
  deliveryCycle: string; // → deliveryTime
}

// Normalize to SourceScout format
const normalizeProduct = (cj: CJProduct): SourceScoutProduct => ({
  id: `cj-${cj.id}`,
  source: 'cj-dropshipping',
  title: cj.nameEn,
  imageUrl: cj.bigImage,
  supplierPrice: parseFloat(cj.nowPrice || cj.sellPrice),
  originalPrice: parseFloat(cj.sellPrice),
  moq: 1, // CJ has no MOQ
  supplier: 'CJ Dropshipping',
  supplierUrl: `https://cjdropshipping.com/product/${cj.id}`,
  shipping: cj.addMarkStatus === 1 ? 'Free' : 'Calculated',
  deliveryDays: cj.deliveryCycle,
  inStock: cj.warehouseInventoryNum > 0,
  stockQuantity: cj.warehouseInventoryNum,
  sourceData: cj // Keep original for order creation
});
```

---

## 15. Next Steps

**Ready to implement?** Choose your path:

### Option A: Quick Start (Search Only)
Add CJ as a product search source. Takes ~2 days.
- Users can search CJ products alongside Alibaba
- Compare prices, check inventory
- Manual ordering through CJ website

### Option B: Full Integration
Complete dropshipping automation. Takes ~1-2 weeks.
- Everything in Option A
- Plus automatic order creation
- Plus tracking sync to Shopify
- Plus inventory management

**Recommendation:** Start with Option A to validate product quality, then expand to Option B.

---

## Appendix: Error Codes

| Code | Message |
|------|---------|
| 200 | Success |
| 1600001 | Authentication failed |
| 1600003 | Refresh token expired |
| 1600100 | Parameter error |
| 1601000 | User not found |
| 1603001 | Order confirm fail |
| 1608001 | Warehouse info not found |

---

*Document generated by SourceScout Research Agent*  
*Last updated: January 31, 2026*
