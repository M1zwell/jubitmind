import type { AIToolAdapter, AdapterSessionMeta, AdapterMessage, AdapterStats } from './types.js';
import { isBrowserToolAvailable, discoverBrowserSessions, getBrowserMessages, getBrowserStats } from './browser-base.js';

export const kimiBrowserAdapter: AIToolAdapter = {
  id: 'kimi-browser',
  name: 'Kimi (Browser)',
  icon: 'Globe',
  category: 'browser',
  description: 'Kimi conversations from Chrome tabs via CDP',

  async isAvailable(): Promise<boolean> {
    return isBrowserToolAvailable('kimi');
  },

  async discoverSessions(options = {}): Promise<AdapterSessionMeta[]> {
    return discoverBrowserSessions('kimi-browser', 'kimi');
  },

  async getMessages(sessionId: string, options = {}): Promise<AdapterMessage[]> {
    return getBrowserMessages(sessionId, 'kimi');
  },

  async getStats(): Promise<AdapterStats> {
    return getBrowserStats('kimi-browser', 'kimi');
  },
};
