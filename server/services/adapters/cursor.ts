import { existsSync } from 'fs';
import { homedir, platform } from 'os';
import { join } from 'path';
import type { AIToolAdapter, AdapterSessionMeta, AdapterMessage, AdapterStats } from './types.js';

const IS_WINDOWS = platform() === 'win32';
const HOME = homedir();

const DATA_PATHS = IS_WINDOWS
  ? [
      // Windows paths
      join(HOME, 'AppData', 'Roaming', 'Cursor', 'User', 'globalStorage', 'state.vscdb'),
      join(HOME, 'AppData', 'Local', 'Cursor', 'User', 'globalStorage', 'state.vscdb'),
      join(HOME, '.cursor', 'ai-tracking', 'ai-code-tracking.db'),
    ]
  : [
      // macOS/Linux paths
      join(HOME, 'Library', 'Application Support', 'Cursor', 'User', 'globalStorage', 'state.vscdb'),
      join(HOME, '.config', 'Cursor', 'User', 'globalStorage', 'state.vscdb'),
      join(HOME, '.cursor', 'ai-tracking', 'ai-code-tracking.db'),
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
