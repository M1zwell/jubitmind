import { Router, type Request, type Response } from 'express';
import {
  getLiteLLMModels,
  getLiteLLMModelsByProvider,
  getLiteLLMSpend,
  getLiteLLMConfig,
} from '../services/litellm-connector.js';

const router = Router();

/** Get all configured LiteLLM models */
router.get('/models', async (_req: Request, res: Response) => {
  try {
    const models = await getLiteLLMModels();
    res.json({ models, count: models.length });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** Get models grouped by provider */
router.get('/models/by-provider', async (_req: Request, res: Response) => {
  try {
    const byProvider = await getLiteLLMModelsByProvider();
    const summary = Object.entries(byProvider).map(([provider, models]) => ({
      provider,
      count: models.length,
      models: models.map((m) => m.modelName),
    }));
    res.json({ providers: summary });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** Get spend data from LiteLLM PostgreSQL (if configured) */
router.get('/spend', async (_req: Request, res: Response) => {
  try {
    const spend = await getLiteLLMSpend();
    if (!spend) {
      return res.json({ spend: null, dbConfigured: false, message: 'Set LITELLM_DB_URL to enable spend tracking' });
    }
    res.json({ spend, dbConfigured: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** Get full config summary */
router.get('/config', async (_req: Request, res: Response) => {
  try {
    const config = await getLiteLLMConfig();
    if (!config) {
      return res.json({ config: null, available: false });
    }
    res.json({
      available: true,
      totalModels: config.models.length,
      providers: [...new Set(config.models.map((m) => m.provider))],
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
