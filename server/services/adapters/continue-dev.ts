import { existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import type { AIToolAdapter, AdapterSessionMeta, AdapterMessage, AdapterStats } from './types.js';

const SESSIONS_DIR = join(homedir(), '.continue', 'sessions');
const CONFIG_PATH = join(homedir(), '.continue', 'config.json');

export const continueDevAdapter: AIToolAdapter = {
  id: 'continue-dev',
  name: 'Continue.dev',
  icon: 'ArrowRight',
  category: 'extension',
  description: 'Continue.dev VS Code extension sessions from ~/.continue/',

  async isAvailable(): Promise<boolean> {
    return existsSync(SESSIONS_DIR) || existsSync(CONFIG_PATH);
  },

  async discoverSessions(): Promise<AdapterSessionMeta[]> {
    // TODO: Read JSON session files from ~/.continue/sessions/
    return [];
  },

  async getMessages(): Promise<AdapterMessage[]> {
    return [];
  },

  async getStats(): Promise<AdapterStats> {
    return { totalSessions: 0, totalMessages: 0 };
  },
};
