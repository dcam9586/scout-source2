# Backend - SourceScout Shopify App

Backend server for the SourceScout product sourcing application.

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in the required values:

```bash
cp .env.example .env
```

Required configurations:
- **Shopify**: API key, secret, and app URL
- **Database**: PostgreSQL connection string
- **Redis**: Redis connection string
- **Alibaba**: API credentials
- **JWT**: Secret key for token generation

### 3. Database Setup

Ensure PostgreSQL is running and accessible via the `DATABASE_URL` in your `.env` file. The database will be initialized automatically on first run.

### 4. Redis Setup

Ensure Redis is running on the URL specified in `REDIS_URL`. Used for rate limiting and caching.

## Development

Start the development server:

```bash
npm run dev
```

The server will run on `http://localhost:3001` by default.

## Build

Compile TypeScript to JavaScript:

```bash
npm run build
```

## Production

```bash
npm run build
npm start
```

## API Endpoints

### Authentication
- `GET /auth/shopify` - Start Shopify OAuth flow
- `GET /auth/callback` - Shopify OAuth callback

### Search
- `POST /api/search` - Search for products across sources
- `GET /api/search/history` - Get search history

### Saved Items
- `GET /api/saved-items` - List saved items
- `POST /api/saved-items` - Create saved item
- `GET /api/saved-items/:id` - Get specific saved item
- `PUT /api/saved-items/:id` - Update saved item
- `DELETE /api/saved-items/:id` - Delete saved item

### Comparisons
- `GET /api/comparisons` - List product comparisons
- `POST /api/comparisons` - Create comparison
- `GET /api/comparisons/:id` - Get specific comparison
- `PUT /api/comparisons/:id` - Update comparison
- `DELETE /api/comparisons/:id` - Delete comparison

### User
- `GET /api/user/profile` - Get user profile
- `GET /api/user/usage` - Get API usage and quota

## Project Structure

```
src/
├── config/
│   ├── config.ts       - Configuration loader
│   ├── database.ts     - PostgreSQL pool setup
│   └── redis.ts        - Redis client setup
├── middleware/
│   ├── auth.ts         - JWT authentication
│   └── rateLimit.ts    - Rate limiting middleware
├── models/
│   ├── User.ts         - User model
│   ├── SavedItem.ts    - SavedItem model
│   ├── SearchLog.ts    - SearchLog model
│   └── Comparison.ts   - Comparison model
├── routes/
│   ├── auth.ts         - Authentication routes
│   ├── search.ts       - Search routes
│   ├── savedItems.ts   - Saved items routes
│   ├── comparisons.ts  - Comparison routes
│   └── user.ts         - User routes
└── index.ts            - Application entry point
```
