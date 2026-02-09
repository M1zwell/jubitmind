import { Router } from 'express';
import { randomUUID } from 'crypto';
import { getClaudeMessagesRaw, type ClaudeMessage } from '../services/claude-sessions.js';
import { getProvider, loadProviders, streamChatCompletion } from '../services/ai-provider.js';

const router = Router();

// --- In-memory multi-turn conversation state ---

interface ConversationState {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  systemPrompt: string;
  createdAt: number;
}

const conversations = new Map<string, ConversationState>();
const CONVERSATION_TTL = 60 * 60 * 1000; // 1 hour

// Cleanup old conversations every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, state] of conversations) {
    if (now - state.createdAt > CONVERSATION_TTL) {
      conversations.delete(id);
    }
  }
}, 10 * 60 * 1000);

// --- Analysis mode system prompts ---

type AnalysisMode = 'summary' | 'security' | 'quality' | 'patterns' | 'custom';

const MODE_INSTRUCTIONS: Record<AnalysisMode, string> = {
  summary: `You are an expert analyst reviewing a Claude Code development session. Provide a concise TL;DR summary:
- What was the user trying to accomplish?
- What were the key decisions and outcomes?
- What files were changed and why?
- Were there any issues or blockers encountered?
Keep the summary focused and actionable.`,
  security: `You are a security auditor reviewing a Claude Code development session. Perform a thorough security audit:
- Identify any sensitive data exposure (API keys, credentials, tokens, passwords)
- Flag dangerous commands (rm -rf, sudo, force push, DROP TABLE, etc.)
- Check for risky file operations (modifying .env, credentials, system configs)
- Identify potential vulnerabilities in any code written
- Rate the overall security risk (Critical/High/Medium/Low)
Be specific about what you find and where.`,
  quality: `You are a senior engineer reviewing a Claude Code development session for code quality:
- Analyze the code changes for correctness and potential bugs
- Check for code style consistency and best practices
- Identify any anti-patterns or code smells
- Suggest specific improvements with examples
- Note any missing error handling, tests, or documentation
Focus on actionable feedback.`,
  patterns: `You are an AI interaction analyst studying a Claude Code development session:
- How effectively did the user and AI collaborate?
- Were there repeated attempts or misunderstandings?
- What communication patterns were most productive?
- Were there any particularly creative solutions?
- How could the interaction be more efficient?
Provide insights on the human-AI collaboration dynamics.`,
  custom: `You are an expert analyst reviewing a Claude Code development session. Answer the user's questions about this session based on the transcript provided. Be specific and reference actual content from the session.`,
};

// --- Helper: extract text from message content ---

function extractTextContent(msg: ClaudeMessage): string {
  if (!msg.message?.content) return '';
  if (typeof msg.message.content === 'string') return msg.message.content;
  if (Array.isArray(msg.message.content)) {
    const parts: string[] = [];
    for (const block of msg.message.content) {
      const b = block as Record<string, unknown>;
      if (b.type === 'text' && typeof b.text === 'string') {
        parts.push(b.text);
      } else if (b.type === 'tool_use') {
        const name = b.name as string || 'unknown';
        const input = b.input as Record<string, unknown> || {};
        // Summarize tool input
        const inputSummary = summarizeToolInput(name, input);
        parts.push(`[TOOL: ${name}] ${inputSummary}`);
      } else if (b.type === 'tool_result') {
        const content = typeof b.content === 'string' ? b.content : JSON.stringify(b.content);
        parts.push(`[RESULT] ${content.slice(0, 500)}`);
      }
    }
    return parts.join('\n');
  }
  return '';
}

function summarizeToolInput(toolName: string, input: Record<string, unknown>): string {
  switch (toolName) {
    case 'Write':
    case 'Read':
    case 'Edit':
      return (input.file_path as string) || (input.path as string) || '';
    case 'Bash':
      return (input.command as string)?.slice(0, 200) || '';
    case 'Glob':
      return (input.pattern as string) || '';
    case 'Grep':
      return `pattern="${input.pattern}" ${input.path || ''}`;
    case 'WebSearch':
      return (input.query as string) || '';
    case 'WebFetch':
      return (input.url as string) || '';
    default:
      return JSON.stringify(input).slice(0, 150);
  }
}

// --- Format session as LLM context ---

function formatSessionAsContext(messages: ClaudeMessage[], mode: AnalysisMode): string {
  const instruction = MODE_INSTRUCTIONS[mode];

  const transcript = messages.map((msg, i) => {
    const role = msg.type === 'user' ? 'USER' : 'ASSISTANT';
    const content = extractTextContent(msg);
    return `[${role} #${i + 1}]\n${content}`;
  }).join('\n\n---\n\n');

  // Truncate if too long (~150K chars ≈ 37K tokens)
  const MAX_CHARS = 150_000;
  let finalTranscript = transcript;
  let truncated = false;

  if (transcript.length > MAX_CHARS) {
    truncated = true;
    const keepChars = Math.floor(MAX_CHARS / 2);
    const first = transcript.slice(0, keepChars);
    const last = transcript.slice(-keepChars);
    finalTranscript = `${first}\n\n[... TRUNCATED: session too long, showing first and last portions ...]\n\n${last}`;
  }

  return `${instruction}\n\n${truncated ? '(Note: This session was truncated due to length. First and last portions are shown.)\n\n' : ''}<session-transcript>\n${finalTranscript}\n</session-transcript>`;
}

