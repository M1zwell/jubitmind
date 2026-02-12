import type { DOMExtractor, EvalFn, ExtractedMessage } from './index.js';

export const chatgptExtractor: DOMExtractor = {
  tool: 'chatgpt',
  selectorVersion: '2026-02-12',

  async extractConversationMessages(evaluate: EvalFn): Promise<ExtractedMessage[]> {
    const result = await evaluate(`
      (() => {
        try {
          const messages = [];
          // Primary: data-message-id attribute containers
          const els = document.querySelectorAll('[data-message-id]');
          if (els.length > 0) {
            els.forEach(el => {
              const role = el.querySelector('[data-message-author-role]')
                ?.getAttribute('data-message-author-role');
              const mappedRole = role === 'user' ? 'user' : 'assistant';
              const content = el.querySelector('.markdown, .whitespace-pre-wrap')?.innerText
                || el.innerText || '';
              if (content.trim()) {
                messages.push({ role: mappedRole, content: content.trim() });
              }
            });
          } else {
            // Fallback: .message containers or article elements
            const fallback = document.querySelectorAll('.message, [role="article"], [class*="ConversationItem"]');
            fallback.forEach(el => {
              const text = el.innerText || '';
              // Heuristic: user messages typically appear before assistant ones
              const isUser = el.classList.contains('user')
                || el.querySelector('[class*="user"]') !== null
                || el.getAttribute('data-role') === 'user';
              if (text.trim()) {
                messages.push({
                  role: isUser ? 'user' : 'assistant',
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
          // Check for user avatar / profile menu
          const avatar = document.querySelector('[data-testid="profile-button"], .avatar, [class*="UserAvatar"]');
          if (avatar) indicators.push('avatar-present');
          // Check for new-chat button (only visible when signed in)
          const newChat = document.querySelector('[data-testid="create-new-chat-button"], a[href="/"]');
          if (newChat) indicators.push('new-chat-button');
          // Check for session cookie
          const hasCookies = document.cookie.includes('__Secure-next-auth')
            || document.cookie.includes('_puid');
          if (hasCookies) indicators.push('session-cookie');
          // Check localStorage for auth tokens
          const token = localStorage.getItem('oai/apps/hasSeenOnboarding')
            || localStorage.getItem('oai-did');
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
