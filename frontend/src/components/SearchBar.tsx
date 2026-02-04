import React from 'react';
import { Card, TextField, Button, BlockStack, Box, InlineStack, Checkbox, Badge, Text, Tooltip, Icon } from '@shopify/polaris';
import { MagicIcon } from '@shopify/polaris-icons';
import { useSearch } from '../hooks/useSearch';
import useAppStore from '../store/appStore';
import { hasFeature, getTierConfig } from '../config/subscriptions';
import type { SearchSource } from '../types';

interface SearchBarProps {
  onSearch?: (query: string, sources?: SearchSource[], bossMode?: boolean) => void;
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
  const [bossModeEnabled, setBossModeEnabled] = React.useState(false);
  const { performSearch } = useSearch();
  const setIsLoading = useAppStore((state) => state.setIsLoading);
  const setError = useAppStore((state) => state.setError);
  const storeLoading = useAppStore((state) => state.isLoading);
  const subscription = useAppStore((state) => state.subscription);
  
  const isLoading = externalLoading !== undefined ? externalLoading : storeLoading;
  const canUseBossMode = hasFeature(subscription.tier, 'bossMode');
  const tierConfig = getTierConfig(subscription.tier);

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
      onSearch(searchQuery, selectedSources, bossModeEnabled && canUseBossMode);
      return;
    }

    // Otherwise use internal search logic
    setIsLoading(true);
    try {
      const results = await performSearch({ 
        query: searchQuery, 
        sources: selectedSources,
        bossMode: bossModeEnabled && canUseBossMode,
      });
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

                <InlineStack gap="200" align="center">
                  <Checkbox
                    label=""
                    checked={selectedSources.includes('global-sources')}
                    onChange={() => toggleSource('global-sources')}
                    disabled={isLoading}
                  />
                  <Badge tone="attention">Global Sources</Badge>
                  <Text as="span" variant="bodySm" tone="subdued">Web scraping</Text>
                </InlineStack>

                <InlineStack gap="200" align="center">
                  <Checkbox
                    label=""
                    checked={selectedSources.includes('tradekorea')}
                    onChange={() => toggleSource('tradekorea')}
                    disabled={isLoading}
                  />
                  <Badge tone="magic">TradeKorea</Badge>
                  <Text as="span" variant="bodySm" tone="subdued">Korean suppliers</Text>
                </InlineStack>

                <InlineStack gap="200" align="center">
                  <Checkbox
                    label=""
                    checked={selectedSources.includes('wholesale-central')}
                    onChange={() => toggleSource('wholesale-central')}
                    disabled={isLoading}
                  />
                  <Badge>Wholesale Central</Badge>
                  <Text as="span" variant="bodySm" tone="subdued">US wholesalers</Text>
                </InlineStack>
              </InlineStack>
            </BlockStack>

            {/* Boss Mode Toggle - Pro+ Feature */}
            <BlockStack gap="200">
              <InlineStack gap="200" align="center">
                <Checkbox
                  label=""
                  checked={bossModeEnabled}
                  onChange={() => setBossModeEnabled(!bossModeEnabled)}
                  disabled={isLoading || !canUseBossMode}
                />
                <InlineStack gap="100" align="center">
                  <Icon source={MagicIcon} tone={canUseBossMode && bossModeEnabled ? 'success' : 'subdued'} />
                  <Text as="span" variant="bodyMd" fontWeight="semibold">
                    Boss Mode
                  </Text>
                  {canUseBossMode ? (
                    <Badge tone="success">PRO</Badge>
                  ) : (
                    <Tooltip content="Upgrade to Pro to unlock Boss Mode - AI-enhanced search across all sources">
                      <Badge tone="attention">🔒 PRO</Badge>
                    </Tooltip>
                  )}
                </InlineStack>
              </InlineStack>
              {canUseBossMode ? (
                <Text as="span" variant="bodySm" tone="subdued">
                  AI-enhanced search finds products from additional sources • {tierConfig.limits.bossModeSearchesPerDay === -1 ? 'Unlimited' : `${tierConfig.limits.bossModeSearchesPerDay}/day`}
                </Text>
              ) : (
                <Text as="span" variant="bodySm" tone="subdued">
                  Unlock AI-powered deep search across the web
                </Text>
              )}
            </BlockStack>

            <Button 
              variant="primary"
              onClick={() => handleSearch({} as React.MouseEvent<HTMLButtonElement>)}
              disabled={isLoading || !searchQuery.trim() || selectedSources.length === 0}
              loading={isLoading}
            >
              {isLoading ? 'Searching...' : bossModeEnabled && canUseBossMode ? '🚀 Boss Mode Search' : `Search ${selectedSources.length} Source${selectedSources.length > 1 ? 's' : ''}`}
            </Button>
          </BlockStack>
        </form>
      </Box>
    </Card>
  );
};

export default SearchBar;
