import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, Spinner } from '@shopify/polaris';
import '@shopify/polaris/build/esm/styles.css';
import useAppStore from './store/appStore';
import { useAuth } from './hooks/useAuth';
import './styles/globals.css';
import './styles/components.css';
import './styles/pages.css';

// Layout Components (loaded immediately)
import Navigation from './components/Navigation';
import Footer from './components/Footer';

// Page Components (lazy loaded for code splitting)
const Dashboard = lazy(() => import('./components/Dashboard'));
const SearchPage = lazy(() => import('./components/SearchPage'));
const SavedPage = lazy(() => import('./components/SavedPage'));
const ComparisonsPage = lazy(() => import('./components/ComparisonsPage'));
const ApiKeysPage = lazy(() => import('./components/ApiKeysPage'));
const PushedProductsPage = lazy(() => import('./components/PushedProductsPage'));

// Legal and Landing Pages
const LandingPage = lazy(() => import('./pages/LandingPage'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const AccountPage = lazy(() => import('./pages/AccountPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

// Loading fallback component
const PageLoader: React.FC = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '50vh',
    flexDirection: 'column',
    gap: '1rem'
  }}>
    <Spinner accessibilityLabel="Loading page" size="large" />
    <p style={{ color: '#666' }}>Loading...</p>
  </div>
);

const App: React.FC = () => {
  const token = useAppStore((state) => state.token);
  const { getProfile, getUsage } = useAuth();

  useEffect(() => {
    if (token) {
      getProfile().catch(console.error);
      getUsage().catch(console.error);
    }
  }, [token, getProfile, getUsage]);

  // Check for auth token in URL (from OAuth callback)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');
    const shop = params.get('shop');

    if (tokenParam) {
      useAppStore.getState().setToken(tokenParam);
      getProfile().catch(console.error);
      getUsage().catch(console.error);
      window.history.replaceState({}, document.title, '/');
    }
  }, [getProfile, getUsage]);

  const handleLoginClick = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/v1/auth/shopify?shop=sourcescout.myshopify.com`);
      const data = await response.json() as { authUrl: string };
      // Redirect to Shopify authorization page
      window.location.href = data.authUrl;
    } catch (error) {
      console.error('OAuth initiation failed:', error);
      alert('Failed to initiate login. Please try again.');
    }
  };

  // Show landing page for unauthenticated users
  if (!token) {
    return (
      <AppProvider i18n={{}}>
        <Router>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<LandingPage onLoginClick={handleLoginClick} />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </Router>
      </AppProvider>
    );
  }

  return (
    <AppProvider i18n={{}}>
      <Router>
        <Navigation onLoginClick={handleLoginClick} />
        <main id="main-content" role="main" aria-label="SourceScout main content">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/saved" element={<SavedPage />} />
              <Route path="/comparisons" element={<ComparisonsPage />} />
              <Route path="/pushed" element={<PushedProductsPage />} />
              <Route path="/account" element={<AccountPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/settings/api-keys" element={<ApiKeysPage />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
      </Router>
    </AppProvider>
  );
};

export default App;
