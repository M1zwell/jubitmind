import { existsSync } from 'fs';
import { homedir, platform } from 'os';
import { join } from 'path';
import type { AIToolAdapter, AdapterSessionMeta, AdapterMessage, AdapterStats } from './types.js';

const IS_WINDOWS = platform() === 'win32';
const HOME = homedir();

const DATA_PATHS = IS_WINDOWS
  ? [
      // Windows paths
      join(HOME, 'AppData', 'Roaming', 'antigravity'),
      join(HOME, 'AppData', 'Local', 'antigravity'),
      join(HOME, '.antigravity'),
    ]
  : [
      // macOS/Linux paths
      join(HOME, '.antigravity'),
      join(HOME, '.config', 'antigravity'),
    ];

export const antigravityAdapter: AIToolAdapter = {
  id: 'antigravity',
  name: 'Antigravity',
  icon: 'Rocket',
  category: 'cli',
  description: 'Antigravity AI agent sessions',

  async isAvailable(): Promise<boolean> {
    return DATA_PATHS.some((p) => existsSync(p));
  },

  async discoverSessions(): Promise<AdapterSessionMeta[]> {
    return [];
  },

  async getMessages(): Promise<AdapterMessage[]> {
    return [];
  },

  async getStats(): Promise<AdapterStats> {
    return { totalSessions: 0, totalMessages: 0 };
  },
};
