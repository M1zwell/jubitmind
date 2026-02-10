import { existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import type { AIToolAdapter, AdapterSessionMeta, AdapterMessage, AdapterStats } from './types.js';

const DATA_DIR = join(homedir(), 'Library', 'Application Support', 'Windsurf');

export const windsurfAdapter: AIToolAdapter = {
  id: 'windsurf',
  name: 'Windsurf',
  icon: 'Wind',
  category: 'ide',
  description: 'Windsurf AI IDE sessions from local storage',

  async isAvailable(): Promise<boolean> {
    return existsSync(DATA_DIR);
  },

  async discoverSessions(): Promise<AdapterSessionMeta[]> {
    // TODO: Read Windsurf session storage when installed
    return [];
  },

  async getMessages(): Promise<AdapterMessage[]> {
    return [];
  },

  async getStats(): Promise<AdapterStats> {
    return { totalSessions: 0, totalMessages: 0 };
  },
};
