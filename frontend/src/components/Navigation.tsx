/**
 * Navigation Component
 * Header navigation with logo, menu, and user profile
 */

import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/components.css';

interface NavigationProps {
  user?: {
    email: string;
    name?: string;
  };
  onLogout?: () => void;
}

const Navigation: React.FC<NavigationProps> = ({ user, onLogout }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const location = useLocation();
  const userMenuRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => location.pathname === path;

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
            {user ? (
              <div className="navigation__profile" ref={userMenuRef}>
                <button
                  className="navigation__avatar"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  aria-label={`${user.name || user.email}'s menu`}
                  aria-expanded={isUserMenuOpen}
                  aria-haspopup="true"
                  title={user.email}
                >
                  {(user.name || user.email).charAt(0).toUpperCase()}
                </button>
                <div 
                  className={`navigation__user-menu ${isUserMenuOpen ? 'navigation__user-menu--open' : ''}`}
                  role="menu"
                  aria-hidden={!isUserMenuOpen}
                >
                  <div className="navigation__user-info">
                    <p className="navigation__user-name">{user.name || 'User'}</p>
                    <p className="navigation__user-email">{user.email}</p>
                  </div>
                  <button
                    className="navigation__logout-btn"
                    onClick={onLogout}
                    role="menuitem"
                    aria-label="Log out"
                  >
                  Log Out
                </button>
              </div>
            </div>
          ) : (
            <button className="navigation__login-btn" aria-label="Log in">
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
