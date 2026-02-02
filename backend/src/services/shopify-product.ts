/**
 * Shopify Product Service
 * Creates and manages products in merchant's Shopify store
 * Part of the "Push to Shopify" workflow
 */

import axios, { AxiosInstance } from 'axios';
import { Pool } from 'pg';
import { getPool } from '../config/database';
import { createLogger } from '../utils/logger';
import { ISavedItem } from '../models/SavedItem';

const logger = createLogger('ShopifyProductService');

// Shopify API version
const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-01';

export interface ShopifyProductImage {
  src: string;
  alt?: string;
  position?: number;
}

export interface ShopifyProductVariant {
  price: string;
  sku?: string;
  inventory_quantity?: number;
  inventory_management?: 'shopify' | null;
  requires_shipping?: boolean;
  weight?: number;
  weight_unit?: 'kg' | 'g' | 'lb' | 'oz';
}

export interface ShopifyMetafield {
  namespace: string;
  key: string;
  value: string;
  type: string;
}

export interface ShopifyProductInput {
  title: string;
  body_html: string;
  vendor?: string;
  product_type?: string;
  status: 'draft' | 'active' | 'archived';
  tags?: string;
  images?: ShopifyProductImage[];
  variants?: ShopifyProductVariant[];
  metafields?: ShopifyMetafield[];
}

export interface ShopifyProductResponse {
  id: number;
  title: string;
  handle: string;
  status: string;
  vendor: string;
  product_type: string;
  created_at: string;
  updated_at: string;
  admin_graphql_api_id: string;
  variants: Array<{
    id: number;
    product_id: number;
    price: string;
    sku: string;
  }>;
  images: Array<{
    id: number;
    src: string;
  }>;
}

export interface PushResult {
  success: boolean;
  savedItemId: number;
  shopifyProductId?: number;
  shopifyHandle?: string;
  error?: string;
}

export interface BatchPushResult {
  total: number;
  successful: number;
  failed: number;
  results: PushResult[];
}

class ShopifyProductService {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Get Shopify Admin API URL for a shop
   */
  private getAdminApiUrl(shopDomain: string): string {
    // Ensure shop domain is properly formatted
    const cleanDomain = shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    return `https://${cleanDomain}/admin/api/${SHOPIFY_API_VERSION}`;
  }

