/**
 * ProductCard Component
 * Displays a single product with image, title, pricing, supplier info, and actions
 * Supports products from Alibaba, Made-in-China, Shopify, and CJ Dropshipping
 */

import React from 'react';
import useAppStore from '../store/appStore';
import { getTierConfig, SubscriptionTier } from '../config/subscriptions';
import '../styles/components.css';

export interface ProductCardProps {
  id: string;
  title: string;
  image?: string;
  price?: number;
  currency?: string;
  supplier: string;
  moq?: number;
  rating?: number;
  reviews?: number;
  source: 'alibaba' | 'made-in-china' | 'shopify_global' | 'cj-dropshipping';
  // Supplier quality metrics (unique to SourceScout)
  supplierRating?: number; // 0-5 scale
  supplierResponseRate?: number; // 0-100
  supplierTransactionLevel?: string; // Gold, Silver, etc.
  supplierYearsInBusiness?: number;
  // CJ Dropshipping specific fields
  freeShipping?: boolean;
  deliveryDays?: number | string;
  warehouseStock?: number;
  discountPercent?: number;
  originalPrice?: number;
  variants?: any[];
  // Save state props
  isSaved?: boolean;
  isSaving?: boolean;
  // Hide default action buttons (for SavedItems page)
  hideActions?: boolean;
  onSave?: (product: ProductCardProps) => void;
  onCompare?: (product: ProductCardProps) => void;
  onViewDetails?: (product: ProductCardProps) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
  id,
  title,
  image,
  price,
  currency = 'USD',
  supplier,
  moq = 1,
  rating,
  reviews,
  source,
  supplierRating,
  supplierResponseRate,
  supplierTransactionLevel,
  supplierYearsInBusiness,
  freeShipping,
  deliveryDays,
  warehouseStock,
  discountPercent,
  originalPrice,
  variants,
  isSaved = false,
  isSaving = false,
  hideActions = false,
  onSave,
  onCompare,
  onViewDetails,
}) => {
  // Get user's subscription tier to determine if we should show source names
  const subscription = useAppStore((state) => state.subscription);
  const showUpgradeModal = useAppStore((state) => state.showUpgradeModal);
  const userTier: SubscriptionTier = (subscription?.tier as SubscriptionTier) || 'free';
  const tierConfig = getTierConfig(userTier);
  const canShowSources = tierConfig.features.showSourceNames;

  const sourceColors: Record<string, string> = {
    alibaba: '#E62E04',
    'made-in-china': '#2563EB',
    shopify_global: '#008060',
    'cj-dropshipping': '#7C3AED', // Purple for CJ
  };

  const sourceLabels: Record<string, string> = {
    alibaba: 'ALIBABA',
    'made-in-china': 'MADE-IN-CHINA',
    shopify_global: 'Shopify',
    'cj-dropshipping': 'CJ DROP',
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    onSave?.({ id, title, image, price, currency, supplier, moq, rating, reviews, source, freeShipping, deliveryDays, warehouseStock });
  };

  const handleCompare = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    onCompare?.({ id, title, image, price, currency, supplier, moq, rating, reviews, source, freeShipping, deliveryDays, warehouseStock });
  };

  const handleViewDetails = () => {
    onViewDetails?.({ id, title, image, price, currency, supplier, moq, rating, reviews, source, freeShipping, deliveryDays, warehouseStock });
  };

  // Make entire card clickable to view details
  const handleCardClick = () => {
    onViewDetails?.({ id, title, image, price, currency, supplier, moq, rating, reviews, source, freeShipping, deliveryDays, warehouseStock });
  };

  return (
    <div 
      className="product-card" 
      role="article" 
      aria-label={`Product: ${title}`}
      onClick={handleCardClick}
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleCardClick()}
    >
      {/* Product Image */}
      <div className="product-card__image-container">
        {image ? (
          <img src={image} alt={title} className="product-card__image" />
        ) : (
          <div className="product-card__image-placeholder">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
        )}
        {canShowSources ? (
          <span
            className="product-card__source-badge"
            style={{ backgroundColor: sourceColors[source] }}
            aria-label={`Source: ${source.replace('_', ' ')}`}
          >
            {sourceLabels[source] || source.toUpperCase()}
          </span>
        ) : (
          <span
            className="product-card__source-badge product-card__source-badge--locked"
            style={{ backgroundColor: '#9CA3AF', cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              showUpgradeModal('showSourceNames');
            }}
            aria-label="Upgrade to see source"
            title="Upgrade to Pro to see supplier source"
          >
            🔒 PRO
          </span>
        )}

        {/* Floating Heart Save Icon */}
        <button
          className={`product-card__heart-btn ${isSaved ? 'product-card__heart-btn--saved' : ''}`}
          onClick={handleSave}
          disabled={isSaved || isSaving}
          aria-label={isSaved ? `${title} is saved` : `Save ${title}`}
          title={isSaved ? 'Saved to your list' : 'Save for later'}
        >
          {isSaving ? (
            <svg className="product-card__heart-loading" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          )}
        </button>
        
        {/* CJ Dropshipping badges */}
        {source === 'cj-dropshipping' && (
          <div className="product-card__cj-badges" style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}>
            {freeShipping && (
              <span style={{
                background: '#10b981',
                color: 'white',
                fontSize: '10px',
                fontWeight: '600',
                padding: '2px 6px',
                borderRadius: '4px',
              }}>
                FREE SHIP
              </span>
            )}
            {discountPercent && discountPercent > 0 && (
              <span style={{
                background: '#ef4444',
                color: 'white',
                fontSize: '10px',
                fontWeight: '600',
                padding: '2px 6px',
                borderRadius: '4px',
              }}>
                -{discountPercent}%
              </span>
            )}
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="product-card__content">
        <h3 className="product-card__title" title={title}>
          {title}
        </h3>

        {/* Supplier & Rating */}
        <div className="product-card__supplier">
          <span className="product-card__supplier-name">{supplier}</span>
          
          {/* Supplier Quality Metrics - SourceScout's unique value */}
          {(supplierRating || supplierResponseRate) && (
            <div style={{ fontSize: '0.8rem', marginTop: '0.4rem', display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
              {supplierRating !== undefined && (
                <span style={{ color: '#f59e0b', fontWeight: '600' }}>
                  ⭐ {supplierRating.toFixed(1)} rating
                </span>
              )}
              {supplierResponseRate !== undefined && (
                <span style={{ color: '#10b981' }}>
                  ✓ {supplierResponseRate.toFixed(0)}% response
                </span>
              )}
              {supplierTransactionLevel && (
                <span style={{ color: '#8b5cf6', fontWeight: '500' }}>
                  {supplierTransactionLevel}
                </span>
              )}
            </div>
          )}
          
          {/* CJ Dropshipping specific info */}
          {source === 'cj-dropshipping' && (deliveryDays || warehouseStock !== undefined) && (
            <div style={{ fontSize: '0.8rem', marginTop: '0.4rem', display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
              {deliveryDays && (
                <span style={{ color: '#3b82f6' }}>
                  🚚 {deliveryDays} days delivery
                </span>
              )}
              {warehouseStock !== undefined && warehouseStock > 0 && (
                <span style={{ color: warehouseStock > 100 ? '#10b981' : '#f59e0b' }}>
                  📦 {warehouseStock} in stock
                </span>
              )}
              {variants && variants.length > 1 && (
                <span style={{ color: '#8b5cf6' }}>
                  🎨 {variants.length} variants
                </span>
              )}
            </div>
          )}
          
          {rating && (

            <div className="product-card__rating" aria-label={`Rating: ${rating} out of 5`}>
              <span className="product-card__stars">
                {'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))}
              </span>
              <span className="product-card__rating-value">
                {rating.toFixed(1)} {reviews && `(${reviews})`}
              </span>
            </div>
          )}
        </div>

        {/* Price & MOQ */}
        <div className="product-card__meta">
          {price && (
            <div className="product-card__price">
              <span className="product-card__currency">{currency}</span>
              <span className="product-card__amount">${price.toFixed(2)}</span>
              {originalPrice && originalPrice > price && (
                <span style={{ 
                  textDecoration: 'line-through', 
                  color: '#9ca3af', 
                  fontSize: '0.85rem',
                  marginLeft: '0.5rem'
                }}>
                  ${originalPrice.toFixed(2)}
                </span>
              )}
            </div>
          )}
          <div className="product-card__moq" aria-label={`Minimum order quantity: ${moq}`}>
            MOQ: <strong>{moq}</strong>
            {source === 'cj-dropshipping' && moq === 1 && (
              <span style={{ color: '#10b981', marginLeft: '4px', fontSize: '0.8rem' }}>
                ✓ No minimum
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      {!hideActions && (
        <div className="product-card__actions">
          <button
            className="product-card__action-btn product-card__action-btn--tertiary"
            onClick={(e) => { e.stopPropagation(); handleViewDetails(); }}
            aria-label={`View details for ${title}`}
            title="View full product details"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Details
          </button>
          <button
            className="product-card__action-btn product-card__action-btn--primary"
            onClick={handleCompare}
            aria-label={`Compare ${title}`}
            title="Add to comparison"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            Compare
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductCard;
