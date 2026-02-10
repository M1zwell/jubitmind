import { existsSync, readdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import type { AIToolAdapter, AdapterSessionMeta, AdapterMessage, AdapterStats } from './types.js';

const EXTENSIONS_DIR = join(homedir(), '.vscode', 'extensions');

function findClaudeExtension(): boolean {
  try {
    const entries = readdirSync(EXTENSIONS_DIR);
    return entries.some((e) => e.startsWith('anthropic.claude-') || e.startsWith('anthropic.claude-code-'));
  } catch {
    return false;
  }
}

export const claudeVscodeAdapter: AIToolAdapter = {
  id: 'claude-vscode',
  name: 'Claude for VS Code',
  icon: 'Blocks',
  category: 'extension',
  description: 'Anthropic Claude VS Code extension sessions',

  async isAvailable(): Promise<boolean> {
    return findClaudeExtension();
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
