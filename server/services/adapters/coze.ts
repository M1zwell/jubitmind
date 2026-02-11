import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { homedir, platform } from 'os';
import { join } from 'path';
import type { AIToolAdapter, AdapterSessionMeta, AdapterMessage, AdapterStats } from './types.js';

const IS_WINDOWS = platform() === 'win32';
const HOME = homedir();

// Coze is ByteDance's AI chatbot platform
// Data locations:
// - Browser: Chrome/Edge IndexedDB or LocalStorage
// - Coze Desktop App (if installed): AppData on Windows
// - Exported conversations: Downloads folder
const COZE_PATHS = IS_WINDOWS
  ? [
      // Coze desktop app locations (Windows)
      join(HOME, 'AppData', 'Local', 'Coze'),
      join(HOME, 'AppData', 'Roaming', 'Coze'),
      join(HOME, 'AppData', 'Local', 'coze-desktop'),
      join(HOME, 'AppData', 'Local', 'Programs', 'coze'),
      // Browser data (Chrome)
      join(HOME, 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default', 'IndexedDB'),
      // Browser data (Edge)
      join(HOME, 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data', 'Default', 'IndexedDB'),
    ]
  : [
      // macOS/Linux
      join(HOME, '.coze'),
      join(HOME, 'Library', 'Application Support', 'Coze'),
      join(HOME, '.config', 'coze'),
      // Chrome on macOS
      join(HOME, 'Library', 'Application Support', 'Google', 'Chrome', 'Default', 'IndexedDB'),
    ];

// Common export locations
const EXPORT_PATHS = [
  join(HOME, 'Downloads'),
  join(HOME, 'Documents'),
  join(HOME, 'Desktop'),
];

interface CozeExportedChat {
  id?: string;
  title?: string;
  messages?: Array<{
    role: string;
    content: string;
    timestamp?: string;
  }>;
  created_at?: string;
  updated_at?: string;
}

function findCozeInstallation(): string | null {
  for (const p of COZE_PATHS) {
    if (existsSync(p)) {
      // Check for Coze-specific files/directories
      if (p.includes('Coze') || p.includes('coze')) {
        return p;
      }
      // Check for IndexedDB with coze domain
      if (p.includes('IndexedDB')) {
        try {
          const dirs = readdirSync(p);
          const cozeDb = dirs.find(d =>
            d.toLowerCase().includes('coze') ||
            d.includes('www.coze.com') ||
            d.includes('coze.cn')
          );
          if (cozeDb) {
            return join(p, cozeDb);
          }
        } catch {
          // Continue checking other paths
        }
      }
    }
  }
  return null;
}

function findCozeExports(): string[] {
  const exports: string[] = [];

  for (const dir of EXPORT_PATHS) {
    if (existsSync(dir)) {
      try {
        const files = readdirSync(dir);
        const cozeFiles = files.filter(f =>
          (f.toLowerCase().includes('coze') && f.endsWith('.json')) ||
          (f.toLowerCase().includes('coze') && f.endsWith('.txt')) ||
          f.match(/^chat[-_]export[-_].*\.(json|txt)$/i)
        );
        for (const file of cozeFiles) {
          exports.push(join(dir, file));
        }
      } catch {
        // Skip unreadable directories
      }
    }
  }

  return exports;
}

let cachedCozePath: string | null | undefined = undefined;

function getCozePath(): string | null {
  if (cachedCozePath === undefined) {
    cachedCozePath = findCozeInstallation();
  }
  return cachedCozePath;
}

export const cozeAdapter: AIToolAdapter = {
  id: 'coze',
  name: 'Coze',
  icon: 'Bot',
  category: 'api-router',
  description: 'ByteDance Coze AI chatbot conversations',

  async isAvailable(): Promise<boolean> {
    const cozePath = getCozePath();
    const exports = findCozeExports();
    return cozePath !== null || exports.length > 0;
  },

  async discoverSessions(): Promise<AdapterSessionMeta[]> {
    const sessions: AdapterSessionMeta[] = [];
    const cozePath = getCozePath();

    // Check for Coze desktop app data
    if (cozePath) {
      // Look for conversation data in various formats
      const dataFiles = [
        join(cozePath, 'conversations.json'),
        join(cozePath, 'chats.json'),
        join(cozePath, 'Local Storage', 'leveldb'),
        join(cozePath, 'data', 'conversations'),
      ];

      for (const dataFile of dataFiles) {
        if (existsSync(dataFile)) {
          try {
            const stat = statSync(dataFile);

            if (stat.isFile() && dataFile.endsWith('.json')) {
              const content = readFileSync(dataFile, 'utf8');
              const data = JSON.parse(content);

              if (Array.isArray(data)) {
                for (const chat of data as CozeExportedChat[]) {
                  sessions.push({
                    sessionId: chat.id || `coze-${Date.now()}`,
                    adapterId: 'coze',
                    createdAt: chat.created_at || stat.birthtime.toISOString(),
                    updatedAt: chat.updated_at || stat.mtime.toISOString(),
                    messageCount: chat.messages?.length || 0,
                    preview: chat.title || 'Coze conversation',
                    riskLevel: 'low',
                  });
                }
              }
            } else if (stat.isDirectory()) {
              sessions.push({
                sessionId: 'coze-local-storage',
                adapterId: 'coze',
                createdAt: stat.birthtime.toISOString(),
                updatedAt: stat.mtime.toISOString(),
                messageCount: 0,
                preview: `Coze data found at ${dataFile}`,
                riskLevel: 'unknown',
              });
            }
          } catch {
            // Skip unreadable files
          }
        }
      }
    }

    // Check for exported conversations
    const exports = findCozeExports();
    for (const exportPath of exports) {
      try {
        const stat = statSync(exportPath);
        const filename = exportPath.split(/[/\\]/).pop() || 'export';

        // Try to parse JSON exports
        if (exportPath.endsWith('.json')) {
          try {
            const content = readFileSync(exportPath, 'utf8');
            const data = JSON.parse(content) as CozeExportedChat;

            sessions.push({
              sessionId: `export-${filename}`,
              adapterId: 'coze',
              createdAt: data.created_at || stat.birthtime.toISOString(),
              updatedAt: data.updated_at || stat.mtime.toISOString(),
              messageCount: data.messages?.length || 0,
              preview: data.title || `Coze export: ${filename}`,
              sizeBytes: stat.size,
              riskLevel: 'low',
            });
          } catch {
            sessions.push({
              sessionId: `export-${filename}`,
              adapterId: 'coze',
              createdAt: stat.birthtime.toISOString(),
              updatedAt: stat.mtime.toISOString(),
              messageCount: 0,
              preview: `Coze export: ${filename}`,
              sizeBytes: stat.size,
              riskLevel: 'low',
            });
          }
        } else {
          sessions.push({
            sessionId: `export-${filename}`,
            adapterId: 'coze',
            createdAt: stat.birthtime.toISOString(),
            updatedAt: stat.mtime.toISOString(),
            messageCount: 0,
            preview: `Coze export: ${filename}`,
            sizeBytes: stat.size,
            riskLevel: 'low',
          });
        }
      } catch {
        // Skip unreadable exports
      }
    }

    // Add info session if we found installation but no conversations
    if (sessions.length === 0 && cozePath) {
      sessions.push({
        sessionId: 'coze-installation',
        adapterId: 'coze',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messageCount: 0,
        preview: `Coze data found at ${cozePath} (browser-based - export conversations to access)`,
        riskLevel: 'unknown',
      });
    }

    return sessions;
  },

  async getMessages(sessionId: string): Promise<AdapterMessage[]> {
    const messages: AdapterMessage[] = [];

    if (sessionId === 'coze-installation' || sessionId === 'coze-local-storage') {
      return [{
        id: 'info',
        role: 'system',
        content: `Coze is primarily a browser-based service. To access your conversation history:

1. **Export from Coze**: Go to coze.com, open a conversation, and export it as JSON
2. **Save to Downloads**: Place exported files in your Downloads folder
3. **Re-scan**: JubitMind will detect exported conversations

Note: Coze doesn't store conversations locally like desktop apps. Browser data is encrypted and not directly accessible.`,
        timestamp: new Date().toISOString(),
      }];
    }

    // Try to read exported conversation
    const exports = findCozeExports();
    const exportFile = exports.find(e => e.includes(sessionId.replace('export-', '')));

    if (exportFile && existsSync(exportFile)) {
      try {
        if (exportFile.endsWith('.json')) {
          const content = readFileSync(exportFile, 'utf8');
          const data = JSON.parse(content) as CozeExportedChat;

          if (data.messages) {
            for (const msg of data.messages) {
              messages.push({
                id: `${sessionId}-${messages.length}`,
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.content,
                timestamp: msg.timestamp,
              });
            }
          }
        } else {
          // Plain text export
          const content = readFileSync(exportFile, 'utf8');
          messages.push({
            id: `${sessionId}-content`,
            role: 'system',
            content: content,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        messages.push({
          id: 'error',
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
