import React, { useState, useCallback, useEffect } from 'react';
import {
  Modal,
  Form,
  FormLayout,
  TextField,
  Select,
  RangeSlider,
  Text,
  Banner,
  BlockStack,
  InlineStack,
  Box,
  Badge,
  Thumbnail,
  Spinner,
  Card,
  Divider,
} from '@shopify/polaris';

interface SavedItemForPush {
  id: string | number;
  title?: string;
  product_name?: string;
  image?: string;
  product_image_url?: string;
  price?: number;
  supplier?: string;
  supplier_name?: string;
  moq?: number;
  source?: string;
  source_url?: string;
  description?: string;
}

interface PushToShopifyModalProps {
  open: boolean;
  onClose: () => void;
  item: SavedItemForPush | null;
  onPush: (data: PushData) => Promise<void>;
}

interface PushData {
  savedItemId: string | number;
  customTitle: string;
  customDescription: string;
  priceMarkup: number;
  productType: string;
  tags: string[];
}

interface PreviewData {
  costPrice: number;
  sellingPrice: number;
  profitMargin: string;
  preview: {
    title: string;
    body_html: string;
    vendor: string;
    status: string;
  };
}

const PRODUCT_TYPES = [
  { label: 'General', value: 'General' },
  { label: 'Electronics', value: 'Electronics' },
  { label: 'Clothing', value: 'Clothing' },
  { label: 'Home & Garden', value: 'Home & Garden' },
  { label: 'Beauty', value: 'Beauty' },
  { label: 'Sports', value: 'Sports' },
  { label: 'Toys', value: 'Toys' },
  { label: 'Automotive', value: 'Automotive' },
  { label: 'Health', value: 'Health' },
  { label: 'Office', value: 'Office' },
];

/**
 * PushToShopifyModal Component
 * 
 * Modal for editing product details before pushing to Shopify.
 * Allows customizing title, description, markup, and product type.
 */
