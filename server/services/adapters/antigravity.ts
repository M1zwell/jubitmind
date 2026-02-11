import { existsSync, readdirSync, statSync } from 'fs';
import { homedir, platform } from 'os';
import { join } from 'path';
import type { AIToolAdapter, AdapterSessionMeta, AdapterMessage, AdapterStats } from './types.js';

const IS_WINDOWS = platform() === 'win32';
const HOME = homedir();

// Antigravity stores conversation data in .gemini/antigravity/conversations/
// Conversations are stored as Protocol Buffer (.pb) files
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
  description: 'Antigravity AI agent sessions (Gemini-powered)',

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

          sessions.push({
            sessionId,
            adapterId: 'antigravity',
            createdAt: stat.birthtime.toISOString(),
            updatedAt: stat.mtime.toISOString(),
            messageCount: 0, // Can't determine without decoding protobuf
            preview: 'Antigravity conversation (Gemini)',
            sizeBytes: stat.size,
            riskLevel: 'low',
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

  async getMessages(): Promise<AdapterMessage[]> {
    // TODO: Implement Protocol Buffer decoding to read actual messages
    // Antigravity uses .pb (protobuf) format which requires a decoder
    return [];
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
