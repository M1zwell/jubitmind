import type { AIToolAdapter, AdapterSessionMeta, AdapterMessage, AdapterStats } from './types.js';
import { isBrowserToolAvailable, discoverBrowserSessions, getBrowserMessages, getBrowserStats } from './browser-base.js';

export const perplexityBrowserAdapter: AIToolAdapter = {
  id: 'perplexity-browser',
  name: 'Perplexity (Browser)',
  icon: 'Globe',
  category: 'browser',
  description: 'Perplexity conversations from Chrome tabs via CDP',

  async isAvailable(): Promise<boolean> {
    return isBrowserToolAvailable('perplexity');
  },

  async discoverSessions(options = {}): Promise<AdapterSessionMeta[]> {
    return discoverBrowserSessions('perplexity-browser', 'perplexity');
  },

  async getMessages(sessionId: string, options = {}): Promise<AdapterMessage[]> {
    return getBrowserMessages(sessionId, 'perplexity');
  },

  async getStats(): Promise<AdapterStats> {
    return getBrowserStats('perplexity-browser', 'perplexity');
  },
};
