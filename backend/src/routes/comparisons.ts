import express, { Response } from 'express';
import { Comparison } from '../models/Comparison';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

/**
 * GET /api/comparisons
 * Get all product comparisons for the authenticated user
 */
router.get('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const comparisons = await Comparison.findByUserId(userId);
    res.json({ comparisons });
  } catch (error) {
    console.error('Error fetching comparisons:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/comparisons
 * Create a new product comparison
 */
router.post('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const comparison = await Comparison.create(userId, req.body);
    res.status(201).json({ comparison });
  } catch (error) {
    console.error('Error creating comparison:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/comparisons/:id
 * Get a specific comparison
 */
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const comparison = await Comparison.findById(parseInt(req.params.id), userId);
    if (!comparison) {
      res.status(404).json({ error: 'Comparison not found' });
      return;
    }

    res.json({ comparison });
  } catch (error) {
    console.error('Error fetching comparison:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/comparisons/:id
 * Update a comparison
 */
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const comparison = await Comparison.update(parseInt(req.params.id), userId, req.body);
    res.json({ comparison });
  } catch (error) {
    console.error('Error updating comparison:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/comparisons/:id
 * Delete a comparison
 */
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const success = await Comparison.delete(parseInt(req.params.id), userId);
    if (!success) {
      res.status(404).json({ error: 'Comparison not found' });
      return;
    }

    res.json({ message: 'Comparison deleted successfully' });
  } catch (error) {
    console.error('Error deleting comparison:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