  /**
   * Get user's access token from database
   */
  private async getUserAccessToken(userId: number): Promise<{ token: string; shopName: string } | null> {
    const pool: Pool = getPool();
    const result = await pool.query(
      'SELECT access_token, shop_name FROM users WHERE id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }

    return {
      token: result.rows[0].access_token,
      shopName: result.rows[0].shop_name,
    };
  }

  /**
   * Transform SavedItem to Shopify Product format
   */
  transformToShopifyProduct(
    savedItem: ISavedItem,
    options: {
      priceMarkup?: number; // Percentage markup (e.g., 1.5 = 50% markup)
      productType?: string;
      tags?: string[];
      customTitle?: string;
      customDescription?: string;
    } = {}
  ): ShopifyProductInput {
    const {
      priceMarkup = 2.0, // Default 100% markup
      productType = 'General',
      tags = [],
      customTitle,
      customDescription,
    } = options;

    // Calculate selling price with markup
    const costPrice = savedItem.price || 0;
    const sellingPrice = (costPrice * priceMarkup).toFixed(2);

    // Build description with supplier info
    const description = customDescription || savedItem.description || '';
    const enhancedDescription = `
      <div class="product-description">
        <p>${description}</p>
      </div>
    `.trim();

    // Generate SKU from source
    const skuPrefix = savedItem.source === 'alibaba' ? 'ALI' : 'MIC';
    const skuId = savedItem.id.toString().padStart(6, '0');
    const sku = `${skuPrefix}-${skuId}`;

    // Build tags array
    const allTags = [
      savedItem.source,
      'sourcescout',
      ...tags,
    ].filter(Boolean);

    const product: ShopifyProductInput = {
      title: customTitle || savedItem.product_name,
      body_html: enhancedDescription,
      vendor: savedItem.supplier_name || 'Unknown Supplier',
      product_type: productType,
      status: 'draft', // Always create as draft for review
      tags: allTags.join(', '),
      variants: [
        {
          price: sellingPrice,
          sku,
          inventory_quantity: 0, // Start with 0, user updates after ordering
          inventory_management: 'shopify',
          requires_shipping: true,
        },
      ],
      metafields: [
        {
          namespace: 'sourcescout',
          key: 'source_url',
          value: savedItem.source_url,
          type: 'url',
        },
        {
          namespace: 'sourcescout',
          key: 'source_platform',
          value: savedItem.source,
          type: 'single_line_text_field',
        },
        {
          namespace: 'sourcescout',
          key: 'supplier_name',
          value: savedItem.supplier_name || '',
          type: 'single_line_text_field',
        },
        {
          namespace: 'sourcescout',
          key: 'supplier_rating',
          value: (savedItem.supplier_rating || 0).toString(),
          type: 'number_decimal',
        },
        {
          namespace: 'sourcescout',
          key: 'cost_price',
          value: costPrice.toString(),
          type: 'number_decimal',
        },
        {
          namespace: 'sourcescout',
          key: 'moq',
          value: (savedItem.moq || 1).toString(),
          type: 'number_integer',
        },
      ],
    };

    // Add image if available
    if (savedItem.product_image_url) {
      product.images = [
        {
          src: savedItem.product_image_url,
          alt: savedItem.product_name,
        },
      ];
    }

    return product;
  }

  /**
   * Check if product already exists by source URL
   */
  async findExistingProduct(
    userId: number,
    sourceUrl: string
  ): Promise<number | null> {
    const pool: Pool = getPool();
    
    // Check our tracking table first
    const result = await pool.query(
      `SELECT shopify_product_id FROM pushed_products 
       WHERE user_id = $1 
       AND source_url = $2 
       AND push_status != 'deleted'`,
      [userId, sourceUrl]
    );

    if (result.rows.length > 0) {
      return parseInt(result.rows[0].shopify_product_id);
    }

    return null;
  }

  /**
   * Create a draft product in Shopify
   */
  async createProduct(
    userId: number,
    savedItem: ISavedItem,
    options: {
      priceMarkup?: number;
      productType?: string;
      tags?: string[];
      customTitle?: string;
      customDescription?: string;
    } = {}
  ): Promise<PushResult> {
    const startTime = Date.now();

    try {
      // Get user's access token
      const userAuth = await this.getUserAccessToken(userId);
      if (!userAuth) {
        throw new Error('User not found or not authenticated with Shopify');
      }

      // Check for existing product
      const existingProductId = await this.findExistingProduct(userId, savedItem.source_url);
      if (existingProductId) {
        logger.warn('PRODUCT_EXISTS', 'Product already pushed to Shopify', {
          savedItemId: savedItem.id,
          existingProductId,
        });
        return {
          success: false,
          savedItemId: savedItem.id,
          shopifyProductId: existingProductId,
          error: 'Product already exists in your Shopify store',
        };
      }

      // Transform to Shopify format
      const productData = this.transformToShopifyProduct(savedItem, options);

      // Create product via Shopify Admin API
      const apiUrl = this.getAdminApiUrl(userAuth.shopName);
      const response = await this.axiosInstance.post<{ product: ShopifyProductResponse }>(
        `${apiUrl}/products.json`,
        { product: productData },
        {
          headers: {
            'X-Shopify-Access-Token': userAuth.token,
          },
        }
      );

      const createdProduct = response.data.product;
      const duration = Date.now() - startTime;

      // Record in our tracking table
      await this.recordPushedProduct(userId, savedItem, createdProduct);

      logger.info('PRODUCT_CREATED', 'Product pushed to Shopify', duration, {
        savedItemId: savedItem.id,
        shopifyProductId: createdProduct.id,
        handle: createdProduct.handle,
      });

      return {
        success: true,
        savedItemId: savedItem.id,
        shopifyProductId: createdProduct.id,
        shopifyHandle: createdProduct.handle,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.error('PRODUCT_CREATE_FAILED', 'Failed to push product', error, {
        savedItemId: savedItem.id,
        duration,
      });

      // Handle specific Shopify errors
      let errorMessage = 'Failed to create product';
      if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        if (typeof errors === 'string') {
          errorMessage = errors;
        } else if (typeof errors === 'object') {
          errorMessage = Object.values(errors).flat().join(', ');
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        savedItemId: savedItem.id,
        error: errorMessage,
      };
    }
  }

  /**
   * Record pushed product in database
   */
  private async recordPushedProduct(
    userId: number,
    savedItem: ISavedItem,
    shopifyProduct: ShopifyProductResponse
  ): Promise<void> {
    const pool: Pool = getPool();

    await pool.query(
      `INSERT INTO pushed_products 
       (user_id, saved_item_id, shopify_product_id, shopify_product_handle, source_url, push_status)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, shopify_product_id) 
       DO UPDATE SET updated_at = NOW()`,
      [
        userId,
        savedItem.id,
        shopifyProduct.id.toString(),
        shopifyProduct.handle,
        savedItem.source_url,
        'draft',
      ]
    );

    // Update saved item with shopify reference
    await pool.query(
      `UPDATE saved_items 
       SET shopify_product_id = $1, push_status = $2, updated_at = NOW()
       WHERE id = $3`,
      [shopifyProduct.id.toString(), 'draft', savedItem.id]
    );
  }

  /**
   * Batch create products
   */
  async batchCreateProducts(
    userId: number,
    savedItems: ISavedItem[],
    options: {
      priceMarkup?: number;
      productType?: string;
      tags?: string[];
    } = {}
  ): Promise<BatchPushResult> {
    const results: PushResult[] = [];
    let successful = 0;
    let failed = 0;

    logger.info('BATCH_PUSH_START', `Starting batch push of ${savedItems.length} products`, 0);

    // Process sequentially to avoid rate limits
    for (const item of savedItems) {
      const result = await this.createProduct(userId, item, options);
      results.push(result);

      if (result.success) {
        successful++;
      } else {
        failed++;
      }

      // Small delay to avoid rate limiting
      await this.delay(500);
    }

    logger.info('BATCH_PUSH_COMPLETE', `Batch push completed: ${successful}/${savedItems.length} successful`, 0);

    return {
      total: savedItems.length,
      successful,
      failed,
      results,
    };
  }

  /**
   * Update product status in Shopify
   */
  async updateProductStatus(
    userId: number,
    shopifyProductId: string,
    status: 'active' | 'draft' | 'archived'
  ): Promise<boolean> {
    try {
      const userAuth = await this.getUserAccessToken(userId);
      if (!userAuth) {
        throw new Error('User not authenticated');
      }

      const apiUrl = this.getAdminApiUrl(userAuth.shopName);
      await this.axiosInstance.put(
        `${apiUrl}/products/${shopifyProductId}.json`,
        { product: { status } },
        {
          headers: {
            'X-Shopify-Access-Token': userAuth.token,
          },
        }
      );

      // Update our tracking
      const pool: Pool = getPool();
      await pool.query(
        `UPDATE pushed_products 
         SET push_status = $1, updated_at = NOW()
         WHERE user_id = $2 AND shopify_product_id = $3`,
        [status, userId, shopifyProductId]
      );

      await pool.query(
        `UPDATE saved_items 
         SET push_status = $1, updated_at = NOW()
         WHERE shopify_product_id = $2`,
        [status, shopifyProductId]
      );

      return true;
    } catch (error) {
      logger.error('UPDATE_STATUS_FAILED', 'Failed to update product status', error as Error);
      return false;
    }
  }

  /**
   * Delete product from Shopify
   */
  async deleteProduct(userId: number, shopifyProductId: string): Promise<boolean> {
    try {
      const userAuth = await this.getUserAccessToken(userId);
      if (!userAuth) {
        throw new Error('User not authenticated');
      }

      const apiUrl = this.getAdminApiUrl(userAuth.shopName);
      await this.axiosInstance.delete(
        `${apiUrl}/products/${shopifyProductId}.json`,
        {
          headers: {
            'X-Shopify-Access-Token': userAuth.token,
          },
        }
      );

      // Update our tracking
      const pool: Pool = getPool();
      await pool.query(
        `UPDATE pushed_products 
         SET push_status = 'deleted', updated_at = NOW()
         WHERE user_id = $1 AND shopify_product_id = $2`,
        [userId, shopifyProductId]
      );

      await pool.query(
        `UPDATE saved_items 
         SET push_status = NULL, shopify_product_id = NULL, updated_at = NOW()
         WHERE shopify_product_id = $1`,
        [shopifyProductId]
      );

      return true;
    } catch (error) {
      logger.error('DELETE_PRODUCT_FAILED', 'Failed to delete product', error as Error);
      return false;
    }
  }

  /**
   * Get all pushed products for a user
   */
  async getPushedProducts(userId: number): Promise<any[]> {
    const pool: Pool = getPool();
    const result = await pool.query(
      `SELECT pp.*, si.product_name, si.supplier_name, si.price as cost_price
       FROM pushed_products pp
       LEFT JOIN saved_items si ON pp.saved_item_id = si.id
       WHERE pp.user_id = $1 AND pp.push_status != 'deleted'
       ORDER BY pp.pushed_at DESC`,
      [userId]
    );
    return result.rows;
  }

  /**
   * Helper delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const shopifyProductService = new ShopifyProductService();
export default ShopifyProductService;
