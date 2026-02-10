import { existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import type { AIToolAdapter, AdapterSessionMeta, AdapterMessage, AdapterStats } from './types.js';

const DATA_PATHS = [
  join(homedir(), 'Library', 'Application Support', 'Cursor', 'User', 'globalStorage', 'state.vscdb'),
  join(homedir(), '.cursor', 'ai-tracking', 'ai-code-tracking.db'),
];

export const cursorAdapter: AIToolAdapter = {
  id: 'cursor',
  name: 'Cursor',
  icon: 'MousePointer2',
  category: 'ide',
  description: 'Cursor AI IDE sessions from local SQLite database',

  async isAvailable(): Promise<boolean> {
    return DATA_PATHS.some((p) => existsSync(p));
  },

  async discoverSessions(): Promise<AdapterSessionMeta[]> {
    // TODO: Implement SQLite reading with better-sqlite3 when Cursor is installed
    return [];
  },

  async getMessages(): Promise<AdapterMessage[]> {
    return [];
  },

  async getStats(): Promise<AdapterStats> {
    return { totalSessions: 0, totalMessages: 0 };
  },
};
