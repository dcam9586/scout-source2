/**
 * ProductDetailsModal Component
 * Shows detailed information about a product in a modal overlay
 */

import React from 'react';
import { ProductCardProps } from './ProductCard';
import '../styles/components.css';

interface ProductDetailsModalProps {
  product: ProductCardProps | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (product: ProductCardProps) => void;
  onCompare?: (product: ProductCardProps) => void;
}

const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({
  product,
  isOpen,
  onClose,
  onSave,
  onCompare,
}) => {
  if (!isOpen || !product) return null;

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
    'cj-dropshipping': 'CJ Dropshipping',
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="product-details-modal__backdrop" 
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-details-title"
    >
      <div className="product-details-modal">
        <button
          className="product-details-modal__close"
          onClick={onClose}
          aria-label="Close modal"
        >
          ×
        </button>

        <div className="product-details-modal__content">
          {/* Image Section */}
          <div className="product-details-modal__image-section">
            {product.image ? (
              <img
                src={product.image}
                alt={product.title}
                className="product-details-modal__image"
              />
            ) : (
              <div className="product-details-modal__image-placeholder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
              </div>
            )}
            <span
              className="product-details-modal__source-badge"
              style={{ backgroundColor: sourceColors[product.source] }}
            >
              {sourceLabels[product.source]}
            </span>
          </div>

          {/* Details Section */}
          <div className="product-details-modal__details">
            <h2 id="product-details-title" className="product-details-modal__title">
              {product.title}
            </h2>

            <div className="product-details-modal__supplier">
              <span className="product-details-modal__label">Supplier:</span>
              <span className="product-details-modal__value">{product.supplier}</span>
            </div>

            {product.rating && (
              <div className="product-details-modal__rating">
                <span className="product-details-modal__stars">
                  {'★'.repeat(Math.round(product.rating))}
                  {'☆'.repeat(5 - Math.round(product.rating))}
                </span>
                <span>{product.rating.toFixed(1)}</span>
                {product.reviews && <span>({product.reviews} reviews)</span>}
              </div>
            )}

            <div className="product-details-modal__price-section">
              <div className="product-details-modal__price">
                <span className="product-details-modal__currency">{product.currency || 'USD'}</span>
                <span className="product-details-modal__amount">
                  ${product.price?.toFixed(2) || 'N/A'}
                </span>
                {product.originalPrice && product.originalPrice > (product.price || 0) && (
                  <span className="product-details-modal__original-price">
                    ${product.originalPrice.toFixed(2)}
                  </span>
                )}
              </div>
              <div className="product-details-modal__moq">
                <span className="product-details-modal__label">MOQ:</span>
                <span className="product-details-modal__value">{product.moq || 1} units</span>
              </div>
            </div>

            {/* CJ Dropshipping specific info */}
            {product.source === 'cj-dropshipping' && (
              <div className="product-details-modal__cj-info">
                {product.freeShipping && (
                  <span className="product-details-modal__badge product-details-modal__badge--success">
                    🚚 Free Shipping
                  </span>
                )}
                {product.deliveryDays && (
                  <span className="product-details-modal__badge">
                    📦 {product.deliveryDays} days delivery
                  </span>
                )}
                {product.warehouseStock !== undefined && product.warehouseStock > 0 && (
                  <span className="product-details-modal__badge">
                    📊 {product.warehouseStock} in stock
                  </span>
                )}
              </div>
            )}

            {/* Supplier Metrics */}
            {(product.supplierRating || product.supplierResponseRate || product.supplierYearsInBusiness) && (
              <div className="product-details-modal__supplier-metrics">
                <h3>Supplier Details</h3>
                {product.supplierRating && (
                  <div>
                    <span className="product-details-modal__label">Rating:</span>
                    <span>{product.supplierRating.toFixed(1)} / 5</span>
                  </div>
                )}
                {product.supplierResponseRate && (
                  <div>
                    <span className="product-details-modal__label">Response Rate:</span>
                    <span>{product.supplierResponseRate}%</span>
                  </div>
                )}
                {product.supplierTransactionLevel && (
                  <div>
                    <span className="product-details-modal__label">Level:</span>
                    <span>{product.supplierTransactionLevel}</span>
                  </div>
                )}
                {product.supplierYearsInBusiness && (
                  <div>
                    <span className="product-details-modal__label">Years in Business:</span>
                    <span>{product.supplierYearsInBusiness} years</span>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="product-details-modal__actions">
              <button
                className="product-details-modal__btn product-details-modal__btn--primary"
                onClick={() => onSave?.(product)}
              >
                💾 Save Product
              </button>
              <button
                className="product-details-modal__btn product-details-modal__btn--secondary"
                onClick={() => onCompare?.(product)}
              >
                ⚖️ Add to Compare
              </button>
              <a
                href={(product as any).source_url || (product as any).url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="product-details-modal__btn product-details-modal__btn--outline"
              >
                🔗 View on {sourceLabels[product.source]}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailsModal;
