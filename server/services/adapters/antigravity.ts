import { existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import type { AIToolAdapter, AdapterSessionMeta, AdapterMessage, AdapterStats } from './types.js';

const DATA_PATHS = [
  join(homedir(), '.antigravity'),
  join(homedir(), '.config', 'antigravity'),
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
