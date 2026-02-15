/**
 * Partner Integration Routes
 * Handles partner platform connections and exports (Dropified, Syncee, CSV)
 */

import express, { Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { PartnerConnection, ExportedProduct, ExportLog } from '../models/PartnerConnection';
import { SavedItem } from '../models/SavedItem';
import { createLogger } from '../utils/logger';

const router = express.Router();
const logger = createLogger('PartnerRoutes');

// Valid partner platforms
const VALID_PARTNERS = ['dropified', 'syncee', 'csv'];

/**
 * GET /api/v1/partners
 * Get all partner connections for the current user
 */
router.get('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const connections = await PartnerConnection.findByUserId(userId);
    
    // Don't expose tokens to frontend
    const safeConnections = connections.map(conn => ({
      id: conn.id,
      partner: conn.partner,
      account_id: conn.account_id,
      account_name: conn.account_name,
      connection_status: conn.connection_status,
      last_sync_at: conn.last_sync_at,
      sync_count: conn.sync_count,
      connected_at: conn.connected_at,
    }));

    res.json({ connections: safeConnections });
  } catch (error) {
    logger.error('PARTNER_LIST_ERROR', 'Failed to list partner connections', error as Error);
    res.status(500).json({ error: 'Failed to retrieve partner connections' });
  }
});

/**
 * GET /api/v1/partners/:partner
 * Get specific partner connection details
 */
router.get('/:partner', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { partner } = req.params;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    if (!VALID_PARTNERS.includes(partner)) {
      res.status(400).json({ error: 'Invalid partner platform' });
      return;
    }

    const connection = await PartnerConnection.findByUserAndPartner(userId, partner);
    
    if (!connection) {
      res.json({ connected: false, partner });
      return;
    }

    res.json({
      connected: connection.connection_status === 'connected',
      partner: connection.partner,
      account_id: connection.account_id,
      account_name: connection.account_name,
      connection_status: connection.connection_status,
      last_sync_at: connection.last_sync_at,
      sync_count: connection.sync_count,
    });
  } catch (error) {
    logger.error('PARTNER_GET_ERROR', 'Failed to get partner connection', error as Error);
    res.status(500).json({ error: 'Failed to retrieve partner connection' });
  }
});

/**
 * POST /api/v1/partners/:partner/connect
 * Connect to a partner platform (OAuth or API key)
 */
router.post('/:partner/connect', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { partner } = req.params;
    const { apiKey, accessToken, refreshToken, accountId, accountName } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    if (!VALID_PARTNERS.includes(partner)) {
      res.status(400).json({ error: 'Invalid partner platform' });
      return;
    }

    // For now, store the connection (in production, validate credentials first)
    const connection = await PartnerConnection.upsert(userId, partner, {
      api_key: apiKey,
      access_token: accessToken,
      refresh_token: refreshToken,
      account_id: accountId,
      account_name: accountName,
      connection_status: 'connected',
    });

    logger.info('PARTNER_CONNECTED', `User ${userId} connected to ${partner}`);

    res.json({
      success: true,
      message: `Connected to ${partner}`,
      connection: {
        partner: connection.partner,
        account_name: connection.account_name,
        connection_status: connection.connection_status,
      },
    });
  } catch (error) {
    logger.error('PARTNER_CONNECT_ERROR', 'Failed to connect to partner', error as Error);
    res.status(500).json({ error: 'Failed to connect to partner platform' });
  }
});

/**
 * DELETE /api/v1/partners/:partner/disconnect
 * Disconnect from a partner platform
 */
router.delete('/:partner/disconnect', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { partner } = req.params;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const deleted = await PartnerConnection.delete(userId, partner);

    if (!deleted) {
      res.status(404).json({ error: 'Partner connection not found' });
      return;
    }

    logger.info('PARTNER_DISCONNECTED', `User ${userId} disconnected from ${partner}`);
    res.json({ success: true, message: `Disconnected from ${partner}` });
  } catch (error) {
    logger.error('PARTNER_DISCONNECT_ERROR', 'Failed to disconnect from partner', error as Error);
    res.status(500).json({ error: 'Failed to disconnect from partner' });
  }
});

