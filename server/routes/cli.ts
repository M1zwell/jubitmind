import { Router } from 'express';
import { randomUUID } from 'crypto';
import { runCli, streamCli, cancelCli, runCliSync } from '../services/claude-cli.js';
import { createSession, appendMessage } from '../services/conversation-store.js';

const router = Router();

router.get('/version', (_req, res) => {
  try {
    const version = runCliSync(['--version']);
    res.json({ version });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/doctor', async (_req, res) => {
  try {
    const output = await runCli(['doctor']);
    res.json({ output });
  } catch (err) {
    res.json({ output: (err as Error).message });
  }
});

router.post('/run', async (req, res) => {
  const { prompt, model, continueSession } = req.body;
  if (!prompt) {
    res.status(400).json({ error: 'prompt is required' });
    return;
  }

  const args = ['-p', prompt, '--output-format', 'json'];
  if (model) args.push('--model', model);
  if (continueSession) args.push('--continue');

  try {
    const output = await runCli(args);
    try {
      res.json(JSON.parse(output));
    } catch {
      res.json({ result: output });
    }
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/stream', async (req, res) => {
  const prompt = req.query.prompt as string;
  const model = req.query.model as string;

  if (!prompt) {
    res.status(400).json({ error: 'prompt query parameter is required' });
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
    metadata: { mode: 'claude-cli', model: model || 'sonnet' },
  }).catch(() => {});

  // Set up SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const args = ['-p', prompt, '--output-format', 'stream-json', '--verbose'];
  if (model) args.push('--model', model);

  let assistantContent = '';

  streamCli(
    args,
    (chunk) => {
      // Accumulate assistant content for saving
      try {
        const parsed = JSON.parse(chunk);
        if (parsed.content) assistantContent += parsed.content;
        else if (parsed.result) assistantContent += parsed.result;
      } catch { /* non-JSON chunk */ }
      res.write(`data: ${chunk}\n\n`);
    },
    () => {
      // Save assistant response
      if (assistantContent) {
        appendMessage(sessionId, {
          type: 'assistant',
          message: { role: 'assistant', content: assistantContent },
          sessionId,
          timestamp: new Date().toISOString(),
          uuid: randomUUID(),
          metadata: { mode: 'claude-cli', model: model || 'sonnet' },
        }).catch(() => {});
      }
      res.write(`event: done\ndata: ${JSON.stringify({ sessionId })}\n\n`);
      res.end();
    },
    (err) => {
      res.write(`data: ${JSON.stringify({ type: 'error', content: err.message })}\n\n`);
      res.write(`event: done\ndata: ${JSON.stringify({ sessionId })}\n\n`);
      res.end();
    },
  );

  req.on('close', () => {
    cancelCli();
  });
});

router.post('/cancel', (_req, res) => {
  const cancelled = cancelCli();
  res.json({ ok: true, cancelled });
});

export default router;
