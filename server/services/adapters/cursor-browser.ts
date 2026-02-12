import type { AIToolAdapter, AdapterSessionMeta, AdapterMessage, AdapterStats } from './types.js';
import { isBrowserToolAvailable, discoverBrowserSessions, getBrowserMessages, getBrowserStats } from './browser-base.js';

export const cursorBrowserAdapter: AIToolAdapter = {
  id: 'cursor-browser',
  name: 'Cursor (Browser)',
  icon: 'Globe',
  category: 'browser',
  description: 'Cursor web conversations from Chrome tabs via CDP',

  async isAvailable(): Promise<boolean> {
    return isBrowserToolAvailable('cursor-web');
  },

  async discoverSessions(options = {}): Promise<AdapterSessionMeta[]> {
    return discoverBrowserSessions('cursor-browser', 'cursor-web');
  },

  async getMessages(sessionId: string, options = {}): Promise<AdapterMessage[]> {
    return getBrowserMessages(sessionId, 'cursor-web');
  },

  async getStats(): Promise<AdapterStats> {
    return getBrowserStats('cursor-browser', 'cursor-web');
  },
};
