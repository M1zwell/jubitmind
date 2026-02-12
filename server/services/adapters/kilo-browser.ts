import type { AIToolAdapter, AdapterSessionMeta, AdapterMessage, AdapterStats } from './types.js';
import { isBrowserToolAvailable, discoverBrowserSessions, getBrowserMessages, getBrowserStats } from './browser-base.js';

export const kiloBrowserAdapter: AIToolAdapter = {
  id: 'kilo-browser',
  name: 'Kilo Code (Browser)',
  icon: 'Globe',
  category: 'browser',
  description: 'Kilo Code conversations from Chrome tabs via CDP',

  async isAvailable(): Promise<boolean> {
    return isBrowserToolAvailable('kilo-web');
  },

  async discoverSessions(options = {}): Promise<AdapterSessionMeta[]> {
    return discoverBrowserSessions('kilo-browser', 'kilo-web');
  },

  async getMessages(sessionId: string, options = {}): Promise<AdapterMessage[]> {
    return getBrowserMessages(sessionId, 'kilo-web');
  },

  async getStats(): Promise<AdapterStats> {
    return getBrowserStats('kilo-browser', 'kilo-web');
  },
};
