import type { AIToolAdapter, AdapterSessionMeta, AdapterMessage, AdapterStats } from './types.js';
import { isBrowserToolAvailable, discoverBrowserSessions, getBrowserMessages, getBrowserStats } from './browser-base.js';

export const geminiBrowserAdapter: AIToolAdapter = {
  id: 'gemini-browser',
  name: 'Gemini (Browser)',
  icon: 'Globe',
  category: 'browser',
  description: 'Google Gemini conversations from Chrome tabs via CDP',

  async isAvailable(): Promise<boolean> {
    return isBrowserToolAvailable('gemini');
  },

  async discoverSessions(options = {}): Promise<AdapterSessionMeta[]> {
    return discoverBrowserSessions('gemini-browser', 'gemini');
  },

  async getMessages(sessionId: string, options = {}): Promise<AdapterMessage[]> {
    return getBrowserMessages(sessionId, 'gemini');
  },

  async getStats(): Promise<AdapterStats> {
    return getBrowserStats('gemini-browser', 'gemini');
  },
};
