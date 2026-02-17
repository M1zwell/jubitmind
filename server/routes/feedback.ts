import { Router, type Request, type Response } from 'express';
import {
  getFeedback,
  upsertFeedback,
  deleteFeedback,
  listFeedback,
  getFeedbackStats,
} from '../services/feedback-store.js';

const router = Router();

/** List feedback entries with optional filters */
router.get('/', async (req: Request, res: Response) => {
  try {
    const adapterId = req.query.adapterId as string | undefined;
    const rating = req.query.rating as string | undefined;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;

    const result = await listFeedback({ adapterId, rating, limit, offset });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** Get aggregated feedback stats */
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await getFeedbackStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** Get feedback for a specific session */
router.get('/:sessionId', async (req: Request, res: Response) => {
  try {
    const sessionId = String(req.params.sessionId);
    const adapterId = req.query.adapterId as string | undefined;
    const feedback = await getFeedback(sessionId, adapterId);
    res.json({ feedback });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** Create or update feedback */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { sessionId, adapterId, rating, comment, tags } = req.body;

    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ error: 'sessionId is required' });
    }
    if (!adapterId || typeof adapterId !== 'string') {
      return res.status(400).json({ error: 'adapterId is required' });
    }
    if (rating !== 'positive' && rating !== 'negative') {
      return res.status(400).json({ error: 'rating must be "positive" or "negative"' });
    }
    if (comment && typeof comment !== 'string') {
      return res.status(400).json({ error: 'comment must be a string' });
    }
    if (tags && !Array.isArray(tags)) {
      return res.status(400).json({ error: 'tags must be an array' });
    }

    const feedback = await upsertFeedback({
      sessionId,
      adapterId,
      rating,
      comment: comment?.slice(0, 2000),
      tags: tags?.map(String).slice(0, 10),
    });
    res.json({ feedback });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** Delete feedback by ID */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const deleted = await deleteFeedback(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Feedback not found' });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
