/**
 * Navigation Component
 * Header navigation with logo, menu, and user profile
 * Updated with improved user status indicator and dropdown per UX best practices
 */

import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import useAppStore from '../store/appStore';
import '../styles/components.css';

interface NavigationProps {
  onLoginClick?: () => void;
}

const Navigation: React.FC<NavigationProps> = ({ onLoginClick }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const location = useLocation();
  const userMenuRef = useRef<HTMLDivElement>(null);
  
  // Get user and auth state from store
  const user = useAppStore((state) => state.user);
  const token = useAppStore((state) => state.token);
  const logout = useAppStore((state) => state.logout);
  const usage = useAppStore((state) => state.usage);
  
  const isLoggedIn = !!token;

  const isActive = (path: string) => location.pathname === path;
  
  const handleLogout = () => {
    logout();
    setIsUserMenuOpen(false);
    window.location.href = '/';
  };

  // Close user menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close user menu on Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsUserMenuOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <>
      {/* Skip to content link for keyboard users */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      
      <nav className="navigation" role="navigation" aria-label="Main navigation">
        <div className="navigation__container">
          {/* Logo */}
          <Link to="/" className="navigation__logo" aria-label="SourceScout Home">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="6" fill="white" opacity="0.3" />
            </svg>
            <span>SourceScout</span>
          </Link>

          {/* Desktop Menu */}
          <div className="navigation__menu" role="menubar">
            <Link
              to="/"
              className={`navigation__link ${isActive('/') ? 'navigation__link--active' : ''}`}
              role="menuitem"
              aria-current={isActive('/') ? 'page' : undefined}
            >
              Dashboard
            </Link>
            <Link
              to="/search"
              className={`navigation__link ${isActive('/search') ? 'navigation__link--active' : ''}`}
              role="menuitem"
              aria-current={isActive('/search') ? 'page' : undefined}
            >
              Search
            </Link>
            <Link
              to="/saved"
              className={`navigation__link ${isActive('/saved') ? 'navigation__link--active' : ''}`}
              role="menuitem"
              aria-current={isActive('/saved') ? 'page' : undefined}
            >
              Saved Items
            </Link>
            <Link
              to="/comparisons"
              className={`navigation__link ${isActive('/comparisons') ? 'navigation__link--active' : ''}`}
              role="menuitem"
              aria-current={isActive('/comparisons') ? 'page' : undefined}
            >
              Comparisons
            </Link>
            <Link
              to="/pushed"
              className={`navigation__link ${isActive('/pushed') ? 'navigation__link--active' : ''}`}
              role="menuitem"
              aria-current={isActive('/pushed') ? 'page' : undefined}
            >
              Shopify Products
            </Link>
            <Link
              to="/settings"
              className={`navigation__link ${isActive('/settings') ? 'navigation__link--active' : ''}`}
              role="menuitem"
              aria-current={isActive('/settings') ? 'page' : undefined}
            >
              Settings
            </Link>
          </div>

          {/* User Menu */}
          <div className="navigation__user">
            {isLoggedIn ? (
              <div className="navigation__profile" ref={userMenuRef}>
                {/* User Avatar Button with Status Indicator */}
                <button
                  className="navigation__avatar-btn"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  aria-label={`${user?.shop_name || 'User'}'s menu`}
                  aria-expanded={isUserMenuOpen}
                  aria-haspopup="true"
                >
                  <div className="navigation__avatar">
                    {(user?.shop_name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <span className="navigation__status-indicator" title="Logged in"></span>
                  <svg 
                    className={`navigation__chevron ${isUserMenuOpen ? 'navigation__chevron--open' : ''}`}
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    width="16" 
                    height="16"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                
                {/* Enhanced User Dropdown Menu */}
                <div 
                  className={`navigation__dropdown ${isUserMenuOpen ? 'navigation__dropdown--open' : ''}`}
                  role="menu"
                  aria-hidden={!isUserMenuOpen}
                >
                  {/* User Info Header */}
                  <div className="navigation__dropdown-header">
                    <div className="navigation__dropdown-avatar">
                      {(user?.shop_name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="navigation__dropdown-info">
                      <p className="navigation__dropdown-name">{user?.shop_name || 'Your Store'}</p>
                      <div className="navigation__dropdown-status">
                        <span className="navigation__dropdown-status-dot"></span>
                        <span>Logged in</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Plan Badge */}
                  <div className="navigation__dropdown-plan">
                    <span className={`navigation__plan-badge navigation__plan-badge--${user?.subscription_tier || 'free'}`}>
                      {user?.subscription_tier === 'premium' ? '⭐ Premium' : 'Free Plan'}
                    </span>
                    <span className="navigation__usage-text">
                      {usage?.searches_today || 0} searches today
                    </span>
                  </div>
                  
                  <div className="navigation__dropdown-divider"></div>
                  
                  {/* Menu Links */}
                  <Link 
                    to="/account" 
                    className="navigation__dropdown-item"
                    onClick={() => setIsUserMenuOpen(false)}
                    role="menuitem"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    Your Account
                  </Link>
                  
                  <Link 
                    to="/settings" 
                    className="navigation__dropdown-item"
                    onClick={() => setIsUserMenuOpen(false)}
                    role="menuitem"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                    Settings
                  </Link>
                  
                  <Link 
                    to="/saved" 
                    className="navigation__dropdown-item"
                    onClick={() => setIsUserMenuOpen(false)}
                    role="menuitem"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                    </svg>
                    Saved Items
                  </Link>
                  
                  <div className="navigation__dropdown-divider"></div>
                  
                  <a 
                    href="mailto:support@sourcescout.app" 
                    className="navigation__dropdown-item"
                    role="menuitem"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    Help & Support
                  </a>
                  
                  <div className="navigation__dropdown-divider"></div>
                  
                  <button
                    className="navigation__dropdown-item navigation__dropdown-item--logout"
                    onClick={handleLogout}
                    role="menuitem"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Log Out
                  </button>
                </div>
              </div>
            ) : (
              <button 
                className="navigation__login-btn" 
                onClick={onLoginClick}
                aria-label="Log in"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" y1="12" x2="3" y2="12" />
                </svg>
                Log In
              </button>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className={`navigation__mobile-toggle ${isMenuOpen ? 'navigation__mobile-toggle--active' : ''}`}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={isMenuOpen}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>

        {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="navigation__mobile-menu" role="menu">
          <Link
            to="/"
            className="navigation__mobile-link"
            role="menuitem"
            onClick={() => setIsMenuOpen(false)}
          >
            Dashboard
          </Link>
          <Link
            to="/search"
            className="navigation__mobile-link"
            role="menuitem"
            onClick={() => setIsMenuOpen(false)}
          >
            Search
          </Link>
          <Link
            to="/saved"
            className="navigation__mobile-link"
            role="menuitem"
            onClick={() => setIsMenuOpen(false)}
          >
            Saved Items
          </Link>
          <Link
            to="/comparisons"
            className="navigation__mobile-link"
            role="menuitem"
            onClick={() => setIsMenuOpen(false)}
          >
            Comparisons
          </Link>
        </div>
      )}
    </nav>
    </>
  );
};

export default Navigation;
