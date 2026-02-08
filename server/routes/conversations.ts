import { Router } from 'express';
import * as store from '../services/conversation-store.js';
import * as claude from '../services/claude-sessions.js';
import { discoverProjects } from '../services/project-discovery.js';
import { getClaudeMessages, getClaudeMessagesRaw } from '../services/claude-sessions.js';
import { scoreMessageContent, computeSessionRisk } from '../services/risk-scorer.js';
import { computeAutoTags } from '../services/auto-tagger.js';
import * as tagStore from '../services/tag-store.js';

const router = Router();

// List all discovered projects
router.get('/projects', async (_req, res) => {
  try {
    const projects = await discoverProjects();
    res.json({ projects });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// List all unique tag names
router.get('/tags', async (_req, res) => {
  try {
    const { autoTags, manualTags } = await tagStore.getAllUniqueTagNames();
    res.json({ tags: [...new Set([...autoTags, ...manualTags])], autoTagNames: autoTags });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// List all sessions (dashboard + claude-code), with optional project/risk/tag filters
router.get('/sessions', async (req, res) => {
  try {
    const source = (req.query.source as string) || 'all';
    const project = req.query.project as string | undefined;
    const minRisk = req.query.minRisk as string | undefined;
    const tagFilter = req.query.tags as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);

    let sessions: Array<Record<string, unknown>> = [];

    if (source === 'dashboard' || source === 'all') {
      const dashSessions = await store.listSessions();
      sessions.push(...dashSessions);
    }

    if (source === 'claude-code' || source === 'all') {
      const claudeSessions = await claude.listClaudeSessions({ project, limit });
      sessions.push(...claudeSessions);
    }

    if (source === 'cloud') {
      // Future: return cloud-synced sessions
    }

    // Apply risk filter
    if (minRisk) {
      const scoreMap: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };
      const minScore = scoreMap[minRisk] || 0;
      sessions = sessions.filter((s) => ((s.riskScore as number) || 0) >= minScore);
    }

    // Apply tag filter
    if (tagFilter) {
      const filterTags = tagFilter.split(',').map((t) => t.trim().toLowerCase());
      sessions = sessions.filter((s) => {
        const sessionAutoTags = (s.autoTags as string[]) || [];
        const sessionManualTags = (s.manualTags as string[]) || [];
        const allTags = [...sessionAutoTags, ...sessionManualTags].map((t) => t.toLowerCase());
        return filterTags.some((ft) => allTags.includes(ft));
      });
    }

    // Sort by updatedAt descending
    sessions.sort(
      (a, b) =>
        new Date(b.updatedAt as string).getTime() -
        new Date(a.updatedAt as string).getTime(),
    );

    res.json({ sessions: sessions.slice(0, limit), total: sessions.length });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Get messages for a session (paginated)
router.get('/sessions/:sessionId/messages', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const project = req.query.project as string | undefined;
    const offset = parseInt(req.query.offset as string) || 0;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);

    let messages;
    try {
      messages = await store.getMessages(sessionId, offset, limit);
    } catch {
      messages = await getClaudeMessages(sessionId, project, offset, limit);
    }

    res.json({ messages, offset, limit, hasMore: messages.length === limit });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Compute risk and tags for a session
router.get('/sessions/:sessionId/risk', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const project = req.query.project as string | undefined;

    let messages;
    try {
      messages = await getClaudeMessagesRaw(sessionId, project);
    } catch {
      messages = await store.getMessages(sessionId, 0, 10000);
    }

    const assessments = messages.map((msg, i) =>
      scoreMessageContent(msg.message?.content, i),
    );
    const riskSummary = computeSessionRisk(assessments);
    const autoTags = computeAutoTags(messages as Array<{ type: string; message?: { role: string; content: unknown } }>, riskSummary);

    const storeKey = project ? `${project}:${sessionId}` : `dashboard:${sessionId}`;
    const existingEntry = await tagStore.getEntry(storeKey);
    const manualTags = existingEntry?.manualTags || [];

    await tagStore.saveEntry(storeKey, {
      autoTags,
      manualTags,
      riskSummary,
      computedAt: new Date().toISOString(),
      fileMtime: Date.now(),
    });

    res.json({
      risk: riskSummary,
      tags: { autoTags, manualTags, computedAt: new Date().toISOString() },
      messages: assessments,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Add a manual tag to a session
router.post('/sessions/:sessionId/tags', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const project = req.query.project as string | undefined;
    const { tag } = req.body;

    if (!tag || typeof tag !== 'string' || tag.length > 50) {
      return res.status(400).json({ error: 'Invalid tag (max 50 chars)' });
    }

    const storeKey = project ? `${project}:${sessionId}` : `dashboard:${sessionId}`;
    const entry = await tagStore.addManualTag(storeKey, tag.trim().toLowerCase());

    res.json({
      ok: true,
      tags: { autoTags: entry.autoTags, manualTags: entry.manualTags, computedAt: entry.computedAt },
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Remove a manual tag from a session
router.delete('/sessions/:sessionId/tags/:tag', async (req, res) => {
  try {
    const { sessionId, tag } = req.params;
    const project = req.query.project as string | undefined;
    const storeKey = project ? `${project}:${sessionId}` : `dashboard:${sessionId}`;
    const entry = await tagStore.removeManualTag(storeKey, decodeURIComponent(tag));
    res.json({
      ok: true,
      tags: { autoTags: entry.autoTags, manualTags: entry.manualTags, computedAt: entry.computedAt },
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Delete a dashboard session
router.delete('/sessions/:sessionId', async (req, res) => {
  try {
    await store.deleteSession(req.params.sessionId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Global prompt history
router.get('/history', async (_req, res) => {
  try {
    const history = await claude.getGlobalHistory(200);
    res.json({ history });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Usage stats
router.get('/stats', async (_req, res) => {
  try {
    const stats = await claude.getStatsCache();
    res.json({ stats });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Cloud import (placeholder)
router.post('/cloud/import', async (req, res) => {
  try {
    const { conversations } = req.body;
    if (!Array.isArray(conversations) || conversations.length === 0) {
      return res.status(400).json({ error: 'No conversations provided' });
    }

    const imported: string[] = [];
    for (const conv of conversations) {
      const sessionId = store.createSession();
      if (conv.messages && Array.isArray(conv.messages)) {
        for (const msg of conv.messages) {
          await store.appendMessage(sessionId, {
            type: msg.type || (msg.role === 'user' ? 'user' : 'assistant'),
            message: {
              role: msg.role || msg.type || 'user',
              content: msg.content || msg.message?.content || '',
            },
            sessionId,
            timestamp: msg.timestamp || new Date().toISOString(),
            uuid: msg.uuid || crypto.randomUUID(),
            metadata: { mode: 'claude-cli' as const, ...(msg.metadata || {}) },
          });
        }
      }
      imported.push(sessionId);
    }

    res.json({ imported: imported.length, sessionIds: imported });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Cloud export
router.get('/cloud/export', async (req, res) => {
  try {
    const sessionId = req.query.sessionId as string;
    const project = req.query.project as string | undefined;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    let messages;
    try {
      messages = await store.getMessages(sessionId, 0, 10000);
    } catch {
      messages = await getClaudeMessages(sessionId, project, 0, 10000);
    }

    res.json({
      session: {
        sessionId,
        project: project || 'dashboard',
        exportedAt: new Date().toISOString(),
        messageCount: messages.length,
        messages,
      },
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
