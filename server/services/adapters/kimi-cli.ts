import { existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import type { AIToolAdapter, AdapterSessionMeta, AdapterMessage, AdapterStats } from './types.js';

const DATA_PATHS = [
  join(homedir(), '.kimi'),
  join(homedir(), '.config', 'kimi'),
];

export const kimiCliAdapter: AIToolAdapter = {
  id: 'kimi-cli',
  name: 'Kimi CLI',
  icon: 'Wand2',
  category: 'cli',
  description: 'Moonshot Kimi CLI sessions from ~/.kimi/',

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
