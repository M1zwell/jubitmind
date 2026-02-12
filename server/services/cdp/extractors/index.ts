import { chatgptExtractor } from './chatgpt.js';
import { claudeWebExtractor } from './claude-web.js';
import { geminiExtractor } from './gemini.js';
import { perplexityExtractor } from './perplexity.js';
import { deepseekExtractor } from './deepseek.js';
import { qwenExtractor } from './qwen.js';
import { kimiExtractor } from './kimi.js';
import { jubitExtractor } from './jubit.js';
import { cursorWebExtractor } from './cursor-web.js';
import { kiloWebExtractor } from './kilo-web.js';
import { antigravityWebExtractor } from './antigravity-web.js';

// --- Types ---

export type EvalFn = (expression: string) => Promise<unknown>;

export interface ExtractedMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  model?: string;
}

export interface ExtractedConversation {
  conversationId: string;
  title: string;
  messages: ExtractedMessage[];
  url: string;
  extractedAt: string;
}

export interface DOMExtractor {
  tool: string;
  selectorVersion: string;  // date when selectors were last verified
  extractConversationMessages(evaluate: EvalFn): Promise<ExtractedMessage[]>;
  detectAuthStatus(evaluate: EvalFn): Promise<{ signedIn: boolean; indicators: string[] }>;
}

// --- Registry ---

const extractorRegistry = new Map<string, DOMExtractor>();

function register(extractor: DOMExtractor): void {
  extractorRegistry.set(extractor.tool, extractor);
}

// Register all built-in extractors
register(chatgptExtractor);
register(claudeWebExtractor);
register(geminiExtractor);
register(perplexityExtractor);
register(deepseekExtractor);
register(qwenExtractor);
register(kimiExtractor);
register(jubitExtractor);
register(cursorWebExtractor);
register(kiloWebExtractor);
register(antigravityWebExtractor);

/**
 * Get the DOM extractor for a given tool identifier.
 * Returns undefined if no extractor is registered for that tool.
 */
export function getExtractor(tool: string): DOMExtractor | undefined {
  return extractorRegistry.get(tool);
}

/**
 * List all registered extractor tool names.
 */
export function listExtractors(): string[] {
  return Array.from(extractorRegistry.keys());
}
