import type { SessionRiskSummary } from './risk-scorer.js';

export type TagCategory = 'technical' | 'sensitivity' | 'operational';

export interface AutoTag {
  name: string;
  category: TagCategory;
  confidence: number;
}

interface AnalysisContext {
  allText: string;
  toolNames: string[];
  bashCommands: string[];
  writeFilePaths: string[];
  riskSummary: SessionRiskSummary;
}

interface TagRule {
  name: string;
  category: TagCategory;
  detect: (ctx: AnalysisContext) => number;
}

const TAG_RULES: TagRule[] = [
  // --- Technical ---
  {
    name: 'code-generation',
    category: 'technical',
    detect: (ctx) => {
      const writeCount = ctx.toolNames.filter((n) => n === 'Write').length;
      if (writeCount >= 5) return 0.9;
      if (writeCount >= 3) return 0.7;
      if (writeCount >= 1) return 0.4;
      return 0;
    },
  },
  {
    name: 'debugging',
    category: 'technical',
    detect: (ctx) => {
      const keywords = ['error', 'fix', 'bug', 'stack trace', 'debug', 'issue', 'broken', 'crash', 'exception', 'traceback'];
      const text = ctx.allText.toLowerCase();
      const matches = keywords.filter((k) => text.includes(k)).length;
      if (matches >= 3) return 0.9;
      if (matches >= 2) return 0.6;
      if (matches >= 1) return 0.3;
      return 0;
    },
  },
  {
    name: 'architecture',
    category: 'technical',
    detect: (ctx) => {
      const keywords = ['design', 'architect', 'system design', 'pattern', 'schema', 'structure', 'plan mode', 'implementation plan'];
      const text = ctx.allText.toLowerCase();
      const matches = keywords.filter((k) => text.includes(k)).length;
      return matches >= 3 ? 0.7 : matches >= 2 ? 0.5 : 0;
    },
  },
  {
    name: 'devops',
    category: 'technical',
    detect: (ctx) => {
      const keywords = ['deploy', 'ci/cd', 'pipeline', 'docker', 'kubernetes', 'terraform', 'infrastructure', 'nginx', 'server'];
      const text = ctx.allText.toLowerCase();
      const matches = keywords.filter((k) => text.includes(k)).length;
      const hasDocker = ctx.bashCommands.some((c) => /\bdocker\b/.test(c));
      if (hasDocker) return 0.8;
      return matches >= 2 ? 0.7 : 0;
    },
  },
  {
    name: 'testing',
    category: 'technical',
    detect: (ctx) => {
      const keywords = ['test', 'jest', 'pytest', 'bats', 'spec', 'assert', 'expect', 'mock', 'coverage'];
      const text = ctx.allText.toLowerCase();
      const matches = keywords.filter((k) => text.includes(k)).length;
      const hasTestCmd = ctx.bashCommands.some((c) => /\b(test|jest|pytest|bats|vitest|mocha)\b/.test(c));
      if (hasTestCmd) return 0.9;
      return matches >= 3 ? 0.7 : matches >= 2 ? 0.5 : 0;
    },
  },
  {
    name: 'refactoring',
    category: 'technical',
    detect: (ctx) => {
      const keywords = ['refactor', 'restructure', 'reorganize', 'rename', 'extract', 'cleanup', 'clean up', 'simplify'];
      const text = ctx.allText.toLowerCase();
      const matches = keywords.filter((k) => text.includes(k)).length;
      const hasEdits = ctx.toolNames.filter((n) => n === 'Edit').length;
      if (matches >= 2 && hasEdits >= 3) return 0.8;
      return matches >= 2 ? 0.5 : 0;
    },
  },

  // --- Sensitivity ---
  {
    name: 'security',
    category: 'sensitivity',
    detect: (ctx) => {
      const keywords = ['auth', 'token', 'api key', 'permission', 'encrypt', 'oauth', 'jwt', 'credential', 'password', 'secret', 'rls', 'cors', 'xss', 'injection', 'vulnerability'];
      const text = ctx.allText.toLowerCase();
      const matches = keywords.filter((k) => text.includes(k)).length;
      const sensitiveFiles = ctx.writeFilePaths.some((p) => /\.(env|pem|key)$|credential|secret|auth/i.test(p));
      if (sensitiveFiles) return 0.9;
      if (matches >= 3) return 0.8;
      if (matches >= 2) return 0.5;
      return 0;
    },
  },
  {
    name: 'privacy',
    category: 'sensitivity',
    detect: (ctx) => {
      const keywords = ['pii', 'personal data', 'gdpr', 'user data', 'email address', 'phone number', 'name', 'address', 'privacy', 'data protection', 'anonymize', 'consent'];
      const text = ctx.allText.toLowerCase();
      const matches = keywords.filter((k) => text.includes(k)).length;
      if (matches >= 3) return 0.8;
      if (matches >= 2) return 0.5;
      return 0;
    },
  },
  {
    name: 'ip-creation',
    category: 'sensitivity',
    detect: (ctx) => {
      const keywords = ['algorithm', 'novel', 'innovative', 'patent', 'proprietary', 'unique approach', 'intellectual property', 'invention', 'original'];
      const text = ctx.allText.toLowerCase();
      const matches = keywords.filter((k) => text.includes(k)).length;
      // High code generation + unique content suggests IP creation
      const writes = ctx.toolNames.filter((n) => n === 'Write').length;
      if (matches >= 2 && writes >= 3) return 0.7;
      if (matches >= 2) return 0.5;
      return 0;
    },
  },
  {
    name: 'legal',
    category: 'sensitivity',
    detect: (ctx) => {
      const keywords = ['license', 'compliance', 'regulation', 'terms', 'legal', 'copyright', 'liability', 'contract', 'agreement'];
      const text = ctx.allText.toLowerCase();
      const matches = keywords.filter((k) => text.includes(k)).length;
      if (matches >= 2) return 0.7;
      return 0;
    },
  },
  {
    name: 'safety',
    category: 'sensitivity',
    detect: (ctx) => {
      const keywords = ['harmful', 'dangerous', 'safety', 'moderation', 'abuse', 'malicious', 'exploit', 'attack', 'threat'];
      const text = ctx.allText.toLowerCase();
      const matches = keywords.filter((k) => text.includes(k)).length;
      if (matches >= 2) return 0.7;
      return 0;
    },
  },

  // --- Operational ---
  {
    name: 'file-modification',
    category: 'operational',
    detect: (ctx) => (ctx.toolNames.some((n) => n === 'Write' || n === 'Edit') ? 1.0 : 0),
  },
  {
    name: 'system-command',
    category: 'operational',
    detect: (ctx) => (ctx.toolNames.some((n) => n === 'Bash') ? 1.0 : 0),
  },
  {
    name: 'external-api',
    category: 'operational',
    detect: (ctx) => {
      const hasCurl = ctx.bashCommands.some((c) => /\bcurl\b|\bwget\b|\bssh\b/.test(c));
      const hasMcp = ctx.toolNames.some((n) => n.startsWith('mcp__'));
      const hasWeb = ctx.toolNames.some((n) => n === 'WebFetch' || n === 'WebSearch');
      return hasCurl || hasMcp || hasWeb ? 1.0 : 0;
    },
  },
  {
    name: 'data-access',
    category: 'operational',
    detect: (ctx) => {
      const sqlKeywords = ['SELECT ', 'INSERT ', 'UPDATE ', 'DELETE ', 'CREATE TABLE', 'ALTER TABLE'];
      const text = ctx.allText.toUpperCase();
      return sqlKeywords.some((k) => text.includes(k)) ? 0.8 : 0;
    },
  },
  {
    name: 'browser-conversation',
    category: 'operational',
    detect: (ctx) => {
      const keywords = ['browser', 'chatgpt', 'claude.ai', 'gemini', 'perplexity', 'deepseek', 'qwen', 'kimi'];
      const text = ctx.allText.toLowerCase();
      const matches = keywords.filter((k) => text.includes(k)).length;
      return matches >= 1 ? 0.8 : 0;
    },
  },
];

