import React from 'react';
import { Card, ResourceList, ResourceItem, Text, Badge } from '@shopify/polaris';
import { SavedItem } from '../types';

interface SavedItemsListProps {
  items: SavedItem[];
  onDelete: (id: number) => void;
}

const SavedItemsList: React.FC<SavedItemsListProps> = ({
  items,
  onDelete,
}) => {
  return (
    <Card>
      <ResourceList
        resourceName={{ singular: 'item', plural: 'items' }}
        items={items}
        renderItem={(item: SavedItem) => (
          <ResourceItem
            id={item.id.toString()}
            onClick={() => {
              // Handle item click
            }}
          >
            <div style={{ padding: '10px' }}>
              <Text as="h3" variant="headingMd">
                {item.product_name}
              </Text>
              <div style={{ marginTop: '8px' }}>
                <Text as="p" variant="bodyMd">
                  <strong>Supplier:</strong> {item.supplier_name || 'N/A'}
                </Text>
                <Text as="p" variant="bodyMd">
                  <strong>Price:</strong> ${item.price || 'N/A'}
                </Text>
                <Text as="p" variant="bodyMd">
                  <strong>MOQ:</strong> {item.moq || 'N/A'}
                </Text>
                <Badge>{item.source}</Badge>
              </div>
            </div>
          </ResourceItem>
        )}
      />
    </Card>
  );
};

export default SavedItemsList;
