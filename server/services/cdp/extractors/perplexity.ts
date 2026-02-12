import type { DOMExtractor, EvalFn, ExtractedMessage } from './index.js';

export const perplexityExtractor: DOMExtractor = {
  tool: 'perplexity',
  selectorVersion: '2026-02-12',

  async extractConversationMessages(evaluate: EvalFn): Promise<ExtractedMessage[]> {
    const result = await evaluate(`
      (() => {
        try {
          const messages = [];
          // Perplexity uses answer blocks with query and response sections
          const queryBlocks = document.querySelectorAll(
            '[class*="QueryText"], [class*="query-text"], [class*="user-query"]'
          );
          const answerBlocks = document.querySelectorAll(
            '[class*="AnswerBlock"], [class*="answer-block"], [class*="prose"]'
          );
          const maxLen = Math.max(queryBlocks.length, answerBlocks.length);
          for (let i = 0; i < maxLen; i++) {
            if (i < queryBlocks.length) {
              const text = queryBlocks[i].innerText || '';
              if (text.trim()) {
                messages.push({ role: 'user', content: text.trim() });
              }
            }
            if (i < answerBlocks.length) {
              const text = answerBlocks[i].innerText || '';
              if (text.trim()) {
                messages.push({ role: 'assistant', content: text.trim() });
              }
            }
          }
          // Fallback: generic message containers
          if (messages.length === 0) {
            const containers = document.querySelectorAll(
              '[class*="message"], [class*="chat-turn"], [role="article"]'
            );
            containers.forEach((el, i) => {
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
            '[class*="UserAvatar"], [class*="avatar"], img[alt*="profile"]'
          );
          if (avatar) indicators.push('avatar-present');
          const settingsLink = document.querySelector(
            'a[href*="/settings"], [class*="settings"]'
          );
          if (settingsLink) indicators.push('settings-link');
          const hasCookies = document.cookie.includes('pplx')
            || document.cookie.includes('next-auth');
          if (hasCookies) indicators.push('session-cookie');
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
