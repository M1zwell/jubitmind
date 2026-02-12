import type { AIToolAdapter, AdapterSessionMeta, AdapterMessage, AdapterStats } from './types.js';
import { isBrowserToolAvailable, discoverBrowserSessions, getBrowserMessages, getBrowserStats } from './browser-base.js';

export const jubitBrowserAdapter: AIToolAdapter = {
  id: 'jubit-browser',
  name: 'Jubit AI (Browser)',
  icon: 'Globe',
  category: 'browser',
  description: 'Jubit AI conversations from Chrome tabs via CDP',

  async isAvailable(): Promise<boolean> {
    return isBrowserToolAvailable('jubit');
  },

  async discoverSessions(options = {}): Promise<AdapterSessionMeta[]> {
    return discoverBrowserSessions('jubit-browser', 'jubit');
  },

  async getMessages(sessionId: string, options = {}): Promise<AdapterMessage[]> {
    return getBrowserMessages(sessionId, 'jubit');
  },

  async getStats(): Promise<AdapterStats> {
    return getBrowserStats('jubit-browser', 'jubit');
  },
};
