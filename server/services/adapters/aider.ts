import { existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import type { AIToolAdapter, AdapterSessionMeta, AdapterMessage, AdapterStats } from './types.js';

const HISTORY_PATH = join(homedir(), '.aider.chat.history.md');
const TAGS_DIR = join(homedir(), '.aider.tags.cache.v3');

export const aiderAdapter: AIToolAdapter = {
  id: 'aider',
  name: 'Aider',
  icon: 'GitBranch',
  category: 'cli',
  description: 'Aider AI pair programming sessions from ~/.aider.chat.history.md',

  async isAvailable(): Promise<boolean> {
    return existsSync(HISTORY_PATH) || existsSync(TAGS_DIR);
  },

  async discoverSessions(): Promise<AdapterSessionMeta[]> {
    // TODO: Parse markdown chat history into sessions (split by "# aider chat" headers)
    return [];
  },

  async getMessages(): Promise<AdapterMessage[]> {
    return [];
  },

  async getStats(): Promise<AdapterStats> {
    return { totalSessions: 0, totalMessages: 0 };
  },
};
