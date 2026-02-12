import type { DOMExtractor, EvalFn, ExtractedMessage } from './index.js';

export const geminiExtractor: DOMExtractor = {
  tool: 'gemini',
  selectorVersion: '2026-02-12',

  async extractConversationMessages(evaluate: EvalFn): Promise<ExtractedMessage[]> {
    const result = await evaluate(`
      (() => {
        try {
          const messages = [];
          // Gemini uses message-content containers with query-text and model-response
          const queryEls = document.querySelectorAll(
            '.query-text, [class*="query-content"], [class*="user-query"], [data-content-type="query"]'
          );
          const responseEls = document.querySelectorAll(
            '.model-response-text, [class*="response-content"], [class*="model-response"], [data-content-type="response"]'
          );
          // Interleave user queries and model responses
          const maxLen = Math.max(queryEls.length, responseEls.length);
          for (let i = 0; i < maxLen; i++) {
            if (i < queryEls.length) {
              const text = queryEls[i].innerText || '';
              if (text.trim()) {
                messages.push({ role: 'user', content: text.trim() });
              }
            }
            if (i < responseEls.length) {
              const text = responseEls[i].innerText || '';
              if (text.trim()) {
                messages.push({ role: 'assistant', content: text.trim() });
              }
            }
          }
          // Fallback: generic turn containers
          if (messages.length === 0) {
            const turns = document.querySelectorAll('[class*="turn"], [class*="message-pair"]');
            turns.forEach(el => {
              const userPart = el.querySelector('[class*="user"], [class*="query"]');
              const assistantPart = el.querySelector('[class*="model"], [class*="response"]');
              if (userPart?.innerText?.trim()) {
                messages.push({ role: 'user', content: userPart.innerText.trim() });
              }
              if (assistantPart?.innerText?.trim()) {
                messages.push({ role: 'assistant', content: assistantPart.innerText.trim() });
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
          // Google account avatar
          const avatar = document.querySelector(
            'img[class*="avatar"], a[href*="accounts.google.com"], [data-ogsr-up]'
          );
          if (avatar) indicators.push('google-avatar');
          // New chat button
          const newChat = document.querySelector(
            'button[aria-label*="New chat"], [class*="new-chat"]'
          );
          if (newChat) indicators.push('new-chat-button');
          // Google auth cookies
          const hasCookies = document.cookie.includes('SID')
            || document.cookie.includes('HSID');
          if (hasCookies) indicators.push('google-session-cookie');
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
