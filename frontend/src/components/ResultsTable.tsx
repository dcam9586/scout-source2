/**
 * ResultsTable Component
 * Responsive data display for search results
 * - Card View for mobile (block) - better readability on small screens
 * - Table View for desktop (hidden md:block) - efficient data comparison
 */

import React, { useState } from 'react';
import { ProductCardProps } from './ProductCard';
import useAppStore from '../store/appStore';
import { getTierConfig, SubscriptionTier } from '../config/subscriptions';
import '../styles/components.css';

export interface ResultsTableProps {
  results: ProductCardProps[];
  savedProductUrls?: Set<string>;
  savingProductId?: string | null;
  onSave?: (product: ProductCardProps) => void;
  onCompare?: (product: ProductCardProps) => void;
  onViewDetails?: (product: ProductCardProps) => void;
}

const sourceColors: Record<string, string> = {
  alibaba: '#E62E04',
  'made-in-china': '#2563EB',
  shopify_global: '#008060',
  'cj-dropshipping': '#7C3AED',
};

const sourceLabels: Record<string, string> = {
  alibaba: 'Alibaba',
  'made-in-china': 'Made-in-China',
  shopify_global: 'Shopify',
  'cj-dropshipping': 'CJ Dropship',
};

// View mode options
type ViewMode = 'table' | 'cards';
type ColumnCount = 1 | 2 | 3 | 4;

