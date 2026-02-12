import { Router, type Request, type Response } from 'express';
import { memoryStore, ingestAllAdapters, correlateMemories } from '../services/memory/index.js';
import type { MemorySearchQuery } from '../services/memory/types.js';

const router = Router();

/** GET /api/unified-memory/search - Full-text search across all tool memories */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const query: MemorySearchQuery = {
      text: req.query.text as string | undefined,
      adapters: req.query.adapters ? (req.query.adapters as string).split(',') : undefined,
      layers: req.query.layers ? (req.query.layers as string).split(',') as MemorySearchQuery['layers'] : undefined,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      dateFrom: req.query.dateFrom as string | undefined,
      dateTo: req.query.dateTo as string | undefined,
      role: req.query.role as 'user' | 'assistant' | undefined,
      project: req.query.project as string | undefined,
      limit: req.query.limit ? Number(req.query.limit) : 50,
      offset: req.query.offset ? Number(req.query.offset) : 0,
    };
    const result = await memoryStore.search(query);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** GET /api/unified-memory/stats - Memory store statistics */
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await memoryStore.getStats();
    res.json({ stats });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** POST /api/unified-memory/ingest - Trigger ingestion from all adapters */
router.post('/ingest', async (_req: Request, res: Response) => {
  try {
    const result = await ingestAllAdapters();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** POST /api/unified-memory/correlate - Run cross-tool correlation */
router.post('/correlate', async (_req: Request, res: Response) => {
  try {
    const count = await correlateMemories();
    res.json({ relationshipsCreated: count });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** GET /api/unified-memory/entry/:id - Get a specific memory entry */
router.get('/entry/:id', async (req: Request, res: Response) => {
  try {
    const entry = await memoryStore.getEntry(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    res.json({ entry });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** GET /api/unified-memory/entry/:id/graph - Get relationship graph for an entry */
router.get('/entry/:id/graph', async (req: Request, res: Response) => {
  try {
    const relationships = await memoryStore.getRelationships(req.params.id);
    res.json({ relationships });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** POST /api/unified-memory/auto-tier - Re-tier entries by age */
router.post('/auto-tier', async (_req: Request, res: Response) => {
  try {
    const result = await memoryStore.autoTierEntries();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