/**
 * POST /api/v1/partners/:partner/export
 * Export saved items to a partner platform
 */
router.post('/:partner/export', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { partner } = req.params;
    const { savedItemIds, options } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    if (!VALID_PARTNERS.includes(partner)) {
      res.status(400).json({ error: 'Invalid partner platform' });
      return;
    }

    if (!savedItemIds || !Array.isArray(savedItemIds) || savedItemIds.length === 0) {
      res.status(400).json({ error: 'No items provided for export' });
      return;
    }

    // Get saved items
    const savedItems = await SavedItem.findByIds(userId, savedItemIds);
    if (savedItems.length === 0) {
      res.status(404).json({ error: 'No valid saved items found' });
      return;
    }

    // Handle export based on partner
    const results = {
      successful: [] as number[],
      failed: [] as { id: number; error: string }[],
    };

    if (partner === 'csv') {
      // CSV export just logs the action
      for (const item of savedItems) {
        try {
          await ExportedProduct.create({
            userId,
            savedItemId: item.id,
            partner: 'csv',
            exportStatus: 'exported',
            exportData: {
              product_name: item.product_name,
              price: item.price,
              supplier: item.supplier_name,
              exported_at: new Date().toISOString(),
            },
          });
          results.successful.push(item.id);
        } catch {
          results.failed.push({ id: item.id, error: 'Failed to log export' });
        }
      }
    } else {
      // For Dropified/Syncee, check if connected first
      const connection = await PartnerConnection.findByUserAndPartner(userId, partner);
      if (!connection || connection.connection_status !== 'connected') {
        res.status(400).json({ 
          error: `Not connected to ${partner}. Please connect your account first.`,
          needsConnection: true,
        });
        return;
      }

      // TODO: Implement actual API calls to Dropified/Syncee
      // For now, mark as pending
      for (const item of savedItems) {
        try {
          await ExportedProduct.create({
            userId,
            savedItemId: item.id,
            partner,
            exportStatus: 'pending',
            exportData: {
              product_name: item.product_name,
              price: item.price,
              supplier: item.supplier_name,
            },
          });
          results.successful.push(item.id);
        } catch {
          results.failed.push({ id: item.id, error: 'Failed to queue export' });
        }
      }

      // Update sync count
      await PartnerConnection.recordSync(userId, partner);
    }

    // Log the export operation
    await ExportLog.create({
      userId,
      partner,
      exportType: savedItemIds.length > 1 ? 'batch' : 'single',
      itemsCount: savedItems.length,
      successfulCount: results.successful.length,
      failedCount: results.failed.length,
      exportData: { itemIds: savedItemIds, options },
    });

    logger.info('PARTNER_EXPORT', `Exported ${results.successful.length}/${savedItems.length} items to ${partner}`, undefined, {
      userId,
      partner,
      successful: results.successful.length,
      failed: results.failed.length,
    });

    res.json({
      success: true,
      total: savedItems.length,
      successful: results.successful.length,
      failed: results.failed.length,
      results,
    });
  } catch (error) {
    logger.error('PARTNER_EXPORT_ERROR', 'Failed to export to partner', error as Error);
    res.status(500).json({ error: 'Failed to export products' });
  }
});

/**
 * GET /api/v1/partners/exports
 * Get export history for the current user
 */
router.get('/exports/history', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { partner, limit = '50' } = req.query;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const exports = await ExportedProduct.findByUserId(userId, partner as string | undefined);
    const logs = await ExportLog.findByUserId(userId, parseInt(limit as string));
    const stats = await ExportLog.getStats(userId, 30);

    res.json({ exports: exports.slice(0, 100), logs, stats });
  } catch (error) {
    logger.error('EXPORT_HISTORY_ERROR', 'Failed to get export history', error as Error);
    res.status(500).json({ error: 'Failed to retrieve export history' });
  }
});

export default router;
