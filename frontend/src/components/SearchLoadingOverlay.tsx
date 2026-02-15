/**
 * SearchLoadingOverlay Component
 * Animated loading screen with a scout traveling to different sources
 */

import React, { useState, useEffect } from 'react';
import './SearchLoadingOverlay.css';

interface SearchLoadingOverlayProps {
  isVisible: boolean;
  sources: string[];
  query: string;
}

const SOURCE_INFO: Record<string, { name: string; icon: string; color: string }> = {
  'alibaba': {
    name: 'Alibaba',
    icon: '🏭',
    color: '#FF6A00',
  },
  'made-in-china': {
    name: 'Made-in-China',
    icon: '🇨🇳',
    color: '#E31937',
  },
  'cj-dropshipping': {
    name: 'CJ Dropshipping',
    icon: '📦',
    color: '#1890FF',
  },
};

const LOADING_MESSAGES = [
  "Our scouts are on the move! 🚗💨",
  "Searching through millions of products...",
  "Finding the best deals for you...",
  "Comparing prices across suppliers...",
  "Almost there! Great finds incoming...",
  "Negotiating the best MOQ for you... 😉",
  "Checking supplier ratings...",
  "Scanning warehouses worldwide...",
  "Your products are being discovered!",
];

const SearchLoadingOverlay: React.FC<SearchLoadingOverlayProps> = ({
  isVisible,
  sources,
  query,
}) => {
  const [currentMessage, setCurrentMessage] = useState(0);
  const [activeSourceIndex, setActiveSourceIndex] = useState(0);
  const [completedSources, setCompletedSources] = useState<string[]>([]);

  // Rotate messages
  useEffect(() => {
    if (!isVisible) return;
    
    const messageInterval = setInterval(() => {
      setCurrentMessage((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 3000);

    return () => clearInterval(messageInterval);
  }, [isVisible]);

  // Animate through sources
  useEffect(() => {
    if (!isVisible) {
      setActiveSourceIndex(0);
      setCompletedSources([]);
      return;
    }

    const sourceInterval = setInterval(() => {
      setActiveSourceIndex((prev) => {
        const next = prev + 1;
        if (next <= sources.length) {
          // Mark previous source as completed
          if (sources[prev]) {
            setCompletedSources((completed) => [...completed, sources[prev]]);
          }
        }
        return next >= sources.length ? 0 : next;
      });
    }, 2500);

    return () => clearInterval(sourceInterval);
  }, [isVisible, sources]);

  if (!isVisible) return null;

  return (
    <div className="search-loading-overlay">
      <div className="loading-content">
        {/* Scout Vehicle Animation */}
        <div className="scout-container">
          <div className="road">
            <div className="road-line"></div>
          </div>
          
          <div className="scout-vehicle">
            <div className="car-body">
              <div className="car-top"></div>
              <div className="car-bottom"></div>
              <div className="car-window"></div>
              <div className="headlight"></div>
              <div className="exhaust">
                <span className="smoke">💨</span>
                <span className="smoke delay-1">💨</span>
                <span className="smoke delay-2">💨</span>
              </div>
            </div>
            <div className="wheel wheel-front"></div>
            <div className="wheel wheel-back"></div>
            <div className="scout-flag">🔍</div>
          </div>
        </div>

        {/* Source Destinations */}
        <div className="source-destinations">
          {sources.map((source, index) => {
            const info = SOURCE_INFO[source] || { name: source, icon: '🏢', color: '#666' };
            const isActive = index === activeSourceIndex;
            const isCompleted = completedSources.includes(source);
            
            return (
              <div
                key={source}
                className={`source-stop ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                style={{ '--source-color': info.color } as React.CSSProperties}
              >
                <div className="source-icon">
                  {isCompleted ? '✅' : info.icon}
                </div>
                <div className="source-name">{info.name}</div>
                {isActive && <div className="searching-indicator">Searching...</div>}
              </div>
            );
          })}
        </div>

        {/* Query Display */}
        <div className="search-query">
          <span className="query-label">Looking for:</span>
          <span className="query-text">"{query}"</span>
        </div>

        {/* Loading Message */}
        <div className="loading-message">
          <p className="message-text">{LOADING_MESSAGES[currentMessage]}</p>
        </div>

        {/* Progress Dots */}
        <div className="progress-dots">
          <span className="dot"></span>
          <span className="dot"></span>
          <span className="dot"></span>
        </div>

        {/* Fun Facts */}
        <div className="fun-fact">
          <span className="fact-icon">💡</span>
          <span className="fact-text">
            SourceScout searches {sources.length} platforms simultaneously to find you the best deals!
          </span>
        </div>
      </div>
    </div>
  );
};

export default SearchLoadingOverlay;
