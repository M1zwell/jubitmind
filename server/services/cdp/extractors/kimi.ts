import type { DOMExtractor, EvalFn, ExtractedMessage } from './index.js';

/**
 * Extractor for Kimi (kimi.moonshot.cn / kimi.ai).
 */
export const kimiExtractor: DOMExtractor = {
  tool: 'kimi',
  selectorVersion: '2026-02-12',

  async extractConversationMessages(evaluate: EvalFn): Promise<ExtractedMessage[]> {
    const result = await evaluate(`
      (() => {
        try {
          const messages = [];
          // Kimi uses chat message containers
          const containers = document.querySelectorAll(
            '[class*="message"], [class*="chat-item"], [class*="bubble"], [role="article"]'
          );
          containers.forEach(el => {
            const text = el.innerText || '';
            if (!text.trim()) return;
            const isUser = el.classList.toString().includes('user')
              || el.classList.toString().includes('User')
              || el.classList.toString().includes('self')
              || el.querySelector('[class*="user"], [class*="self"]') !== null;
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
            '[class*="avatar"], [class*="Avatar"], [class*="user-icon"]'
          );
          if (avatar) indicators.push('avatar-present');
          const hasCookies = document.cookie.includes('access_token')
            || document.cookie.includes('refresh_token');
          if (hasCookies) indicators.push('session-cookie');
          const token = localStorage.getItem('access_token')
            || localStorage.getItem('user_info');
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
