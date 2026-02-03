/**
 * Account Page
 * User profile, connected store info, and usage statistics
 * Based on UX best practices from design-bootcamp article
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import useAppStore from '../store/appStore';
import '../styles/components.css';

const AccountPage: React.FC = () => {
  const user = useAppStore((state) => state.user);
  const usage = useAppStore((state) => state.usage);
  const savedItems = useAppStore((state) => state.savedItems);
  const comparisons = useAppStore((state) => state.comparisons);
  const logout = useAppStore((state) => state.logout);
  
  const [isEditing, setIsEditing] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Calculate usage percentage
  const searchLimit = user?.subscription_tier === 'premium' ? 1000 : 50;
  const searchesUsed = user?.searches_used || 0;
  const usagePercent = Math.min((searchesUsed / searchLimit) * 100, 100);

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  return (
    <div className="account-page">
      <div className="account-page__container">
        {/* Page Header */}
        <header className="account-page__header">
          <h1 className="account-page__title">Your Account</h1>
          <p className="account-page__subtitle">
            Manage your profile, view usage, and control your SourceScout experience
          </p>
        </header>

        <div className="account-page__grid">
          {/* Profile Section */}
          <section className="account-card account-card--profile">
            <div className="account-card__header">
              <h2 className="account-card__title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Profile Information
              </h2>
              <button 
                className="account-card__edit-btn"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? 'Cancel' : 'Edit'}
              </button>
            </div>
            
            <div className="account-card__content">
              {/* Avatar */}
              <div className="account-profile__avatar-section">
                <div className="account-profile__avatar">
                  {user?.shop_name?.charAt(0).toUpperCase() || 'U'}
                </div>
                {isEditing && (
                  <button className="account-profile__avatar-btn">
                    Change Photo
                  </button>
                )}
              </div>

              {/* Profile Fields */}
              <div className="account-profile__fields">
                <div className="account-profile__field">
                  <label className="account-profile__label">Store Name</label>
                  {isEditing ? (
                    <input 
                      type="text" 
                      className="account-profile__input"
                      defaultValue={user?.shop_name || ''}
                      placeholder="Your store name"
                    />
                  ) : (
                    <p className="account-profile__value">{user?.shop_name || 'Not set'}</p>
                  )}
                </div>

                <div className="account-profile__field">
                  <label className="account-profile__label">Account Type</label>
                  <div className="account-profile__badge-row">
                    <span className={`account-badge account-badge--${user?.subscription_tier || 'free'}`}>
                      {user?.subscription_tier === 'premium' ? '⭐ Premium' : 'Free Plan'}
                    </span>
                    {user?.subscription_tier !== 'premium' && (
                      <Link to="/settings" className="account-profile__upgrade-link">
                        Upgrade
                      </Link>
                    )}
                  </div>
                </div>

                <div className="account-profile__field">
                  <label className="account-profile__label">Member Since</label>
                  <p className="account-profile__value">{formatDate(user?.created_at)}</p>
                </div>
              </div>

              {isEditing && (
                <div className="account-profile__actions">
                  <button className="account-btn account-btn--primary">
                    Save Changes
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Connected Store Section */}
          <section className="account-card">
            <div className="account-card__header">
              <h2 className="account-card__title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                Connected Store
              </h2>
              <span className="account-status account-status--connected">
                <span className="account-status__dot"></span>
                Connected
              </span>
            </div>
            
            <div className="account-card__content">
              <div className="account-store">
                <div className="account-store__icon">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </div>
                <div className="account-store__info">
                  <h3 className="account-store__name">{user?.shop_name || 'Your Shopify Store'}</h3>
                  <p className="account-store__url">{user?.shop_name?.toLowerCase().replace(/\s+/g, '-')}.myshopify.com</p>
                </div>
              </div>

              <div className="account-store__stats">
                <div className="account-store__stat">
                  <span className="account-store__stat-value">{savedItems.length}</span>
                  <span className="account-store__stat-label">Saved Products</span>
                </div>
                <div className="account-store__stat">
                  <span className="account-store__stat-value">{comparisons.length}</span>
                  <span className="account-store__stat-label">Comparisons</span>
                </div>
                <div className="account-store__stat">
                  <span className="account-store__stat-value">{usage?.searchesUsed || 0}</span>
                  <span className="account-store__stat-label">Searches Used</span>
                </div>
              </div>

              <Link to="/pushed" className="account-store__link">
                View Pushed Products →
              </Link>
            </div>
          </section>

          {/* Usage & Limits Section */}
          <section className="account-card">
            <div className="account-card__header">
              <h2 className="account-card__title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <path d="M12 20V10" />
                  <path d="M18 20V4" />
                  <path d="M6 20v-4" />
                </svg>
                Usage & Limits
              </h2>
            </div>
            
            <div className="account-card__content">
              <div className="account-usage">
                <div className="account-usage__header">
                  <span className="account-usage__label">Monthly Searches</span>
                  <span className="account-usage__count">
                    {searchesUsed} / {searchLimit}
                  </span>
                </div>
                <div className="account-usage__bar">
                  <div 
                    className={`account-usage__fill ${usagePercent > 80 ? 'account-usage__fill--warning' : ''}`}
                    style={{ width: `${usagePercent}%` }}
                  ></div>
                </div>
                <p className="account-usage__note">
                  {searchLimit - searchesUsed} searches remaining this month
                </p>
              </div>

              <div className="account-usage__features">
                <h4 className="account-usage__features-title">Your Plan Includes:</h4>
                <ul className="account-usage__features-list">
                  <li className="account-usage__feature">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {searchLimit} searches per month
                  </li>
                  <li className="account-usage__feature">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Multi-source search (Alibaba, CJ, Made-in-China)
                  </li>
                  <li className="account-usage__feature">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Push to Shopify
                  </li>
                  {user?.subscription_tier === 'premium' && (
                    <>
                      <li className="account-usage__feature">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Priority support
                      </li>
                      <li className="account-usage__feature">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Advanced analytics
                      </li>
                    </>
                  )}
                </ul>
              </div>

              {user?.subscription_tier !== 'premium' && (
                <div className="account-usage__upgrade">
                  <p>Need more searches? Upgrade to Premium for 1,000 searches/month.</p>
                  <button className="account-btn account-btn--primary">
                    Upgrade to Premium
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Quick Actions Section */}
          <section className="account-card">
            <div className="account-card__header">
              <h2 className="account-card__title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                Quick Actions
              </h2>
            </div>
            
            <div className="account-card__content">
              <div className="account-actions">
                <Link to="/settings" className="account-action">
                  <div className="account-action__icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <div className="account-action__text">
                    <h4>API Keys</h4>
                    <p>Manage your supplier API connections</p>
                  </div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>

                <Link to="/settings" className="account-action">
                  <div className="account-action__icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                  </div>
                  <div className="account-action__text">
                    <h4>Notifications</h4>
                    <p>Configure alerts and updates</p>
                  </div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>

                <Link to="/settings" className="account-action">
                  <div className="account-action__icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                      <circle cx="12" cy="12" r="5" />
                      <line x1="12" y1="1" x2="12" y2="3" />
                      <line x1="12" y1="21" x2="12" y2="23" />
                      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                      <line x1="1" y1="12" x2="3" y2="12" />
                      <line x1="21" y1="12" x2="23" y2="12" />
                      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                    </svg>
                  </div>
                  <div className="account-action__text">
                    <h4>Appearance</h4>
                    <p>Theme and display preferences</p>
                  </div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>

                <a href="mailto:support@sourcescout.app" className="account-action">
                  <div className="account-action__icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  </div>
                  <div className="account-action__text">
                    <h4>Help & Support</h4>
                    <p>Get help or contact us</p>
                  </div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </a>
              </div>
            </div>
          </section>
        </div>

        {/* Danger Zone */}
        <section className="account-card account-card--danger">
          <div className="account-card__header">
            <h2 className="account-card__title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              Account Actions
            </h2>
          </div>
          
          <div className="account-card__content">
            <div className="account-danger-zone">
              <div className="account-danger-zone__item">
                <div>
                  <h4>Log Out</h4>
                  <p>Sign out of your SourceScout account on this device.</p>
                </div>
                {showLogoutConfirm ? (
                  <div className="account-danger-zone__confirm">
                    <button 
                      className="account-btn account-btn--danger"
                      onClick={handleLogout}
                    >
                      Confirm Logout
                    </button>
                    <button 
                      className="account-btn account-btn--secondary"
                      onClick={() => setShowLogoutConfirm(false)}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button 
                    className="account-btn account-btn--outline-danger"
                    onClick={() => setShowLogoutConfirm(true)}
                  >
                    Log Out
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AccountPage;
