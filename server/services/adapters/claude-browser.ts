import type { AIToolAdapter, AdapterSessionMeta, AdapterMessage, AdapterStats } from './types.js';
import { isBrowserToolAvailable, discoverBrowserSessions, getBrowserMessages, getBrowserStats } from './browser-base.js';

export const claudeBrowserAdapter: AIToolAdapter = {
  id: 'claude-browser',
  name: 'Claude (Browser)',
  icon: 'Globe',
  category: 'browser',
  description: 'Claude.ai conversations from Chrome tabs via CDP',

  async isAvailable(): Promise<boolean> {
    return isBrowserToolAvailable('claude-web');
  },

  async discoverSessions(options = {}): Promise<AdapterSessionMeta[]> {
    return discoverBrowserSessions('claude-browser', 'claude-web');
  },

  async getMessages(sessionId: string, options = {}): Promise<AdapterMessage[]> {
    return getBrowserMessages(sessionId, 'claude-web');
  },

  async getStats(): Promise<AdapterStats> {
    return getBrowserStats('claude-browser', 'claude-web');
  },
};
