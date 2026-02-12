import type { AIToolAdapter, AdapterSessionMeta, AdapterMessage, AdapterStats } from './types.js';
import { isBrowserToolAvailable, discoverBrowserSessions, getBrowserMessages, getBrowserStats } from './browser-base.js';

export const deepseekBrowserAdapter: AIToolAdapter = {
  id: 'deepseek-browser',
  name: 'DeepSeek (Browser)',
  icon: 'Globe',
  category: 'browser',
  description: 'DeepSeek conversations from Chrome tabs via CDP',

  async isAvailable(): Promise<boolean> {
    return isBrowserToolAvailable('deepseek');
  },

  async discoverSessions(options = {}): Promise<AdapterSessionMeta[]> {
    return discoverBrowserSessions('deepseek-browser', 'deepseek');
  },

  async getMessages(sessionId: string, options = {}): Promise<AdapterMessage[]> {
    return getBrowserMessages(sessionId, 'deepseek');
  },

  async getStats(): Promise<AdapterStats> {
    return getBrowserStats('deepseek-browser', 'deepseek');
  },
};