function extractContent(msg: { type: string; message?: { role: string; content: unknown } }): {
  text: string;
  toolNames: string[];
  bashCommands: string[];
  writeFilePaths: string[];
} {
  const result = { text: '', toolNames: [] as string[], bashCommands: [] as string[], writeFilePaths: [] as string[] };
  const content = msg.message?.content;

  if (typeof content === 'string') {
    result.text = content;
    return result;
  }

  if (!Array.isArray(content)) return result;

  for (const block of content) {
    if (!block || typeof block !== 'object') continue;
    if (block.type === 'text' && block.text) {
      result.text += block.text + '\n';
    }
    if (block.type === 'tool_use' && block.name) {
      result.toolNames.push(block.name);
      if (block.name === 'Bash' && block.input?.command) {
        result.bashCommands.push(String(block.input.command));
      }
      if ((block.name === 'Write' || block.name === 'Edit') && block.input?.file_path) {
        result.writeFilePaths.push(String(block.input.file_path));
      }
    }
    if (block.type === 'tool_result' && typeof block.content === 'string') {
      result.text += block.content.slice(0, 500) + '\n'; // limit tool output text
    }
  }

  return result;
}

const CONFIDENCE_THRESHOLD = 0.4;

export function computeAutoTags(
  messages: Array<{ type: string; message?: { role: string; content: unknown } }>,
  riskSummary: SessionRiskSummary,
): AutoTag[] {
  // Build analysis context from all messages
  let allText = '';
  const toolNames: string[] = [];
  const bashCommands: string[] = [];
  const writeFilePaths: string[] = [];

  for (const msg of messages) {
    const extracted = extractContent(msg);
    allText += extracted.text + '\n';
    toolNames.push(...extracted.toolNames);
    bashCommands.push(...extracted.bashCommands);
    writeFilePaths.push(...extracted.writeFilePaths);
  }

  const ctx: AnalysisContext = {
    allText,
    toolNames,
    bashCommands,
    writeFilePaths,
    riskSummary,
  };

  const tags: AutoTag[] = [];
  for (const rule of TAG_RULES) {
    const confidence = rule.detect(ctx);
    if (confidence >= CONFIDENCE_THRESHOLD) {
      tags.push({ name: rule.name, category: rule.category, confidence });
    }
  }

  // Sort by confidence descending
  tags.sort((a, b) => b.confidence - a.confidence);
  return tags;
}
