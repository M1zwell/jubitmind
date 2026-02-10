import { Router } from 'express';
import {
  getInsightsStatus,
  getLatestInsight,
  getInsightHistory,
  runInsightsNow,
} from '../services/insights-agent.js';

const router = Router();

// Get insights agent status
router.get('/status', (_req, res) => {
  try {
    const status = getInsightsStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Get latest insight report
router.get('/reports/latest', async (_req, res) => {
  try {
    const report = await getLatestInsight();
    res.json({ report });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Get insight report history
router.get('/reports', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const reports = await getInsightHistory(limit);
    res.json({ reports, count: reports.length });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Trigger on-demand insight run
router.post('/run', async (_req, res) => {
  try {
    const report = await runInsightsNow('on-demand');
    res.json({ report });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
