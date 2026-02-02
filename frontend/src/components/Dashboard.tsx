import React, { useEffect } from 'react';
import { Card, BlockStack, InlineGrid, Page, Text, Box, Button, InlineStack, Badge, ProgressBar } from '@shopify/polaris';
import { useNavigate } from 'react-router-dom';
import useAppStore from '../store/appStore';
import { usePushedProducts } from '../hooks/usePushedProducts';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const user = useAppStore((state) => state.user);
  const usage = useAppStore((state) => state.usage);
  const savedItems = useAppStore((state) => state.savedItems);
  const comparisons = useAppStore((state) => state.comparisons);
  
  // Fetch pushed products stats
  const { stats, products, isLoading: isPushLoading } = usePushedProducts();

  // Calculate search usage percentage
  const searchPercentage = usage ? (usage.searchesUsed / usage.searchLimit) * 100 : 0;

  return (
    <Page title="Dashboard">
      <BlockStack gap="500">
        {/* Main Stats Row */}
        <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="400">
          <Card>
            <Box padding="400">
              <BlockStack gap="200">
                <Text as="h3" variant="headingMd">
                  Subscription
                </Text>
                <InlineStack gap="200" align="start">
                  <Badge tone={user?.subscription_tier === 'premium' ? 'success' : 'info'}>
                    {user?.subscription_tier === 'premium' ? 'Premium' : 'Free'}
                  </Badge>
                </InlineStack>
              </BlockStack>
            </Box>
          </Card>
          <Card>
            <Box padding="400">
              <BlockStack gap="200">
                <Text as="h3" variant="headingMd">
                  Searches Used
                </Text>
                <Text as="p" variant="headingLg">
                  {usage?.searchesUsed || 0}/{usage?.searchLimit || 10}
                </Text>
                <ProgressBar progress={searchPercentage} size="small" tone={searchPercentage > 80 ? 'critical' : 'primary'} />
              </BlockStack>
            </Box>
          </Card>
          <Card>
            <Box padding="400">
              <BlockStack gap="200">
                <Text as="h3" variant="headingMd">
                  Saved Items
                </Text>
                <Text as="p" variant="headingLg">
                  {savedItems?.length || 0}
                </Text>
              </BlockStack>
            </Box>
          </Card>
          <Card>
            <Box padding="400">
              <BlockStack gap="200">
                <Text as="h3" variant="headingMd">
                  Comparisons
                </Text>
                <Text as="p" variant="headingLg">
                  {comparisons?.length || 0}
                </Text>
              </BlockStack>
            </Box>
          </Card>
        </InlineGrid>

        {/* Shopify Products Stats */}
        <Card>
          <Box padding="400">
            <BlockStack gap="400">
              <InlineStack align="space-between">
                <Text as="h2" variant="headingLg">
                  🚀 Shopify Products
                </Text>
                <Button onClick={() => navigate('/pushed')} variant="plain">
                  View All →
                </Button>
              </InlineStack>
              
              <InlineGrid columns={{ xs: 2, sm: 4 }} gap="400">
                <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                  <BlockStack gap="100" align="center">
                    <Text as="p" variant="headingXl" alignment="center">
                      {stats.total}
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                      Total Pushed
                    </Text>
                  </BlockStack>
                </Box>
                <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                  <BlockStack gap="100" align="center">
                    <Text as="p" variant="headingXl" tone="caution" alignment="center">
                      {stats.draft}
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                      Drafts
                    </Text>
                  </BlockStack>
                </Box>
                <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                  <BlockStack gap="100" align="center">
                    <Text as="p" variant="headingXl" tone="success" alignment="center">
                      {stats.active}
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                      Active
                    </Text>
                  </BlockStack>
                </Box>
                <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                  <BlockStack gap="100" align="center">
                    <Text as="p" variant="headingXl" alignment="center">
                      {stats.archived}
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                      Archived
                    </Text>
                  </BlockStack>
                </Box>
              </InlineGrid>
            </BlockStack>
          </Box>
        </Card>

        {/* Quick Actions */}
        <Card>
          <Box padding="400">
            <BlockStack gap="400">
              <Text as="h2" variant="headingLg">
                Quick Actions
              </Text>
              <InlineStack gap="300" wrap>
                <Button variant="primary" onClick={() => navigate('/search')}>
                  🔍 Search Products
                </Button>
                <Button onClick={() => navigate('/saved')}>
                  💾 View Saved Items
                </Button>
                <Button onClick={() => navigate('/comparisons')}>
                  ⚖️ Compare Products
                </Button>
                <Button onClick={() => navigate('/pushed')}>
                  🚀 Manage Shopify Products
                </Button>
              </InlineStack>
            </BlockStack>
          </Box>
        </Card>

        {/* Getting Started / Tips */}
        <Card>
          <Box padding="400">
            <BlockStack gap="300">
              <Text as="h2" variant="headingLg">
                💡 Workflow Tips
              </Text>
              <InlineGrid columns={{ xs: 1, md: 3 }} gap="400">
                <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                  <BlockStack gap="200">
                    <Text as="h3" variant="headingMd">1. Search & Save</Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Find products from Alibaba, Made-in-China, or Shopify's global catalog. Save the ones you like.
                    </Text>
                  </BlockStack>
                </Box>
                <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                  <BlockStack gap="200">
                    <Text as="h3" variant="headingMd">2. Compare & Decide</Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Compare suppliers side-by-side. Check prices, MOQ, and ratings to find the best deal.
                    </Text>
                  </BlockStack>
                </Box>
                <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                  <BlockStack gap="200">
                    <Text as="h3" variant="headingMd">3. Push to Shopify</Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Push winning products to your Shopify store as drafts. Set your markup and go live!
                    </Text>
                  </BlockStack>
                </Box>
              </InlineGrid>
            </BlockStack>
          </Box>
        </Card>
      </BlockStack>
    </Page>
  );
};

export default Dashboard;
