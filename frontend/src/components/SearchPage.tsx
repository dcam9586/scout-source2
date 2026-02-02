import React, { useState, useCallback, useEffect } from 'react';
import { Page, BlockStack, Card, Box, Text, Icon, Badge, InlineStack } from '@shopify/polaris';
import { SearchIcon } from '@shopify/polaris-icons';
import SearchBar from './SearchBar';
import SearchResults from './SearchResults';
import { SkeletonGrid } from './SkeletonLoader';
import SearchLoadingOverlay from './SearchLoadingOverlay';
import ProductDetailsModal from './ProductDetailsModal';
import CompareBar from './CompareBar';
import { useSavedItems } from '../hooks/useSavedItems';
import useAppStore from '../store/appStore';
import type { SearchSource } from '../types';
import type { ProductCardProps } from './ProductCard';

// Simple toast component (no Frame required)
interface SimpleToastProps {
  message: string;
  isError?: boolean;
  onDismiss: () => void;
}

const SimpleToast: React.FC<SimpleToastProps> = ({ message, isError, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: isError ? '#d72c0d' : '#1a1a1a',
        color: 'white',
        padding: '12px 24px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: 9999,
        fontSize: '14px',
        fontWeight: 500,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        animation: 'slideUp 0.3s ease-out',
      }}
      role="alert"
      aria-live="polite"
    >
      {message}
      <button
        onClick={onDismiss}
        style={{
          background: 'none',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          padding: '0 0 0 8px',
          fontSize: '18px',
          opacity: 0.7,
        }}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
};

/**
 * SearchPage Component
 *
 * Wrapper component that combines the search input bar with search results display.
 * Manages the search state and handles the workflow from user input to results display.
 *
 * Features:
 * - Search query input and submission
 * - Multi-source selection (Alibaba, CJ Dropshipping)
 * - Results display with filtering and sorting
 * - Loading states and error handling
 * - Empty state guidance
 * - Responsive layout
 *
 * @component
 */
interface SearchPageProps {}

