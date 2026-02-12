import type { AIToolAdapter, AdapterSessionMeta, AdapterMessage, AdapterStats } from './types.js';
import { isBrowserToolAvailable, discoverBrowserSessions, getBrowserMessages, getBrowserStats } from './browser-base.js';

export const antigravityBrowserAdapter: AIToolAdapter = {
  id: 'antigravity-browser',
  name: 'Antigravity (Browser)',
  icon: 'Globe',
  category: 'browser',
  description: 'Antigravity conversations from Chrome tabs via CDP',

  async isAvailable(): Promise<boolean> {
    return isBrowserToolAvailable('antigravity-web');
  },

  async discoverSessions(options = {}): Promise<AdapterSessionMeta[]> {
    return discoverBrowserSessions('antigravity-browser', 'antigravity-web');
  },

  async getMessages(sessionId: string, options = {}): Promise<AdapterMessage[]> {
    return getBrowserMessages(sessionId, 'antigravity-web');
  },

  async getStats(): Promise<AdapterStats> {
    return getBrowserStats('antigravity-browser', 'antigravity-web');
  },
};
