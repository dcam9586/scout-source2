/**
 * LandingPage Component
 * Professional landing page with guest search functionality
 * Shows teaser results to encourage sign-up conversion
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';

// Mock teaser results for demonstration
const TEASER_RESULTS = [
  {
    id: '1',
    title: 'Premium Yoga Mat - Extra Thick Non-Slip',
    image: 'https://via.placeholder.com/300x300?text=Yoga+Mat',
    price: 4.50,
    supplier: 'Guangzhou Sports Co.',
    moq: 50,
    rating: 4.8,
    source: 'alibaba',
    isBlurred: false,
  },
  {
    id: '2',
    title: 'Eco-Friendly Cork Yoga Mat with Strap',
    image: 'https://via.placeholder.com/300x300?text=Cork+Mat',
    price: 8.20,
    supplier: 'Shenzhen Wellness Ltd.',
    moq: 30,
    rating: 4.6,
    source: 'made-in-china',
    isBlurred: true,
  },
  {
    id: '3',
    title: 'Professional Yoga Mat 6mm TPE Material',
    image: 'https://via.placeholder.com/300x300?text=TPE+Mat',
    price: 3.80,
    supplier: 'Yiwu Fitness Factory',
    moq: 100,
    rating: 4.5,
    source: 'cj-dropshipping',
    isBlurred: true,
  },
  {
    id: '4',
    title: 'Foldable Travel Yoga Mat Lightweight',
    image: 'https://via.placeholder.com/300x300?text=Travel+Mat',
    price: 5.99,
    supplier: 'Beijing Active Gear',
    moq: 25,
    rating: 4.7,
    source: 'alibaba',
    isBlurred: true,
  },
];

interface LandingPageProps {
  onLoginClick: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showTeaser, setShowTeaser] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    
    // Simulate API delay for realistic feel
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsSearching(false);
    setShowTeaser(true);
    
    // Show signup modal after a short delay
    setTimeout(() => setShowModal(true), 2000);
  };

  const features = [
    {
      icon: '🔍',
      title: 'Unified Search',
      description: 'Search Alibaba, Made-in-China, and CJ Dropshipping in one query',
    },
    {
      icon: '📊',
      title: 'Compare Prices',
      description: 'Side-by-side supplier comparison with real-time pricing',
    },
    {
      icon: '🛡️',
      title: 'Verified Suppliers',
      description: 'Supplier ratings, response rates, and transaction history',
    },
    {
      icon: '🚀',
      title: 'Push to Shopify',
      description: 'One-click product import to your Shopify store',
    },
  ];

  const stats = [
    { value: '50+', label: 'Supplier Sources' },
    { value: '10M+', label: 'Products Indexed' },
    { value: '5,000+', label: 'Active Merchants' },
    { value: '24/7', label: 'Real-time Updates' },
  ];

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero__container">
          <div className="hero__content">
            <span className="hero__badge">🚀 The Kayak for Dropshipping</span>
            <h1 className="hero__title">
              Find the Best Suppliers
              <span className="hero__title-highlight"> Instantly</span>
            </h1>
            <p className="hero__subtitle">
              Compare products across Alibaba, Made-in-China, and CJ Dropshipping. 
              Find the best prices, MOQs, and shipping options in seconds.
            </p>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="hero__search">
              <div className="hero__search-input-wrapper">
                <svg 
                  className="hero__search-icon" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  className="hero__search-input"
                  placeholder='Try "Yoga Mat", "Wireless Earbuds", or "Phone Case"...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search for products"
                />
              </div>
              <button 
                type="submit" 
                className="hero__search-button"
                disabled={isSearching}
              >
                {isSearching ? (
                  <>
                    <span className="hero__search-spinner"></span>
                    Searching...
                  </>
                ) : (
                  'Search Suppliers'
                )}
              </button>
            </form>

            <p className="hero__cta-hint">
              ✨ No credit card required • Free to start • Cancel anytime
            </p>
          </div>

          {/* Hero Visual */}
          <div className="hero__visual">
            <div className="hero__visual-card">
              <div className="hero__visual-header">
                <span className="hero__visual-dot hero__visual-dot--red"></span>
                <span className="hero__visual-dot hero__visual-dot--yellow"></span>
                <span className="hero__visual-dot hero__visual-dot--green"></span>
              </div>
              <div className="hero__visual-content">
                <div className="hero__visual-search">
                  <span>🔍 "Wireless Earbuds"</span>
                </div>
                <div className="hero__visual-results">
                  <div className="hero__visual-result">
                    <span className="hero__visual-source hero__visual-source--alibaba">Alibaba</span>
                    <span>$3.50 · MOQ 50</span>
                  </div>
                  <div className="hero__visual-result">
                    <span className="hero__visual-source hero__visual-source--mic">Made-in-China</span>
                    <span>$4.20 · MOQ 30</span>
                  </div>
                  <div className="hero__visual-result">
                    <span className="hero__visual-source hero__visual-source--cj">CJ Dropship</span>
                    <span>$5.99 · No MOQ</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Teaser Results Section */}
      {showTeaser && (
        <section className="teaser-results" id="teaser-results">
          <div className="teaser-results__container">
            <div className="teaser-results__header">
              <h2>Found 50+ suppliers for "{searchQuery}"</h2>
              <p>Here's a preview of what you can find:</p>
            </div>
            
            <div className="teaser-results__grid">
              {TEASER_RESULTS.map((product) => (
                <div 
                  key={product.id} 
                  className={`teaser-card ${product.isBlurred ? 'teaser-card--blurred' : ''}`}
                >
                  <div className="teaser-card__image">
                    <img src={product.image} alt={product.title} />
                    {product.isBlurred && (
                      <div className="teaser-card__blur-overlay">
                        <span className="teaser-card__lock">🔒</span>
                        <span>Sign up to view</span>
                      </div>
                    )}
                  </div>
                  <div className="teaser-card__content">
                    <span className={`teaser-card__source teaser-card__source--${product.source}`}>
                      {product.source.toUpperCase().replace('-', ' ')}
                    </span>
                    <h3 className="teaser-card__title">{product.title}</h3>
                    <div className="teaser-card__meta">
                      <span className="teaser-card__price">
                        ${product.isBlurred ? '?.??' : product.price.toFixed(2)}
                      </span>
                      <span className="teaser-card__moq">
                        MOQ: {product.isBlurred ? '???' : product.moq}
                      </span>
                    </div>
                    <div className="teaser-card__supplier">
                      {product.isBlurred ? '••••••••••••••' : product.supplier}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="teaser-results__cta">
              <button onClick={onLoginClick} className="teaser-results__button">
                🔓 Unlock All 50+ Suppliers
              </button>
              <p className="teaser-results__hint">Free signup • Takes 30 seconds</p>
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="features">
        <div className="features__container">
          <h2 className="features__title">Why Merchants Choose SourceScout</h2>
          <p className="features__subtitle">
            Stop wasting hours comparing suppliers manually. Let us do the heavy lifting.
          </p>
          
          <div className="features__grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-card">
                <span className="feature-card__icon">{feature.icon}</span>
                <h3 className="feature-card__title">{feature.title}</h3>
                <p className="feature-card__description">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats">
        <div className="stats__container">
          {stats.map((stat, index) => (
            <div key={index} className="stat-card">
              <span className="stat-card__value">{stat.value}</span>
              <span className="stat-card__label">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-section__container">
          <h2>Ready to Find Better Suppliers?</h2>
          <p>Join thousands of merchants who save hours every week with SourceScout.</p>
          <button onClick={onLoginClick} className="cta-section__button">
            Get Started Free
          </button>
        </div>
      </section>

      {/* Footer */}
      <Footer />

      {/* Signup Modal */}
      {showModal && (
        <div className="signup-modal" onClick={() => setShowModal(false)}>
          <div className="signup-modal__content" onClick={(e) => e.stopPropagation()}>
            <button 
              className="signup-modal__close" 
              onClick={() => setShowModal(false)}
              aria-label="Close modal"
            >
              ×
            </button>
            
            <div className="signup-modal__icon">🎉</div>
            <h2 className="signup-modal__title">
              We Found 50+ Suppliers!
            </h2>
            <p className="signup-modal__subtitle">
              Create a free account to see all suppliers, compare prices, 
              and save products to your dashboard.
            </p>
            
            <div className="signup-modal__benefits">
              <div className="signup-modal__benefit">✅ Compare prices across all platforms</div>
              <div className="signup-modal__benefit">✅ Save products & suppliers</div>
              <div className="signup-modal__benefit">✅ Push directly to Shopify</div>
              <div className="signup-modal__benefit">✅ 100% free to start</div>
            </div>

            <button onClick={onLoginClick} className="signup-modal__button">
              Create Free Account
            </button>
            
            <p className="signup-modal__footer">
              Already have an account? <button onClick={onLoginClick} className="signup-modal__link">Log in</button>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
