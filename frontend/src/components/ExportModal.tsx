/**
 * Export Modal Component
 * Allows users to export saved items to various destinations
 * - Push to Shopify (existing functionality)
 * - Export to CSV (for manual import to partner platforms)
 * - Future: Direct API integrations with Dropified, Syncee
 */

import React, { useState } from 'react';
import {
  Modal,
  BlockStack,
  Card,
  Text,
  Button,
  RadioButton,
  Badge,
  Banner,
  Divider,
  InlineStack,
  Icon,
  Box,
  Checkbox,
  TextField,
} from '@shopify/polaris';
import {
  ExportIcon,
} from '@shopify/polaris-icons';
import type { SavedItem } from '../types';

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  items: SavedItem[];
  onPushToShopify: (items: SavedItem[]) => void;
}

type ExportDestination = 'shopify' | 'csv' | 'dropified' | 'syncee';

interface ExportOption {
  id: ExportDestination;
  name: string;
  description: string;
  available: boolean;
  badge?: {
    text: string;
    tone: 'success' | 'warning' | 'info' | 'attention';
  };
}

const EXPORT_OPTIONS: ExportOption[] = [
  {
    id: 'shopify',
    name: 'Push to Shopify',
    description: 'Create draft products directly in your Shopify store',
    available: true,
    badge: { text: 'Recommended', tone: 'success' },
  },
  {
    id: 'csv',
    name: 'Export to CSV',
    description: 'Download a CSV file for manual import to any platform',
    available: true,
  },
  {
    id: 'dropified',
    name: 'Export to Dropified',
    description: 'Send products directly to your Dropified import list',
    available: false,
    badge: { text: 'Coming Soon', tone: 'info' },
  },
  {
    id: 'syncee',
    name: 'Export to Syncee',
    description: 'Sync products to Syncee for automated dropshipping',
    available: false,
    badge: { text: 'Coming Soon', tone: 'info' },
  },
];

