import type { AIToolAdapter, AdapterSessionMeta, AdapterMessage, AdapterStats } from './types.js';
import { isBrowserToolAvailable, discoverBrowserSessions, getBrowserMessages, getBrowserStats } from './browser-base.js';

export const qwenBrowserAdapter: AIToolAdapter = {
  id: 'qwen-browser',
  name: 'Qwen (Browser)',
  icon: 'Globe',
  category: 'browser',
  description: 'Qwen conversations from Chrome tabs via CDP',

  async isAvailable(): Promise<boolean> {
    return isBrowserToolAvailable('qwen');
  },

  async discoverSessions(options = {}): Promise<AdapterSessionMeta[]> {
    return discoverBrowserSessions('qwen-browser', 'qwen');
  },

  async getMessages(sessionId: string, options = {}): Promise<AdapterMessage[]> {
    return getBrowserMessages(sessionId, 'qwen');
  },

  async getStats(): Promise<AdapterStats> {
    return getBrowserStats('qwen-browser', 'qwen');
  },
};
