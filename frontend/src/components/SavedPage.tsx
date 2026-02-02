import React, { useState, useCallback, useEffect } from 'react';
import { Page, BlockStack, Card, Box, Text, Button, InlineStack, Banner } from '@shopify/polaris';
import SavedItems from './SavedItems';
import { usePushToShopify } from '../hooks/usePushToShopify';
import { PushToShopifyData } from '../types';

// Mock data for development testing
const MOCK_SAVED_ITEMS = [
  {
    id: '1',
    title: 'USB-C Charging Cable 3ft - Fast Charge Compatible',
    image: 'https://via.placeholder.com/300x300?text=USB+Cable',
    price: 2.50,
    currency: 'USD',
    supplier: 'Shenzhen Electronics Co.',
    moq: 100,
    rating: 4.5,
    reviews: 1250,
    source: 'alibaba' as const,
  },
  {
    id: '2',
    title: 'Wireless Bluetooth Earbuds TWS 5.0',
    image: 'https://via.placeholder.com/300x300?text=Earbuds',
    price: 8.99,
    currency: 'USD',
    supplier: 'Guangzhou Audio Tech',
    moq: 50,
    rating: 4.2,
    reviews: 890,
    source: 'made-in-china' as const,
  },
  {
    id: '3',
    title: 'Phone Case Silicone Soft Cover iPhone 15',
    image: 'https://via.placeholder.com/300x300?text=Phone+Case',
    price: 1.20,
    currency: 'USD',
    supplier: 'Dongguan Cases Factory',
    moq: 200,
    rating: 4.7,
    reviews: 2100,
    source: 'alibaba' as const,
  },
];

/**
 * SavedPage Component
 *
 * Page wrapper for the saved items list. Manages the state of saved products
 * and provides actions for managing the saved items collection.
 *
 * Features:
 * - Display all saved products
 * - Bulk select and compare
 * - Bulk remove saved items
 * - Filtering by source
 * - Sorting by date, price, or name
 * - Empty state when no items are saved
 *
 * @component
 */
interface SavedPageProps {}

const SavedPage: React.FC<SavedPageProps> = () => {
  const [savedItems, setSavedItems] = useState<any[]>(MOCK_SAVED_ITEMS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pushSuccess, setPushSuccess] = useState<string | null>(null);

  // Push to Shopify hook
  const { pushProduct, isPushing, error: pushError, clearError } = usePushToShopify();

  // DEV MODE: Skip API call and use mock data
  // useEffect(() => {
  //   const fetchSavedItems = async () => {
  //     ... API call ...
  //   };
  //   fetchSavedItems();
  // }, []);

  /**
   * Handle removing a single saved item
   */
  const handleRemoveSavedItem = useCallback((itemId: string) => {
    setSavedItems((prevItems) =>
      prevItems.filter((item) => item.id !== itemId)
    );

    // TODO: Call remove saved item API endpoint
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    fetch(`${apiUrl}/api/v1/saved-items/${itemId}`, { method: 'DELETE' })
      .catch((err) => {
        console.error('Error removing item:', err);
        // Re-fetch items on error
        window.location.reload();
      });
  }, []);

  /**
   * Handle removing multiple saved items
   */
  const handleRemoveMultiple = useCallback((itemIds: string[]) => {
    setSavedItems((prevItems) =>
      prevItems.filter((item) => !itemIds.includes(item.id))
    );

    // TODO: Call bulk remove API endpoint
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    fetch(`${apiUrl}/api/v1/saved-items/bulk-remove`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemIds }),
    })
      .catch((err) => {
        console.error('Error removing items:', err);
        // Re-fetch items on error
        window.location.reload();
      });
  }, []);

  /**
   * Handle comparing selected items
   */
  const handleCompareSelected = useCallback((itemIds: string[]) => {
    const selectedItems = savedItems.filter((item) =>
      itemIds.includes(item.id)
    );

    // TODO: Store selected items in app state and navigate to comparisons
    console.log('Compare selected items:', selectedItems);
    // useAppStore.getState().setComparisonItems(selectedItems);
    // navigate('/comparisons');
  }, [savedItems]);

  /**
   * Handle pushing a saved item to Shopify
   */
  const handlePushToShopify = useCallback(async (itemId: string, data: PushToShopifyData) => {
    clearError();
    setPushSuccess(null);

    const result = await pushProduct(data);
    
    if (result.success) {
      setPushSuccess(`Product pushed to Shopify successfully! Product ID: ${result.shopifyProductId}`);
      
      // Update the item in state to reflect it's been pushed
      setSavedItems((prevItems) =>
        prevItems.map((item) =>
          item.id === itemId
            ? { ...item, push_status: 'draft', shopify_product_id: result.shopifyProductId }
            : item
        )
      );
      
      // Clear success message after 5 seconds
      setTimeout(() => setPushSuccess(null), 5000);
    }
  }, [pushProduct, clearError]);

  if (error) {
    return (
      <Page title="Saved Items">
        <Card>
          <Box padding="600" background="bg-surface-critical">
            <BlockStack gap="300" align="center">
              <Text as="h2" variant="headingMd">Error loading saved items</Text>
              <Text as="p" tone="critical">{error}</Text>
              <Button onClick={() => window.location.reload()}>Try again</Button>
            </BlockStack>
          </Box>
        </Card>
      </Page>
    );
  }

  return (
    <Page title="Saved Items">
      <BlockStack gap="400">
        {pushSuccess && (
          <Banner tone="success" onDismiss={() => setPushSuccess(null)}>
            {pushSuccess}
          </Banner>
        )}
        
        {pushError && (
          <Banner tone="critical" onDismiss={clearError}>
            {pushError}
          </Banner>
        )}

        <SavedItems
          items={savedItems}
          onRemove={handleRemoveSavedItem}
          onCompare={(id) => console.log('Compare item:', id)}
          onPushToShopify={handlePushToShopify}
        />
      </BlockStack>
    </Page>
  );
};

export default SavedPage;
