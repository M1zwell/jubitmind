import { Router } from 'express';
import {
  getLatestReport,
  getReportHistory,
  runAuditNow,
  type AuditReport,
} from '../services/auditor-agent.js';

const router = Router();

// GET /api/auditor/status — auditor status + latest report summary
router.get('/status', async (_req, res) => {
  try {
    const latest = await getLatestReport();
    res.json({
      running: true,
      lastAudit: latest?.timestamp ?? null,
      criticalFindings: latest?.security.criticalFindings ?? 0,
      highFindings: latest?.security.highFindings ?? 0,
      billingAlert: latest?.billing.alert ?? false,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/auditor/reports/latest — full latest report
router.get('/reports/latest', async (_req, res) => {
  try {
    const report = await getLatestReport();
    if (!report) {
      return res.json({ report: null });
    }
    res.json({ report });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/auditor/reports — report history
router.get('/reports', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const reports = await getReportHistory(limit);
    res.json({ reports, count: reports.length });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/auditor/run — trigger emergency audit
router.post('/run', async (_req, res) => {
  try {
    const report = await runAuditNow();
    res.json({ report });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
