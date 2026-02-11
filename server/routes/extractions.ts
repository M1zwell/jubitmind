import { Router, type Request, type Response } from 'express';
import {
  getSidecarStatus,
  getSchemas,
  extractFromText,
  getResultsForSession,
  getAllResults,
  getProviderPresets,
  getSidecarConfig,
  updateSidecarConfig,
  getVisualizationHtml,
} from '../services/langextract-connector.js';
import { getClaudeMessagesRaw } from '../services/claude-sessions.js';
import * as store from '../services/conversation-store.js';

const router = Router();

/** Load all messages for a session (tries Claude Code JSONL first, then dashboard store). */
async function loadSessionText(sessionId: string, projectSlug?: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let messages: Array<{ type?: string; message?: { role?: string; content?: unknown } }> = [];

  try {
    messages = await getClaudeMessagesRaw(sessionId, projectSlug);
  } catch {
    messages = await store.getMessages(sessionId, 0, 10000);
  }

  if (!messages || messages.length === 0) {
    throw new Error('Session not found or has no messages');
  }

  const text = messages
    .map((m) => {
      const content = m.message?.content;
      if (typeof content === 'string') return content;
      if (Array.isArray(content)) {
        return content
          .filter((b: { type?: string; text?: string }) => b.type === 'text' && b.text)
          .map((b: { text: string }) => b.text)
          .join('\n');
      }
      return '';
    })
    .filter(Boolean)
    .join('\n\n---\n\n');

  if (!text.trim()) {
    throw new Error('Session contains no extractable text');
  }

  return text;
}

/** Sidecar health + provider availability */
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const status = await getSidecarStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** List provider presets */
router.get('/providers', async (_req: Request, res: Response) => {
  try {
    const providers = await getProviderPresets();
    res.json({ providers });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** Get sidecar configuration */
router.get('/config', async (_req: Request, res: Response) => {
  try {
    const config = await getSidecarConfig();
    res.json(config || { provider: 'gemini', model_id: 'gemini-2.5-flash' });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** Update sidecar configuration */
router.post('/config', async (req: Request, res: Response) => {
  try {
    const result = await updateSidecarConfig(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** List available extraction schemas */
router.get('/schemas', async (_req: Request, res: Response) => {
  try {
    const schemas = await getSchemas();
    res.json({ schemas });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** Run extraction on a session */
router.post('/run', async (req: Request, res: Response) => {
  try {
    const { sessionId, schemaName, projectSlug, modelId, extractionPasses } = req.body;

    if (!sessionId || !schemaName) {
      return res.status(400).json({ error: 'sessionId and schemaName are required' });
    }

    const text = await loadSessionText(sessionId, projectSlug);
    const result = await extractFromText(text, schemaName, sessionId, { modelId, extractionPasses });
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** Get extraction results for a session */
router.get('/results/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const results = await getResultsForSession(sessionId as string);
    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** List all extraction results (paginated) */
router.get('/results', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;
    const data = await getAllResults(limit, offset);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** Get interactive HTML visualization for an extraction result */
router.get('/visualize/:resultId', async (req: Request, res: Response) => {
  try {
    const { resultId } = req.params;
    const html = await getVisualizationHtml(resultId as string);
    if (!html) {
      return res.status(404).json({ error: 'Visualization not available for this result' });
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
