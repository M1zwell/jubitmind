import { existsSync, readdirSync, statSync } from 'fs';
import { homedir, platform } from 'os';
import { join } from 'path';
import type { AIToolAdapter, AdapterSessionMeta, AdapterMessage, AdapterStats } from './types.js';

const IS_WINDOWS = platform() === 'win32';
const HOME = homedir();

// Antigravity stores conversation data in .gemini/antigravity/conversations/
// Files are .pb (Protocol Buffer) but are ENCRYPTED with per-file keys
// Analysis shows: max entropy (8.0), no compression headers, unique magic bytes per file
// Message content cannot be read without Google account decryption keys
const CONVERSATIONS_PATH = join(HOME, '.gemini', 'antigravity', 'conversations');

const DATA_PATHS = [
  CONVERSATIONS_PATH,
  join(HOME, '.antigravity'),
  ...(IS_WINDOWS
    ? [
        join(HOME, 'AppData', 'Roaming', 'antigravity'),
        join(HOME, 'AppData', 'Local', 'antigravity'),
      ]
    : [join(HOME, '.config', 'antigravity')]),
];

export const antigravityAdapter: AIToolAdapter = {
  id: 'antigravity',
  name: 'Antigravity',
  icon: 'Rocket',
  category: 'cli',
  description: 'Antigravity AI agent sessions (Gemini-powered) - metadata only, content encrypted',

  async isAvailable(): Promise<boolean> {
    return DATA_PATHS.some((p) => existsSync(p));
  },

  async discoverSessions(): Promise<AdapterSessionMeta[]> {
    // Check if conversations directory exists
    if (!existsSync(CONVERSATIONS_PATH)) {
      return [];
    }

    try {
      const files = readdirSync(CONVERSATIONS_PATH).filter((f) => f.endsWith('.pb'));
      const sessions: AdapterSessionMeta[] = [];

      for (const file of files) {
        const filePath = join(CONVERSATIONS_PATH, file);
        try {
          const stat = statSync(filePath);
          const sessionId = file.replace('.pb', '');

          // Format file size for display
          const sizeKB = Math.round(stat.size / 1024);
          const sizeDisplay = sizeKB >= 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;

          sessions.push({
            sessionId,
            adapterId: 'antigravity',
            createdAt: stat.birthtime.toISOString(),
            updatedAt: stat.mtime.toISOString(),
            messageCount: 0, // Encrypted - cannot determine
            preview: `Gemini conversation (${sizeDisplay}, encrypted)`,
            sizeBytes: stat.size,
            riskLevel: 'unknown', // Cannot assess without content
          });
        } catch {
          // Skip files we can't stat
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
    // Antigravity .pb files are ENCRYPTED - cannot read message content
    // Analysis confirmed: entropy = 8.0/8.0, unique magic bytes per file
    // Decryption requires Google account credentials which we don't have access to
    //
    // We can only provide metadata (file size, timestamps) not content
    const filePath = join(CONVERSATIONS_PATH, `${sessionId}.pb`);

    if (!existsSync(filePath)) {
      return [];
    }

    // Return a placeholder message explaining the encryption
    const stat = statSync(filePath);
    return [{
      id: `${sessionId}-encrypted`,
      role: 'system',
      content: `[Encrypted Gemini conversation - ${Math.round(stat.size / 1024)} KB]\n\nAntigravity encrypts conversation files with per-session keys tied to your Google account. Content cannot be read without Google's decryption infrastructure.`,
      timestamp: stat.mtime.toISOString(),
    }];
  },

  async getStats(): Promise<AdapterStats> {
    const sessions = await this.discoverSessions();
    let totalSize = 0;
    let oldest: string | undefined;
    let newest: string | undefined;

    for (const s of sessions) {
      totalSize += s.sizeBytes || 0;
      if (!oldest || s.createdAt < oldest) oldest = s.createdAt;
      if (!newest || s.updatedAt > newest) newest = s.updatedAt;
    }

    return {
      totalSessions: sessions.length,
      totalMessages: 0, // Can't determine without decoding
      oldestSession: oldest,
      newestSession: newest,
    };
  },
};
