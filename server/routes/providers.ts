import { Router } from 'express';
import { randomUUID } from 'crypto';
import {
  loadProviders,
  saveProviders,
  getProvider,
  chatCompletion,
  streamChatCompletion,
  testProvider,
  discoverModels,
  maskApiKey,
  type Provider,
} from '../services/ai-provider.js';
import { createSession, appendMessage } from '../services/conversation-store.js';

const router = Router();

// Active streaming abort controllers
let activeController: AbortController | null = null;

// --- CRUD ---

router.get('/', async (_req, res) => {
  const providers = await loadProviders();
  // Mask API keys for frontend
  const masked = providers.map((p) => ({
    ...p,
    apiKey: maskApiKey(p.apiKey),
    _hasKey: !!p.apiKey,
  }));
  res.json({ providers: masked });
});

router.post('/', async (req, res) => {
  const { id, name, apiBase, apiKey, models, enabled } = req.body;
  if (!id || !name || !apiBase) {
    res.status(400).json({ error: 'id, name, and apiBase are required' });
    return;
  }

  const providers = await loadProviders();
  if (providers.some((p) => p.id === id)) {
    res.status(409).json({ error: `Provider "${id}" already exists` });
    return;
  }

  providers.push({ id, name, apiBase, apiKey: apiKey || '', models: models || [], enabled: enabled ?? true });
  await saveProviders(providers);
  res.json({ ok: true });
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const providers = await loadProviders();
  const idx = providers.findIndex((p) => p.id === id);

  if (idx === -1) {
    res.status(404).json({ error: `Provider "${id}" not found` });
    return;
  }

  // Merge updates but don't overwrite apiKey with masked value
  if (updates.apiKey && updates.apiKey.includes('••')) {
    delete updates.apiKey;
  }

  providers[idx] = { ...providers[idx], ...updates, id }; // id cannot change
  await saveProviders(providers);
  res.json({ ok: true });
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const providers = await loadProviders();
  const filtered = providers.filter((p) => p.id !== id);

  if (filtered.length === providers.length) {
    res.status(404).json({ error: `Provider "${id}" not found` });
    return;
  }

  await saveProviders(filtered);
  res.json({ ok: true });
});

// --- Test Connection ---

router.post('/:id/test', async (req, res) => {
  const provider = await getProvider(req.params.id);
  if (!provider) {
    res.status(404).json({ error: 'Provider not found' });
    return;
  }
  if (!provider.apiKey) {
    res.json({ ok: false, latencyMs: 0, error: 'No API key configured' });
    return;
  }

  const result = await testProvider(provider);
  res.json(result);
});

// --- Auto-discover Models ---

router.post('/:id/discover', async (req, res) => {
  const provider = await getProvider(req.params.id);
  if (!provider) {
    res.status(404).json({ error: 'Provider not found' });
    return;
  }

  const models = await discoverModels(provider);
  if (models.length > 0) {
    // Save discovered models to provider config
    const providers = await loadProviders();
    const idx = providers.findIndex((p) => p.id === req.params.id);
    if (idx !== -1) {
      providers[idx].models = models;
      await saveProviders(providers);
    }
  }

  res.json({ models, count: models.length });
});

// --- Chat (non-streaming) ---

router.post('/chat', async (req, res) => {
  const { providerId, model, messages, temperature, maxTokens } = req.body;

  const provider = await getProvider(providerId);
  if (!provider) {
    res.status(404).json({ error: `Provider "${providerId}" not found` });
    return;
  }
  if (!provider.apiKey) {
    res.status(400).json({ error: 'No API key configured for this provider' });
    return;
  }

  try {
    const result = await chatCompletion(provider, model, messages, { temperature, maxTokens });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// --- Chat (streaming via SSE) ---

router.get('/chat/stream', async (req, res) => {
  const providerId = req.query.providerId as string;
  const model = req.query.model as string;
  const prompt = req.query.prompt as string;
  const systemPrompt = req.query.systemPrompt as string;
  const temperature = parseFloat(req.query.temperature as string) || 0.7;
  const maxTokens = parseInt(req.query.maxTokens as string) || 4096;

  if (!providerId || !model || !prompt) {
    res.status(400).json({ error: 'providerId, model, and prompt are required' });
    return;
  }

  const provider = await getProvider(providerId);
  if (!provider) {
    res.status(404).json({ error: `Provider "${providerId}" not found` });
    return;
  }
  if (!provider.apiKey) {
    res.status(400).json({ error: 'No API key configured for this provider' });
    return;
  }

  // Create conversation session and save user message
  const sessionId = (req.query.sessionId as string) || createSession();
  const now = new Date().toISOString();

  appendMessage(sessionId, {
    type: 'user',
    message: { role: 'user', content: prompt },
    sessionId,
    timestamp: now,
    uuid: randomUUID(),
    metadata: { mode: 'ai-chat', providerId, model, temperature },
  }).catch(() => {});

  // Set up SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  // Build messages
  const messages: Array<{ role: string; content: string }> = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  // Cancel any existing stream
  if (activeController) {
    activeController.abort();
    activeController = null;
  }

  let assistantContent = '';

  activeController = await streamChatCompletion(
    provider,
    model,
    messages as Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    { temperature, maxTokens },
    (chunk) => {
      // Accumulate assistant content
      try {
        const parsed = JSON.parse(chunk);
        if (parsed.content) assistantContent += parsed.content;
      } catch { /* non-JSON */ }
      res.write(`data: ${chunk}\n\n`);
    },
    (usage) => {
      // Save assistant response
      if (assistantContent) {
        appendMessage(sessionId, {
          type: 'assistant',
          message: { role: 'assistant', content: assistantContent },
          sessionId,
          timestamp: new Date().toISOString(),
          uuid: randomUUID(),
          metadata: { mode: 'ai-chat', providerId, model, usage: usage || undefined },
        }).catch(() => {});
      }
      if (usage) {
        res.write(`data: ${JSON.stringify({ type: 'usage', usage })}\n\n`);
      }
      res.write(`event: done\ndata: ${JSON.stringify({ sessionId })}\n\n`);
      res.end();
      activeController = null;
    },
    (err) => {
      res.write(`data: ${JSON.stringify({ type: 'error', content: err.message })}\n\n`);
      res.write(`event: done\ndata: ${JSON.stringify({ sessionId })}\n\n`);
      res.end();
      activeController = null;
    },
  );

  req.on('close', () => {
    if (activeController) {
      activeController.abort();
      activeController = null;
    }
  });
});

// --- Cancel ---

router.post('/chat/cancel', (_req, res) => {
  if (activeController) {
    activeController.abort();
    activeController = null;
    res.json({ ok: true, cancelled: true });
  } else {
    res.json({ ok: true, cancelled: false });
  }
});

export default router;
