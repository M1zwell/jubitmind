import type { DOMExtractor, EvalFn, ExtractedMessage } from './index.js';

export const deepseekExtractor: DOMExtractor = {
  tool: 'deepseek',
  selectorVersion: '2026-02-12',

  async extractConversationMessages(evaluate: EvalFn): Promise<ExtractedMessage[]> {
    const result = await evaluate(`
      (() => {
        try {
          const messages = [];
          // DeepSeek uses chat message containers with role indicators
          const containers = document.querySelectorAll(
            '[class*="chat-message"], [class*="message-item"], [class*="chatItem"]'
          );
          if (containers.length > 0) {
            containers.forEach(el => {
              const text = el.innerText || '';
              if (!text.trim()) return;
              const isUser = el.classList.toString().includes('user')
                || el.querySelector('[class*="user"], [class*="User"]') !== null
                || el.getAttribute('data-role') === 'user';
              messages.push({
                role: isUser ? 'user' : 'assistant',
                content: text.trim()
              });
            });
          } else {
            // Fallback: generic selectors
            const fallback = document.querySelectorAll(
              '[class*="message"], [class*="chat"], [role="article"]'
            );
            fallback.forEach((el, i) => {
              const text = el.innerText || '';
              if (text.trim()) {
                messages.push({
                  role: i % 2 === 0 ? 'user' : 'assistant',
                  content: text.trim()
                });
              }
            });
          }
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
            '[class*="avatar"], [class*="Avatar"], img[class*="profile"]'
          );
          if (avatar) indicators.push('avatar-present');
          const sidebar = document.querySelector(
            '[class*="sidebar"], [class*="Sidebar"], nav'
          );
          if (sidebar) indicators.push('sidebar-present');
          const hasCookies = document.cookie.includes('ds_session')
            || document.cookie.includes('token');
          if (hasCookies) indicators.push('session-cookie');
          const token = localStorage.getItem('token')
            || localStorage.getItem('userInfo');
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
