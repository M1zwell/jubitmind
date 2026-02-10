import { existsSync, readdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import type { AIToolAdapter, AdapterSessionMeta, AdapterMessage, AdapterStats } from './types.js';

const EXTENSIONS_DIR = join(homedir(), '.vscode', 'extensions');

function findCopilotExtension(): boolean {
  try {
    const entries = readdirSync(EXTENSIONS_DIR);
    return entries.some((e) => e.startsWith('github.copilot-'));
  } catch {
    return false;
  }
}

export const copilotAdapter: AIToolAdapter = {
  id: 'copilot',
  name: 'GitHub Copilot',
  icon: 'Sparkles',
  category: 'extension',
  description: 'GitHub Copilot VS Code extension telemetry',

  async isAvailable(): Promise<boolean> {
    return existsSync(EXTENSIONS_DIR) && findCopilotExtension();
  },

  async discoverSessions(): Promise<AdapterSessionMeta[]> {
    // TODO: Parse Copilot telemetry/extension storage when available
    return [];
  },

  async getMessages(): Promise<AdapterMessage[]> {
    return [];
  },

  async getStats(): Promise<AdapterStats> {
    return { totalSessions: 0, totalMessages: 0 };
  },
};
