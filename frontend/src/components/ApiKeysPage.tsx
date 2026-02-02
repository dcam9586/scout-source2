/**
 * API Keys Settings Page
 * Allows users to configure their own supplier platform API keys
 */

import React, { useState, useEffect } from 'react';
import api from '../store/api';
import {
  Page,
  Card,
  FormLayout,
  TextField,
  Button,
  Banner,
  BlockStack,
  Text,
  Link,
  Divider,
  Badge,
  InlineStack,
  Icon,
} from '@shopify/polaris';
import {
  KeyIcon,
  LockIcon,
  CheckCircleIcon,
} from '@shopify/polaris-icons';

interface ApiKeyConfig {
  platform: string;
  name: string;
  description: string;
  apiKeyLabel: string;
  secretLabel?: string;
  docsUrl: string;
  hasSecret: boolean;
  color: string;
}

const SUPPORTED_PLATFORMS: ApiKeyConfig[] = [
  {
    platform: 'alibaba',
    name: 'Alibaba.com',
    description: 'Access wholesale suppliers from China. Requires Alibaba Open Platform account.',
    apiKeyLabel: 'App Key',
    secretLabel: 'App Secret',
    docsUrl: 'https://open.alibaba.com/',
    hasSecret: true,
    color: '#FF6A00',
  },
  {
    platform: 'aliexpress',
    name: 'AliExpress',
    description: 'Dropshipping-friendly supplier platform. Uses AliExpress Affiliate API.',
    apiKeyLabel: 'API Key',
    secretLabel: 'Tracking ID',
    docsUrl: 'https://portals.aliexpress.com/affiportals/web/openapi.htm',
    hasSecret: true,
    color: '#E62E04',
  },
  {
    platform: 'amazon',
    name: 'Amazon Product API',
    description: 'Search Amazon product catalog via Product Advertising API.',
    apiKeyLabel: 'Access Key',
    secretLabel: 'Secret Key',
    docsUrl: 'https://webservices.amazon.com/paapi5/documentation/',
    hasSecret: true,
    color: '#FF9900',
  },
  {
    platform: 'cjdropshipping',
    name: 'CJ Dropshipping',
    description: 'Popular dropshipping platform with fast shipping options.',
    apiKeyLabel: 'API Key',
    docsUrl: 'https://developers.cjdropshipping.com/',
    hasSecret: false,
    color: '#1890FF',
  },
];

interface ApiKeyData {
  platform: string;
  apiKey: string;
  apiSecret?: string;
  isConfigured: boolean;
}

