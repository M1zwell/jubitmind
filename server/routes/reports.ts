import { Router } from 'express';
import {
  generateCombinedReport,
  getLatestCombinedReport,
  getCombinedReportHistory,
  exportCombinedMarkdown,
  exportCombinedPdf,
} from '../services/report-generator.js';

const router = Router();

// POST /api/reports/generate - Generate a new combined report
router.post('/generate', async (_req, res) => {
  try {
    const report = await generateCombinedReport();
    res.json({ report });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Report generation failed' });
  }
});

// GET /api/reports/latest - Get the latest combined report
router.get('/latest', async (_req, res) => {
  try {
    const report = await getLatestCombinedReport();
    res.json({ report });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to read report' });
  }
});

// GET /api/reports/export?format=pdf|md - Download exported report
router.get('/export', async (req, res) => {
  try {
    const format = (req.query.format as string) || 'pdf';
    const report = await getLatestCombinedReport();

    if (!report) {
      return res.status(404).json({ error: 'No report available. Generate one first.' });
    }

    if (format === 'md') {
      const markdown = exportCombinedMarkdown(report);
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="jubitmind-report-${report.id}.md"`);
      return res.send(markdown);
    }

    // Default: PDF
    const pdfBuffer = exportCombinedPdf(report);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="jubitmind-report-${report.id}.pdf"`);
    return res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Export failed' });
  }
});

// GET /api/reports/history?limit=10 - List past combined reports
router.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const reports = await getCombinedReportHistory(limit);
    res.json({ reports, count: reports.length });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to read history' });
  }
});

export default router;
