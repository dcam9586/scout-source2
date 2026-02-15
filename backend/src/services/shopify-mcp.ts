/**
 * Shopify Global Product Discovery Service
 * Integrates with Shopify's MCP (Model Context Protocol) endpoint
 * for discovering products globally across Shopify's network
 */

import axios, { AxiosInstance } from 'axios';
import { getRedis } from '../config/redis';
import { createLogger } from '../utils/logger';

const logger = createLogger('ShopifyMCPService');

export interface ShopifyProduct {
  id: string;
  title: string;
  description?: string;
  price?: number;
  currency?: string;
  image_url?: string;
  supplier?: string;
  moq?: number; // Minimum Order Quantity
  rating?: number;
  reviews?: number;
  url?: string;
  source: 'shopify_global';
}

export interface MCPTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

export interface MCPSearchResponse {
  products?: any[];
  error?: string;
  message?: string;
}

class ShopifyMCPService {
  private clientId: string;
  private clientSecret: string;
  private mcpEndpoint = 'https://discover.shopifyapps.com/global/mcp';
  private tokenEndpoint = 'https://api.shopify.com/auth/access_token';
  private axiosInstance: AxiosInstance;
  private tokenCache: { token: string; expiresAt: number } | null = null;
  private tokenCacheDuration = 3600000; // 1 hour in milliseconds

