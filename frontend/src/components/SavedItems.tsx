/**
 * SavedItems Component
 * Display and manage saved products
 */

import React, { useState, useCallback } from 'react';
import ProductCard, { ProductCardProps } from './ProductCard';
import PushToShopifyModal from './PushToShopifyModal';
import '../styles/components.css';

interface SavedItemForPush {
  id: string;
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

interface SavedItemsProps {
  items: ProductCardProps[];
  onRemove?: (productId: string) => void;
  onCompare?: (productId: string) => void;
  onPushToShopify?: (itemId: string, data: any) => Promise<void>;
}

const SavedItems: React.FC<SavedItemsProps> = ({ items, onRemove, onCompare, onPushToShopify }) => {
  const [sortBy, setSortBy] = useState<'date' | 'price' | 'name'>('date');
  const [filterSource, setFilterSource] = useState<'all' | 'alibaba' | 'made-in-china' | 'shopify'>('all');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [pushModalOpen, setPushModalOpen] = useState(false);
  const [itemToPush, setItemToPush] = useState<SavedItemForPush | null>(null);
  const [isPushing, setIsPushing] = useState(false);

  // Filter items
  const filteredItems = items.filter((item) => {
    if (filterSource === 'all') return true;
    if (filterSource === 'alibaba') return item.source === 'alibaba';
    if (filterSource === 'made-in-china') return item.source === 'made-in-china';
    if (filterSource === 'shopify') return item.source === 'shopify_global';
    return true;
  });

  // Sort items
  const sortedItems = [...filteredItems].sort((a, b) => {
    switch (sortBy) {
      case 'price':
        return (a.price || 0) - (b.price || 0);
      case 'name':
        return a.title.localeCompare(b.title);
      case 'date':
      default:
        return b.id.localeCompare(a.id);
    }
  });

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === sortedItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(sortedItems.map((item) => item.id)));
    }
  };

  const handleCompareSelected = () => {
    selectedItems.forEach((id) => {
      onCompare?.(id);
    });
    setSelectedItems(new Set());
  };

  const handleRemoveSelected = () => {
    selectedItems.forEach((id) => {
      onRemove?.(id);
    });
    setSelectedItems(new Set());
  };

  // Push to Shopify handlers
  const handleOpenPushModal = useCallback((item: ProductCardProps) => {
    const pushItem: SavedItemForPush = {
      id: item.id,
      title: item.title,
      image: item.image,
      price: item.price,
      supplier: item.supplier,
      moq: item.moq,
      source: item.source,
      description: '',
    };
    setItemToPush(pushItem);
    setPushModalOpen(true);
  }, []);

  const handleClosePushModal = useCallback(() => {
    setPushModalOpen(false);
    setItemToPush(null);
  }, []);

  const handlePushToShopify = useCallback(async (data: any) => {
    if (!onPushToShopify || !itemToPush) return;
    
    setIsPushing(true);
    try {
      await onPushToShopify(itemToPush.id, data);
      handleClosePushModal();
    } finally {
      setIsPushing(false);
    }
  }, [onPushToShopify, itemToPush, handleClosePushModal]);

  const handleBulkPush = useCallback(async () => {
    if (!onPushToShopify || selectedItems.size === 0) return;
    
    setIsPushing(true);
    try {
      // Push items one by one with default settings
      for (const id of selectedItems) {
        const item = items.find((i) => i.id === id);
        if (item) {
          await onPushToShopify(id, {
            savedItemId: id,
            customTitle: item.title,
            customDescription: '',
            priceMarkup: 2.0,
            productType: 'General',
            tags: [],
          });
        }
      }
      setSelectedItems(new Set());
    } finally {
      setIsPushing(false);
    }
  }, [onPushToShopify, selectedItems, items]);

  if (items.length === 0) {
    return (
      <div className="saved-items__empty" role="status">
        <div className="saved-items__empty-content">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 5 7 13 17 13 17 5" />
          </svg>
          <h2>No saved items yet</h2>
          <p>Start searching and save products to compare and track</p>
        </div>
      </div>
    );
  }

  return (
    <div className="saved-items" role="region" aria-label="Saved items">
      <div className="saved-items__header">
        <h2>Saved Items</h2>
        <p>{items.length} products saved</p>
      </div>

      {/* Controls */}
      <div className="saved-items__controls">
        <div className="saved-items__filter-group">
          <label htmlFor="source-filter-saved">Filter by Source:</label>
          <select
            id="source-filter-saved"
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value as any)}
            className="saved-items__select"
            aria-label="Filter saved items by source"
          >
            <option value="all">All Sources</option>
            <option value="alibaba">Alibaba</option>
            <option value="made-in-china">Made-in-China</option>
            <option value="shopify">Shopify Global</option>
          </select>
        </div>

        <div className="saved-items__sort-group">
          <label htmlFor="sort-by-saved">Sort by:</label>
          <select
            id="sort-by-saved"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="saved-items__select"
            aria-label="Sort saved items by"
          >
            <option value="date">Recently Saved</option>
            <option value="price">Price: Low to High</option>
            <option value="name">Product Name</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {sortedItems.length > 0 && (
        <div className="saved-items__bulk-actions">
          <label className="saved-items__select-all">
            <input
              type="checkbox"
              checked={selectedItems.size === sortedItems.length && sortedItems.length > 0}
              onChange={toggleSelectAll}
              aria-label="Select all items"
            />
            <span>
              Select All ({selectedItems.size}/{sortedItems.length})
            </span>
          </label>

          {selectedItems.size > 0 && (
            <div className="saved-items__action-buttons">
              <button
                className="saved-items__action-btn saved-items__action-btn--success"
                onClick={handleBulkPush}
                disabled={isPushing}
                aria-label={`Push ${selectedItems.size} selected items to Shopify`}
              >
                {isPushing ? 'Pushing...' : `Push to Shopify (${selectedItems.size})`}
              </button>
              <button
                className="saved-items__action-btn saved-items__action-btn--primary"
                onClick={handleCompareSelected}
                aria-label={`Compare ${selectedItems.size} selected items`}
              >
                Compare ({selectedItems.size})
              </button>
              <button
                className="saved-items__action-btn saved-items__action-btn--danger"
                onClick={handleRemoveSelected}
                aria-label={`Remove ${selectedItems.size} selected items`}
              >
                Remove ({selectedItems.size})
              </button>
            </div>
          )}
        </div>
      )}

      {/* Items Grid */}
      <div className="saved-items__grid">
        {sortedItems.map((item) => (
          <div key={item.id} className="saved-items__item-wrapper">
            <input
              type="checkbox"
              className="saved-items__item-checkbox"
              checked={selectedItems.has(item.id)}
              onChange={() => toggleSelect(item.id)}
              aria-label={`Select ${item.title}`}
            />
            <div className="saved-items__item-card">
              <ProductCard
                {...item}
                hideActions={true}
                onCompare={() => onCompare?.(item.id)}
                onSave={() => {}} // Already saved
                onViewDetails={() => {}}
              />
              <div className="saved-items__item-actions">
                <button
                  className="saved-items__push-btn"
                  onClick={() => handleOpenPushModal(item)}
                  aria-label={`Push ${item.title} to Shopify`}
                  title="Push to Shopify"
                >
                  🚀 Push to Shopify
                </button>
                <button
                  className="saved-items__remove-btn"
                  onClick={() => onRemove?.(item.id)}
                  aria-label={`Remove ${item.title} from saved items`}
                  title="Remove from saved items"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="saved-items__footer">
        <p>Showing {sortedItems.length} of {items.length} items</p>
      </div>

      {/* Push to Shopify Modal */}
      <PushToShopifyModal
        open={pushModalOpen}
        onClose={handleClosePushModal}
        item={itemToPush}
        onPush={handlePushToShopify}
      />
    </div>
  );
};

export default SavedItems;
