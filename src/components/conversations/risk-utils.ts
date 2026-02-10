import type { RiskLevel, ContentBlock } from '@/lib/types';

const CRITICAL_PATTERNS = [
  /rm\s+-rf/i,
  /sudo\s+/,
  /git\s+push\s+--force/i,
  /DROP\s+(TABLE|DATABASE)/i,
  /\.env/,
  /credentials|secret_?key|api_?key|password/i,
  /chmod\s+777/,
  /mkfs\./,
  /format\s+[a-z]:/i,
];

const HIGH_PATTERNS = [
  /git\s+push/i,
  /npm\s+publish/i,
  /docker\s+(run|exec|build)/i,
  /curl\s+/,
  /wget\s+/,
  /ssh\s+/,
];

const MEDIUM_TOOLS = ['Write', 'Edit', 'NotebookEdit', 'Task', 'Bash'];
const LOW_TOOLS = ['Read', 'Glob', 'Grep', 'WebSearch', 'WebFetch'];

export function scoreBlock(block: ContentBlock): { level: RiskLevel; score: number } {
  if (block.type !== 'tool_use') return { level: 'low', score: 1 };

  const name = block.name || '';
  const inputStr = JSON.stringify(block.input || '');

  for (const p of CRITICAL_PATTERNS) {
    if (p.test(inputStr)) return { level: 'critical', score: 4 };
  }

  for (const p of HIGH_PATTERNS) {
    if (p.test(inputStr)) return { level: 'high', score: 3 };
  }

  if (MEDIUM_TOOLS.includes(name)) return { level: 'medium', score: 2 };
  if (LOW_TOOLS.includes(name)) return { level: 'low', score: 1 };

  return { level: 'medium', score: 2 };
}

export const RISK_COLORS: Record<RiskLevel, { bg: string; text: string; border: string }> = {
  critical: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/50' },
  high: { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/50' },
  medium: { bg: 'bg-yellow-500/15', text: 'text-yellow-400', border: 'border-yellow-500/50' },
  low: { bg: 'bg-green-500/15', text: 'text-green-400', border: 'border-green-500/50' },
};