const PushToShopifyModal: React.FC<PushToShopifyModalProps> = ({
  open,
  onClose,
  item,
  onPush,
}) => {
  const [customTitle, setCustomTitle] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [priceMarkup, setPriceMarkup] = useState(100); // Percentage (100 = 2x)
  const [productType, setProductType] = useState('General');
  const [tagsInput, setTagsInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);

  // Reset form when item changes
  useEffect(() => {
    if (item) {
      setCustomTitle(item.title || item.product_name || '');
      setCustomDescription(item.description || '');
      setPriceMarkup(100);
      setProductType('General');
      setTagsInput('');
      setError(null);
      setPreview(null);
    }
  }, [item]);

  // Calculate preview prices
  useEffect(() => {
    if (item?.price) {
      const costPrice = item.price;
      const markup = 1 + priceMarkup / 100;
      const sellingPrice = costPrice * markup;
      const profit = sellingPrice - costPrice;
      
      setPreview({
        costPrice,
        sellingPrice,
        profitMargin: `${priceMarkup}%`,
        preview: {
          title: customTitle,
          body_html: customDescription,
          vendor: item.supplier || item.supplier_name || 'Unknown',
          status: 'draft',
        },
      });
    }
  }, [item, priceMarkup, customTitle, customDescription]);

  const handlePush = useCallback(async () => {
    if (!item) return;

    setIsLoading(true);
    setError(null);

    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      await onPush({
        savedItemId: item.id,
        customTitle,
        customDescription,
        priceMarkup: 1 + priceMarkup / 100, // Convert percentage to multiplier
        productType,
        tags,
      });

      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to push product to Shopify');
    } finally {
      setIsLoading(false);
    }
  }, [item, customTitle, customDescription, priceMarkup, productType, tagsInput, onPush, onClose]);

  const handleMarkupChange = useCallback((value: number) => {
    setPriceMarkup(value);
  }, []);

  if (!item) return null;

  const costPrice = item.price || 0;
  const sellingPrice = costPrice * (1 + priceMarkup / 100);
  const profit = sellingPrice - costPrice;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Push to Shopify"
      primaryAction={{
        content: isLoading ? 'Pushing...' : 'Push as Draft',
        onAction: handlePush,
        loading: isLoading,
        disabled: isLoading || !customTitle,
      }}
      secondaryActions={[
        {
          content: 'Cancel',
          onAction: onClose,
          disabled: isLoading,
        },
      ]}
      large
    >
      <Modal.Section>
        {error && (
          <Box paddingBlockEnd="400">
            <Banner tone="critical" onDismiss={() => setError(null)}>
              {error}
            </Banner>
          </Box>
        )}

        <BlockStack gap="500">
          {/* Product Preview Header */}
          <InlineStack gap="400" align="start">
            <Thumbnail
              source={item.image || item.product_image_url || 'https://via.placeholder.com/60'}
              alt={item.title || item.product_name || 'Product'}
              size="large"
            />
            <BlockStack gap="100">
              <Text as="h3" variant="headingMd">
                {item.title || item.product_name}
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Supplier: {item.supplier || item.supplier_name || 'Unknown'}
              </Text>
              <InlineStack gap="200">
                <Badge tone={item.source === 'alibaba' ? 'warning' : 'info'}>
                  {item.source || 'Unknown Source'}
                </Badge>
                {item.moq && (
                  <Badge>MOQ: {item.moq}</Badge>
                )}
              </InlineStack>
            </BlockStack>
          </InlineStack>

          <Divider />

          {/* Edit Form */}
          <Form onSubmit={handlePush}>
            <FormLayout>
              <TextField
                label="Product Title"
                value={customTitle}
                onChange={setCustomTitle}
                autoComplete="off"
                helpText="This title will appear in your Shopify store"
              />

              <TextField
                label="Description"
                value={customDescription}
                onChange={setCustomDescription}
                multiline={4}
                autoComplete="off"
                helpText="Product description for customers"
              />

              <Select
                label="Product Type"
                options={PRODUCT_TYPES}
                value={productType}
                onChange={setProductType}
              />

              <TextField
                label="Tags"
                value={tagsInput}
                onChange={setTagsInput}
                autoComplete="off"
                helpText="Comma-separated tags (e.g., trending, summer, sale)"
                placeholder="trending, featured, new-arrival"
              />
            </FormLayout>
          </Form>

          <Divider />

          {/* Pricing Section */}
          <Card>
            <BlockStack gap="400">
              <Text as="h3" variant="headingMd">
                Pricing Calculator
              </Text>

              <Box>
                <Text as="p" variant="bodySm" tone="subdued">
                  Price Markup: {priceMarkup}%
                </Text>
                <RangeSlider
                  label=""
                  labelHidden
                  value={priceMarkup}
                  min={25}
                  max={300}
                  step={5}
                  onChange={handleMarkupChange}
                  output
                />
              </Box>

              <InlineStack gap="800" align="space-between">
                <BlockStack gap="100">
                  <Text as="p" variant="bodySm" tone="subdued">
                    Cost Price
                  </Text>
                  <Text as="p" variant="headingLg">
                    ${costPrice.toFixed(2)}
                  </Text>
                </BlockStack>

                <BlockStack gap="100">
                  <Text as="p" variant="bodySm" tone="subdued">
                    Selling Price
                  </Text>
                  <Text as="p" variant="headingLg" tone="success">
                    ${sellingPrice.toFixed(2)}
                  </Text>
                </BlockStack>

                <BlockStack gap="100">
                  <Text as="p" variant="bodySm" tone="subdued">
                    Profit per Sale
                  </Text>
                  <Text as="p" variant="headingLg" tone="success">
                    ${profit.toFixed(2)}
                  </Text>
                </BlockStack>
              </InlineStack>
            </BlockStack>
          </Card>

          {/* Info Banner */}
          <Banner tone="info">
            <p>
              Products are pushed as <strong>drafts</strong> to your Shopify store.
              Review and activate them in your Shopify admin when ready.
            </p>
          </Banner>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
};

export default PushToShopifyModal;
