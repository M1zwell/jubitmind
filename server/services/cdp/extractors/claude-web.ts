import type { DOMExtractor, EvalFn, ExtractedMessage } from './index.js';

export const claudeWebExtractor: DOMExtractor = {
  tool: 'claude-web',
  selectorVersion: '2026-02-12',

  async extractConversationMessages(evaluate: EvalFn): Promise<ExtractedMessage[]> {
    const result = await evaluate(`
      (() => {
        try {
          const messages = [];
          // Claude uses .font-claude-message for assistant, .font-user-message for user
          // Also check for data-is-streaming, [class*="human"], [class*="assistant"]
          const containers = document.querySelectorAll(
            '[class*="Message"], [class*="message-row"], [data-testid*="message"]'
          );
          if (containers.length > 0) {
            containers.forEach(el => {
              const text = el.innerText || '';
              if (!text.trim()) return;
              const isHuman = el.classList.toString().includes('human')
                || el.classList.toString().includes('Human')
                || el.querySelector('[class*="human"], [class*="Human"]') !== null
                || el.getAttribute('data-testid')?.includes('human');
              messages.push({
                role: isHuman ? 'user' : 'assistant',
                content: text.trim()
              });
            });
          } else {
            // Fallback: look for turn-based containers
            const turns = document.querySelectorAll('[class*="turn"], [class*="Turn"]');
            turns.forEach((el, i) => {
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
          // Check for user menu / settings button
          const userMenu = document.querySelector(
            '[data-testid="user-menu"], [class*="UserMenu"], [class*="avatar"], button[aria-label*="menu"]'
          );
          if (userMenu) indicators.push('user-menu-present');
          // Check for new conversation button
          const newConv = document.querySelector(
            '[data-testid="new-conversation"], a[href="/new"], button[class*="NewChat"]'
          );
          if (newConv) indicators.push('new-conversation-button');
          // Check cookies for session
          const hasSession = document.cookie.includes('sessionKey')
            || document.cookie.includes('__cf_bm');
          if (hasSession) indicators.push('session-cookie');
          // Check for sidebar with conversation list
          const sidebar = document.querySelector('nav[class*="sidebar"], [class*="ConversationList"]');
          if (sidebar) indicators.push('sidebar-present');
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
