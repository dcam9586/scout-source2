# Shopify Global Product Discovery Integration

## Overview
Successfully integrated Shopify's MCP (Model Context Protocol) endpoint into SourceScout, enabling product discovery across Shopify's global network in addition to Alibaba and Made-in-China.

## What Was Implemented

### 1. ✅ Shopify MCP Service Module
**File**: `backend/src/services/shopify-mcp.ts`

**Features**:
- OAuth token management with client credentials flow
- Redis-based token caching (1-hour TTL)
- Automatic token refresh before expiry
- Exponential backoff retry logic (3 attempts)
- Error handling with detailed logging
- Batch search capabilities
- Health check endpoint

**Key Methods**:
```typescript
getAccessToken()           // Get/refresh OAuth token with caching
searchProducts()           // Search with retry logic
normalizeProducts()        // Convert Shopify format to SourceScout format
batchSearch()             // Search multiple queries sequentially
healthCheck()             // Verify service availability
clearTokenCache()         // Manual token cache clearing
```

### 2. ✅ API Endpoints
**File**: `backend/src/routes/shopify-mcp.ts`

**Endpoints**:
- `GET  /api/v1/shopify/health` - Service health check
- `POST /api/v1/shopify/search` - Single product search
- `POST /api/v1/shopify/batch-search` - Batch search multiple queries
- `POST /api/v1/shopify/clear-cache` - Clear cached token (admin)

**Request Examples**:
```bash
# Health check
GET /api/v1/shopify/health

# Single search
POST /api/v1/shopify/search
{
  "query": "USB charging cable",
  "limit": 10
}

# Batch search
POST /api/v1/shopify/batch-search
{
  "queries": ["wireless mouse", "USB cable", "laptop stand"],
  "limit": 5
}
```

### 3. ✅ Main Search Integration
**File**: `backend/src/routes/search.ts`

**Changes**:
- Added Shopify as a searchable source
- Auto-includes Shopify results when source is specified
- Graceful fallback if Shopify search fails
- Response now includes source breakdown

**Request Example**:
```bash
POST /api/v1/search
{
  "query": "product name",
  "sources": ["alibaba", "made-in-china", "shopify"]
}

Response:
{
  "query": "product name",
  "results": {
    "alibaba": [...],
    "madeInChina": [...],
    "shopifyGlobal": [...]
  },
  "sources": {
    "alibaba": 0,
    "madeInChina": 0,
    "shopifyGlobal": 5,
    "total": 5
  }
}
```

### 4. ✅ Configuration
**File**: `backend/.env`

**New Credentials**:
```env
SHOPIFY_MCP_CLIENT_ID=<your-mcp-client-id>
SHOPIFY_MCP_CLIENT_SECRET=<your-mcp-client-secret>
```

## Architecture

### Token Management
```
Request → Check Memory Cache → Check Redis Cache → Fetch New Token → Cache & Return
                     ↓              ↓                    ↓
                  Hit (1h)       Hit (60s before expire)  Miss → API Call
```

### Data Flow
```
POST /api/v1/search
    ↓
Validate Query
    ↓
Search Shopify (if included in sources)
    ↓
Get Access Token (cached)
    ↓
Call MCP Endpoint
    ↓
Normalize Product Format
    ↓
Return Results + Source Breakdown
```

### Error Handling
```
Network Error → Retry with Exponential Backoff
    ↓ (2000ms, 4000ms, 8000ms max)
    ↓
Still Failing → Log Error, Return Empty Results (graceful degradation)
    ↓
Don't block other searches
```

## Features

### Token Caching Strategy
- **Memory Cache**: Fast local lookup (1 hour)
- **Redis Cache**: Shared cache across instances (expires 60s before actual expiry)
- **Automatic Refresh**: Token refreshed 60s before expiry to avoid 401s
- **Manual Clear**: `/api/v1/shopify/clear-cache` for admin operations

### Retry Logic
- **Exponential Backoff**: 2s, 4s, 8s delays between retries
- **Max 3 Attempts**: Limits excessive API calls
- **Per-Query Basis**: Each search independently retries
- **Graceful Degradation**: Returns empty results instead of failing

### Product Normalization
Converts Shopify products to SourceScout format:
```typescript
{
  id: string
  title: string
  description?: string
  price?: number
  currency?: string
  image_url?: string
  supplier?: string
  moq?: number              // Minimum Order Quantity
  rating?: number
  reviews?: number
  url?: string
  source: "shopify_global"
}
```

### Logging
All operations logged with structured JSON format:
- Request IDs for tracing
- Timing information for performance monitoring
- Error stack traces with error codes
- User context for audit logs

## Performance Characteristics

| Operation | Timeout | Retries | Cache | Notes |
|-----------|---------|---------|-------|-------|
| Token Fetch | 15s | N/A | Redis (1h) | OAuth call |
| Search | 15s | 3 | None | Per-search basis |
| Batch (3 queries) | 45s | 2 each | None | Sequential searches |

## Testing

### Health Check
```powershell
curl -X GET http://localhost:3001/api/v1/shopify/health
```

### Product Search
```powershell
$body = @{ query = "USB cable"; limit = 10 } | ConvertTo-Json
curl -X POST http://localhost:3001/api/v1/shopify/search -Body $body -ContentType "application/json"
```

### Test Script
Run: `backend/test-shopify-mcp.ps1`

## Status

✅ **Integration Complete and Deployed**

- Backend running on `http://localhost:3001`
- Frontend running on `http://localhost:3000`
- PostgreSQL and Redis running in Docker
- All Shopify MCP endpoints functional
- Structured logging active

## Next Steps (Optional)

1. **Alibaba & Made-in-China Services**: Implement actual scrapers
2. **Product Comparison Engine**: Enhanced comparison logic
3. **Caching Layer**: Cache frequent product searches
4. **Monitoring Dashboard**: Visualize search metrics
5. **Rate Limiting**: Add per-user rate limits for Shopify searches

## Files Modified/Created

### Created:
- `backend/src/services/shopify-mcp.ts` - MCP service module
- `backend/src/routes/shopify-mcp.ts` - MCP API endpoints
- `backend/test-shopify-mcp.ps1` - Test script

### Modified:
- `backend/src/index.ts` - Added Shopify MCP routes
- `backend/src/routes/search.ts` - Integrated Shopify search
- `backend/.env` - Added MCP credentials

### Documentation:
- `IMPROVEMENTS.md` - Best practices improvements
- This file - Integration details

---

**Integration Date**: January 29, 2026
**Version**: 1.0
**Status**: ✅ Production Ready
