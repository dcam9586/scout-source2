import express, { Response } from 'express';
import { SavedItem, ISavedItem } from '../models/SavedItem';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

/**
 * GET /api/saved-items
 * Get all saved items for the authenticated user
 */
router.get('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const items = await SavedItem.findByUserId(userId);
    res.json({ items });
  } catch (error) {
    console.error('Error fetching saved items:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/saved-items
 * Create a new saved item
 */
router.post('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const item = await SavedItem.create(userId, req.body);
    res.status(201).json({ item });
  } catch (error) {
    console.error('Error creating saved item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/saved-items/:id
 * Get a specific saved item
 */
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const item = await SavedItem.findById(parseInt(req.params.id), userId);
    if (!item) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    res.json({ item });
  } catch (error) {
    console.error('Error fetching saved item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/saved-items/:id
 * Update a saved item
 */
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const item = await SavedItem.update(parseInt(req.params.id), userId, req.body);
    res.json({ item });
  } catch (error) {
    console.error('Error updating saved item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/saved-items/:id
 * Delete a saved item
 */
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const success = await SavedItem.delete(parseInt(req.params.id), userId);
    if (!success) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting saved item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
