/**
 * Shopify Products Routes
 * API endpoints for pushing products to Shopify stores
 */

import express, { Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { shopifyProductService } from '../services/shopify-product';
import { SavedItem } from '../models/SavedItem';
import { createLogger } from '../utils/logger';

const router = express.Router();
const logger = createLogger('ShopifyProductsRoutes');

/**
 * POST /api/v1/shopify/products
 * Push a single saved item to Shopify as a draft product
 */
router.post('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  const startTime = Date.now();
  
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { savedItemId, priceMarkup, productType, tags, customTitle, customDescription } = req.body;

    if (!savedItemId) {
      res.status(400).json({ error: 'savedItemId is required' });
      return;
    }

    // Get the saved item
    const savedItem = await SavedItem.findById(savedItemId, userId);
    if (!savedItem) {
      res.status(404).json({ error: 'Saved item not found' });
      return;
    }

    // Push to Shopify
    const result = await shopifyProductService.createProduct(userId, savedItem, {
      priceMarkup: priceMarkup || 2.0,
      productType: productType || 'General',
      tags: tags || [],
      customTitle,
      customDescription,
    });

    const duration = Date.now() - startTime;

    if (result.success) {
      logger.info('PUSH_SUCCESS', 'Product pushed to Shopify', duration, {
        savedItemId,
        shopifyProductId: result.shopifyProductId,
      });

      res.status(201).json({
        success: true,
        message: 'Product pushed to Shopify as draft',
        data: {
          savedItemId: result.savedItemId,
          shopifyProductId: result.shopifyProductId,
          shopifyHandle: result.shopifyHandle,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        savedItemId: result.savedItemId,
      });
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('PUSH_ERROR', 'Failed to push product', error as Error, { duration });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/shopify/products/batch
 * Push multiple saved items to Shopify
 */
router.post('/batch', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  const startTime = Date.now();

  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { savedItemIds, priceMarkup, productType, tags } = req.body;

    if (!savedItemIds || !Array.isArray(savedItemIds) || savedItemIds.length === 0) {
      res.status(400).json({ error: 'savedItemIds array is required' });
      return;
    }

    if (savedItemIds.length > 50) {
      res.status(400).json({ error: 'Maximum 50 items per batch' });
      return;
    }

    // Get all saved items
    const savedItems = [];
    for (const id of savedItemIds) {
      const item = await SavedItem.findById(id, userId);
      if (item) {
        savedItems.push(item);
      }
    }

    if (savedItems.length === 0) {
      res.status(404).json({ error: 'No valid saved items found' });
      return;
    }

    // Batch push
    const result = await shopifyProductService.batchCreateProducts(userId, savedItems, {
      priceMarkup: priceMarkup || 2.0,
      productType: productType || 'General',
      tags: tags || [],
    });

    const duration = Date.now() - startTime;
    logger.info('BATCH_PUSH_COMPLETE', `Batch push: ${result.successful}/${result.total}`, duration);

    res.json({
      success: true,
      message: `Pushed ${result.successful} of ${result.total} products`,
      data: result,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('BATCH_PUSH_ERROR', 'Batch push failed', error as Error, { duration });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/shopify/products
 * Get all pushed products for the user
 */
router.get('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const products = await shopifyProductService.getPushedProducts(userId);
    res.json({ products });
  } catch (error) {
    logger.error('GET_PRODUCTS_ERROR', 'Failed to get pushed products', error as Error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/v1/shopify/products/:id/status
 * Update product status (draft/active/archived)
 */
router.put('/:id/status', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const shopifyProductId = req.params.id;
    const { status } = req.body;

    if (!['draft', 'active', 'archived'].includes(status)) {
      res.status(400).json({ error: 'Invalid status. Must be draft, active, or archived' });
      return;
    }

    const success = await shopifyProductService.updateProductStatus(userId, shopifyProductId, status);

    if (success) {
      res.json({ 
        success: true, 
        message: `Product status updated to ${status}` 
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: 'Failed to update product status' 
      });
    }
  } catch (error) {
    logger.error('UPDATE_STATUS_ERROR', 'Failed to update status', error as Error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/v1/shopify/products/:id
 * Delete product from Shopify
 */
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const shopifyProductId = req.params.id;
    const success = await shopifyProductService.deleteProduct(userId, shopifyProductId);

    if (success) {
      res.json({ 
        success: true, 
        message: 'Product deleted from Shopify' 
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: 'Failed to delete product' 
      });
    }
  } catch (error) {
    logger.error('DELETE_ERROR', 'Failed to delete product', error as Error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/shopify/products/preview
 * Preview how a saved item would appear as a Shopify product
 */
router.post('/preview', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { savedItemId, priceMarkup, productType, tags, customTitle, customDescription } = req.body;

    if (!savedItemId) {
      res.status(400).json({ error: 'savedItemId is required' });
      return;
    }

    // Get the saved item
    const savedItem = await SavedItem.findById(savedItemId, userId);
    if (!savedItem) {
      res.status(404).json({ error: 'Saved item not found' });
      return;
    }

    // Generate preview
    const preview = shopifyProductService.transformToShopifyProduct(savedItem, {
      priceMarkup: priceMarkup || 2.0,
      productType: productType || 'General',
      tags: tags || [],
      customTitle,
      customDescription,
    });

    res.json({
      preview,
      costPrice: savedItem.price,
      sellingPrice: parseFloat(preview.variants?.[0]?.price || '0'),
      profitMargin: priceMarkup ? ((priceMarkup - 1) * 100).toFixed(0) + '%' : '100%',
    });
  } catch (error) {
    logger.error('PREVIEW_ERROR', 'Failed to generate preview', error as Error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
