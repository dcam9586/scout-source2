/**
 * CJ Dropshipping API Service
 * Official API integration for product search and data retrieval
 * 
 * Features:
 * - OAuth2 token management with auto-refresh
 * - Product search with filters
 * - Category and warehouse lookup
 * - Inventory checking
 * 
 * API Docs: https://developers.cjdropshipping.com/en/api/introduction.html
 */

import axios, { AxiosInstance } from 'axios';
import { createLogger } from '../utils/logger';
import { getRedis } from '../config/redis';

const logger = createLogger('CJDropshipping');

// CJ API Base URL
const CJ_API_BASE = 'https://developers.cjdropshipping.com/api2.0/v1';

// Token cache keys
const TOKEN_CACHE_KEY = 'cj:access_token';
const REFRESH_TOKEN_CACHE_KEY = 'cj:refresh_token';
const TOKEN_EXPIRY_KEY = 'cj:token_expiry';

// Token validity (15 days for access, 180 days for refresh)
const ACCESS_TOKEN_TTL = 15 * 24 * 60 * 60; // 15 days in seconds
const REFRESH_TOKEN_TTL = 180 * 24 * 60 * 60; // 180 days in seconds

/**
 * CJ Product interface matching their API response
 */
export interface CJProduct {
  id: string;
  nameEn: string;
  sku: string;
  spu?: string;
  bigImage: string;
  sellPrice: string;
  nowPrice?: string;
  discountPrice?: string;
  discountPriceRate?: string;
  listedNum?: number;
  categoryId?: string;
  threeCategoryName?: string;
  twoCategoryId?: string;
  twoCategoryName?: string;
  oneCategoryId?: string;
  oneCategoryName?: string;
  addMarkStatus?: number; // 0=paid shipping, 1=free shipping
  isVideo?: number;
  productType?: string;
  supplierName?: string;
  warehouseInventoryNum?: number;
  totalVerifiedInventory?: number;
  deliveryCycle?: string;
  description?: string;
  currency?: string;
}

/**
 * Normalized product for SourceScout
 */
export interface NormalizedCJProduct {
  id: string;
  title: string;
  description?: string;
  price: number;
  originalPrice?: number;
  minOrder: number;
  image_url: string;
  url: string;
  supplierId?: string;
  supplierName: string;
  supplierRating?: number;
  supplierResponseRate?: number;
  supplierTransactionLevel?: string;
  supplierYearsInBusiness?: number;
  source: 'cj-dropshipping';
  // CJ-specific fields
  sku?: string;
  freeShipping?: boolean;
  warehouseStock?: number;
  deliveryDays?: string;
  categoryName?: string;
  discountPercent?: string;
}

/**
 * CJ Category interface
 */
export interface CJCategory {
  categoryFirstName: string;
  categoryFirstList: {
    categorySecondName: string;
    categorySecondList: {
      categoryId: string;
      categoryName: string;
    }[];
  }[];
}

/**
 * CJ Warehouse interface
 */
export interface CJWarehouse {
  areaId: number;
  areaEn: string;
  countryCode: string;
  nameEn: string;
}

/**
 * Search parameters for CJ products
 */
export interface CJSearchParams {
  keyword: string;
  page?: number;
  pageSize?: number;
  categoryId?: string;
  countryCode?: string; // Warehouse country (CN, US, GB, etc.)
  minPrice?: number;
  maxPrice?: number;
  freeShipping?: boolean;
  productType?: 'trending' | 'new' | 'video';
  sortBy?: 'best_match' | 'listings' | 'price' | 'newest' | 'inventory';
  sortOrder?: 'asc' | 'desc';
}

/**
 * CJ Dropshipping API Client
 */
