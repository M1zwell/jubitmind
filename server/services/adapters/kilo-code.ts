import { existsSync, readdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import type { AIToolAdapter, AdapterSessionMeta, AdapterMessage, AdapterStats } from './types.js';

const EXTENSIONS_DIR = join(homedir(), '.vscode', 'extensions');

function findKiloCode(): boolean {
  try {
    const entries = readdirSync(EXTENSIONS_DIR);
    return entries.some((e) => e.includes('kilo-code') || e.includes('kilocode'));
  } catch {
    return false;
  }
}

export const kiloCodeAdapter: AIToolAdapter = {
  id: 'kilo-code',
  name: 'Kilo Code',
  icon: 'Gauge',
  category: 'extension',
  description: 'Kilo Code VS Code extension sessions',

  async isAvailable(): Promise<boolean> {
    return findKiloCode();
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
