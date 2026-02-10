import { existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import type { AIToolAdapter, AdapterSessionMeta, AdapterMessage, AdapterStats } from './types.js';

const DATA_DIR = join(homedir(), '.codex');

export const codexAdapter: AIToolAdapter = {
  id: 'codex',
  name: 'OpenAI Codex CLI',
  icon: 'Code2',
  category: 'cli',
  description: 'OpenAI Codex CLI sessions from ~/.codex/',

  async isAvailable(): Promise<boolean> {
    return existsSync(DATA_DIR);
  },

  async discoverSessions(): Promise<AdapterSessionMeta[]> {
    // TODO: Parse Codex CLI session data when installed
    return [];
  },

  async getMessages(): Promise<AdapterMessage[]> {
    return [];
  },

  async getStats(): Promise<AdapterStats> {
    return { totalSessions: 0, totalMessages: 0 };
  },
};
