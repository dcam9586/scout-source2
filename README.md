# SourceScout - Product Sourcing App for Shopify

A comprehensive Shopify app that helps store owners scout for products from Alibaba, Made-in-China, and CJ Dropshipping, providing price comparisons, supplier information, and product saving capabilities.

## 🌐 Live Demo

- **Frontend**: [sourcescout-frontend.up.railway.app](https://sourcescout-frontend.up.railway.app)
- **Backend API**: [sourcescout-backend.up.railway.app](https://sourcescout-backend.up.railway.app)
- **Documentation**: [GitHub Wiki](https://github.com/dcam9586/scout-source2/wiki)

## Overview

**SourceScout** is a full-stack application designed to streamline the product sourcing process for Shopify store owners. It enables users to:

- 🔍 **Search** across Alibaba, Made-in-China, and CJ Dropshipping simultaneously
- 💾 **Save** products with notes and descriptions
- ⚖️ **Compare** products from multiple suppliers side-by-side
- 📊 **Track** supplier ratings, MOQ, and pricing
- 🛒 **Push** products directly to your Shopify store
- 🚀 **Upgrade** to premium for unlimited searches and advanced filters

## 💰 Subscription Tiers

| Feature | Free | Starter ($19/mo) | Pro ($49/mo) | Enterprise ($149/mo) |
|---------|:----:|:----------------:|:------------:|:--------------------:|
| Searches/month | 5 | 100 | Unlimited | Unlimited |
| Results/search | 10 | 25 | 100 | Unlimited |
| Saved items | 25 | 100 | 500 | Unlimited |
| Push to Shopify | ❌ | 10/mo | 50/mo | Unlimited |
| **See source names** | ❌ | ❌ | ✅ | ✅ |
| All supplier sources | ❌ | ❌ | ✅ | ✅ |
| HS Code search | ❌ | ❌ | ✅ | ✅ |
| Certification filters | ❌ | ❌ | ✅ | ✅ |
| Export to CSV | ❌ | ❌ | ✅ | ✅ |
| API access | ❌ | ❌ | ❌ | ✅ |
| Support | Community | Email | Priority | Dedicated |

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

To get started with local development:

1. Clone the repository
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`
