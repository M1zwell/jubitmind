import type { AIToolAdapter, AdapterSessionMeta, AdapterMessage, AdapterStats } from './types.js';
import {
  listClaudeSessions,
  getClaudeMessages,
  getStatsCache,
  type ClaudeMessage,
} from '../claude-sessions.js';
import { getAllSessions } from '../session-cache.js';

function extractContent(msg: ClaudeMessage): string {
  if (!msg.message?.content) return '';
  if (typeof msg.message.content === 'string') return msg.message.content;
  if (Array.isArray(msg.message.content)) {
    const textBlock = msg.message.content.find(
      (b: { type?: string }) => b.type === 'text',
    ) as { text?: string } | undefined;
    return textBlock?.text || '';
  }
  return '';
}

export const claudeCodeAdapter: AIToolAdapter = {
  id: 'claude-code',
  name: 'Claude Code',
  icon: 'Terminal',
  category: 'cli',
  description: 'Anthropic Claude Code CLI sessions from ~/.claude/',

  async isAvailable(): Promise<boolean> {
    const { existsSync } = await import('fs');
    const { homedir } = await import('os');
    const { join } = await import('path');
    return existsSync(join(homedir(), '.claude', 'projects'));
  },

  async discoverSessions(options = {}): Promise<AdapterSessionMeta[]> {
    const { limit = 50, project } = options;
    const sessions = await listClaudeSessions({ project, limit });
    return sessions.map((s) => ({
      sessionId: s.sessionId,
      adapterId: 'claude-code',
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      messageCount: s.messageCount,
      preview: s.preview,
      projectSlug: s.projectSlug,
      projectDisplayName: s.projectDisplayName,
      sizeBytes: s.sizeBytes,
      riskLevel: s.riskLevel as AdapterSessionMeta['riskLevel'],
      riskScore: s.riskScore,
      tags: [...(s.autoTags || []), ...(s.manualTags || [])],
    }));
  },

  async getMessages(sessionId, options = {}): Promise<AdapterMessage[]> {
    const { offset = 0, limit = 50, project } = options;
    const messages = await getClaudeMessages(sessionId, project, offset, limit);
    return messages.map((m) => ({
      role: m.message?.role === 'user' ? 'user' as const : 'assistant' as const,
      content: extractContent(m),
      timestamp: m.timestamp,
      uuid: m.uuid,
      metadata: {
        cwd: m.cwd,
        gitBranch: m.gitBranch,
      },
    }));
  },

  async getStats(): Promise<AdapterStats> {
    const [sessions, statsCache] = await Promise.all([
      getAllSessions(9999),
      getStatsCache(),
    ]);

    const totalSessions = sessions.length;
    let totalMessages = 0;
    let oldest: string | undefined;
    let newest: string | undefined;

    for (const s of sessions) {
      totalMessages += s.messageCount;
      if (!oldest || s.createdAt < oldest) oldest = s.createdAt;
      if (!newest || s.updatedAt > newest) newest = s.updatedAt;
    }

    // Extract model usage from stats-cache if available
    let modelUsage: Record<string, number> | undefined;
    let totalTokens: number | undefined;
    let totalCostUsd: number | undefined;

    if (statsCache) {
      const sessions_data = statsCache.sessions as Array<Record<string, unknown>> | undefined;
      if (sessions_data) {
        modelUsage = {};
        totalTokens = 0;
        totalCostUsd = 0;
        for (const sd of sessions_data) {
          const model = sd.model as string | undefined;
          const inputTokens = (sd.inputTokens as number) || 0;
          const outputTokens = (sd.outputTokens as number) || 0;
          const cost = (sd.costUsd as number) || 0;
          if (model) {
            modelUsage[model] = (modelUsage[model] || 0) + inputTokens + outputTokens;
          }
          totalTokens += inputTokens + outputTokens;
          totalCostUsd += cost;
        }
      }
    }

    return {
      totalSessions,
      totalMessages,
      totalTokens,
      totalCostUsd,
      oldestSession: oldest,
      newestSession: newest,
      modelUsage,
    };
  },
};