const SearchPage: React.FC<SearchPageProps> = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchedSources, setSearchedSources] = useState<SearchSource[]>([]);
  const [sourceStats, setSourceStats] = useState<Record<string, number>>({});
  
  // Toast notifications
  const [toastActive, setToastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastError, setToastError] = useState(false);
  
  // Saved items tracking
  const [savingProductId, setSavingProductId] = useState<string | null>(null);
  const [savedProductUrls, setSavedProductUrls] = useState<Set<string>>(new Set());
  
  // Product details modal
  const [selectedProduct, setSelectedProduct] = useState<ProductCardProps | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  
  // Hooks
  const { createSavedItem, fetchSavedItems } = useSavedItems();
  const savedItems = useAppStore((state) => state.savedItems);
  const addToCompare = useAppStore((state) => state.addToCompare);
  const compareItems = useAppStore((state) => state.compareItems);
  
  // Load saved items on mount to track which products are already saved
  useEffect(() => {
    fetchSavedItems().catch(console.error);
  }, [fetchSavedItems]);
  
  // Update saved product URLs when savedItems changes
  useEffect(() => {
    const urls = new Set(savedItems.map(item => item.source_url));
    setSavedProductUrls(urls);
  }, [savedItems]);
  
  // Show toast notification
  const showToast = useCallback((message: string, isError = false) => {
    setToastMessage(message);
    setToastError(isError);
    setToastActive(true);
  }, []);
  
  const dismissToast = useCallback(() => setToastActive(false), []);

  /**
   * Handle search submission
   * Fetches products from the backend (Alibaba scraper and/or CJ API)
   */
  const handleSearch = useCallback(async (searchQuery: string, sources: SearchSource[] = ['alibaba', 'made-in-china', 'cj-dropshipping']) => {
    if (!searchQuery.trim()) {
      setError('Please enter a search term');
      return;
    }

    setQuery(searchQuery);
    setIsSearching(true);
    setError(null);
    setSearchedSources(sources);
    setSourceStats({});

    try {
      // Use the unified search endpoint that supports multiple sources
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/v1/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          sources,
          limit: 20
        })
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Combine results from all sources
      const allResults: any[] = [];
      const stats: Record<string, number> = {};
      
      if (data.results) {
        // Handle results from each source
        for (const source of sources) {
          const sourceResults = data.results[source] || [];
          stats[source] = sourceResults.length;
          
          // Tag each result with its source
          sourceResults.forEach((product: any) => {
            allResults.push({
              ...product,
              source: source
            });
          });
        }
      }
      
      setResults(allResults);
      setSourceStats(stats);

      if (allResults.length === 0) {
        setError('No products found. Try a different search term or enable more sources.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed. Please try again.';
      setError(errorMessage);
      setResults([]);
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  /**
   * Handle product save action
   * Saves a product to the user's saved items
   */
  const handleSaveProduct = useCallback(async (product: ProductCardProps) => {
    // Check if already saved using source URL
    const productUrl = (product as any).source_url || (product as any).url || product.id;
    
    if (savedProductUrls.has(productUrl)) {
      showToast('Product already saved!', false);
      return;
    }
    
    setSavingProductId(product.id);
    
    try {
      await createSavedItem({
        product_name: product.title,
        supplier_name: product.supplier,
        supplier_rating: product.rating || product.supplierRating,
        moq: product.moq || 1,
        price: product.price,
        source: product.source === 'shopify_global' ? 'shopify' : product.source,
        source_url: productUrl,
        product_image_url: product.image,
        description: undefined,
        notes: undefined,
      });
      
      // Update local tracking
      setSavedProductUrls(prev => new Set([...prev, productUrl]));
      showToast('✓ Product saved successfully!', false);
    } catch (err) {
      console.error('Failed to save product:', err);
      showToast('Failed to save product. Please try again.', true);
    } finally {
      setSavingProductId(null);
    }
  }, [createSavedItem, savedProductUrls, showToast]);

  /**
   * Handle product compare action
   * Adds product to comparison list
   */
  const handleCompareProduct = useCallback((product: ProductCardProps) => {
    // Check if already in compare list
    if (compareItems.find(item => item.id === product.id)) {
      showToast('Product already in comparison!', false);
      return;
    }
    
    // Check if compare list is full (max 4)
    if (compareItems.length >= 4) {
      showToast('Compare list full! Remove an item first. (Max 4)', true);
      return;
    }
    
    addToCompare(product);
    showToast(`Added to compare (${compareItems.length + 1}/4)`, false);
  }, [addToCompare, compareItems, showToast]);

  /**
   * Handle view details action
   * Opens the product details modal
   */
  const handleViewDetails = useCallback((product: ProductCardProps) => {
    setSelectedProduct(product);
    setIsDetailsModalOpen(true);
  }, []);

  const handleCloseDetailsModal = useCallback(() => {
    setIsDetailsModalOpen(false);
    setSelectedProduct(null);
  }, []);

  return (
    <Page title="Search Products">
      <BlockStack gap="400">
        <SearchBar
          onSearch={handleSearch}
          isLoading={isSearching}
          placeholder="Search for products across suppliers..."
        />

        {error && (
          <Card>
            <Box padding="400" background="bg-surface-critical">
              <Text as="p" tone="critical">{error}</Text>
            </Box>
          </Card>
        )}

        {/* Source stats after search */}
        {query && !isSearching && Object.keys(sourceStats).length > 0 && (
          <Card>
            <Box padding="300">
              <InlineStack gap="400" align="center">
                <Text as="span" variant="bodyMd" fontWeight="semibold">
                  Found {results.length} products:
                </Text>
                {sourceStats['alibaba'] !== undefined && sourceStats['alibaba'] > 0 && (
                  <Badge tone="warning">{sourceStats['alibaba']} from Alibaba</Badge>
                )}
                {sourceStats['made-in-china'] !== undefined && sourceStats['made-in-china'] > 0 && (
                  <Badge tone="info">{sourceStats['made-in-china']} from Made-in-China</Badge>
                )}
                {sourceStats['cj-dropshipping'] !== undefined && sourceStats['cj-dropshipping'] > 0 && (
                  <Badge tone="success">{sourceStats['cj-dropshipping']} from CJ Dropshipping</Badge>
                )}
              </InlineStack>
            </Box>
          </Card>
        )}

        {/* Show skeleton loader while searching */}
        {isSearching && (
          <SkeletonGrid count={6} />
        )}

        {/* Animated loading overlay */}
        <SearchLoadingOverlay 
          isVisible={isSearching} 
          sources={searchedSources} 
          query={query} 
        />

        {query && !isSearching && (
          <SearchResults
            query={query}
            results={results}
            isLoading={false}
            savedProductUrls={savedProductUrls}
            savingProductId={savingProductId}
            onSave={handleSaveProduct}
            onCompare={handleCompareProduct}
            onViewDetails={handleViewDetails}
          />
          )}

        {!query && !error && (
          <Card>
            <Box padding="800">
              <BlockStack gap="400" align="center">
                <div style={{ 
                  width: '80px', 
                  height: '80px', 
                  color: '#8c9196',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    width="80"
                    height="80"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                </div>
                <Text as="h2" variant="headingLg" alignment="center">
                  Start searching for products
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
                  Enter a product name or description above to search across multiple
                  supplier platforms and find the best options for your store.
                </Text>
                <Card>
                  <Box padding="400">
                    <BlockStack gap="200">
                      <Text as="h3" variant="headingMd">Search Tips:</Text>
                      <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#6d7175' }}>
                        <li>Use specific product names for better results</li>
                        <li>Include materials or features you're looking for</li>
                        <li>CJ Dropshipping offers official API with no MOQ</li>
                        <li>Compare prices and shipping across sources</li>
                      </ul>
                    </BlockStack>
                  </Box>
                </Card>
                <InlineStack gap="300">
                  <Badge tone="warning">Alibaba</Badge>
                  <Badge tone="info">Made-in-China</Badge>
                  <Badge tone="success">CJ Dropshipping</Badge>
                </InlineStack>
              </BlockStack>
            </Box>
          </Card>
        )}
      </BlockStack>
      
      {/* Toast notification */}
      {toastActive && (
        <SimpleToast
          message={toastMessage}
          isError={toastError}
          onDismiss={dismissToast}
        />
      )}
      
      {/* Product Details Modal */}
      <ProductDetailsModal
        product={selectedProduct}
        isOpen={isDetailsModalOpen}
        onClose={handleCloseDetailsModal}
        onSave={handleSaveProduct}
        onCompare={handleCompareProduct}
      />
      
      {/* Compare Bar */}
      <CompareBar />
    </Page>
  );
};

export default SearchPage;