// --- Prepare endpoint: read session and return stats ---

router.post('/prepare', async (req, res) => {
  try {
    const { sessionId, projectSlug } = req.body;
    if (!sessionId) {
      res.status(400).json({ error: 'sessionId is required' });
      return;
    }

    const messages = await getClaudeMessagesRaw(sessionId, projectSlug);
    const formatted = formatSessionAsContext(messages, 'custom');
    const estimatedTokens = Math.ceil(formatted.length / 4);

    const userMessages = messages.filter(m => m.type === 'user');
    const preview = userMessages[0] ? extractTextContent(userMessages[0]).slice(0, 200) : '';

    res.json({
      sessionId,
      messageCount: messages.length,
      estimatedTokens,
      preview,
      truncated: formatted.length >= 150_000,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// --- Available models endpoint ---

router.get('/models', async (_req, res) => {
  try {
    const providers = await loadProviders();
    const enabled = providers
      .filter(p => p.enabled && p.models.length > 0)
      .map(p => ({ id: p.id, name: p.name, models: p.models }));
    res.json({ providers: enabled });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// --- Streaming analysis chat ---

let activeController: AbortController | null = null;

router.get('/stream', async (req, res) => {
  const providerId = req.query.providerId as string;
  const model = req.query.model as string;
  const prompt = req.query.prompt as string;
  const sessionId = req.query.sessionId as string;
  const projectSlug = (req.query.projectSlug as string) || undefined;
  const analysisSessionId = (req.query.analysisSessionId as string) || randomUUID();
  const mode = (req.query.mode as AnalysisMode) || 'custom';
  const temperature = parseFloat(req.query.temperature as string) || 0.3;
  const maxTokens = parseInt(req.query.maxTokens as string) || 4096;

  if (!providerId || !model || !prompt || !sessionId) {
    res.status(400).json({ error: 'providerId, model, prompt, and sessionId are required' });
    return;
  }

  const provider = await getProvider(providerId);
  if (!provider) {
    res.status(404).json({ error: `Provider "${providerId}" not found` });
    return;
  }

  // Set up SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  try {
    // Get or create conversation state
    let convo = conversations.get(analysisSessionId);

    if (!convo) {
      // First message — read session and build system prompt
      const sessionMessages = await getClaudeMessagesRaw(sessionId, projectSlug);
      const systemPrompt = formatSessionAsContext(sessionMessages, mode);

      convo = {
        messages: [{ role: 'system' as const, content: systemPrompt }],
        systemPrompt,
        createdAt: Date.now(),
      };
      conversations.set(analysisSessionId, convo);
    }

    // Add user message to conversation
    convo.messages.push({ role: 'user' as const, content: prompt });

    // Cancel any existing stream
    if (activeController) {
      activeController.abort();
      activeController = null;
    }

    let assistantContent = '';

    activeController = await streamChatCompletion(
      provider,
      model,
      convo.messages,
      { temperature, maxTokens },
      (chunk) => {
        try {
          const parsed = JSON.parse(chunk);
          if (parsed.content) assistantContent += parsed.content;
        } catch { /* non-JSON */ }
        res.write(`data: ${chunk}\n\n`);
      },
      (usage) => {
        // Save assistant response to conversation state
        if (assistantContent) {
          convo!.messages.push({ role: 'assistant' as const, content: assistantContent });
        }
        if (usage) {
          res.write(`data: ${JSON.stringify({ type: 'usage', usage })}\n\n`);
        }
        res.write(`event: done\ndata: ${JSON.stringify({ analysisSessionId })}\n\n`);
        res.end();
        activeController = null;
      },
      (err) => {
        res.write(`data: ${JSON.stringify({ type: 'error', content: err.message })}\n\n`);
        res.write(`event: done\ndata: ${JSON.stringify({ analysisSessionId })}\n\n`);
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
  } catch (err) {
    res.write(`data: ${JSON.stringify({ type: 'error', content: (err as Error).message })}\n\n`);
    res.write(`event: done\ndata: ${JSON.stringify({ analysisSessionId })}\n\n`);
    res.end();
  }
});

// --- Cancel ---

router.post('/stream/cancel', (_req, res) => {
  if (activeController) {
    activeController.abort();
    activeController = null;
    res.json({ ok: true, cancelled: true });
  } else {
    res.json({ ok: true, cancelled: false });
  }
});

export default router;
