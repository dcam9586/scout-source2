# Frontend - SourceScout Shopify App

React + TypeScript frontend for the SourceScout product sourcing application using Shopify Polaris.

## Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Development

Start the development server:

```bash
npm run dev
```

The app will run on `http://localhost:3000` and proxy API requests to `http://localhost:3001`.

### 3. Build

Build for production:

```bash
npm run build
```

Output is in the `dist` folder.

### 4. Preview

Preview production build locally:

```bash
npm run preview
```

## Project Structure

```
src/
├── components/
│   ├── Dashboard.tsx        - Main dashboard page
│   ├── SearchBar.tsx        - Product search interface
│   └── SavedItemsList.tsx   - List of saved items
├── hooks/
│   ├── useAuth.ts           - Authentication hooks
│   ├── useSavedItems.ts     - Saved items management
│   ├── useComparisons.ts    - Product comparisons
│   └── useSearch.ts         - Search functionality
├── store/
│   ├── appStore.ts          - Zustand state management
│   └── api.ts               - Axios instance with interceptors
├── types/
│   └── index.ts             - TypeScript interfaces
├── App.tsx                  - Main app component
└── main.tsx                 - Entry point
```

## Features

- **Authentication**: Shopify OAuth integration
- **Product Search**: Search across Alibaba and Made-in-China
- **Save Items**: Bookmark products for later review
- **Compare**: Side-by-side product comparison
- **Rate Limiting**: Free tier (10 searches/month) and Premium (unlimited)
- **Dashboard**: Overview of usage and saved items

## State Management

Uses Zustand for simple, efficient state management:
- Authentication (token, user)
- Saved items
- Comparisons
- API usage quota
- UI state (loading, errors)

## API Integration

All API calls are made through the `api` instance in `store/api.ts`:
- Automatic JWT token injection
- Error handling and auto-logout on 401
- Base URL configuration
- Request/response interceptors

## Styling

Uses Shopify Polaris design system for consistent UI with Shopify admin.
