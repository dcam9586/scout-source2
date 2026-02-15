/**
 * Settings Page
 * Comprehensive settings with organized sections
 * Based on UX best practices for account/settings pages
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import useAppStore from '../store/appStore';
import ApiKeysPage from '../components/ApiKeysPage';
import '../styles/components.css';

type SettingsSection = 'api-keys' | 'appearance' | 'notifications' | 'privacy';

const SettingsPage: React.FC = () => {
  const user = useAppStore((state) => state.user);
  const [activeSection, setActiveSection] = useState<SettingsSection>('api-keys');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');
  const [notifications, setNotifications] = useState({
    email: true,
    priceAlerts: true,
    weeklyDigest: false,
    productUpdates: true,
  });

  const sections = [
    {
      id: 'api-keys' as SettingsSection,
      label: 'API Keys',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      ),
      description: 'Manage supplier platform API connections',
    },
    {
      id: 'appearance' as SettingsSection,
      label: 'Appearance',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
        </svg>
      ),
      description: 'Theme and display preferences',
    },
    {
      id: 'notifications' as SettingsSection,
      label: 'Notifications',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      ),
      description: 'Email alerts and updates',
    },
    {
      id: 'privacy' as SettingsSection,
      label: 'Privacy & Security',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
      description: 'Security settings and data privacy',
    },
  ];

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'api-keys':
        return <ApiKeysPage />;
      
      case 'appearance':
        return (
          <div className="settings-content">
            <div className="settings-content__header">
              <h2>Appearance Settings</h2>
              <p>Customize how SourceScout looks and feels</p>
            </div>

            <div className="settings-group">
              <h3 className="settings-group__title">Theme</h3>
              <p className="settings-group__description">
                Choose your preferred color theme
              </p>
              
              <div className="settings-theme-options">
                {[
                  { value: 'light', label: 'Light', icon: '☀️' },
                  { value: 'dark', label: 'Dark', icon: '🌙' },
                  { value: 'system', label: 'System', icon: '💻' },
                ].map((option) => (
                  <button
                    key={option.value}
                    className={`settings-theme-btn ${theme === option.value ? 'settings-theme-btn--active' : ''}`}
                    onClick={() => setTheme(option.value as typeof theme)}
                  >
                    <span className="settings-theme-btn__icon">{option.icon}</span>
                    <span className="settings-theme-btn__label">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-group">
              <h3 className="settings-group__title">Display Density</h3>
              <p className="settings-group__description">
                Adjust the spacing of UI elements
              </p>
              
              <div className="settings-radio-group">
                {['Compact', 'Comfortable', 'Spacious'].map((density) => (
                  <label key={density} className="settings-radio">
                    <input 
                      type="radio" 
                      name="density" 
                      value={density.toLowerCase()}
                      defaultChecked={density === 'Comfortable'}
                    />
                    <span className="settings-radio__label">{density}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="settings-group">
              <h3 className="settings-group__title">Product Cards</h3>
              <p className="settings-group__description">
                Customize product display preferences
              </p>
              
              <div className="settings-toggle-list">
                <label className="settings-toggle">
                  <span className="settings-toggle__text">
                    <strong>Show supplier ratings</strong>
                    <span>Display supplier quality metrics on cards</span>
                  </span>
                  <input type="checkbox" defaultChecked />
                  <span className="settings-toggle__slider"></span>
                </label>
                
                <label className="settings-toggle">
                  <span className="settings-toggle__text">
                    <strong>Show MOQ badges</strong>
                    <span>Highlight minimum order quantities</span>
                  </span>
                  <input type="checkbox" defaultChecked />
                  <span className="settings-toggle__slider"></span>
                </label>
                
                <label className="settings-toggle">
                  <span className="settings-toggle__text">
                    <strong>Animate hover effects</strong>
                    <span>Enable card animations on hover</span>
                  </span>
                  <input type="checkbox" defaultChecked />
                  <span className="settings-toggle__slider"></span>
                </label>
              </div>
            </div>
          </div>
        );
      
      case 'notifications':
        return (
          <div className="settings-content">
            <div className="settings-content__header">
              <h2>Notification Settings</h2>
              <p>Control how and when SourceScout contacts you</p>
            </div>

            <div className="settings-group">
              <h3 className="settings-group__title">Email Notifications</h3>
              
              <div className="settings-toggle-list">
                <label className="settings-toggle">
                  <span className="settings-toggle__text">
                    <strong>Email notifications</strong>
                    <span>Receive updates via email</span>
                  </span>
                  <input 
                    type="checkbox" 
                    checked={notifications.email}
                    onChange={(e) => setNotifications({...notifications, email: e.target.checked})}
                  />
                  <span className="settings-toggle__slider"></span>
                </label>
                
                <label className="settings-toggle">
                  <span className="settings-toggle__text">
                    <strong>Price drop alerts</strong>
                    <span>Get notified when saved product prices change</span>
                  </span>
                  <input 
                    type="checkbox" 
                    checked={notifications.priceAlerts}
                    onChange={(e) => setNotifications({...notifications, priceAlerts: e.target.checked})}
                  />
                  <span className="settings-toggle__slider"></span>
                </label>
                
                <label className="settings-toggle">
                  <span className="settings-toggle__text">
                    <strong>Weekly digest</strong>
                    <span>Summary of your sourcing activity</span>
                  </span>
                  <input 
                    type="checkbox" 
                    checked={notifications.weeklyDigest}
                    onChange={(e) => setNotifications({...notifications, weeklyDigest: e.target.checked})}
                  />
                  <span className="settings-toggle__slider"></span>
                </label>
                
                <label className="settings-toggle">
                  <span className="settings-toggle__text">
                    <strong>Product updates</strong>
                    <span>New features and improvements</span>
                  </span>
                  <input 
                    type="checkbox" 
                    checked={notifications.productUpdates}
                    onChange={(e) => setNotifications({...notifications, productUpdates: e.target.checked})}
                  />
                  <span className="settings-toggle__slider"></span>
                </label>
              </div>
            </div>

            <div className="settings-group">
              <h3 className="settings-group__title">Push Notifications</h3>
              <p className="settings-group__description">
                Browser notifications are currently not enabled
              </p>
              
              <button className="settings-btn settings-btn--secondary">
                Enable Push Notifications
              </button>
            </div>
          </div>
        );
      
      case 'privacy':
        return (
          <div className="settings-content">
            <div className="settings-content__header">
              <h2>Privacy & Security</h2>
              <p>Manage your security settings and data</p>
            </div>

            <div className="settings-group">
              <h3 className="settings-group__title">Session</h3>
              
              <div className="settings-info-card">
                <div className="settings-info-card__icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <div className="settings-info-card__content">
                  <h4>Logged in via Shopify OAuth</h4>
                  <p>Your session is secured through Shopify's authentication</p>
                </div>
                <span className="settings-info-card__badge settings-info-card__badge--success">
                  Secure
                </span>
              </div>
            </div>

            <div className="settings-group">
              <h3 className="settings-group__title">Data & Privacy</h3>
              
              <div className="settings-toggle-list">
                <label className="settings-toggle">
                  <span className="settings-toggle__text">
                    <strong>Usage analytics</strong>
                    <span>Help improve SourceScout with anonymous usage data</span>
                  </span>
                  <input type="checkbox" defaultChecked />
                  <span className="settings-toggle__slider"></span>
                </label>
                
                <label className="settings-toggle">
                  <span className="settings-toggle__text">
                    <strong>Search history</strong>
                    <span>Save search queries for quick access</span>
                  </span>
                  <input type="checkbox" defaultChecked />
                  <span className="settings-toggle__slider"></span>
                </label>
              </div>
            </div>

            <div className="settings-group">
              <h3 className="settings-group__title">Your Data</h3>
              
              <div className="settings-actions-row">
                <button className="settings-btn settings-btn--secondary">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Export My Data
                </button>
                
                <button className="settings-btn settings-btn--secondary">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  Clear Search History
                </button>
              </div>
            </div>

            <div className="settings-group settings-group--danger">
              <h3 className="settings-group__title">Danger Zone</h3>
              
              <div className="settings-danger-item">
                <div>
                  <strong>Delete Account</strong>
                  <p>Permanently delete your account and all associated data</p>
                </div>
                <button className="settings-btn settings-btn--danger">
                  Delete Account
                </button>
              </div>
            </div>

            <div className="settings-group">
              <h3 className="settings-group__title">Legal</h3>
              
              <div className="settings-links">
                <Link to="/privacy" className="settings-link">
                  Privacy Policy
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </Link>
                <Link to="/terms" className="settings-link">
                  Terms of Service
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-page__container">
        {/* Page Header */}
        <header className="settings-page__header">
          <div className="settings-page__breadcrumb">
            <Link to="/account">Your Account</Link>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <polyline points="9 18 15 12 9 6" />
            </svg>
            <span>Settings</span>
          </div>
          <h1 className="settings-page__title">Settings</h1>
          <p className="settings-page__subtitle">
            Configure your SourceScout experience
          </p>
        </header>

        <div className="settings-page__layout">
          {/* Sidebar Navigation */}
          <aside className="settings-sidebar">
            <nav className="settings-nav">
              {sections.map((section) => (
                <button
                  key={section.id}
                  className={`settings-nav__item ${activeSection === section.id ? 'settings-nav__item--active' : ''}`}
                  onClick={() => setActiveSection(section.id)}
                >
                  <span className="settings-nav__icon">{section.icon}</span>
                  <span className="settings-nav__text">
                    <strong>{section.label}</strong>
                    <span>{section.description}</span>
                  </span>
                </button>
              ))}
            </nav>

            {/* Quick Links */}
            <div className="settings-sidebar__footer">
              <Link to="/account" className="settings-sidebar__link">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Back to Account
              </Link>
            </div>
          </aside>

          {/* Main Content */}
          <main className="settings-main">
            {renderSectionContent()}
          </main>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