const ResultsTable: React.FC<ResultsTableProps> = ({
  results,
  savedProductUrls = new Set(),
  savingProductId = null,
  onSave,
  onCompare,
  onViewDetails,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [columnCount, setColumnCount] = useState<ColumnCount>(4);
  
  // Get user's subscription tier to determine if we should show source names
  const subscription = useAppStore((state) => state.subscription);
  const showUpgradeModal = useAppStore((state) => state.showUpgradeModal);
  const userTier: SubscriptionTier = (subscription?.tier as SubscriptionTier) || 'free';
  const tierConfig = getTierConfig(userTier);
  const canShowSources = tierConfig.features.showSourceNames;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const formatPrice = (price?: number, currency?: string) => {
    if (price === undefined || price === null) return 'Contact';
    const currencySymbol = currency === 'USD' ? '$' : currency || '$';
    return `${currencySymbol}${price.toFixed(2)}`;
  };

  const formatMOQ = (moq?: number) => {
    if (!moq || moq <= 1) return 'No MOQ';
    return `${moq} units`;
  };

  const renderRating = (rating?: number, reviews?: number) => {
    if (!rating) return null;
    return (
      <div className="results-table__rating">
        <span className="results-table__stars">
          {'★'.repeat(Math.floor(rating))}
          {'☆'.repeat(5 - Math.floor(rating))}
        </span>
        <span className="results-table__rating-value">{rating.toFixed(1)}</span>
        {reviews && <span className="results-table__reviews">({reviews})</span>}
      </div>
    );
  };

  if (results.length === 0) {
    return (
      <div className="results-table__empty">
        <div className="results-table__empty-icon">🔍</div>
        <h3>No products found</h3>
        <p>Try adjusting your search query or filters</p>
      </div>
    );
  }

  return (
    <div className="results-table-container">
      {/* View Mode Controls */}
      <div className="results-view-controls">
        <div className="results-view-controls__left">
          <button 
            className={`results-view-controls__btn ${viewMode === 'cards' ? 'results-view-controls__btn--active' : ''}`}
            onClick={() => setViewMode('cards')}
            title="Card View"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            Cards
          </button>
          <button 
            className={`results-view-controls__btn ${viewMode === 'table' ? 'results-view-controls__btn--active' : ''}`}
            onClick={() => setViewMode('table')}
            title="Table View"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
            Table
          </button>
        </div>
        
        {viewMode === 'cards' && (
          <div className="results-view-controls__right">
            <span className="results-view-controls__label">Columns:</span>
            <div className="results-view-controls__columns">
              {([1, 2, 3, 4] as ColumnCount[]).map((num) => (
                <button
                  key={num}
                  className={`results-view-controls__col-btn ${columnCount === num ? 'results-view-controls__col-btn--active' : ''}`}
                  onClick={() => setColumnCount(num)}
                  title={`${num} column${num > 1 ? 's' : ''}`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      {viewMode === 'table' && (
      <div className="results-table results-table--desktop">
        <table>
          <thead>
            <tr>
              <th className="results-table__th results-table__th--checkbox">
                <input 
                  type="checkbox" 
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIds(new Set(results.map(r => r.id)));
                    } else {
                      setSelectedIds(new Set());
                    }
                  }}
                  checked={selectedIds.size === results.length && results.length > 0}
                  aria-label="Select all products"
                />
              </th>
              <th className="results-table__th results-table__th--image">Image</th>
              <th className="results-table__th results-table__th--product">Product</th>
              <th className="results-table__th results-table__th--source">Source</th>
              <th className="results-table__th results-table__th--price">Price</th>
              <th className="results-table__th results-table__th--moq">MOQ</th>
              <th className="results-table__th results-table__th--shipping">Shipping</th>
              <th className="results-table__th results-table__th--rating">Rating</th>
              <th className="results-table__th results-table__th--actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {results.map((product) => {
              const isSaved = savedProductUrls.has(product.id) || product.isSaved;
              const isSaving = savingProductId === product.id || product.isSaving;
              
              return (
                <tr 
                  key={product.id} 
                  className={`results-table__row ${selectedIds.has(product.id) ? 'results-table__row--selected' : ''}`}
                >
                  <td className="results-table__td results-table__td--checkbox">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.has(product.id)}
                      onChange={() => toggleSelect(product.id)}
                      aria-label={`Select ${product.title}`}
                    />
                  </td>
                  <td className="results-table__td results-table__td--image">
                    <div className="results-table__image-wrapper">
                      <img 
                        src={product.image || 'https://via.placeholder.com/60x60?text=No+Image'} 
                        alt={product.title}
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/60x60?text=No+Image';
                        }}
                      />
                    </div>
                  </td>
                  <td className="results-table__td results-table__td--product">
                    <div className="results-table__product-info">
                      <span className="results-table__product-title" title={product.title}>
                        {product.title}
                      </span>
                      <span className="results-table__product-supplier">
                        {product.supplier}
                      </span>
                    </div>
                  </td>
                  <td className="results-table__td results-table__td--source">
                    {canShowSources ? (
                      <span 
                        className="results-table__source-badge"
                        style={{ backgroundColor: sourceColors[product.source] || '#6B7280' }}
                      >
                        {sourceLabels[product.source] || product.source}
                      </span>
                    ) : (
                      <span 
                        className="results-table__source-badge results-table__source-badge--locked"
                        style={{ backgroundColor: '#9CA3AF', cursor: 'pointer' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          showUpgradeModal('showSourceNames');
                        }}
                        title="Upgrade to see supplier source"
                      >
                        🔒 PRO
                      </span>
                    )}
                  </td>
                  <td className="results-table__td results-table__td--price">
                    <span className="results-table__price">
                      {formatPrice(product.price, product.currency)}
                    </span>
                    {product.originalPrice && product.originalPrice > (product.price || 0) && (
                      <span className="results-table__original-price">
                        {formatPrice(product.originalPrice, product.currency)}
                      </span>
                    )}
                  </td>
                  <td className="results-table__td results-table__td--moq">
                    {formatMOQ(product.moq)}
                  </td>
                  <td className="results-table__td results-table__td--shipping">
                    {product.freeShipping ? (
                      <span className="results-table__free-shipping">Free</span>
                    ) : product.deliveryDays ? (
                      <span>{product.deliveryDays} days</span>
                    ) : (
                      <span className="results-table__shipping-contact">Contact</span>
                    )}
                  </td>
                  <td className="results-table__td results-table__td--rating">
                    {renderRating(product.rating, product.reviews)}
                  </td>
                  <td className="results-table__td results-table__td--actions">
                    <div className="results-table__actions">
                      <button
                        className={`results-table__action-btn results-table__action-btn--save ${isSaved ? 'results-table__action-btn--saved' : ''}`}
                        onClick={() => onSave?.(product)}
                        disabled={isSaving || isSaved}
                        title={isSaved ? 'Saved' : 'Save'}
                        aria-label={isSaved ? 'Product saved' : 'Save product'}
                      >
                        {isSaving ? '...' : isSaved ? '✓' : '♡'}
                      </button>
                      <button
                        className="results-table__action-btn results-table__action-btn--compare"
                        onClick={() => onCompare?.(product)}
                        title="Compare"
                        aria-label="Add to comparison"
                      >
                        ⚖
                      </button>
                      <button
                        className="results-table__action-btn results-table__action-btn--view"
                        onClick={() => onViewDetails?.(product)}
                        title="View Details"
                        aria-label="View product details"
                      >
                        →
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}

      {/* Card View - Responsive grid with adjustable columns */}
      {viewMode === 'cards' && (
      <div 
        className="results-cards-grid"
        style={{ '--column-count': columnCount } as React.CSSProperties}
      >
        {results.map((product) => {
          const isSaved = savedProductUrls.has(product.id) || product.isSaved;
          const isSaving = savingProductId === product.id || product.isSaving;
          
          return (
            <div key={product.id} className="results-card">
              {/* Product Image - Full width at top */}
              <div className="results-card__image-container">
                <img 
                  src={product.image || 'https://via.placeholder.com/300x200?text=No+Image'} 
                  alt={product.title}
                  className="results-card__image"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x200?text=No+Image';
                  }}
                />
                {canShowSources ? (
                  <span 
                    className="results-card__source-badge"
                    style={{ backgroundColor: sourceColors[product.source] || '#6B7280' }}
                  >
                    {sourceLabels[product.source] || product.source}
                  </span>
                ) : (
                  <span 
                    className="results-card__source-badge results-card__source-badge--locked"
                    style={{ backgroundColor: '#9CA3AF', cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      showUpgradeModal('showSourceNames');
                    }}
                    title="Upgrade to see supplier source"
                  >
                    🔒 PRO
                  </span>
                )}
              </div>

              {/* Product Content */}
              <div className="results-card__content">
                <h3 className="results-card__title">{product.title}</h3>
                <p className="results-card__supplier">{product.supplier}</p>

                {/* Price and MOQ - Highlighted */}
                <div className="results-card__highlights">
                  <div className="results-card__highlight results-card__highlight--price">
                    <span className="results-card__highlight-label">Price</span>
                    <span className="results-card__highlight-value">
                      {formatPrice(product.price, product.currency)}
                    </span>
                    {product.originalPrice && product.originalPrice > (product.price || 0) && (
                      <span className="results-card__original-price">
                        {formatPrice(product.originalPrice, product.currency)}
                      </span>
                    )}
                  </div>
                  <div className="results-card__highlight results-card__highlight--moq">
                    <span className="results-card__highlight-label">MOQ</span>
                    <span className="results-card__highlight-value">{formatMOQ(product.moq)}</span>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="results-card__meta">
                  <div className="results-card__meta-item">
                    <span className="results-card__meta-label">Shipping:</span>
                    <span className="results-card__meta-value">
                      {product.freeShipping ? '🚚 Free' : product.deliveryDays ? `${product.deliveryDays} days` : 'Contact'}
                    </span>
                  </div>
                  {product.rating && (
                    <div className="results-card__meta-item">
                      <span className="results-card__meta-label">Rating:</span>
                      <span className="results-card__meta-value">
                        ⭐ {product.rating.toFixed(1)} {product.reviews && `(${product.reviews})`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="results-card__actions">
                  <button
                    className={`results-card__action-btn results-card__action-btn--save ${isSaved ? 'results-card__action-btn--saved' : ''}`}
                    onClick={() => onSave?.(product)}
                    disabled={isSaving || isSaved}
                  >
                    {isSaving ? '...' : isSaved ? '✓' : '♡'}
                  </button>
                  <button
                    className="results-card__action-btn results-card__action-btn--compare"
                    onClick={() => onCompare?.(product)}
                  >
                    ⚖
                  </button>
                  <button
                    className="results-card__action-btn results-card__action-btn--view"
                    onClick={() => onViewDetails?.(product)}
                  >
                    →
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
};

export default ResultsTable;
