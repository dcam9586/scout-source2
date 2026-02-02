/**
 * SearchResults Component
 * Displays search results with filters, sorting, and product grid
 * Supports products from Alibaba, Made-in-China, Shopify, and CJ Dropshipping
 */

import React, { useState } from 'react';
import ProductCard, { ProductCardProps } from './ProductCard';
import '../styles/components.css';

export interface SearchResultsProps {
  query: string;
  results: ProductCardProps[];
  isLoading?: boolean;
  totalCount?: number;
  sources?: {
    alibaba?: number;
    madeInChina?: number;
    shopifyGlobal?: number;
    cjDropshipping?: number;
  };
  savedProductUrls?: Set<string>;
  savingProductId?: string | null;
  onSave?: (product: ProductCardProps) => void;
  onCompare?: (product: ProductCardProps) => void;
  onViewDetails?: (product: ProductCardProps) => void;
}

type SortBy = 'relevance' | 'price-low' | 'price-high' | 'rating' | 'newest';
type FilterSource = 'all' | 'alibaba' | 'made-in-china' | 'shopify' | 'cj-dropshipping';

const SearchResults: React.FC<SearchResultsProps> = ({
  query,
  results,
  isLoading,
  totalCount = results.length,
  sources = {},
  savedProductUrls = new Set(),
  savingProductId = null,
  onSave,
  onCompare,
  onViewDetails,
}) => {
  const [sortBy, setSortBy] = useState<SortBy>('relevance');
  const [filterSource, setFilterSource] = useState<FilterSource>('all');

  // Filter results
  const filteredResults = results.filter((product) => {
    if (filterSource === 'all') return true;
    if (filterSource === 'alibaba') return product.source === 'alibaba';
    if (filterSource === 'made-in-china') return product.source === 'made-in-china';
    if (filterSource === 'shopify') return product.source === 'shopify_global';
    if (filterSource === 'cj-dropshipping') return product.source === 'cj-dropshipping';
    return true;
  });

  // Sort results
  const sortedResults = [...filteredResults].sort((a, b) => {
    switch (sortBy) {
      case 'price-low':
        return (a.price || 0) - (b.price || 0);
      case 'price-high':
        return (b.price || 0) - (a.price || 0);
      case 'rating':
        return (b.rating || 0) - (a.rating || 0);
      case 'newest':
        return b.id.localeCompare(a.id);
      case 'relevance':
      default:
        return 0;
    }
  });

  if (isLoading) {
    return (
      <div className="search-results search-results--loading" role="status" aria-live="polite">
        <div className="search-results__spinner" aria-label="Loading search results">
          <div className="spinner"></div>
          <p>Searching for "{query}"...</p>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="search-results search-results--empty" role="status">
        <div className="search-results__empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <h2>No products found</h2>
          <p>Try adjusting your search query or filters</p>
        </div>
      </div>
    );
  }

  return (
    <div className="search-results" role="region" aria-label="Search results">
      {/* Header */}
      <div className="search-results__header">
        <div>
          <h2>Search Results</h2>
          <p className="search-results__query">
            Results for "<strong>{query}</strong>" ({totalCount} found)
          </p>
        </div>
      </div>

      {/* Source Breakdown */}
      {Object.keys(sources).length > 0 && (
        <div className="search-results__sources" aria-label="Results by source">
          {sources.alibaba !== undefined && (
            <div className="search-results__source-item">
              <span className="search-results__source-label">Alibaba:</span>
              <span className="search-results__source-count">{sources.alibaba}</span>
            </div>
          )}
          {sources.madeInChina !== undefined && (
            <div className="search-results__source-item">
              <span className="search-results__source-label">Made-in-China:</span>
              <span className="search-results__source-count">{sources.madeInChina}</span>
            </div>
          )}
          {sources.shopifyGlobal !== undefined && (
            <div className="search-results__source-item">
              <span className="search-results__source-label">Shopify Global:</span>
              <span className="search-results__source-count">{sources.shopifyGlobal}</span>
            </div>
          )}
          {sources.cjDropshipping !== undefined && (
            <div className="search-results__source-item">
              <span className="search-results__source-label" style={{ color: '#7C3AED' }}>CJ Dropshipping:</span>
              <span className="search-results__source-count">{sources.cjDropshipping}</span>
            </div>
          )}
        </div>
      )}

      {/* Filters & Sorting */}
      <div className="search-results__controls">
        <div className="search-results__filter">
          <label htmlFor="source-filter">Filter by Source:</label>
          <select
            id="source-filter"
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value as FilterSource)}
            className="search-results__select"
            aria-label="Filter products by source"
          >
            <option value="all">All Sources</option>
            <option value="alibaba">Alibaba</option>
            <option value="cj-dropshipping">CJ Dropshipping</option>
            <option value="made-in-china">Made-in-China</option>
            <option value="shopify">Shopify Global</option>
          </select>
        </div>

        <div className="search-results__sort">
          <label htmlFor="sort-by">Sort by:</label>
          <select
            id="sort-by"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="search-results__select"
            aria-label="Sort products by"
          >
            <option value="relevance">Relevance</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="rating">Highest Rated</option>
            <option value="newest">Newest</option>
          </select>
        </div>
      </div>

      {/* Results Grid */}
      <div className="search-results__grid">
        {sortedResults.map((product) => {
          const productUrl = (product as any).source_url || (product as any).url || product.id;
          const isSaved = savedProductUrls.has(productUrl);
          const isSaving = savingProductId === product.id;
          
          return (
            <ProductCard
              key={product.id}
              {...product}
              isSaved={isSaved}
              isSaving={isSaving}
              onSave={onSave}
              onCompare={onCompare}
              onViewDetails={onViewDetails}
            />
          );
        })}
      </div>

      {/* Results Info */}
      <div className="search-results__footer">
        <p>Showing {sortedResults.length} of {totalCount} results</p>
      </div>
    </div>
  );
};

export default SearchResults;
