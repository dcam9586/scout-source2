import React, { useState, useCallback, useEffect } from 'react';
import { Page, BlockStack, Card, Box, Text, Button, InlineStack, Banner, Spinner } from '@shopify/polaris';
import SavedItems from './SavedItems';
import { usePushToShopify } from '../hooks/usePushToShopify';
import { useSavedItems } from '../hooks/useSavedItems';
import { PushToShopifyData } from '../types';

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
  const [savedItems, setSavedItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pushSuccess, setPushSuccess] = useState<string | null>(null);

  // Push to Shopify hook
  const { pushProduct, isPushing, error: pushError, clearError } = usePushToShopify();
  
  // Saved items hook
  const { fetchSavedItems, deleteSavedItem } = useSavedItems();

  // Fetch saved items on mount
  useEffect(() => {
    const loadSavedItems = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const items = await fetchSavedItems();
        // Map the items to ensure proper image field
        const mappedItems = items.map((item: any) => ({
          ...item,
          image: item.image_url || item.image || 'https://via.placeholder.com/300x300?text=No+Image',
        }));
        setSavedItems(mappedItems);
      } catch (err) {
        console.error('Failed to fetch saved items:', err);
        setError('Failed to load saved items. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSavedItems();
  }, [fetchSavedItems]);

  /**
   * Handle removing a single saved item
   */
  const handleRemoveSavedItem = useCallback(async (itemId: string) => {
    // Optimistically remove from UI
    setSavedItems((prevItems) =>
      prevItems.filter((item) => String(item.id) !== String(itemId))
    );

    try {
      await deleteSavedItem(Number(itemId));
    } catch (err) {
      console.error('Error removing item:', err);
      // Refresh to restore state on error
      const items = await fetchSavedItems();
      setSavedItems(items.map((item: any) => ({
        ...item,
        image: item.image_url || item.image || 'https://via.placeholder.com/300x300?text=No+Image',
      })));
    }
  }, [deleteSavedItem, fetchSavedItems]);

  /**
   * Handle removing multiple saved items
   */
  const handleRemoveMultiple = useCallback(async (itemIds: string[]) => {
    // Optimistically remove from UI
    setSavedItems((prevItems) =>
      prevItems.filter((item) => !itemIds.includes(String(item.id)))
    );

    try {
      // Delete each item
      await Promise.all(itemIds.map(id => deleteSavedItem(Number(id))));
    } catch (err) {
      console.error('Error removing items:', err);
      // Refresh to restore state on error
      const items = await fetchSavedItems();
      setSavedItems(items.map((item: any) => ({
        ...item,
        image: item.image_url || item.image || 'https://via.placeholder.com/300x300?text=No+Image',
      })));
    }
  }, [deleteSavedItem, fetchSavedItems]);

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

  if (isLoading) {
    return (
      <Page title="Saved Items">
        <Card>
          <Box padding="600">
            <BlockStack gap="300" align="center">
              <Spinner size="large" />
              <Text as="p">Loading saved items...</Text>
            </BlockStack>
          </Box>
        </Card>
      </Page>
    );
  }

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
