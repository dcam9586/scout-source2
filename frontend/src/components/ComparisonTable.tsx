/**
 * ComparisonTable Component
 * Side-by-side product comparison with detailed specifications
 */

import React, { useState } from 'react';
import { ProductCardProps } from './ProductCard';
import '../styles/components.css';

interface ComparisonTableProps {
  products: ProductCardProps[];
  isLoading?: boolean;
  onRemove?: (productId: string) => void;
  onRemoveProduct?: (productId: string) => void;
  onSave?: (products: ProductCardProps[]) => void;
  onPrint?: () => void;
  onSaveComparison?: () => Promise<void>;
}

const ComparisonTable: React.FC<ComparisonTableProps> = ({ 
  products, 
  isLoading = false,
  onRemove, 
  onRemoveProduct,
  onSave,
  onPrint,
  onSaveComparison,
}) => {
  const [selectedComparison, setSelectedComparison] = useState<string[]>([]);

  // Use onRemoveProduct if provided, fallback to onRemove
  const handleRemove = onRemoveProduct || onRemove;

  if (isLoading) {
    return (
      <div className="comparison-loading" role="status">
        <p>Loading comparison...</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="comparison-empty" role="status">
        <div className="comparison-empty__content">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          <h3>No products to compare</h3>
          <p>Add products from search results to start comparing</p>
        </div>
      </div>
    );
  }

  const getSourceColor = (source: string) => {
    const colors: Record<string, string> = {
      alibaba: '#E62E04',
      'made-in-china': '#2563EB',
      shopify_global: '#008060',
    };
    return colors[source] || '#666';
  };

  return (
    <div className="comparison-table" role="region" aria-label="Product comparison">
      <div className="comparison-table__header">
        <h2>Compare Products</h2>
        <p>Side-by-side comparison of your selected products</p>
      </div>

      <div className="comparison-table__wrapper">
        <table className="comparison-table__grid">
          <thead>
            <tr>
              <th className="comparison-table__spec-column">Specification</th>
              {products.map((product) => (
                <th key={product.id} className="comparison-table__product-column">
                  <div className="comparison-table__product-header">
                    <img
                      src={product.image || '/placeholder.png'}
                      alt={product.title}
                      className="comparison-table__product-image"
                    />
                    <div className="comparison-table__product-info">
                      <h4>{product.title}</h4>
                      <span
                        className="comparison-table__source-badge"
                        style={{ backgroundColor: getSourceColor(product.source) }}
                      >
                        {product.source === 'shopify_global'
                          ? 'Shopify'
                          : product.source.replace('-', ' ').toUpperCase()}
                      </span>
                    </div>
                    <button
                      className="comparison-table__remove-btn"
                      onClick={() => onRemove?.(product.id)}
                      aria-label={`Remove ${product.title} from comparison`}
                      title="Remove from comparison"
                    >
                      ✕
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Price Row */}
            <tr>
              <td className="comparison-table__spec-label">Price</td>
              {products.map((product) => (
                <td key={`price-${product.id}`} className="comparison-table__cell">
                  {product.price ? (
                    <span className="comparison-table__price">
                      {product.currency} ${product.price.toFixed(2)}
                    </span>
                  ) : (
                    <span className="comparison-table__na">N/A</span>
                  )}
                </td>
              ))}
            </tr>

            {/* Minimum Order Quantity */}
            <tr>
              <td className="comparison-table__spec-label">MOQ</td>
              {products.map((product) => (
                <td key={`moq-${product.id}`} className="comparison-table__cell">
                  <span className="comparison-table__moq">{product.moq || 1} units</span>
                </td>
              ))}
            </tr>

            {/* Supplier */}
            <tr>
              <td className="comparison-table__spec-label">Supplier</td>
              {products.map((product) => (
                <td key={`supplier-${product.id}`} className="comparison-table__cell">
                  <span className="comparison-table__supplier">{product.supplier}</span>
                </td>
              ))}
            </tr>

            {/* Rating */}
            <tr>
              <td className="comparison-table__spec-label">Rating</td>
              {products.map((product) => (
                <td key={`rating-${product.id}`} className="comparison-table__cell">
                  {product.rating ? (
                    <div className="comparison-table__rating">
                      <span className="comparison-table__stars">
                        {'★'.repeat(Math.round(product.rating))}
                        {'☆'.repeat(5 - Math.round(product.rating))}
                      </span>
                      <span className="comparison-table__rating-text">
                        {product.rating.toFixed(1)}/5
                        {product.reviews && ` (${product.reviews} reviews)`}
                      </span>
                    </div>
                  ) : (
                    <span className="comparison-table__na">N/A</span>
                  )}
                </td>
              ))}
            </tr>

            {/* Price per Unit (Calculated) */}
            <tr>
              <td className="comparison-table__spec-label">Unit Price</td>
              {products.map((product) => (
                <td key={`unit-price-${product.id}`} className="comparison-table__cell">
                  {product.price && product.moq ? (
                    <span className="comparison-table__unit-price">
                      ${(product.price / product.moq).toFixed(4)}
                    </span>
                  ) : (
                    <span className="comparison-table__na">N/A</span>
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="comparison-table__actions">
        <button
          className="comparison-table__action-btn comparison-table__action-btn--primary"
          onClick={() => onSaveComparison ? onSaveComparison() : onSave?.(products)}
          aria-label="Save this comparison"
        >
          Save Comparison
        </button>
        <button
          className="comparison-table__action-btn comparison-table__action-btn--secondary"
          onClick={() => onPrint ? onPrint() : window.print()}
          aria-label="Print comparison table"
        >
          Print
        </button>
      </div>
    </div>
  );
};

export default ComparisonTable;
