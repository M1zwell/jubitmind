import { Router } from 'express';
import { discoverConfigs, getConfigById, auditAllConfigs, saveConfig } from '../services/agent-configs.js';

const router = Router();

// GET /api/agent-configs — list all known config files with existence/metadata
router.get('/', async (_req, res) => {
  try {
    const configs = await discoverConfigs(false);
    res.json({ configs });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/agent-configs/audit — full audit across all configs
router.get('/audit', async (_req, res) => {
  try {
    const result = await auditAllConfigs();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/agent-configs/:id — single config with content + audit
router.get('/:id', async (req, res) => {
  try {
    const config = await getConfigById(String(req.params.id));
    if (!config) {
      return res.status(404).json({ error: 'Config not found' });
    }
    res.json({ config });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// PUT /api/agent-configs/:id — save/create config file
router.put('/:id', async (req, res) => {
  try {
    const { content } = req.body;
    if (typeof content !== 'string') {
      return res.status(400).json({ error: 'content (string) is required' });
    }
    const config = await saveConfig(String(req.params.id), content);
    res.json({ ok: true, config });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
