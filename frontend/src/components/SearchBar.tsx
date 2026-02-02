import React from 'react';
import { Card, TextField, Button, BlockStack, Box, InlineStack, Checkbox, Badge, Text } from '@shopify/polaris';
import { useSearch } from '../hooks/useSearch';
import useAppStore from '../store/appStore';
import type { SearchSource } from '../types';

interface SearchBarProps {
  onSearch?: (query: string, sources?: SearchSource[]) => void;
  isLoading?: boolean;
  placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  onSearch, 
  isLoading: externalLoading, 
  placeholder = "e.g., USB charging cable, wireless earbuds" 
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedSources, setSelectedSources] = React.useState<SearchSource[]>(['alibaba', 'made-in-china', 'cj-dropshipping']);
  const { performSearch } = useSearch();
  const setIsLoading = useAppStore((state) => state.setIsLoading);
  const setError = useAppStore((state) => state.setError);
  const storeLoading = useAppStore((state) => state.isLoading);
  
  const isLoading = externalLoading !== undefined ? externalLoading : storeLoading;

  const toggleSource = (source: SearchSource) => {
    setSelectedSources(prev => {
      if (prev.includes(source)) {
        // Don't allow removing all sources
        if (prev.length === 1) return prev;
        return prev.filter(s => s !== source);
      }
      return [...prev, source];
    });
  };

  const handleSearch = async (e: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>) => {
    if (e.type === 'submit') {
      (e as React.FormEvent).preventDefault();
    }
    
    if (!searchQuery.trim()) {
      setError('Please enter a search query');
      return;
    }

    if (selectedSources.length === 0) {
      setError('Please select at least one source');
      return;
    }

    // If external onSearch callback is provided, use it
    if (onSearch) {
      onSearch(searchQuery, selectedSources);
      return;
    }

    // Otherwise use internal search logic
    setIsLoading(true);
    try {
      const results = await performSearch({ query: searchQuery, sources: selectedSources });
      console.log('Search results:', results);
      setError(null);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <Box padding="400">
        <form onSubmit={handleSearch} role="search" aria-label="Product search form">
          <BlockStack gap="400">
            <TextField
              label="Product Name or Keywords"
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={placeholder}
              helpText="Search for products across multiple supplier platforms"
              disabled={isLoading}
              autoComplete="off"
            />
            
            {/* Source Selection */}
            <BlockStack gap="200">
              <Text as="span" variant="bodyMd" fontWeight="semibold">
                Search Sources
              </Text>
              <InlineStack gap="400" wrap={true}>
                <InlineStack gap="200" align="center">
                  <Checkbox
                    label=""
                    checked={selectedSources.includes('alibaba')}
                    onChange={() => toggleSource('alibaba')}
                    disabled={isLoading}
                  />
                  <Badge tone="warning">Alibaba</Badge>
                  <Text as="span" variant="bodySm" tone="subdued">Web scraping</Text>
                </InlineStack>
                
                <InlineStack gap="200" align="center">
                  <Checkbox
                    label=""
                    checked={selectedSources.includes('made-in-china')}
                    onChange={() => toggleSource('made-in-china')}
                    disabled={isLoading}
                  />
                  <Badge tone="info">Made-in-China</Badge>
                  <Text as="span" variant="bodySm" tone="subdued">Web scraping</Text>
                </InlineStack>

                <InlineStack gap="200" align="center">
                  <Checkbox
                    label=""
                    checked={selectedSources.includes('cj-dropshipping')}
                    onChange={() => toggleSource('cj-dropshipping')}
                    disabled={isLoading}
                  />
                  <Badge tone="success">CJ Dropshipping</Badge>
                  <Text as="span" variant="bodySm" tone="subdued">Official API • No MOQ</Text>
                </InlineStack>
              </InlineStack>
            </BlockStack>

            <Button 
              variant="primary"
              onClick={() => handleSearch({} as React.MouseEvent<HTMLButtonElement>)}
              disabled={isLoading || !searchQuery.trim() || selectedSources.length === 0}
              loading={isLoading}
            >
              {isLoading ? 'Searching...' : `Search ${selectedSources.length} Source${selectedSources.length > 1 ? 's' : ''}`}
            </Button>
          </BlockStack>
        </form>
      </Box>
    </Card>
  );
};

export default SearchBar;
