/**
 * PushedProductsPage Component
 * 
 * Displays all products that have been pushed to Shopify.
 * Allows users to manage product status and delete products.
 */

import React, { useState, useCallback } from 'react';
import {
  Page,
  Card,
  ResourceList,
  ResourceItem,
  Text,
  Badge,
  Button,
  ButtonGroup,
  BlockStack,
  InlineStack,
  Box,
  Banner,
  Modal,
  Thumbnail,
  Spinner,
  EmptyState,
  Filters,
  ChoiceList,
} from '@shopify/polaris';
import { usePushedProducts } from '../hooks/usePushedProducts';
import { PushedProduct } from '../types';

/**
 * Get badge tone based on push status
 */
function getStatusBadge(status: string): { tone: 'success' | 'warning' | 'info' | 'critical'; label: string } {
  switch (status) {
    case 'active':
      return { tone: 'success', label: 'Active' };
    case 'draft':
      return { tone: 'warning', label: 'Draft' };
    case 'archived':
      return { tone: 'info', label: 'Archived' };
    default:
      return { tone: 'info', label: status };
  }
}

const PushedProductsPage: React.FC = () => {
  const {
    products,
    isLoading,
    error,
    fetchProducts,
    updateStatus,
    deleteProduct,
    stats,
  } = usePushedProducts();

  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<PushedProduct | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter products based on status
  const filteredProducts = statusFilter.length > 0
    ? products.filter(p => statusFilter.includes(p.push_status))
    : products;

  /**
   * Handle status change
   */
  const handleStatusChange = useCallback(async (
    product: PushedProduct,
    newStatus: 'draft' | 'active' | 'archived'
  ) => {
    setIsUpdating(product.shopify_product_id);
    const success = await updateStatus(product.shopify_product_id, newStatus);
    setIsUpdating(null);
    
    if (success) {
      setSuccessMessage(`Product status updated to ${newStatus}`);
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  }, [updateStatus]);

  /**
   * Handle delete confirmation
   */
  const handleDeleteClick = useCallback((product: PushedProduct) => {
    setProductToDelete(product);
    setDeleteModalOpen(true);
  }, []);

  /**
   * Confirm delete
   */
  const handleConfirmDelete = useCallback(async () => {
    if (!productToDelete) return;
    
    setIsUpdating(productToDelete.shopify_product_id);
    const success = await deleteProduct(productToDelete.shopify_product_id);
    setIsUpdating(null);
    setDeleteModalOpen(false);
    setProductToDelete(null);
    
    if (success) {
      setSuccessMessage('Product deleted from Shopify');
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  }, [productToDelete, deleteProduct]);

  /**
   * Open product in Shopify admin
   */
  const handleViewInShopify = useCallback((product: PushedProduct) => {
    // This would need the shop domain - for now, show the product ID
    window.open(`https://admin.shopify.com/products/${product.shopify_product_id}`, '_blank');
  }, []);

  /**
   * Render individual product item
   */
  const renderItem = (product: PushedProduct) => {
    const { tone, label } = getStatusBadge(product.push_status);
    const isCurrentlyUpdating = isUpdating === product.shopify_product_id;

    return (
      <ResourceItem
        id={product.shopify_product_id}
        accessibilityLabel={`View details for ${product.product_name}`}
      >
        <InlineStack align="space-between" blockAlign="center">
          <InlineStack gap="400" blockAlign="center">
            <Thumbnail
              source="https://via.placeholder.com/60"
              alt={product.product_name || 'Product'}
              size="small"
            />
            <BlockStack gap="100">
              <Text as="h3" variant="bodyMd" fontWeight="semibold">
                {product.product_name || 'Unknown Product'}
              </Text>
              <InlineStack gap="200">
                <Badge tone={tone}>{label}</Badge>
                {product.supplier_name && (
                  <Text as="span" variant="bodySm" tone="subdued">
                    {product.supplier_name}
                  </Text>
                )}
              </InlineStack>
              {product.cost_price && (
                <Text as="p" variant="bodySm" tone="subdued">
                  Cost: ${product.cost_price.toFixed(2)}
                </Text>
              )}
            </BlockStack>
          </InlineStack>

          <InlineStack gap="200">
            {isCurrentlyUpdating ? (
              <Spinner size="small" />
            ) : (
              <ButtonGroup>
                {product.push_status === 'draft' && (
                  <Button
                    size="slim"
                    onClick={() => handleStatusChange(product, 'active')}
                  >
                    Activate
                  </Button>
                )}
                {product.push_status === 'active' && (
                  <Button
                    size="slim"
                    onClick={() => handleStatusChange(product, 'archived')}
                  >
                    Archive
                  </Button>
                )}
                {product.push_status === 'archived' && (
                  <Button
                    size="slim"
                    onClick={() => handleStatusChange(product, 'draft')}
                  >
                    Restore
                  </Button>
                )}
                <Button
                  size="slim"
                  variant="plain"
                  onClick={() => handleViewInShopify(product)}
                >
                  View in Shopify
                </Button>
                <Button
                  size="slim"
                  variant="plain"
                  tone="critical"
                  onClick={() => handleDeleteClick(product)}
                >
                  Delete
                </Button>
              </ButtonGroup>
            )}
          </InlineStack>
        </InlineStack>
      </ResourceItem>
    );
  };

  // Loading state
  if (isLoading && products.length === 0) {
    return (
      <Page title="Pushed Products">
        <Card>
          <Box padding="800">
            <BlockStack gap="400" align="center">
              <Spinner size="large" />
              <Text as="p">Loading pushed products...</Text>
            </BlockStack>
          </Box>
        </Card>
      </Page>
    );
  }

  // Empty state
  if (!isLoading && products.length === 0) {
    return (
      <Page title="Pushed Products">
        <Card>
          <EmptyState
            heading="No products pushed yet"
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          >
            <p>
              Products you push from your Saved Items will appear here.
              Go to Saved Items and click "Push to Shopify" to get started.
            </p>
          </EmptyState>
        </Card>
      </Page>
    );
  }

  return (
    <Page
      title="Pushed Products"
      subtitle={`${stats.total} products in your Shopify store`}
      primaryAction={{
        content: 'Refresh',
        onAction: fetchProducts,
        loading: isLoading,
      }}
    >
      <BlockStack gap="400">
        {/* Success/Error Banners */}
        {successMessage && (
          <Banner tone="success" onDismiss={() => setSuccessMessage(null)}>
            {successMessage}
          </Banner>
        )}
        
        {error && (
          <Banner tone="critical" onDismiss={() => fetchProducts()}>
            {error}
          </Banner>
        )}

        {/* Stats Cards */}
        <InlineStack gap="400" align="start">
          <Card>
            <BlockStack gap="100">
              <Text as="h3" variant="headingXl">{stats.total}</Text>
              <Text as="p" tone="subdued">Total Products</Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="100">
              <Text as="h3" variant="headingXl" tone="caution">{stats.draft}</Text>
              <Text as="p" tone="subdued">Drafts</Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="100">
              <Text as="h3" variant="headingXl" tone="success">{stats.active}</Text>
              <Text as="p" tone="subdued">Active</Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="100">
              <Text as="h3" variant="headingXl">{stats.archived}</Text>
              <Text as="p" tone="subdued">Archived</Text>
            </BlockStack>
          </Card>
        </InlineStack>

        {/* Products List */}
        <Card>
          <ResourceList
            resourceName={{ singular: 'product', plural: 'products' }}
            items={filteredProducts}
            renderItem={renderItem}
            selectedItems={selectedItems}
            onSelectionChange={setSelectedItems}
            selectable
            filterControl={
              <Filters
                queryValue=""
                filters={[
                  {
                    key: 'status',
                    label: 'Status',
                    filter: (
                      <ChoiceList
                        title="Status"
                        titleHidden
                        choices={[
                          { label: 'Draft', value: 'draft' },
                          { label: 'Active', value: 'active' },
                          { label: 'Archived', value: 'archived' },
                        ]}
                        selected={statusFilter}
                        onChange={setStatusFilter}
                        allowMultiple
                      />
                    ),
                    shortcut: true,
                  },
                ]}
                onQueryChange={() => {}}
                onQueryClear={() => {}}
                onClearAll={() => setStatusFilter([])}
              />
            }
          />
        </Card>
      </BlockStack>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete product from Shopify?"
        primaryAction={{
          content: 'Delete',
          destructive: true,
          onAction: handleConfirmDelete,
          loading: isUpdating === productToDelete?.shopify_product_id,
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setDeleteModalOpen(false),
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Text as="p">
              Are you sure you want to delete <strong>{productToDelete?.product_name}</strong> from your Shopify store?
            </Text>
            <Banner tone="warning">
              This action cannot be undone. The product will be permanently removed from your Shopify store.
            </Banner>
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
};

export default PushedProductsPage;
