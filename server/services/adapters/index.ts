import { registry } from './registry.js';
import { claudeCodeAdapter } from './claude-code.js';
import { cursorAdapter } from './cursor.js';
import { aiderAdapter } from './aider.js';
import { continueDevAdapter } from './continue-dev.js';
import { windsurfAdapter } from './windsurf.js';
import { copilotAdapter } from './copilot.js';
import { codexAdapter } from './codex.js';
import { kiloCodeAdapter } from './kilo-code.js';
import { kimiCliAdapter } from './kimi-cli.js';
import { antigravityAdapter } from './antigravity.js';
import { claudeVscodeAdapter } from './claude-vscode.js';
import { difyAdapter } from './dify.js';
import { cozeAdapter } from './coze.js';
import { minimaxAdapter } from './minimax.js';

// Browser-based AI tools (CDP)
import { chatgptBrowserAdapter } from './chatgpt-browser.js';
import { claudeBrowserAdapter } from './claude-browser.js';
import { geminiBrowserAdapter } from './gemini-browser.js';
import { perplexityBrowserAdapter } from './perplexity-browser.js';
import { deepseekBrowserAdapter } from './deepseek-browser.js';
import { qwenBrowserAdapter } from './qwen-browser.js';
import { kimiBrowserAdapter } from './kimi-browser.js';
import { jubitBrowserAdapter } from './jubit-browser.js';
import { cursorBrowserAdapter } from './cursor-browser.js';
import { kiloBrowserAdapter } from './kilo-browser.js';
import { antigravityBrowserAdapter } from './antigravity-browser.js';

export function initAdapters(): void {
  // CLI tools
  registry.register(claudeCodeAdapter);
  registry.register(aiderAdapter);
  registry.register(codexAdapter);
  registry.register(kimiCliAdapter);
  registry.register(antigravityAdapter);

  // IDE tools
  registry.register(cursorAdapter);
  registry.register(windsurfAdapter);

  // VS Code extensions
  registry.register(copilotAdapter);
  registry.register(continueDevAdapter);
  registry.register(kiloCodeAdapter);
  registry.register(claudeVscodeAdapter);

  // AI Platforms (non-coding)
  registry.register(difyAdapter);
  registry.register(cozeAdapter);
  registry.register(minimaxAdapter);

  // Browser-based AI tools (CDP)
  registry.register(chatgptBrowserAdapter);
  registry.register(claudeBrowserAdapter);
  registry.register(geminiBrowserAdapter);
  registry.register(perplexityBrowserAdapter);
  registry.register(deepseekBrowserAdapter);
  registry.register(qwenBrowserAdapter);
  registry.register(kimiBrowserAdapter);
  registry.register(jubitBrowserAdapter);
  registry.register(cursorBrowserAdapter);
  registry.register(kiloBrowserAdapter);
  registry.register(antigravityBrowserAdapter);
}

export { registry } from './registry.js';
export type { AIToolAdapter, AdapterInfo, AdapterSessionMeta, AdapterMessage, AdapterStats } from './types.js';
