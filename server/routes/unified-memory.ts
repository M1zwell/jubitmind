import { Router, type Request, type Response } from 'express';
import { memoryStore, vectorStore, ingestAllAdapters, correlateMemories, hybridSearch, backfillEmbeddings } from '../services/memory/index.js';
import type { MemorySearchQuery } from '../services/memory/types.js';
import type { SearchMode } from '../services/memory/hybrid-search.js';

const router = Router();

/** GET /api/unified-memory/search - Search across all tool memories (keyword, semantic, or hybrid) */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const mode = (req.query.mode as SearchMode) || 'keyword';
    const text = req.query.text as string | undefined;
    const adapters = req.query.adapters ? (req.query.adapters as string).split(',') : undefined;
    const layers = req.query.layers ? (req.query.layers as string).split(',') as MemorySearchQuery['layers'] : undefined;
    const tags = req.query.tags ? (req.query.tags as string).split(',') : undefined;
    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;
    const role = req.query.role as 'user' | 'assistant' | undefined;
    const project = req.query.project as string | undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const offset = req.query.offset ? Number(req.query.offset) : 0;

    // Use hybrid search for semantic/hybrid modes when text is provided
    if (text && (mode === 'semantic' || mode === 'hybrid')) {
      const result = await hybridSearch({ text, mode, adapters, layers, tags, dateFrom, dateTo, role, project, limit, offset });
      res.json(result);
      return;
    }

    // Default: keyword search
    const query: MemorySearchQuery = { text, adapters, layers, tags, dateFrom, dateTo, role, project, limit, offset };
    const result = await memoryStore.search(query);
    res.json({ ...result, mode: 'keyword' });
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

/** POST /api/unified-memory/embeddings/backfill - Backfill vector embeddings for existing entries */
router.post('/embeddings/backfill', async (_req: Request, res: Response) => {
  try {
    if (!vectorStore.isReady()) {
      res.status(503).json({ error: 'Vector store not initialized' });
      return;
    }
    const result = await backfillEmbeddings();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** GET /api/unified-memory/embeddings/stats - Vector embedding coverage stats */
router.get('/embeddings/stats', async (_req: Request, res: Response) => {
  try {
    if (!vectorStore.isReady()) {
      res.json({ ready: false, totalEmbeddings: 0, byAdapter: {}, dbSizeBytes: 0 });
      return;
    }
    const memStats = await memoryStore.getStats();
    const vecStats = await vectorStore.getStats();
    res.json({
      ready: true,
      totalEntries: memStats.totalEntries,
      totalEmbeddings: vecStats.totalEmbeddings,
      coveragePercent: memStats.totalEntries > 0
        ? Math.round((vecStats.totalEmbeddings / memStats.totalEntries) * 100)
        : 0,
      byAdapter: vecStats.byAdapter,
      dbSizeBytes: vecStats.dbSizeBytes,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
