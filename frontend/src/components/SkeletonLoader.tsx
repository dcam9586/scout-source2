/**
 * SkeletonLoader Component
 * Provides loading placeholders for better perceived performance
 * 
 * Research: Skeleton screens reduce perceived wait time by up to 50%
 * compared to traditional spinners (UX Collective, 2020)
 */

import React, { useState, useEffect } from 'react';
import '../styles/components.css';

// Loading messages that cycle to keep users engaged during long API calls
const LOADING_MESSAGES = [
  { text: 'Searching Alibaba...', icon: '🔍' },
  { text: 'Contacting Made-in-China...', icon: '🌏' },
  { text: 'Checking CJ Dropshipping...', icon: '📦' },
  { text: 'Analyzing MOQs...', icon: '📊' },
  { text: 'Comparing prices...', icon: '💰' },
  { text: 'Calculating shipping costs...', icon: '🚚' },
  { text: 'Verifying suppliers...', icon: '✅' },
  { text: 'Almost there...', icon: '⏳' },
];

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

/**
 * Search Loading Component with cycling messages
 * Keeps users engaged during long API calls to multiple suppliers
 */
interface SearchLoadingSkeletonProps {
  query?: string;
}

export const SearchLoadingSkeleton: React.FC<SearchLoadingSkeletonProps> = ({ query }) => {
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Cycle through messages every 2 seconds
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000);

    // Animate progress bar
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return prev; // Cap at 95% until actual completion
        return prev + Math.random() * 8;
      });
    }, 500);

    return () => {
      clearInterval(messageInterval);
      clearInterval(progressInterval);
    };
  }, []);

  const currentMessage = LOADING_MESSAGES[messageIndex];

  return (
    <div className="search-loading-skeleton" role="status" aria-live="polite">
      {/* Header with query */}
      <div className="search-loading-skeleton__header">
        <h2 className="search-loading-skeleton__title">
          {query ? `Searching for "${query}"` : 'Searching suppliers...'}
        </h2>
        <p className="search-loading-skeleton__subtitle">
          Scanning multiple platforms to find the best deals
        </p>
      </div>

      {/* Animated loading message */}
      <div className="search-loading-skeleton__message">
        <span className="search-loading-skeleton__icon">{currentMessage.icon}</span>
        <span className="search-loading-skeleton__text">{currentMessage.text}</span>
      </div>

      {/* Progress bar */}
      <div className="search-loading-skeleton__progress-container">
        <div 
          className="search-loading-skeleton__progress-bar"
          style={{ width: `${Math.min(progress, 95)}%` }}
        />
      </div>

      {/* Skeleton Cards Grid */}
      <div className="search-loading-skeleton__grid">
        {/* Desktop Table Skeleton */}
        <div className="skeleton-table skeleton-table--desktop">
          <div className="skeleton-table__header">
            <div className="skeleton skeleton-table__cell" style={{ width: '50px' }}></div>
            <div className="skeleton skeleton-table__cell" style={{ flex: 2 }}></div>
            <div className="skeleton skeleton-table__cell" style={{ width: '100px' }}></div>
            <div className="skeleton skeleton-table__cell" style={{ width: '80px' }}></div>
            <div className="skeleton skeleton-table__cell" style={{ width: '80px' }}></div>
            <div className="skeleton skeleton-table__cell" style={{ width: '120px' }}></div>
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton-table__row" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="skeleton skeleton-table__cell skeleton-table__image"></div>
              <div className="skeleton skeleton-table__cell" style={{ flex: 2 }}></div>
              <div className="skeleton skeleton-table__cell" style={{ width: '100px' }}></div>
              <div className="skeleton skeleton-table__cell" style={{ width: '80px' }}></div>
              <div className="skeleton skeleton-table__cell" style={{ width: '80px' }}></div>
              <div className="skeleton skeleton-table__cell" style={{ width: '120px' }}></div>
            </div>
          ))}
        </div>

        {/* Mobile Cards Skeleton */}
        <div className="skeleton-cards skeleton-cards--mobile">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton-mobile-card" style={{ animationDelay: `${i * 0.15}s` }}>
              <div className="skeleton skeleton-mobile-card__image"></div>
              <div className="skeleton-mobile-card__content">
                <div className="skeleton skeleton-mobile-card__title"></div>
                <div className="skeleton skeleton-mobile-card__subtitle"></div>
                <div className="skeleton-mobile-card__meta">
                  <div className="skeleton skeleton-mobile-card__price"></div>
                  <div className="skeleton skeleton-mobile-card__moq"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Screen reader text */}
      <span className="sr-only">
        Loading search results, please wait. {currentMessage.text}
      </span>
    </div>
  );
};

export default SkeletonGrid;
