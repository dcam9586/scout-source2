# SourceScout Deployment Guide

## 🚀 Quick Deploy Options

### Option 1: Railway (Recommended)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and initialize
railway login
railway init

# Add services
railway add --database postgres
railway add --database redis

# Deploy
railway up
```

### Option 2: Render
1. Connect GitHub repository
2. Create Web Service (backend)
3. Create Static Site (frontend)
4. Add PostgreSQL and Redis

### Option 3: Docker Compose (Self-hosted)
```bash
docker-compose -f docker-compose.prod.yml up -d
```

---

## 📋 Pre-Deployment Checklist

### 1. Environment Variables Required

```env
# === REQUIRED ===
NODE_ENV=production
PORT=3001

# Database (provided by hosting platform)
DATABASE_URL=postgresql://user:password@host:5432/sourcescout

# Redis (provided by hosting platform)
REDIS_URL=redis://host:6379

# JWT (CHANGE THIS - generate with: openssl rand -base64 32)
JWT_SECRET=your-super-secret-jwt-key-change-this

# === SHOPIFY (Required for Shopify integration) ===
SHOPIFY_API_KEY=your-shopify-api-key
SHOPIFY_API_SECRET=your-shopify-api-secret
SHOPIFY_API_SCOPES=read_products,write_products,read_inventory,write_inventory
SHOPIFY_APP_URL=https://your-app-domain.com

# === SUPPLIER APIs ===
# CJ Dropshipping (your API key)
CJ_API_KEY=your-cj-api-key
CJ_API_URL=https://developers.cjdropshipping.com/api2.0/v1

# API Key Encryption (generate with: openssl rand -base64 32)
API_KEY_ENCRYPTION_SECRET=your-32-char-encryption-key

# === OPTIONAL ===
# Rate limiting
FREE_TIER_SEARCHES_PER_MONTH=10
PREMIUM_TIER_SEARCHES_UNLIMITED=true

# JWT expiry
JWT_EXPIRY=7d
```

### 2. Shopify App Configuration

Update your Shopify Partner Dashboard:
- **App URL**: `https://your-production-domain.com`
- **Allowed redirection URLs**: 
  - `https://your-production-domain.com/auth/callback`
  - `https://your-production-domain.com/api/v1/auth/callback`

### 3. Database Migrations

Run after deployment:
```bash
# All migrations in order
psql $DATABASE_URL -f backend/prisma/migrations/20240530213853_create_session_table/migration.sql
psql $DATABASE_URL -f backend/prisma/migrations/20260130_add_pushed_products/migration.sql
psql $DATABASE_URL -f backend/prisma/migrations/20260131_add_partner_integrations/migration.sql
```

---

## 🐳 Docker Production Compose

Save as `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - PORT=3001
      - DATABASE_URL=postgresql://sourcescout:${DB_PASSWORD}@postgres:5432/sourcescout
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - SHOPIFY_API_KEY=${SHOPIFY_API_KEY}
      - SHOPIFY_API_SECRET=${SHOPIFY_API_SECRET}
      - SHOPIFY_APP_URL=${SHOPIFY_APP_URL}
      - CJ_API_KEY=${CJ_API_KEY}
    ports:
      - "3001:3001"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=https://api.your-domain.com
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: sourcescout
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: sourcescout
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U sourcescout"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  # Optional: Nginx reverse proxy
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - backend
      - frontend
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

---

## 🔒 Security Checklist

- [ ] Change JWT_SECRET to a secure random value
- [ ] Change API_KEY_ENCRYPTION_SECRET to a secure random value
- [ ] Set strong database password
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS for production domain only
- [ ] Set up rate limiting
- [ ] Enable Shopify webhook signature verification
- [ ] Review and limit API scopes

---

## 📊 Monitoring Recommendations

1. **Application Monitoring**: Sentry or LogRocket
2. **Uptime Monitoring**: UptimeRobot or Pingdom
3. **Log Aggregation**: Logtail, Papertrail, or Datadog
4. **Database Backups**: Enable automated backups

---

## 🚀 Railway Deployment (Step-by-Step)

### 1. Prepare Repository
```bash
# Make sure everything is committed
git add .
git commit -m "Prepare for production deployment"
git push origin main
```

### 2. Create Railway Project
```bash
railway login
railway init
```

### 3. Add Services
- Add PostgreSQL from Railway dashboard
- Add Redis from Railway dashboard

### 4. Set Environment Variables
In Railway dashboard, add all required env vars

### 5. Deploy
```bash
railway up
```

### 6. Run Migrations
```bash
railway run psql $DATABASE_URL -f migrations.sql
```

### 7. Configure Custom Domain
- Add custom domain in Railway
- Update DNS records
- Update Shopify Partner Dashboard

---

## 💰 Estimated Monthly Costs

| Service | Railway | Render | DigitalOcean |
|---------|---------|--------|--------------|
| Backend | $5-10 | $7 | $12 |
| Frontend | $0-5 | Free | $5 |
| PostgreSQL | $5-15 | $7 | $15 |
| Redis | $5-10 | $10 | $15 |
| **Total** | **$15-40** | **$24-50** | **$47+** |

---

## 📞 Support

For deployment issues:
- Railway: https://railway.app/help
- Render: https://render.com/docs
- Shopify: https://shopify.dev/docs