  constructor() {
    this.clientId = process.env.SHOPIFY_MCP_CLIENT_ID || '';
    this.clientSecret = process.env.SHOPIFY_MCP_CLIENT_SECRET || '';

    this.axiosInstance = axios.create({
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!this.clientId || !this.clientSecret) {
      logger.warn('SHOPIFY_MCP_CONFIG', 'Shopify MCP credentials not fully configured', {
        hasClientId: !!this.clientId,
        hasClientSecret: !!this.clientSecret,
      });
    }
  }

  /**
   * Get or refresh access token for MCP API
   * Uses Redis cache to avoid repeated authentication
   */
  private async getAccessToken(): Promise<string> {
    const redis = getRedis();
    const cacheKey = 'shopify:mcp:token';

    try {
      // Check memory cache first
      if (this.tokenCache && this.tokenCache.expiresAt > Date.now()) {
        logger.debug('TOKEN_CACHE_HIT', 'Using cached token from memory');
        return this.tokenCache.token;
      }

      // Check Redis cache
      const cachedToken = await redis.get(cacheKey);
      if (cachedToken) {
        logger.debug('TOKEN_CACHE_HIT', 'Using cached token from Redis');
        this.tokenCache = {
          token: cachedToken,
          expiresAt: Date.now() + this.tokenCacheDuration,
        };
        return cachedToken;
      }

      // Fetch new token
      logger.debug('TOKEN_FETCH', 'Requesting new access token from Shopify');
      const response = await this.axiosInstance.post<MCPTokenResponse>(
        this.tokenEndpoint,
        {
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'client_credentials',
        }
      );

      const token = response.data.access_token;
      const expiresIn = response.data.expires_in || 3600;

      // Cache token in Redis
      await redis.setex(cacheKey, expiresIn - 60, token); // Expire 60s before actual expiry

      // Cache in memory
      this.tokenCache = {
        token,
        expiresAt: Date.now() + expiresIn * 1000,
      };

      logger.info('TOKEN_OBTAINED', 'Successfully obtained new access token');
      return token;
    } catch (error) {
      logger.error('TOKEN_FETCH_FAILED', 'Failed to obtain access token', error as Error, {
        endpoint: this.tokenEndpoint,
      });
      throw new Error('Failed to authenticate with Shopify MCP service');
    }
  }

  /**
   * Search for products using Shopify's global MCP endpoint
   * with retry logic and error handling
   */
  async searchProducts(
    query: string,
    limit: number = 10,
    retries: number = 3
  ): Promise<ShopifyProduct[]> {
    if (!query || query.trim().length === 0) {
      logger.warn('SEARCH_VALIDATION', 'Empty search query provided');
      return [];
    }

    if (!this.clientId || !this.clientSecret) {
      logger.warn('SEARCH_CONFIG', 'Shopify MCP not properly configured, skipping search');
      return [];
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const startTime = Date.now();
        logger.debug('MCP_SEARCH_START', `Searching Shopify for "${query}" (attempt ${attempt}/${retries})`);

        const token = await this.getAccessToken();

        const response = await this.axiosInstance.post<MCPSearchResponse>(
          this.mcpEndpoint,
          {
            jsonrpc: '2.0',
            method: 'tools/call',
            id: Date.now(),
            params: {
              name: 'search_global_products',
              arguments: {
                query,
                context: 'sourcing,wholesale',
                limit,
              },
            },
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const duration = Date.now() - startTime;

        logger.info('MCP_RESPONSE', 'Full MCP response received', duration, {
          statusCode: response.status,
          hasError: !!response.data.error,
          hasProducts: !!response.data.products,
          productsCount: response.data.products?.length || 0,
        });

        if (response.data.error) {
          logger.error('MCP_ERROR_RESPONSE', `MCP returned error: ${response.data.error}`, new Error(response.data.error));
          throw new Error(`MCP Error: ${response.data.error}`);
        }

        const products = this.normalizeProducts(response.data.products || []);
        logger.info('MCP_SEARCH_SUCCESS', `Found ${products.length} products on Shopify`, duration, {
          query,
          resultsCount: products.length,
          attempt,
        });

        return products;
      } catch (error) {
        lastError = error as Error;
        
        // Log detailed error info
        const isAxiosError = (error as any)?.response !== undefined;
        if (isAxiosError) {
          logger.error('MCP_SEARCH_AXIOS_ERROR', `Search failed with status ${(error as any).response?.status}`, error as Error, {
            query,
            attempt,
            statusCode: (error as any).response?.status,
            statusText: (error as any).response?.statusText,
            responseData: (error as any).response?.data,
            message: (error as Error).message,
          });
        } else {
          logger.error('MCP_SEARCH_ERROR', 'Unexpected error during search', error as Error, {
            query,
            attempt,
            error: (error as Error).message,
          });
        }

        if (attempt < retries) {
          const backoffTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          logger.warn('MCP_SEARCH_RETRY', `Search attempt ${attempt} failed, retrying in ${backoffTime}ms`, {
            query,
            attempt,
            error: (error as Error).message,
          });

          await new Promise((resolve) => setTimeout(resolve, backoffTime));
        } else {
          logger.error('MCP_SEARCH_FAILED', 'Shopify product search failed after retries', lastError, {
            query,
            totalAttempts: retries,
          });
        }
      }
    }

    // Return empty array on failure instead of throwing
    return [];
  }

  /**
   * Normalize Shopify MCP response to SourceScout product format
   */
  private normalizeProducts(rawProducts: any[]): ShopifyProduct[] {
    return rawProducts.map((product) => ({
      id: product.id || `shopify-${Date.now()}-${Math.random()}`,
      title: product.title || 'Unnamed Product',
      description: product.description || product.summary,
      price: parseFloat(product.price) || undefined,
      currency: product.currency || 'USD',
      image_url: product.image || product.imageUrl,
      supplier: product.supplier || product.vendor || 'Shopify Network',
      moq: parseInt(product.moq) || parseInt(product.minimum_order_quantity) || 1,
      rating: parseFloat(product.rating) || undefined,
      reviews: parseInt(product.reviews) || undefined,
      url: product.url || product.link,
      source: 'shopify_global' as const,
    }));
  }

  /**
   * Batch search multiple queries efficiently
   */
  async batchSearch(queries: string[], limit: number = 5): Promise<Map<string, ShopifyProduct[]>> {
    const results = new Map<string, ShopifyProduct[]>();

    const startTime = Date.now();
    logger.info('BATCH_SEARCH_START', `Starting batch search for ${queries.length} queries`);

    // Sequential search to avoid rate limits
    for (const query of queries) {
      const products = await this.searchProducts(query, limit, 2);
      results.set(query, products);
    }

    const duration = Date.now() - startTime;
    logger.info('BATCH_SEARCH_COMPLETE', `Batch search completed`, duration, {
      queriesCount: queries.length,
      totalProducts: Array.from(results.values()).reduce((sum, arr) => sum + arr.length, 0),
    });

    return results;
  }

  /**
   * Clear token cache (useful for manual token refresh)
   */
  async clearTokenCache(): Promise<void> {
    const redis = getRedis();
    await redis.del('shopify:mcp:token');
    this.tokenCache = null;
    logger.info('TOKEN_CACHE_CLEARED', 'Shopify MCP token cache cleared');
  }

  /**
   * Health check - verify MCP service is accessible
   */
  async healthCheck(): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      return !!token;
    } catch (error) {
      logger.error('HEALTH_CHECK_FAILED', 'Shopify MCP health check failed', error as Error);
      return false;
    }
  }
}

// Singleton instance
let instance: ShopifyMCPService | null = null;

export function getShopifyMCPService(): ShopifyMCPService {
  if (!instance) {
    instance = new ShopifyMCPService();
  }
  return instance;
}

export default ShopifyMCPService;