class CJDropshippingService {
  private client: AxiosInstance;
  private apiKey: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor() {
    this.apiKey = process.env.CJ_API_KEY || '';
    
    this.client = axios.create({
      baseURL: CJ_API_BASE,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.client.interceptors.request.use(async (config) => {
      const token = await this.getValidToken();
      if (token) {
        config.headers['CJ-Access-Token'] = token;
      }
      return config;
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired, try to refresh
          logger.warn('CJ_TOKEN_EXPIRED', 'Access token expired, attempting refresh');
          await this.refreshAccessToken();
          // Retry the request
          const token = await this.getValidToken();
          if (token) {
            error.config.headers['CJ-Access-Token'] = token;
            return this.client.request(error.config);
          }
        }
        throw error;
      }
    );
  }

  /**
   * Check if the API key is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get a valid access token, refreshing if necessary
   */
  private async getValidToken(): Promise<string | null> {
    // Check memory cache first
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    // Try to get from Redis
    try {
      const redis = getRedis();
      if (redis) {
        const cachedToken = await redis.get(TOKEN_CACHE_KEY);
        const cachedExpiry = await redis.get(TOKEN_EXPIRY_KEY);
        
        if (cachedToken && cachedExpiry) {
          const expiryDate = new Date(cachedExpiry);
          if (new Date() < expiryDate) {
            this.accessToken = cachedToken;
            this.tokenExpiry = expiryDate;
            return cachedToken;
          }
        }

        // Try to refresh using cached refresh token
        const cachedRefreshToken = await redis.get(REFRESH_TOKEN_CACHE_KEY);
        if (cachedRefreshToken) {
          this.refreshToken = cachedRefreshToken;
          await this.refreshAccessToken();
          return this.accessToken;
        }
      }
    } catch (error) {
      logger.warn('CJ_REDIS_ERROR', 'Failed to get token from Redis', { error });
    }

    // Get new token
    await this.authenticate();
    return this.accessToken;
  }

  /**
   * Authenticate with CJ API and get access token
   */
  async authenticate(): Promise<void> {
    if (!this.apiKey) {
      logger.warn('CJ_NOT_CONFIGURED', 'CJ API key not configured');
      return;
    }

    try {
      logger.info('CJ_AUTH_START', 'Authenticating with CJ Dropshipping API');

      const response = await axios.post(
        `${CJ_API_BASE}/authentication/getAccessToken`,
        { apiKey: this.apiKey },
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (response.data.code === 200 && response.data.data) {
        const { accessToken, refreshToken, accessTokenExpiryDate } = response.data.data;
        
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.tokenExpiry = new Date(accessTokenExpiryDate);

        // Cache tokens in Redis
        await this.cacheTokens();

        logger.info('CJ_AUTH_SUCCESS', 'Successfully authenticated with CJ API');
      } else {
        throw new Error(response.data.message || 'Authentication failed');
      }
    } catch (error) {
      logger.error('CJ_AUTH_ERROR', 'Failed to authenticate with CJ API', error as Error);
      throw error;
    }
  }

  /**
   * Refresh the access token using refresh token
   */
  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      // No refresh token, need full auth
      await this.authenticate();
      return;
    }

    try {
      logger.info('CJ_TOKEN_REFRESH', 'Refreshing CJ access token');

      const response = await axios.post(
        `${CJ_API_BASE}/authentication/refreshAccessToken`,
        { refreshToken: this.refreshToken },
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (response.data.code === 200 && response.data.data) {
        const { accessToken, refreshToken, accessTokenExpiryDate } = response.data.data;
        
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.tokenExpiry = new Date(accessTokenExpiryDate);

        await this.cacheTokens();

        logger.info('CJ_TOKEN_REFRESH_SUCCESS', 'Successfully refreshed CJ access token');
      } else {
        // Refresh failed, need full auth
        await this.authenticate();
      }
    } catch (error) {
      logger.warn('CJ_TOKEN_REFRESH_ERROR', 'Failed to refresh token, re-authenticating', { error });
      await this.authenticate();
    }
  }

  /**
   * Cache tokens in Redis
   */
  private async cacheTokens(): Promise<void> {
    try {
      const redis = getRedis();
      if (redis && this.accessToken && this.refreshToken && this.tokenExpiry) {
        await redis.setex(TOKEN_CACHE_KEY, ACCESS_TOKEN_TTL, this.accessToken);
        await redis.setex(REFRESH_TOKEN_CACHE_KEY, REFRESH_TOKEN_TTL, this.refreshToken);
        await redis.setex(TOKEN_EXPIRY_KEY, ACCESS_TOKEN_TTL, this.tokenExpiry.toISOString());
      }
    } catch (error) {
      logger.warn('CJ_CACHE_ERROR', 'Failed to cache tokens in Redis', { error });
    }
  }

  /**
   * Search for products using the V2 API (ElasticSearch-powered)
   */
  async searchProducts(params: CJSearchParams): Promise<NormalizedCJProduct[]> {
    const startTime = Date.now();

    try {
      logger.info('CJ_SEARCH_START', `Searching CJ for: "${params.keyword}"`, undefined, {
        keyword: params.keyword,
        page: params.page,
        pageSize: params.pageSize,
      });

      // Build query parameters
      const queryParams: Record<string, any> = {
        keyWord: params.keyword,
        page: params.page || 1,
        size: params.pageSize || 20,
        features: ['enable_description', 'enable_category'],
        zonePlatform: 'shopify', // Optimize for Shopify stores
        currency: 'USD',
      };

      if (params.categoryId) queryParams.categoryId = params.categoryId;
      if (params.countryCode) queryParams.countryCode = params.countryCode;
      if (params.minPrice) queryParams.startSellPrice = params.minPrice;
      if (params.maxPrice) queryParams.endSellPrice = params.maxPrice;
      if (params.freeShipping) queryParams.addMarkStatus = 1;

      // Sort mapping
      if (params.sortBy) {
        const sortMap: Record<string, number> = {
          'best_match': 0,
          'listings': 1,
          'price': 2,
          'newest': 3,
          'inventory': 4,
        };
        queryParams.orderBy = sortMap[params.sortBy] || 0;
      }
      queryParams.sort = params.sortOrder || 'desc';

      // Product type/flag mapping
      if (params.productType) {
        const flagMap: Record<string, number> = {
          'trending': 0,
          'new': 1,
          'video': 2,
        };
        queryParams.productFlag = flagMap[params.productType];
      }

      const response = await this.client.get('/product/listV2', { params: queryParams });

      if (response.data.code !== 200 || !response.data.data) {
        throw new Error(response.data.message || 'Search failed');
      }

      const { content, totalRecords } = response.data.data;
      
      // Extract products from the nested structure
      const products: CJProduct[] = [];
      if (content && Array.isArray(content)) {
        for (const item of content) {
          if (item.productList && Array.isArray(item.productList)) {
            products.push(...item.productList);
          }
        }
      }

      const duration = Date.now() - startTime;
      logger.info('CJ_SEARCH_SUCCESS', `Found ${products.length} products on CJ`, duration, {
        keyword: params.keyword,
        totalRecords,
        returnedCount: products.length,
      });

      // Normalize products to SourceScout format
      return products.map(this.normalizeProduct);

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('CJ_SEARCH_ERROR', 'CJ search failed', error as Error, {
        keyword: params.keyword,
        duration,
      });
      throw error;
    }
  }

  /**
   * Get product categories
   */
  async getCategories(): Promise<CJCategory[]> {
    try {
      const response = await this.client.get('/product/getCategory');

      if (response.data.code !== 200) {
        throw new Error(response.data.message || 'Failed to get categories');
      }

      return response.data.data || [];
    } catch (error) {
      logger.error('CJ_CATEGORY_ERROR', 'Failed to get CJ categories', error as Error);
      throw error;
    }
  }

  /**
   * Get global warehouse list
   */
  async getWarehouses(): Promise<CJWarehouse[]> {
    try {
      const response = await this.client.get('/product/globalWarehouseList');

      if (response.data.code !== 200) {
        throw new Error(response.data.message || 'Failed to get warehouses');
      }

      return response.data.data || [];
    } catch (error) {
      logger.error('CJ_WAREHOUSE_ERROR', 'Failed to get CJ warehouses', error as Error);
      throw error;
    }
  }

  /**
   * Get product details by ID
   */
  async getProductDetails(productId: string): Promise<NormalizedCJProduct | null> {
    try {
      const response = await this.client.get('/product/query', {
        params: {
          pid: productId,
          features: ['enable_description', 'enable_video', 'enable_inventory'],
        },
      });

      if (response.data.code !== 200 || !response.data.data) {
        return null;
      }

      return this.normalizeProduct(response.data.data);
    } catch (error) {
      logger.error('CJ_PRODUCT_DETAIL_ERROR', 'Failed to get product details', error as Error, {
        productId,
      });
      throw error;
    }
  }

  /**
   * Check inventory for a variant
   */
  async checkInventory(variantId: string): Promise<{ countryCode: string; quantity: number }[]> {
    try {
      const response = await this.client.get('/product/stock/queryByVid', {
        params: { vid: variantId },
      });

      if (response.data.code !== 200 || !response.data.data) {
        return [];
      }

      return response.data.data.map((item: any) => ({
        countryCode: item.countryCode,
        quantity: item.totalInventoryNum || 0,
      }));
    } catch (error) {
      logger.error('CJ_INVENTORY_ERROR', 'Failed to check inventory', error as Error, {
        variantId,
      });
      throw error;
    }
  }

  /**
   * Normalize CJ product to SourceScout format
   */
  private normalizeProduct(cj: CJProduct): NormalizedCJProduct {
    const price = parseFloat(cj.nowPrice || cj.discountPrice || cj.sellPrice || '0');
    const originalPrice = parseFloat(cj.sellPrice || '0');

    return {
      id: `cj-${cj.id}`,
      title: cj.nameEn,
      description: cj.description,
      price,
      originalPrice: originalPrice > price ? originalPrice : undefined,
      minOrder: 1, // CJ has no MOQ
      image_url: cj.bigImage,
      url: `https://cjdropshipping.com/product-detail/${cj.id}.html`,
      supplierName: cj.supplierName || 'CJ Dropshipping',
      source: 'cj-dropshipping',
      sku: cj.sku,
      freeShipping: cj.addMarkStatus === 1,
      warehouseStock: cj.warehouseInventoryNum,
      deliveryDays: cj.deliveryCycle,
      categoryName: cj.threeCategoryName || cj.twoCategoryName || cj.oneCategoryName,
      discountPercent: cj.discountPriceRate,
    };
  }
}

// Singleton instance
let cjService: CJDropshippingService | null = null;

/**
 * Get the CJ Dropshipping service instance
 */
export function getCJDropshippingService(): CJDropshippingService {
  if (!cjService) {
    cjService = new CJDropshippingService();
  }
  return cjService;
}

export default CJDropshippingService;
