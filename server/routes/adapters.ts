import { Router, type Request, type Response } from 'express';
import { registry } from '../services/adapters/index.js';

const router = Router();

/** List all registered adapters with availability status */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const adapters = await registry.listAll();
    res.json(adapters);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** Get combined stats across all available adapters — must be before /:id routes */
router.get('/stats/unified', async (_req: Request, res: Response) => {
  try {
    const available = await registry.getAvailable();
    const statsResults = await Promise.all(
      available.map(async (a) => {
        try {
          const stats = await a.getStats();
          return { adapterId: a.id, name: a.name, ...stats };
        } catch {
          return { adapterId: a.id, name: a.name, totalSessions: 0, totalMessages: 0 };
        }
      }),
    );

    const totals = {
      totalSessions: statsResults.reduce((s, r) => s + r.totalSessions, 0),
      totalMessages: statsResults.reduce((s, r) => s + r.totalMessages, 0),
      totalTokens: statsResults.reduce((s, r) => s + (r.totalTokens || 0), 0),
      totalCostUsd: statsResults.reduce((s, r) => s + (r.totalCostUsd || 0), 0),
    };

    res.json({ adapters: statsResults, totals });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** Get sessions for a specific adapter */
router.get('/:id/sessions', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const adapter = registry.get(id);
    if (!adapter) {
      return res.status(404).json({ error: `Adapter '${id}' not found` });
    }

    const available = await adapter.isAvailable();
    if (!available) {
      return res.json({ sessions: [], available: false });
    }

    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;
    const project = req.query.project as string | undefined;

    const sessions = await adapter.discoverSessions({ limit, offset, project });
    res.json({ sessions, available: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** Get messages for a specific session from an adapter */
router.get('/:id/sessions/:sessionId/messages', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const sessionId = String(req.params.sessionId);
    const adapter = registry.get(id);
    if (!adapter) {
      return res.status(404).json({ error: `Adapter '${id}' not found` });
    }

    const offset = Number(req.query.offset) || 0;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const project = req.query.project as string | undefined;

    const messages = await adapter.getMessages(sessionId, { offset, limit, project });
    res.json({ messages });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** Get aggregated stats for a specific adapter */
router.get('/:id/stats', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const adapter = registry.get(id);
    if (!adapter) {
      return res.status(404).json({ error: `Adapter '${id}' not found` });
    }

    const available = await adapter.isAvailable();
    if (!available) {
      return res.json({ stats: null, available: false });
    }

    const stats = await adapter.getStats();
    res.json({ stats, available: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
