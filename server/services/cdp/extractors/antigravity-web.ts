import type { DOMExtractor, EvalFn, ExtractedMessage } from './index.js';

/**
 * Extractor for Antigravity web (antigravity.dev / antigravity.ai).
 * Uses generic selectors as the DOM structure may vary.
 */
export const antigravityWebExtractor: DOMExtractor = {
  tool: 'antigravity-web',
  selectorVersion: '2026-02-12',

  async extractConversationMessages(evaluate: EvalFn): Promise<ExtractedMessage[]> {
    const result = await evaluate(`
      (() => {
        try {
          const messages = [];
          const containers = document.querySelectorAll(
            '[class*="message"], [class*="chat"], [role="article"], [class*="bubble"]'
          );
          containers.forEach(el => {
            const text = el.innerText || '';
            if (!text.trim()) return;
            const isUser = el.classList.toString().includes('user')
              || el.classList.toString().includes('User')
              || el.classList.toString().includes('human')
              || el.querySelector('[class*="user"], [class*="human"]') !== null;
            messages.push({
              role: isUser ? 'user' : 'assistant',
              content: text.trim()
            });
          });
          return messages;
        } catch (e) {
          return [];
        }
      })()
    `);
    return (result as ExtractedMessage[]) || [];
  },

  async detectAuthStatus(evaluate: EvalFn): Promise<{ signedIn: boolean; indicators: string[] }> {
    const result = await evaluate(`
      (() => {
        try {
          const indicators = [];
          const avatar = document.querySelector(
            '[class*="avatar"], [class*="Avatar"], [class*="profile"]'
          );
          if (avatar) indicators.push('avatar-present');
          const hasCookies = document.cookie.includes('session')
            || document.cookie.includes('token');
          if (hasCookies) indicators.push('session-cookie');
          const token = localStorage.getItem('token')
            || localStorage.getItem('auth');
          if (token) indicators.push('local-storage-token');
          return {
            signedIn: indicators.length >= 2,
            indicators
          };
        } catch (e) {
          return { signedIn: false, indicators: [] };
        }
      })()
    `);
    return (result as { signedIn: boolean; indicators: string[] }) || { signedIn: false, indicators: [] };
  },
};
