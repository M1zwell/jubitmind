import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { homedir, platform } from 'os';
import { join } from 'path';
import type { AIToolAdapter, AdapterSessionMeta, AdapterMessage, AdapterStats } from './types.js';

const IS_WINDOWS = platform() === 'win32';
const HOME = homedir();

// Dify is a self-hosted LLM app platform
// Data locations:
// - Docker default: ~/.dify/ or docker volumes
// - Local dev: ./api/storage/ in dify directory
// - SQLite DB: storage/storage.db (contains conversations)
const DIFY_PATHS = [
  join(HOME, '.dify'),
  join(HOME, 'dify'),
  join(HOME, 'Documents', 'dify'),
  ...(IS_WINDOWS
    ? [
        join(HOME, 'AppData', 'Local', 'dify'),
        join(HOME, 'AppData', 'Roaming', 'dify'),
        'C:\\dify',
      ]
    : [
        '/opt/dify',
        '/var/lib/dify',
        join(HOME, '.local', 'share', 'dify'),
      ]),
];

// Dify stores conversations in SQLite or PostgreSQL
// SQLite path: storage/storage.db
// Table: conversations, messages

interface DifyConversation {
  id: string;
  name: string;
  app_id: string;
  created_at: string;
  updated_at: string;
}

interface DifyMessage {
  id: string;
  conversation_id: string;
  query: string;
  answer: string;
  created_at: string;
}

function findDifyInstallation(): string | null {
  for (const p of DIFY_PATHS) {
    if (existsSync(p)) {
      // Check for storage directory or docker-compose.yml
      const storageDir = join(p, 'storage');
      const dockerCompose = join(p, 'docker-compose.yml');
      const apiDir = join(p, 'api');

      if (existsSync(storageDir) || existsSync(dockerCompose) || existsSync(apiDir)) {
        return p;
      }
    }
  }
  return null;
}

function findDifyDatabase(difyPath: string): string | null {
  const possiblePaths = [
    join(difyPath, 'storage', 'storage.db'),
    join(difyPath, 'api', 'storage', 'storage.db'),
    join(difyPath, 'volumes', 'db', 'storage.db'),
    join(difyPath, 'data', 'storage.db'),
  ];

  for (const dbPath of possiblePaths) {
    if (existsSync(dbPath)) {
      return dbPath;
    }
  }
  return null;
}

let cachedDifyPath: string | null | undefined = undefined;
let cachedDbPath: string | null | undefined = undefined;

function getDifyPaths(): { difyPath: string | null; dbPath: string | null } {
  if (cachedDifyPath === undefined) {
    cachedDifyPath = findDifyInstallation();
    if (cachedDifyPath) {
      cachedDbPath = findDifyDatabase(cachedDifyPath);
    } else {
      cachedDbPath = null;
    }
  }
  return { difyPath: cachedDifyPath ?? null, dbPath: cachedDbPath ?? null };
}

export const difyAdapter: AIToolAdapter = {
  id: 'dify',
  name: 'Dify',
  icon: 'Boxes',
  category: 'api-router',
  description: 'Dify LLM application platform conversations',

  async isAvailable(): Promise<boolean> {
    const { difyPath } = getDifyPaths();
    return difyPath !== null;
  },

  async discoverSessions(): Promise<AdapterSessionMeta[]> {
    const { difyPath, dbPath } = getDifyPaths();

    if (!difyPath) {
      return [];
    }

    const sessions: AdapterSessionMeta[] = [];

    // If we have SQLite database access
    if (dbPath && existsSync(dbPath)) {
      try {
        // Dynamic import of better-sqlite3
        const Database = (await import('better-sqlite3')).default;
        const db = new Database(dbPath, { readonly: true });

        try {
          const conversations = db.prepare(`
            SELECT id, name, app_id, created_at, updated_at
            FROM conversations
            ORDER BY updated_at DESC
            LIMIT 100
          `).all() as DifyConversation[];

          for (const conv of conversations) {
            const messageCount = db.prepare(`
              SELECT COUNT(*) as count FROM messages WHERE conversation_id = ?
            `).get(conv.id) as { count: number };

            sessions.push({
              sessionId: conv.id,
              adapterId: 'dify',
              createdAt: conv.created_at,
              updatedAt: conv.updated_at,
              messageCount: messageCount?.count || 0,
              preview: conv.name || `Dify conversation (${conv.app_id})`,
              riskLevel: 'low',
            });
          }
        } finally {
          db.close();
        }
      } catch (error) {
        console.error('[Dify] Failed to read database:', error);
      }
    }

    // Fallback: scan for any exported conversation files
    if (sessions.length === 0) {
      const exportDirs = [
        join(difyPath, 'exports'),
        join(difyPath, 'storage', 'exports'),
        join(difyPath, 'conversations'),
      ];

      for (const exportDir of exportDirs) {
        if (existsSync(exportDir)) {
          try {
            const files = readdirSync(exportDir).filter(f =>
              f.endsWith('.json') || f.endsWith('.jsonl')
            );

            for (const file of files) {
              const filePath = join(exportDir, file);
              const stat = statSync(filePath);

              sessions.push({
                sessionId: file.replace(/\.(json|jsonl)$/, ''),
                adapterId: 'dify',
                createdAt: stat.birthtime.toISOString(),
                updatedAt: stat.mtime.toISOString(),
                messageCount: 0,
                preview: `Dify export: ${file}`,
                sizeBytes: stat.size,
                riskLevel: 'low',
              });
            }
          } catch {
            // Skip unreadable directories
          }
        }
      }
    }

    // Add installation info if no sessions found
    if (sessions.length === 0 && difyPath) {
      sessions.push({
        sessionId: 'dify-installation',
        adapterId: 'dify',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messageCount: 0,
        preview: `Dify installation found at ${difyPath} (no conversations accessible)`,
        riskLevel: 'low',
      });
    }

    return sessions;
  },

  async getMessages(sessionId: string): Promise<AdapterMessage[]> {
    const { dbPath } = getDifyPaths();
    const messages: AdapterMessage[] = [];

    if (sessionId === 'dify-installation') {
      return [{
        uuid: 'info',
        role: 'system',
        content: 'Dify installation detected but database is not accessible. This may be because Dify is running in Docker with internal volumes.',
        timestamp: new Date().toISOString(),
      }];
    }

    if (dbPath && existsSync(dbPath)) {
      try {
        const Database = (await import('better-sqlite3')).default;
        const db = new Database(dbPath, { readonly: true });

        try {
          const dbMessages = db.prepare(`
            SELECT id, query, answer, created_at
            FROM messages
            WHERE conversation_id = ?
            ORDER BY created_at ASC
          `).all(sessionId) as DifyMessage[];

          for (const msg of dbMessages) {
            // User query
            if (msg.query) {
              messages.push({
                uuid: `${msg.id}-user`,
                role: 'user',
                content: msg.query,
                timestamp: msg.created_at,
              });
            }
            // Assistant answer
            if (msg.answer) {
              messages.push({
                uuid: `${msg.id}-assistant`,
                role: 'assistant',
                content: msg.answer,
                timestamp: msg.created_at,
              });
            }
          }
        } finally {
          db.close();
        }
      } catch (error) {
        console.error('[Dify] Failed to read messages:', error);
      }
    }

    return messages;
  },

  async getStats(): Promise<AdapterStats> {
    const sessions = await this.discoverSessions();
    let totalMessages = 0;
    let oldest: string | undefined;
    let newest: string | undefined;

    for (const s of sessions) {
      totalMessages += s.messageCount || 0;
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