const ExportModal: React.FC<ExportModalProps> = ({
  open,
  onClose,
  items,
  onPushToShopify,
}) => {
  const [selectedDestination, setSelectedDestination] = useState<ExportDestination>('shopify');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // CSV export options
  const [includeImages, setIncludeImages] = useState(true);
  const [includeSupplierInfo, setIncludeSupplierInfo] = useState(true);
  const [priceMarkup, setPriceMarkup] = useState('50');

  const handleExport = async () => {
    setIsExporting(true);
    setExportError(null);
    setExportSuccess(false);

    try {
      switch (selectedDestination) {
        case 'shopify':
          onPushToShopify(items);
          onClose();
          break;

        case 'csv':
          await exportToCSV();
          setExportSuccess(true);
          setTimeout(() => {
            setExportSuccess(false);
            onClose();
          }, 2000);
          break;

        case 'dropified':
        case 'syncee':
          setExportError('This integration is coming soon!');
          break;
      }
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const exportToCSV = async () => {
    const markupMultiplier = 1 + (parseFloat(priceMarkup) || 0) / 100;

    // Build CSV headers
    const headers = [
      'Handle',
      'Title',
      'Body (HTML)',
      'Vendor',
      'Product Category',
      'Type',
      'Tags',
      'Published',
      'Variant SKU',
      'Variant Price',
      'Variant Compare At Price',
      'Variant Requires Shipping',
      'Variant Taxable',
      'Variant Inventory Policy',
      'Variant Fulfillment Service',
      'Status',
    ];

    if (includeImages) {
      headers.push('Image Src', 'Image Position');
    }

    if (includeSupplierInfo) {
      headers.push(
        'Supplier Name',
        'Supplier Rating',
        'Source URL',
        'MOQ',
        'Original Cost'
      );
    }

    // Build CSV rows
    const rows = items.map((item, index) => {
      const handle = generateHandle(item.product_name);
      const sellingPrice = item.price ? (item.price * markupMultiplier).toFixed(2) : '';
      const comparePrice = item.price ? (item.price * markupMultiplier * 1.2).toFixed(2) : '';

      const row = [
        handle,
        escapeCSV(item.product_name),
        escapeCSV(item.description || ''),
        escapeCSV(item.supplier_name || 'SourceScout Import'),
        '',
        item.source,
        `sourcescout,${item.source},imported`,
        'FALSE', // Published as draft
        `SS-${item.id}`,
        sellingPrice,
        comparePrice,
        'TRUE',
        'TRUE',
        'deny',
        'manual',
        'draft',
      ];

      if (includeImages) {
        row.push(item.product_image_url || '', '1');
      }

      if (includeSupplierInfo) {
        row.push(
          escapeCSV(item.supplier_name || ''),
          item.supplier_rating?.toString() || '',
          item.source_url || '',
          item.moq?.toString() || '',
          item.price?.toString() || ''
        );
      }

      return row;
    });

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    // Download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `sourcescout-export-${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const generateHandle = (title: string): string => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  };

  const escapeCSV = (value: string): string => {
    if (!value) return '';
    // Escape quotes and wrap in quotes if contains comma, newline, or quote
    if (value.includes(',') || value.includes('\n') || value.includes('"')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Export ${items.length} Product${items.length > 1 ? 's' : ''}`}
      primaryAction={{
        content: isExporting ? 'Exporting...' : 'Export',
        onAction: handleExport,
        loading: isExporting,
        disabled: !EXPORT_OPTIONS.find(o => o.id === selectedDestination)?.available,
      }}
      secondaryActions={[
        {
          content: 'Cancel',
          onAction: onClose,
        },
      ]}
    >
      <Modal.Section>
        <BlockStack gap="400">
          {exportSuccess && (
            <Banner title="Export successful!" tone="success">
              <p>Your products have been exported successfully.</p>
            </Banner>
          )}

          {exportError && (
            <Banner title="Export failed" tone="critical">
              <p>{exportError}</p>
            </Banner>
          )}

          <Text as="h3" variant="headingMd">
            Select Export Destination
          </Text>

          <BlockStack gap="300">
            {EXPORT_OPTIONS.map((option) => (
              <Card key={option.id}>
                <Box padding="300">
                  <InlineStack align="space-between" blockAlign="center">
                    <InlineStack gap="300" blockAlign="center">
                      <RadioButton
                        label=""
                        checked={selectedDestination === option.id}
                        onChange={() => option.available && setSelectedDestination(option.id)}
                        disabled={!option.available}
                      />
                      <BlockStack gap="100">
                        <InlineStack gap="200" blockAlign="center">
                          <Text as="span" variant="bodyMd" fontWeight="semibold">
                            {option.name}
                          </Text>
                          {option.badge && (
                            <Badge tone={option.badge.tone}>{option.badge.text}</Badge>
                          )}
                        </InlineStack>
                        <Text as="span" variant="bodySm" tone="subdued">
                          {option.description}
                        </Text>
                      </BlockStack>
                    </InlineStack>
                  </InlineStack>
                </Box>
              </Card>
            ))}
          </BlockStack>

          {/* CSV Export Options */}
          {selectedDestination === 'csv' && (
            <>
              <Divider />
              <Text as="h3" variant="headingMd">
                CSV Export Options
              </Text>
              <BlockStack gap="300">
                <Checkbox
                  label="Include product images"
                  checked={includeImages}
                  onChange={setIncludeImages}
                  helpText="Add image URLs to the CSV for Shopify import"
                />
                <Checkbox
                  label="Include supplier information"
                  checked={includeSupplierInfo}
                  onChange={setIncludeSupplierInfo}
                  helpText="Add supplier name, rating, and source URL as extra columns"
                />
                <TextField
                  label="Price Markup (%)"
                  value={priceMarkup}
                  onChange={setPriceMarkup}
                  type="number"
                  min={0}
                  max={500}
                  suffix="%"
                  autoComplete="off"
                  helpText="Markup percentage to apply to cost prices"
                />
              </BlockStack>
            </>
          )}

          {/* Product Summary */}
          <Divider />
          <Text as="h3" variant="headingMd">
            Products to Export
          </Text>
          <Box padding="200" background="bg-surface-secondary" borderRadius="200">
            <BlockStack gap="100">
              {items.slice(0, 5).map((item) => (
                <InlineStack key={item.id} gap="200" align="space-between">
                  <Text as="span" variant="bodySm" truncate>
                    {item.product_name}
                  </Text>
                  <Badge tone="info">{item.source}</Badge>
                </InlineStack>
              ))}
              {items.length > 5 && (
                <Text as="span" variant="bodySm" tone="subdued">
                  ... and {items.length - 5} more products
                </Text>
              )}
            </BlockStack>
          </Box>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
};

export default ExportModal;
