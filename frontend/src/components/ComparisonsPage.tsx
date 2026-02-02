import React, { useState, useCallback, useEffect } from 'react';
import ComparisonTable from './ComparisonTable';
import useAppStore from '../store/appStore';

/**
 * ComparisonsPage Component
 *
 * Page wrapper for product comparison functionality. Displays a side-by-side
 * comparison of selected products with detailed specifications.
 *
 * Features:
 * - Side-by-side product comparison table
 * - Compare prices, MOQs, ratings, and calculated unit prices
 * - Remove products from comparison
 * - Print comparison table
 * - Save comparison for later reference
 * - Empty state when no products selected
 *
 * @component
 */
interface ComparisonsPageProps {}

const ComparisonsPage: React.FC<ComparisonsPageProps> = () => {
  // Use compareItems from the store
  const compareItems = useAppStore((state) => state.compareItems);
  const removeFromCompare = useAppStore((state) => state.removeFromCompare);
  const clearCompare = useAppStore((state) => state.clearCompare);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle removing a product from comparison
   */
  const handleRemoveProduct = useCallback((productId: string) => {
    removeFromCompare(productId);
  }, [removeFromCompare]);

  /**
   * Handle printing the comparison table
   */
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  /**
   * Handle clearing all comparisons
   */
  const handleClearAll = useCallback(() => {
    clearCompare();
  }, [clearCompare]);

  if (error) {
    return (
      <div className="comparisons-page" role="region" aria-label="Product comparison page">
        <div className="comparisons-page__container">
          <div
            className="comparisons-page__error"
            role="alert"
            aria-live="polite"
          >
            <h2>Error loading comparison</h2>
            <p>{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="comparisons-page__retry-btn"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (compareItems.length === 0) {
    return (
      <div className="comparisons-page" role="region" aria-label="Product comparison page">
        <div className="comparisons-page__container">
          <div className="comparisons-page__empty">
            <div className="comparisons-page__empty-content">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
                width="80"
                height="80"
              >
                <path d="M8 6h13M8 6c0-1.1-.9-2-2-2s-2 .9-2 2M8 6v12c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V6M3 6v12c0 1.1.9 2 2 2h1V6H5c-1.1 0-2 .9-2 2z" />
              </svg>
              <h2>No products to compare</h2>
              <p>
                Add products from the search results by clicking the "Compare" button.
                You can compare up to 4 products at a time.
              </p>
              <a href="/search" className="comparisons-page__link">
                Start searching for products
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Transform compareItems to the format expected by ComparisonTable
  const comparisonProducts = compareItems.map(item => ({
    id: item.id,
    name: item.title,
    image: item.image,
    price: item.price,
    currency: item.currency || 'USD',
    supplier: item.supplier,
    moq: item.moq || 1,
    rating: item.rating,
    reviews: item.reviews,
    source: item.source,
    freeShipping: item.freeShipping,
    deliveryDays: item.deliveryDays,
  }));

  return (
    <div className="comparisons-page" role="region" aria-label="Product comparison page">
      <div className="comparisons-page__header" style={{ padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Compare Products ({compareItems.length}/4)</h1>
        <button
          onClick={handleClearAll}
          style={{
            padding: '0.5rem 1rem',
            background: 'transparent',
            border: '1px solid #dc2626',
            color: '#dc2626',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Clear All
        </button>
      </div>
      <ComparisonTable
        products={comparisonProducts}
        isLoading={isLoading}
        onRemoveProduct={handleRemoveProduct}
        onPrint={handlePrint}
      />
    </div>
  );
};

export default ComparisonsPage;
