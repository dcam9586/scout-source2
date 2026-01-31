# SourceScout 

**The Smarter Way to Source Products for E-commerce**

SourceScout is a comprehensive product sourcing platform for Shopify merchants and e-commerce entrepreneurs. It aggregates supplier data from multiple global marketplaces into a single, intelligent interface.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-MVP%20Complete-green.svg)
![Shopify](https://img.shields.io/badge/Shopify-App-96bf48.svg)

---

##  Features

### Multi-Source Search
Search across multiple supplier platforms simultaneously:
- **Alibaba** - World's largest B2B marketplace
- **Made-in-China** - Alternative Chinese supplier network
- **CJ Dropshipping** - No-MOQ dropshipping supplier (Official API)

### Product Comparison
- Side-by-side comparison of up to 4 products
- Compare pricing, MOQ, shipping, and supplier ratings
- Smart profit margin calculator

### Shopify Integration
- One-click push products to Shopify as draft listings
- Automatic price markup calculation
- Metafields for supplier tracking and cost management
- Batch import multiple products

### Save & Organize
- Save products for later review
- Track price changes over time
- Export to CSV for bulk import

---

##  Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Shopify Polaris, Zustand |
| **Backend** | Node.js, Express, TypeScript |
| **Database** | PostgreSQL 16 |
| **Cache** | Redis 7 |
| **Scraping** | Puppeteer (Chromium) |
| **Deployment** | Docker, Railway/Render |

---

##  Project Structure

```
SourceScout/
 backend/                 # Express API server
    src/
       routes/         # API endpoints
       services/       # Business logic & scrapers
       models/         # Database models
       middleware/     # Auth, rate limiting
    prisma/             # Database schema & migrations
 frontend/               # React SPA
    src/
       components/     # UI components
       hooks/          # Custom React hooks
       store/          # Zustand state management
       styles/         # CSS styles
    public/             # Static assets
 scout-source2/          # Shopify embedded app (this repo)
     app/                # React Router app
     extensions/         # Shopify extensions
     prisma/             # Session storage
```

---

##  Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Shopify Partner Account
- CJ Dropshipping API Key (optional)

### 1. Clone the repository

```bash
git clone https://github.com/dcam9586/scout-source2.git
cd scout-source2
```

### 2. Start the database services

```bash
cd ../SourceScout
docker-compose up -d
```

### 3. Install dependencies

```bash
# Backend
cd backend
npm install
npx prisma migrate dev

# Frontend
cd ../frontend
npm install
```

### 4. Configure environment

```bash
# Backend (.env)
DATABASE_URL=postgresql://sourcescout:sourcescout123@localhost:5432/sourcescout
REDIS_URL=redis://localhost:6379
CJ_API_EMAIL=your-email@example.com
CJ_API_KEY=your-cj-api-key
JWT_SECRET=your-jwt-secret

# Frontend (.env)
VITE_API_URL=http://localhost:3001
```

### 5. Start development servers

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 6. Open the app

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- API Health: http://localhost:3001/health

---

##  API Endpoints

### Search
```
POST /api/v1/search
Body: { "query": "phone case", "sources": ["alibaba", "cj-dropshipping"] }
```

### Saved Items
```
GET    /api/v1/saved-items          # List saved items
POST   /api/v1/saved-items          # Save a product
DELETE /api/v1/saved-items/:id      # Remove saved item
```

### Shopify Products
```
POST   /api/v1/shopify/products           # Push product to Shopify
POST   /api/v1/shopify/products/batch     # Batch push products
GET    /api/v1/shopify/products           # List pushed products
```

### Partners
```
GET    /api/v1/partners                   # List partner connections
POST   /api/v1/partners/:partner/export   # Export to partner platform
```

---

##  Screenshots

*Coming soon*

---

##  Roadmap

- [x] Multi-source search (Alibaba, Made-in-China, CJ)
- [x] Product comparison tools
- [x] Push to Shopify
- [x] Save & organize products
- [ ] Price tracking & alerts
- [ ] AI-powered recommendations
- [ ] Supplier verification badges
- [ ] Chrome extension
- [ ] Team/agency features

---

##  Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a PR.

---

##  License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

##  Contact

- **GitHub:** [@dcam9586](https://github.com/dcam9586)
- **Project Link:** [https://github.com/dcam9586/scout-source2](https://github.com/dcam9586/scout-source2)

---

<div align="center">

**Built with  for e-commerce entrepreneurs**

</div>
