import { Router, type Request, type Response } from 'express';
import { cdpService } from '../services/cdp/index.js';

const router = Router();

/** GET /api/cdp/status - Check CDP connection status */
router.get('/status', (_req: Request, res: Response) => {
  res.json(cdpService.getStatus());
});

/** POST /api/cdp/connect - Connect to Chrome CDP endpoint */
router.post('/connect', async (req: Request, res: Response) => {
  try {
    const { host, port } = req.body || {};
    if (host && host !== '127.0.0.1' && host !== 'localhost') {
      return res.status(400).json({ error: 'Only local connections are allowed (127.0.0.1 or localhost)' });
    }
    const status = await cdpService.connect({ host, port });
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** POST /api/cdp/disconnect - Disconnect from Chrome */
router.post('/disconnect', (_req: Request, res: Response) => {
  cdpService.disconnect();
  res.json({ ok: true });
});

/** GET /api/cdp/tabs - List all open tabs with AI tool detection */
router.get('/tabs', async (_req: Request, res: Response) => {
  try {
    if (!cdpService.getStatus().connected) return res.json({ tabs: [] });
    const tabs = await cdpService.listTabs();
    res.json({ tabs });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** GET /api/cdp/tabs/ai - List only AI tool tabs */
router.get('/tabs/ai', async (_req: Request, res: Response) => {
  try {
    if (!cdpService.getStatus().connected) return res.json({ tabs: [] });
    const tabs = await cdpService.getAIToolTabs();
    res.json({ tabs });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** GET /api/cdp/tabs/:tabId/auth - Check auth status for a specific tab */
router.get('/tabs/:tabId/auth', async (req: Request, res: Response) => {
  try {
    const { tabId } = req.params;
    const tabs = await cdpService.listTabs();
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return res.status(404).json({ error: 'Tab not found' });
    if (!tab.detectedTool) return res.json({ tool: null, signedIn: false, indicators: [] });
    const auth = await cdpService.getAuthStatus(tabId, tab.detectedTool);
    res.json(auth);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** GET /api/cdp/tabs/:tabId/storage - Get cookies + localStorage for a tab */
router.get('/tabs/:tabId/storage', async (req: Request, res: Response) => {
  try {
    const { tabId } = req.params;
    const tabs = await cdpService.listTabs();
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return res.status(404).json({ error: 'Tab not found' });

    const domain = new URL(tab.url).hostname;
    const [cookies, localStorage, sessionStorage] = await Promise.all([
      cdpService.getCookiesForDomain(tabId, domain),
      cdpService.getLocalStorage(tabId),
      cdpService.getSessionStorage(tabId),
    ]);
    res.json({ cookies, localStorage, sessionStorage });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
