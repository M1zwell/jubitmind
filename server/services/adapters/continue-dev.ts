import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { homedir, platform } from 'os';
import { join } from 'path';
import type { AIToolAdapter, AdapterSessionMeta, AdapterMessage, AdapterStats } from './types.js';

const IS_WINDOWS = platform() === 'win32';
const HOME = homedir();

// Continue.dev stores sessions in ~/.continue/sessions/ as JSON files
const SESSIONS_DIR = join(HOME, '.continue', 'sessions');
const CONFIG_PATH = join(HOME, '.continue', 'config.json');

// Also check Windows AppData locations
const ALT_PATHS = IS_WINDOWS
  ? [
      join(HOME, 'AppData', 'Roaming', 'Continue', 'sessions'),
      join(HOME, 'AppData', 'Local', 'Continue', 'sessions'),
    ]
  : [];

interface ContinueSession {
  sessionId?: string;
  title?: string;
  workspaceDirectory?: string;
  history?: ContinueHistoryItem[];
  dateCreated?: string;
}

interface ContinueHistoryItem {
  message?: {
    role?: string;
    content?: string;
  };
  contextItems?: unknown[];
  editorState?: unknown;
  timestamp?: number;
}

function findSessionsDir(): string | null {
  if (existsSync(SESSIONS_DIR)) return SESSIONS_DIR;
  for (const p of ALT_PATHS) {
    if (existsSync(p)) return p;
  }
  return null;
}

export const continueDevAdapter: AIToolAdapter = {
  id: 'continue-dev',
  name: 'Continue.dev',
  icon: 'ArrowRight',
  category: 'extension',
  description: 'Continue.dev VS Code extension sessions from ~/.continue/',

  async isAvailable(): Promise<boolean> {
    return findSessionsDir() !== null || existsSync(CONFIG_PATH);
  },

  async discoverSessions(): Promise<AdapterSessionMeta[]> {
    const sessionsDir = findSessionsDir();
    if (!sessionsDir) return [];

    try {
      const files = readdirSync(sessionsDir).filter((f) => f.endsWith('.json'));
      const sessions: AdapterSessionMeta[] = [];

      for (const file of files) {
        const filePath = join(sessionsDir, file);
        try {
          const stat = statSync(filePath);
          const content = readFileSync(filePath, 'utf-8');
          const data: ContinueSession = JSON.parse(content);

          const sessionId = data.sessionId || file.replace('.json', '');
          const messageCount = data.history?.length || 0;

          // Extract preview from first user message
          let preview = data.title || 'Continue.dev session';
          if (!data.title && data.history && data.history.length > 0) {
            const firstUserMsg = data.history.find((h) => h.message?.role === 'user');
            if (firstUserMsg?.message?.content) {
              preview = firstUserMsg.message.content.slice(0, 150);
            }
          }

          sessions.push({
            sessionId,
            adapterId: 'continue-dev',
            createdAt: data.dateCreated || stat.birthtime.toISOString(),
            updatedAt: stat.mtime.toISOString(),
            messageCount,
            preview,
            projectSlug: data.workspaceDirectory,
            sizeBytes: stat.size,
            riskLevel: 'low',
          });
        } catch {
          // Skip files we can't parse
        }
      }

      // Sort by most recent first
      sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      return sessions;
    } catch {
      return [];
    }
  },

  async getMessages(sessionId: string): Promise<AdapterMessage[]> {
    const sessionsDir = findSessionsDir();
    if (!sessionsDir) return [];

    const filePath = join(sessionsDir, `${sessionId}.json`);
    if (!existsSync(filePath)) return [];

    try {
      const content = readFileSync(filePath, 'utf-8');
      const data: ContinueSession = JSON.parse(content);

      if (!data.history) return [];

      return data.history
        .filter((h) => h.message?.content)
        .map((h, idx) => ({
          role: (h.message?.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
          content: h.message?.content || '',
          timestamp: h.timestamp ? new Date(h.timestamp).toISOString() : undefined,
          uuid: `${sessionId}-${idx}`,
        }));
    } catch {
      return [];
    }
  },

  async getStats(): Promise<AdapterStats> {
    const sessions = await this.discoverSessions();
    let totalMessages = 0;
    let oldest: string | undefined;
    let newest: string | undefined;

    for (const s of sessions) {
      totalMessages += s.messageCount;
      if (!oldest || s.createdAt < oldest) oldest = s.createdAt;
      if (!newest || s.updatedAt > newest) newest = s.updatedAt;
    }

    return {
      totalSessions: sessions.length,
      totalMessages,
      oldestSession: oldest,
      newestSession: newest,
    };
  },
};
