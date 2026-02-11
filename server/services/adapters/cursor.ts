import { existsSync } from 'fs';
import { homedir, platform } from 'os';
import { join } from 'path';
import type { AIToolAdapter, AdapterSessionMeta, AdapterMessage, AdapterStats } from './types.js';

const IS_WINDOWS = platform() === 'win32';
const HOME = homedir();

const DATA_PATHS = IS_WINDOWS
  ? [
      join(HOME, 'AppData', 'Roaming', 'Cursor', 'User', 'globalStorage', 'state.vscdb'),
      join(HOME, 'AppData', 'Local', 'Cursor', 'User', 'globalStorage', 'state.vscdb'),
    ]
  : [
      join(HOME, 'Library', 'Application Support', 'Cursor', 'User', 'globalStorage', 'state.vscdb'),
      join(HOME, '.config', 'Cursor', 'User', 'globalStorage', 'state.vscdb'),
    ];

interface CursorBubble {
  type: number; // 1 = user, 2 = assistant
  text?: string;
  richText?: string;
  createdAt?: string;
  modelInfo?: {
    modelId?: string;
    provider?: string;
  };
  bubbleId?: string;
}

// Cache the database instance
let dbInstance: unknown = null;
let dbPath: string | null = null;

function findDbPath(): string | null {
  for (const p of DATA_PATHS) {
    if (existsSync(p)) return p;
  }
  return null;
}

async function getDatabase(): Promise<unknown> {
  if (dbInstance) return dbInstance;

  const path = findDbPath();
  if (!path) return null;

  try {
    // Dynamic import for better-sqlite3
    const Database = (await import('better-sqlite3')).default;
    dbInstance = new Database(path, { readonly: true });
    dbPath = path;
    return dbInstance;
  } catch (e) {
    console.warn('[Cursor] Failed to open database:', (e as Error).message);
    return null;
  }
}

export const cursorAdapter: AIToolAdapter = {
  id: 'cursor',
  name: 'Cursor',
  icon: 'MousePointer2',
  category: 'ide',
  description: 'Cursor AI IDE Composer sessions from local SQLite database',

  async isAvailable(): Promise<boolean> {
    return findDbPath() !== null;
  },

  async discoverSessions(): Promise<AdapterSessionMeta[]> {
    const db = await getDatabase();
    if (!db) return [];

    try {
      // Get all bubble keys and group by session ID
      const stmt = (db as { prepare: (sql: string) => { all: () => { key: string }[] } })
        .prepare("SELECT key FROM cursorDiskKV WHERE key LIKE 'bubbleId:%'");
      const rows = stmt.all();

      // Group by session ID and collect metadata
      const sessionMap = new Map<string, { count: number; bubbleIds: string[] }>();
      for (const row of rows) {
        const parts = row.key.split(':');
        if (parts.length >= 3) {
          const sessionId = parts[1];
          const bubbleId = parts[2];
          const existing = sessionMap.get(sessionId) || { count: 0, bubbleIds: [] };
          existing.count++;
          existing.bubbleIds.push(bubbleId);
          sessionMap.set(sessionId, existing);
        }
      }

      const sessions: AdapterSessionMeta[] = [];

      for (const [sessionId, data] of sessionMap) {
        // Get first bubble to extract metadata
        const firstKey = `bubbleId:${sessionId}:${data.bubbleIds[0]}`;
        const valueStmt = (db as { prepare: (sql: string) => { get: (key: string) => { value: string } | undefined } })
          .prepare("SELECT value FROM cursorDiskKV WHERE key = ?");
        const valueRow = valueStmt.get(firstKey);

        let preview = 'Cursor Composer session';
        let createdAt = new Date().toISOString();
        let updatedAt = createdAt;

        if (valueRow?.value) {
          try {
            const bubble: CursorBubble = JSON.parse(valueRow.value);
            if (bubble.text) {
              preview = bubble.text.slice(0, 150);
            }
            if (bubble.createdAt) {
              createdAt = bubble.createdAt;
            }
          } catch {
            // Ignore parse errors
          }
        }

        // Get last bubble for updatedAt
        const lastKey = `bubbleId:${sessionId}:${data.bubbleIds[data.bubbleIds.length - 1]}`;
        const lastRow = valueStmt.get(lastKey);
        if (lastRow?.value) {
          try {
            const bubble: CursorBubble = JSON.parse(lastRow.value);
            if (bubble.createdAt) {
              updatedAt = bubble.createdAt;
            }
          } catch {
            // Ignore parse errors
          }
        }

        sessions.push({
          sessionId,
          adapterId: 'cursor',
          createdAt,
          updatedAt,
          messageCount: data.count,
          preview,
          riskLevel: 'low',
        });
      }

      // Sort by most recent first
      sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      return sessions;
    } catch (e) {
      console.warn('[Cursor] Error discovering sessions:', (e as Error).message);
      return [];
    }
  },

  async getMessages(sessionId: string): Promise<AdapterMessage[]> {
    const db = await getDatabase();
    if (!db) return [];

    try {
      const stmt = (db as { prepare: (sql: string) => { all: (pattern: string) => { key: string; value: string }[] } })
        .prepare("SELECT key, value FROM cursorDiskKV WHERE key LIKE ? ORDER BY key");
      const rows = stmt.all(`bubbleId:${sessionId}:%`);

      const messages: AdapterMessage[] = [];

      for (const row of rows) {
        try {
          const bubble: CursorBubble = JSON.parse(row.value);
          const parts = row.key.split(':');
          const bubbleId = parts[2] || row.key;

          // type 1 = user, type 2 = assistant
          const role: 'user' | 'assistant' = bubble.type === 1 ? 'user' : 'assistant';
          const content = bubble.text || bubble.richText || '';

          if (content) {
            messages.push({
              role,
              content,
              timestamp: bubble.createdAt,
              uuid: bubbleId,
              metadata: {
                model: bubble.modelInfo?.modelId,
                provider: bubble.modelInfo?.provider,
              },
            });
          }
        } catch {
          // Skip unparseable bubbles
        }
      }

      // Sort by timestamp if available
      messages.sort((a, b) => {
        if (a.timestamp && b.timestamp) {
          return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        }
        return 0;
      });

      return messages;
    } catch (e) {
      console.warn('[Cursor] Error getting messages:', (e as Error).message);
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
