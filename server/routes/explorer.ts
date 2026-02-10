import { Router } from 'express';
import {
  queryInteractions,
  getInteractionContent,
  getExplorerFacets,
  getIndexStats,
  type InteractionQuery,
} from '../services/interaction-index.js';

const router = Router();

// Query interactions across all sessions
router.get('/interactions', (req, res) => {
  try {
    const query: InteractionQuery = {
      category: req.query.category as string | undefined,
      toolName: req.query.toolName as string | undefined,
      toolRiskTier: req.query.toolRiskTier as string | undefined,
      modelFamily: req.query.modelFamily as string | undefined,
      projectSlug: req.query.projectSlug as string | undefined,
      dateFrom: req.query.dateFrom as string | undefined,
      dateTo: req.query.dateTo as string | undefined,
      search: req.query.search as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      sortBy: req.query.sortBy as 'timestamp' | 'riskTier' | undefined,
      sortOrder: req.query.sortOrder as 'asc' | 'desc' | undefined,
    };

    const result = queryInteractions(query);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Get full content of a specific interaction
router.get('/interactions/:id/content', async (req, res) => {
  try {
    const id = decodeURIComponent(req.params.id);
    const result = await getInteractionContent(id);
    if (!result) {
      return res.status(404).json({ error: 'Interaction not found' });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Get explorer facets
router.get('/facets', (_req, res) => {
  try {
    const facets = getExplorerFacets();
    res.json(facets);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Get index stats
router.get('/stats', (_req, res) => {
  try {
    const stats = getIndexStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