const ApiKeysPage: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<Record<string, { key: string; secret: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [savedPlatforms, setSavedPlatforms] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load existing API keys on mount
  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      const response = await api.get('/api/v1/user/api-keys');
      setSavedPlatforms(response.data.configuredPlatforms || []);
    } catch (err) {
      console.error('Failed to load API keys:', err);
    }
  };

  const handleKeyChange = (platform: string, field: 'key' | 'secret', value: string) => {
    setApiKeys(prev => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        [field]: value,
      },
    }));
  };

  const handleSave = async (platform: string) => {
    setSaving(platform);
    setError(null);
    setSuccess(null);

    try {
      await api.post('/api/v1/user/api-keys', {
        platform,
        apiKey: apiKeys[platform]?.key || '',
        apiSecret: apiKeys[platform]?.secret || '',
      });

      setSavedPlatforms(prev => [...prev.filter(p => p !== platform), platform]);
      setSuccess(`${platform} API keys saved successfully!`);
      // Clear the input fields after saving
      setApiKeys(prev => ({
        ...prev,
        [platform]: { key: '', secret: '' },
      }));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save API keys. Please try again.');
    } finally {
      setSaving(null);
    }
  };

  const handleRemove = async (platform: string) => {
    try {
      await api.delete(`/api/v1/user/api-keys/${platform}`);
      setSavedPlatforms(prev => prev.filter(p => p !== platform));
      setSuccess(`${platform} API keys removed.`);
    } catch (err) {
      setError('Failed to remove API keys.');
    }
  };

  return (
    <Page title="API Keys Configuration">
      <BlockStack gap="400">
        <Banner tone="info">
          <p>
            <strong>Important:</strong> To search for products from supplier platforms, you need to 
            provide your own API keys. This ensures you have full control over your API usage and 
            keeps your data secure.
          </p>
        </Banner>

        {error && (
          <Banner tone="critical" onDismiss={() => setError(null)}>
            <p>{error}</p>
          </Banner>
        )}

        {success && (
          <Banner tone="success" onDismiss={() => setSuccess(null)}>
            <p>{success}</p>
          </Banner>
        )}

        <Card>
          <BlockStack gap="400">
            <Text variant="headingMd" as="h2">How to Get API Keys</Text>
            <Text as="p" tone="subdued">
              Each platform requires you to register as a developer to obtain API credentials. 
              Click the documentation links below for each platform's signup process.
            </Text>
          </BlockStack>
        </Card>

        {SUPPORTED_PLATFORMS.map((platform) => (
          <Card key={platform.platform}>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <InlineStack gap="300" blockAlign="center">
                  {/* Platform color indicator */}
                  <div 
                    style={{ 
                      width: '4px', 
                      height: '40px', 
                      borderRadius: '4px',
                      background: platform.color 
                    }}
                    aria-hidden="true"
                  />
                  <BlockStack gap="100">
                    <InlineStack gap="200" blockAlign="center">
                      <Text variant="headingMd" as="h3">{platform.name}</Text>
                      {savedPlatforms.includes(platform.platform) && (
                        <Badge tone="success" icon={CheckCircleIcon}>Configured</Badge>
                      )}
                    </InlineStack>
                    <Text as="p" tone="subdued">{platform.description}</Text>
                  </BlockStack>
                </InlineStack>
                <Link url={platform.docsUrl} external>
                  Get API Keys →
                </Link>
              </InlineStack>
              
              <Divider />
              
              <FormLayout>
                <TextField
                  label={platform.apiKeyLabel}
                  value={apiKeys[platform.platform]?.key || ''}
                  onChange={(value) => handleKeyChange(platform.platform, 'key', value)}
                  type="password"
                  autoComplete="off"
                  placeholder={savedPlatforms.includes(platform.platform) ? '••••••••••••••••' : 'Enter your API key'}
                />
                
                {platform.hasSecret && (
                  <TextField
                    label={platform.secretLabel}
                    value={apiKeys[platform.platform]?.secret || ''}
                    onChange={(value) => handleKeyChange(platform.platform, 'secret', value)}
                    type="password"
                    autoComplete="off"
                    placeholder={savedPlatforms.includes(platform.platform) ? '••••••••••••••••' : 'Enter your API secret'}
                  />
                )}
                
                <InlineStack gap="200">
                  <Button
                    variant="primary"
                    onClick={() => handleSave(platform.platform)}
                    loading={saving === platform.platform}
                    disabled={!apiKeys[platform.platform]?.key}
                  >
                    {savedPlatforms.includes(platform.platform) ? 'Update Keys' : 'Save Keys'}
                  </Button>
                  
                  {savedPlatforms.includes(platform.platform) && (
                    <Button
                      variant="plain"
                      tone="critical"
                      onClick={() => handleRemove(platform.platform)}
                    >
                      Remove
                    </Button>
                  )}
                </InlineStack>
              </FormLayout>
            </BlockStack>
          </Card>
        ))}

        <Card>
          <BlockStack gap="300">
            <Text variant="headingMd" as="h2">Security Notice</Text>
            <Text as="p" tone="subdued">
              Your API keys are encrypted and stored securely. They are only used to make requests 
              to the respective platforms on your behalf. We never share your credentials with third parties.
            </Text>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
};

export default ApiKeysPage;
