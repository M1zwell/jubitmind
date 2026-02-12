import type { AIToolAdapter, AdapterSessionMeta, AdapterMessage, AdapterStats } from './types.js';
import { isBrowserToolAvailable, discoverBrowserSessions, getBrowserMessages, getBrowserStats } from './browser-base.js';

export const chatgptBrowserAdapter: AIToolAdapter = {
  id: 'chatgpt-browser',
  name: 'ChatGPT (Browser)',
  icon: 'Globe',
  category: 'browser',
  description: 'ChatGPT conversations from Chrome tabs via CDP',

  async isAvailable(): Promise<boolean> {
    return isBrowserToolAvailable('chatgpt');
  },

  async discoverSessions(options = {}): Promise<AdapterSessionMeta[]> {
    return discoverBrowserSessions('chatgpt-browser', 'chatgpt');
  },

  async getMessages(sessionId: string, options = {}): Promise<AdapterMessage[]> {
    return getBrowserMessages(sessionId, 'chatgpt');
  },

  async getStats(): Promise<AdapterStats> {
    return getBrowserStats('chatgpt-browser', 'chatgpt');
  },
};
