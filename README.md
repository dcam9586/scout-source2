# SourceScout - Product Sourcing App for Shopify

A comprehensive Shopify app that helps store owners scout for products from Alibaba and Made-in-China, providing price comparisons, supplier information, and product saving capabilities.

## Overview

**SourceScout** is a full-stack application designed to streamline the product sourcing process for Shopify store owners. It enables users to:

- 🔍 **Search** across Alibaba and Made-in-China simultaneously
- 💾 **Save** products with notes and descriptions
- ⚖️ **Compare** products from multiple suppliers side-by-side
- 📊 **Track** supplier ratings, MOQ, and pricing
- 🚀 **Upgrade** to premium for unlimited searches

## Tech Stack

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **Caching**: Redis
- **Authentication**: Shopify OAuth + JWT
- **Job Queue**: Bull (for background tasks)

### Frontend
- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **UI Library**: Shopify Polaris
- **State Management**: Zustand
- **HTTP Client**: Axios

### DevOps
- **Environment**: Docker-ready
- **Deployment**: Ready for AWS/Railway/Render
- **Local Development**: Ngrok for webhook tunneling

## Project Structure

```
SourceScout/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── config.ts          # Configuration loader
│   │   │   ├── database.ts        # PostgreSQL setup
│   │   │   └── redis.ts           # Redis setup
│   │   ├── middleware/
│   │   │   ├── auth.ts            # JWT authentication
│   │   │   └── rateLimit.ts       # Rate limiting
│   │   ├── models/
│   │   │   ├── User.ts
│   │   │   ├── SavedItem.ts
│   │   │   ├── SearchLog.ts
│   │   │   └── Comparison.ts
│   │   ├── routes/
│   │   │   ├── auth.ts            # OAuth routes
│   │   │   ├── search.ts          # Search routes
│   │   │   ├── savedItems.ts      # Saved items CRUD
│   │   │   ├── comparisons.ts     # Comparisons CRUD
│   │   │   └── user.ts            # User routes
│   │   ├── services/              # (To be implemented)
│   │   │   ├── alibaba-service.ts
│   │   │   ├── made-in-china-scraper.ts
│   │   │   └── comparison-engine.ts
│   │   ├── jobs/                  # (To be implemented)
│   │   └── index.ts               # Entry point
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── README.md
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   └── SavedItemsList.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useSearch.ts
│   │   │   ├── useSavedItems.ts
│   │   │   └── useComparisons.ts
│   │   ├── store/
│   │   │   ├── appStore.ts        # Zustand store
│   │   │   └── api.ts             # Axios instance
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── README.md
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 13+
- Redis 6+
- Shopify App credentials (API key & secret)

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

The backend will run on `http://localhost:3001`

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will run on `http://localhost:3000` and proxy API calls to the backend.

## Environment Configuration

### Backend (.env)

```
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
SHOPIFY_API_SCOPES=read_products,write_products
SHOPIFY_APP_URL=http://localhost:3000

DATABASE_URL=postgresql://user:password@localhost:5432/sourcescout
REDIS_URL=redis://localhost:6379

ALIBABA_CLIENT_ID=your_alibaba_client_id
ALIBABA_CLIENT_SECRET=your_alibaba_client_secret

NODE_ENV=development
PORT=3001

FREE_TIER_SEARCHES_PER_MONTH=10
JWT_SECRET=your_jwt_secret_key_here
```

## API Documentation

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auth/shopify` | Start OAuth flow |
| GET | `/auth/callback` | OAuth callback handler |

### Search Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/search` | Search products (rate-limited) |
| GET | `/api/search/history` | Get search history |

### Saved Items Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/saved-items` | List saved items |
| POST | `/api/saved-items` | Create saved item |
| GET | `/api/saved-items/:id` | Get specific item |
| PUT | `/api/saved-items/:id` | Update saved item |
| DELETE | `/api/saved-items/:id` | Delete saved item |

### Comparisons Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/comparisons` | List comparisons |
| POST | `/api/comparisons` | Create comparison |
| GET | `/api/comparisons/:id` | Get specific comparison |
| PUT | `/api/comparisons/:id` | Update comparison |
| DELETE | `/api/comparisons/:id` | Delete comparison |

### User Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/user/profile` | Get user profile |
| GET | `/api/user/usage` | Get API usage quota |

## Rate Limiting

- **Free Tier**: 10 searches per month
- **Premium Tier**: Unlimited searches

Rate limits are tracked in Redis and reset monthly. Premium users can upgrade through Shopify billing API (to be implemented).

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  shop_name VARCHAR(255) UNIQUE,
  access_token TEXT,
  refresh_token TEXT,
  subscription_tier VARCHAR(50),
  searches_used INT,
  searches_reset_date TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### SavedItems Table
```sql
CREATE TABLE saved_items (
  id SERIAL PRIMARY KEY,
  user_id INT,
  product_name VARCHAR(255),
  supplier_name VARCHAR(255),
  supplier_rating DECIMAL(3,2),
  moq INT,
  price DECIMAL(10,2),
  source VARCHAR(50),
  source_url TEXT,
  notes TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### SearchLogs Table
```sql
CREATE TABLE search_logs (
  id SERIAL PRIMARY KEY,
  user_id INT,
  search_query VARCHAR(255),
  results_count INT,
  sources_searched VARCHAR(255),
  created_at TIMESTAMP
);
```

### Comparisons Table
```sql
CREATE TABLE comparisons (
  id SERIAL PRIMARY KEY,
  user_id INT,
  product_name VARCHAR(255),
  alibaba_price DECIMAL(10,2),
  made_in_china_price DECIMAL(10,2),
  alibaba_moq INT,
  made_in_china_moq INT,
  alibaba_supplier VARCHAR(255),
  made_in_china_supplier VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## Next Steps / TODO

- [ ] Implement Alibaba API integration for product search
- [ ] Implement Made-in-China web scraping service
- [ ] Build comparison engine to match products across sources
- [ ] Create detailed product comparison UI
- [ ] Implement Shopify billing API for premium subscriptions
- [ ] Add email notifications for new supplier deals
- [ ] Build admin dashboard for app owner analytics
- [ ] Implement product import to Shopify catalog
- [ ] Add supplier rating aggregation
- [ ] Create mobile-responsive design
- [ ] Add support for multiple supplier marketplaces
- [ ] Implement bulk search and import features

## Contributing

This is a personal project for Shopify store owners. Feel free to extend and customize for your needs.

## License

MIT

## Support

For issues or questions, please refer to the individual README files in `backend/` and `frontend/` directories.
