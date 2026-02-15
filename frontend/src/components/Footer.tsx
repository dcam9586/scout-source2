/**
 * Footer Component
 * Professional trust layer with legal links and copyright notice
 * Designed for investor readiness and user trust
 */

import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer__container">
        {/* Brand and Description */}
        <div className="footer__brand">
          <div className="footer__logo">
            <svg 
              width="32" 
              height="32" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <span className="footer__logo-text">SourceScout</span>
          </div>
          <p className="footer__tagline">
            The smarter way to source products. Compare suppliers across Alibaba, 
            Made-in-China, and CJ Dropshipping in one unified platform.
          </p>
        </div>

        {/* Quick Links */}
        <div className="footer__links-section">
          <h4 className="footer__heading">Product</h4>
          <ul className="footer__links">
            <li><Link to="/search">Search Products</Link></li>
            <li><Link to="/saved">Saved Items</Link></li>
            <li><Link to="/comparisons">Compare Suppliers</Link></li>
            <li><Link to="/pushed">Pushed to Shopify</Link></li>
          </ul>
        </div>

        {/* Legal Links */}
        <div className="footer__links-section">
          <h4 className="footer__heading">Legal</h4>
          <ul className="footer__links">
            <li><Link to="/privacy">Privacy Policy</Link></li>
            <li><Link to="/terms">Terms of Service</Link></li>
          </ul>
        </div>

        {/* Support */}
        <div className="footer__links-section">
          <h4 className="footer__heading">Support</h4>
          <ul className="footer__links">
            <li><a href="mailto:support@sourcescout.io">Contact Us</a></li>
            <li><Link to="/settings">API Settings</Link></li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="footer__bottom">
        <div className="footer__bottom-container">
          <p className="footer__copyright">
            © {currentYear} SourceScout. All rights reserved.
          </p>
          <div className="footer__badges">
            <span className="footer__badge">🔒 Secure Platform</span>
            <span className="footer__badge">🛡️ Shopify Partner</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
