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
}

export { registry } from './registry.js';
export type { AIToolAdapter, AdapterInfo, AdapterSessionMeta, AdapterMessage, AdapterStats } from './types.js';
