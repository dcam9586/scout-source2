/**
 * SkeletonLoader Component
 * Provides loading placeholders for better perceived performance
 * 
 * Research: Skeleton screens reduce perceived wait time by up to 50%
 * compared to traditional spinners (UX Collective, 2020)
 */

import React from 'react';
import '../styles/components.css';

interface SkeletonCardProps {
  count?: number;
}

/**
 * Skeleton card for product loading states
 */
export const SkeletonCard: React.FC = () => (
  <div className="product-card skeleton-card-wrapper" aria-hidden="true">
    <div className="skeleton skeleton-image"></div>
    <div className="product-card__content">
      <div className="skeleton skeleton-text" style={{ marginBottom: '0.5rem' }}></div>
      <div className="skeleton skeleton-text skeleton-text--short"></div>
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
        <div className="skeleton skeleton-text" style={{ width: '80px', height: '2rem' }}></div>
        <div className="skeleton skeleton-text" style={{ width: '60px', height: '2rem' }}></div>
      </div>
    </div>
  </div>
);

/**
 * Grid of skeleton cards for search results loading
 */
export const SkeletonGrid: React.FC<SkeletonCardProps> = ({ count = 6 }) => (
  <div className="search-results__grid" role="status" aria-label="Loading products">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
    <span className="sr-only">Loading products, please wait...</span>
  </div>
);

/**
 * Skeleton text lines
 */
interface SkeletonTextProps {
  lines?: number;
  width?: 'short' | 'medium' | 'full';
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({ 
  lines = 1, 
  width = 'full' 
}) => {
  const widthClass = width === 'full' ? '' : `skeleton-text--${width}`;
  
  return (
    <div aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div 
          key={i} 
          className={`skeleton skeleton-text ${widthClass}`}
          style={{ marginBottom: i < lines - 1 ? '0.5rem' : 0 }}
        ></div>
      ))}
    </div>
  );
};

/**
 * Full page skeleton loader
 */
export const PageSkeleton: React.FC = () => (
  <div className="page-skeleton" aria-hidden="true">
    <div className="skeleton" style={{ height: '2rem', width: '200px', marginBottom: '1.5rem' }}></div>
    <SkeletonText lines={2} />
    <div style={{ marginTop: '2rem' }}>
      <SkeletonGrid count={6} />
    </div>
  </div>
);

export default SkeletonGrid;
