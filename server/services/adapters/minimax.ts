import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { homedir, platform } from 'os';
import { join } from 'path';
import type { AIToolAdapter, AdapterSessionMeta, AdapterMessage, AdapterStats } from './types.js';

const IS_WINDOWS = platform() === 'win32';
const HOME = homedir();

// MiniMax is a Chinese AI company with Hailuo AI assistant
// Data locations:
// - Browser: Chrome/Edge with hailuoai.com or minimaxi.com
// - Desktop App: May have Electron-based app
// - API exports: User-exported conversation files
const MINIMAX_PATHS = IS_WINDOWS
  ? [
      // MiniMax/Hailuo desktop app locations (Windows)
      join(HOME, 'AppData', 'Local', 'MiniMax'),
      join(HOME, 'AppData', 'Local', 'Hailuo'),
      join(HOME, 'AppData', 'Local', 'hailuo-ai'),
      join(HOME, 'AppData', 'Roaming', 'MiniMax'),
      join(HOME, 'AppData', 'Roaming', 'Hailuo'),
      // Browser IndexedDB
      join(HOME, 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default', 'IndexedDB'),
      join(HOME, 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data', 'Default', 'IndexedDB'),
    ]
  : [
      // macOS/Linux
      join(HOME, '.minimax'),
      join(HOME, '.hailuo'),
      join(HOME, 'Library', 'Application Support', 'MiniMax'),
      join(HOME, 'Library', 'Application Support', 'Hailuo'),
      join(HOME, '.config', 'minimax'),
      join(HOME, '.config', 'hailuo'),
    ];

// Common export locations
const EXPORT_PATHS = [
  join(HOME, 'Downloads'),
  join(HOME, 'Documents'),
  join(HOME, 'Desktop'),
];

interface MiniMaxExportedChat {
  id?: string;
  title?: string;
  bot_name?: string;
  messages?: Array<{
    sender_type: string;
    text: string;
    created_at?: string;
  }>;
  created_at?: string;
  updated_at?: string;
}

function findMiniMaxInstallation(): string | null {
  for (const p of MINIMAX_PATHS) {
    if (existsSync(p)) {
      // Check for MiniMax/Hailuo specific files/directories
      const name = p.toLowerCase();
      if (name.includes('minimax') || name.includes('hailuo')) {
        return p;
      }
      // Check for IndexedDB with minimax/hailuo domain
      if (p.includes('IndexedDB')) {
        try {
          const dirs = readdirSync(p);
          const minimaxDb = dirs.find(d =>
            d.toLowerCase().includes('minimax') ||
            d.toLowerCase().includes('hailuo') ||
            d.includes('hailuoai.com') ||
            d.includes('minimaxi.com')
          );
          if (minimaxDb) {
            return join(p, minimaxDb);
          }
        } catch {
          // Continue checking other paths
        }
      }
    }
  }
  return null;
}

function findMiniMaxExports(): string[] {
  const exports: string[] = [];

  for (const dir of EXPORT_PATHS) {
    if (existsSync(dir)) {
      try {
        const files = readdirSync(dir);
        const minimaxFiles = files.filter(f =>
          (f.toLowerCase().includes('minimax') && (f.endsWith('.json') || f.endsWith('.txt'))) ||
          (f.toLowerCase().includes('hailuo') && (f.endsWith('.json') || f.endsWith('.txt'))) ||
          f.match(/^(minimax|hailuo)[-_].*\.(json|txt)$/i)
        );
        for (const file of minimaxFiles) {
          exports.push(join(dir, file));
        }
      } catch {
        // Skip unreadable directories
      }
    }
  }

  return exports;
}

let cachedMiniMaxPath: string | null | undefined = undefined;

function getMiniMaxPath(): string | null {
  if (cachedMiniMaxPath === undefined) {
    cachedMiniMaxPath = findMiniMaxInstallation();
  }
  return cachedMiniMaxPath;
}

export const minimaxAdapter: AIToolAdapter = {
  id: 'minimax',
  name: 'MiniMax / Hailuo',
  icon: 'Sparkles',
  category: 'api-router',
  description: 'MiniMax Hailuo AI assistant conversations',

  async isAvailable(): Promise<boolean> {
    const minimaxPath = getMiniMaxPath();
    const exports = findMiniMaxExports();
    return minimaxPath !== null || exports.length > 0;
  },

  async discoverSessions(): Promise<AdapterSessionMeta[]> {
    const sessions: AdapterSessionMeta[] = [];
    const minimaxPath = getMiniMaxPath();

    // Check for MiniMax/Hailuo app data
    if (minimaxPath) {
      const dataFiles = [
        join(minimaxPath, 'conversations.json'),
        join(minimaxPath, 'chats.json'),
        join(minimaxPath, 'history.json'),
        join(minimaxPath, 'Local Storage', 'leveldb'),
      ];

      for (const dataFile of dataFiles) {
        if (existsSync(dataFile)) {
          try {
            const stat = statSync(dataFile);

            if (stat.isFile() && dataFile.endsWith('.json')) {
              const content = readFileSync(dataFile, 'utf8');
              const data = JSON.parse(content);

              if (Array.isArray(data)) {
                for (const chat of data as MiniMaxExportedChat[]) {
                  sessions.push({
                    sessionId: chat.id || `minimax-${Date.now()}`,
                    adapterId: 'minimax',
                    createdAt: chat.created_at || stat.birthtime.toISOString(),
                    updatedAt: chat.updated_at || stat.mtime.toISOString(),
                    messageCount: chat.messages?.length || 0,
                    preview: chat.title || chat.bot_name || 'Hailuo conversation',
                    riskLevel: 'low',
                  });
                }
              }
            } else if (stat.isDirectory()) {
              sessions.push({
                sessionId: 'minimax-local-storage',
                adapterId: 'minimax',
                createdAt: stat.birthtime.toISOString(),
                updatedAt: stat.mtime.toISOString(),
                messageCount: 0,
                preview: `MiniMax data found at ${dataFile}`,
                riskLevel: undefined,
              });
            }
          } catch {
            // Skip unreadable files
          }
        }
      }
    }

    // Check for exported conversations
    const exports = findMiniMaxExports();
    for (const exportPath of exports) {
      try {
        const stat = statSync(exportPath);
        const filename = exportPath.split(/[/\\]/).pop() || 'export';

        if (exportPath.endsWith('.json')) {
          try {
            const content = readFileSync(exportPath, 'utf8');
            const data = JSON.parse(content) as MiniMaxExportedChat;

            sessions.push({
              sessionId: `export-${filename}`,
              adapterId: 'minimax',
              createdAt: data.created_at || stat.birthtime.toISOString(),
              updatedAt: data.updated_at || stat.mtime.toISOString(),
              messageCount: data.messages?.length || 0,
              preview: data.title || data.bot_name || `MiniMax export: ${filename}`,
              sizeBytes: stat.size,
              riskLevel: 'low',
            });
          } catch {
            sessions.push({
              sessionId: `export-${filename}`,
              adapterId: 'minimax',
              createdAt: stat.birthtime.toISOString(),
              updatedAt: stat.mtime.toISOString(),
              messageCount: 0,
              preview: `MiniMax export: ${filename}`,
              sizeBytes: stat.size,
              riskLevel: 'low',
            });
          }
        } else {
          sessions.push({
            sessionId: `export-${filename}`,
            adapterId: 'minimax',
            createdAt: stat.birthtime.toISOString(),
            updatedAt: stat.mtime.toISOString(),
            messageCount: 0,
            preview: `MiniMax export: ${filename}`,
            sizeBytes: stat.size,
            riskLevel: 'low',
          });
        }
      } catch {
        // Skip unreadable exports
      }
    }

    // Add info session if we found installation but no conversations
    if (sessions.length === 0 && minimaxPath) {
      sessions.push({
        sessionId: 'minimax-installation',
        adapterId: 'minimax',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messageCount: 0,
        preview: `MiniMax/Hailuo data found at ${minimaxPath} (export conversations to access)`,
        riskLevel: undefined,
      });
    }

    return sessions;
  },

  async getMessages(sessionId: string): Promise<AdapterMessage[]> {
    const messages: AdapterMessage[] = [];

    if (sessionId === 'minimax-installation' || sessionId === 'minimax-local-storage') {
      return [{
        uuid: 'info',
        role: 'system',
        content: `MiniMax/Hailuo is primarily a web/app-based service. To access your conversation history:

1. **Export from Hailuo**: Go to hailuoai.com, open a conversation, and look for export options
2. **Save to Downloads**: Place exported files (JSON or TXT) in your Downloads folder
3. **Re-scan**: JubitMind will detect exported conversations

Note: Browser-based conversation data is encrypted and not directly accessible. Use the official export feature.`,
        timestamp: new Date().toISOString(),
      }];
    }

    // Try to read exported conversation
    const exports = findMiniMaxExports();
    const exportFile = exports.find(e => e.includes(sessionId.replace('export-', '')));

    if (exportFile && existsSync(exportFile)) {
      try {
        if (exportFile.endsWith('.json')) {
          const content = readFileSync(exportFile, 'utf8');
          const data = JSON.parse(content) as MiniMaxExportedChat;

          if (data.messages) {
            for (const msg of data.messages) {
              messages.push({
                uuid: `${sessionId}-${messages.length}`,
                role: msg.sender_type === 'USER' || msg.sender_type === 'user' ? 'user' : 'assistant',
                content: msg.text,
                timestamp: msg.created_at,
              });
            }
          }
        } else {
          // Plain text export
          const content = readFileSync(exportFile, 'utf8');
          messages.push({
            uuid: `${sessionId}-content`,
            role: 'system',
            content: content,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        messages.push({
          uuid: 'error',
          role: 'system',
          content: `Failed to read export: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date().toISOString(),
        });
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
