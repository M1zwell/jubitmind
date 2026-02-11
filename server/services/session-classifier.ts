import fs from 'fs';
import readline from 'readline';
import { scoreToolUseBlock, type RiskLevel } from './risk-scorer.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ModelUsageInfo {
  modelId: string;
  modelFamily: string;
  messageCount: number;
  inputTokens: number;
  outputTokens: number;
}

export interface ToolUsageInfo {
  toolName: string;
  count: number;
  riskTier: RiskLevel;
}

export interface MessageBreakdown {
  userPrompts: number;
  assistantText: number;
  thinkingBlocks: number;
  toolUseBlocks: number;
  toolResultBlocks: number;
  totalMessages: number;
}

export interface SessionClassification {
  modelsUsed: ModelUsageInfo[];
  toolsUsed: ToolUsageInfo[];
  messageBreakdown: MessageBreakdown;
  dominantCategory:
    | 'prompt-heavy'
    | 'tool-heavy'
    | 'planning-heavy'
    | 'balanced';
  hasThinking: boolean;
  hasToolUse: boolean;
  classifiedAt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MODEL_FAMILY_MAP: Array<{ pattern: RegExp; family: string }> = [
  { pattern: /opus/i, family: 'opus' },
  { pattern: /sonnet/i, family: 'sonnet' },
  { pattern: /haiku/i, family: 'haiku' },
  { pattern: /gpt-4o/i, family: 'gpt-4o' },
  { pattern: /gpt-4/i, family: 'gpt-4' },
  { pattern: /gpt-3/i, family: 'gpt-3.5' },
  { pattern: /o1/i, family: 'o1' },
  { pattern: /o3/i, family: 'o3' },
  { pattern: /gemini/i, family: 'gemini' },
  { pattern: /deepseek/i, family: 'deepseek' },
  { pattern: /mistral|magistral/i, family: 'mistral' },
  { pattern: /llama/i, family: 'llama' },
  { pattern: /claude/i, family: 'claude' },
];

export function deriveModelFamily(modelId: string): string {
  if (!modelId) return 'unknown';
  for (const { pattern, family } of MODEL_FAMILY_MAP) {
    if (pattern.test(modelId)) return family;
  }
  return modelId.split('-')[0] || 'unknown';
}

function computeDominantCategory(
  breakdown: MessageBreakdown,
): SessionClassification['dominantCategory'] {
  const totalBlocks =
    breakdown.assistantText +
    breakdown.thinkingBlocks +
    breakdown.toolUseBlocks +
    breakdown.toolResultBlocks;

  if (totalBlocks === 0) return 'prompt-heavy';

  const toolRatio =
    (breakdown.toolUseBlocks + breakdown.toolResultBlocks) / totalBlocks;
  const thinkingRatio = breakdown.thinkingBlocks / totalBlocks;

  if (toolRatio > 0.6) return 'tool-heavy';
  if (thinkingRatio > 0.4) return 'planning-heavy';
  if (breakdown.userPrompts > breakdown.assistantText) return 'prompt-heavy';
  return 'balanced';
}

// ---------------------------------------------------------------------------
// Core classification
// ---------------------------------------------------------------------------

export async function classifySession(
  sessionPath: string,
): Promise<SessionClassification> {
  const breakdown: MessageBreakdown = {
    userPrompts: 0,
    assistantText: 0,
    thinkingBlocks: 0,
    toolUseBlocks: 0,
    toolResultBlocks: 0,
    totalMessages: 0,
  };

  // model -> aggregated info
  const modelMap = new Map<
    string,
    { messageCount: number; inputTokens: number; outputTokens: number }
  >();

  // tool -> { count, maxRiskScore }
  const toolMap = new Map<string, { count: number; maxRiskScore: number }>();

  const rl = readline.createInterface({
    input: fs.createReadStream(sessionPath),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (!line.trim()) continue;

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(line);
    } catch {
      continue;
    }

    const msgType = parsed.type as string | undefined;
    if (msgType !== 'user' && msgType !== 'assistant') continue;

    breakdown.totalMessages++;

    if (msgType === 'user') {
      breakdown.userPrompts++;
      continue;
    }

    // --- Assistant message ---
    const message = parsed.message as
      | { role?: string; content?: unknown; model?: string; usage?: Record<string, unknown> }
      | undefined;

    // Track model
    const modelId = (message?.model as string) || '';
    if (modelId) {
      const existing = modelMap.get(modelId) || {
        messageCount: 0,
        inputTokens: 0,
        outputTokens: 0,
      };
      existing.messageCount++;

      const usage = message?.usage as Record<string, number> | undefined;
      if (usage) {
        existing.inputTokens += usage.input_tokens || 0;
        existing.outputTokens += usage.output_tokens || 0;
      }

      modelMap.set(modelId, existing);
    }

    // Iterate content blocks
    const content = message?.content;
    if (typeof content === 'string') {
      breakdown.assistantText++;
    } else if (Array.isArray(content)) {
      for (const block of content) {
        if (!block || typeof block !== 'object') continue;
        const blockType = (block as Record<string, unknown>).type as string;

        switch (blockType) {
          case 'text':
            breakdown.assistantText++;
            break;
          case 'thinking':
            breakdown.thinkingBlocks++;
            break;
          case 'tool_use': {
            breakdown.toolUseBlocks++;
            const toolBlock = block as {
              type: string;
              name?: string;
              id?: string;
              input?: Record<string, unknown>;
            };
            const toolName = toolBlock.name || 'unknown';
            const scored = scoreToolUseBlock(toolBlock);
            const existing = toolMap.get(toolName) || {
              count: 0,
              maxRiskScore: 0,
            };
            existing.count++;
            existing.maxRiskScore = Math.max(
              existing.maxRiskScore,
              scored.riskScore,
            );
            toolMap.set(toolName, existing);
            break;
          }
          case 'tool_result':
            breakdown.toolResultBlocks++;
            break;
        }
      }
    }
  }

  // Build modelsUsed
  const modelsUsed: ModelUsageInfo[] = Array.from(modelMap.entries())
    .map(([modelId, info]) => ({
      modelId,
      modelFamily: deriveModelFamily(modelId),
      messageCount: info.messageCount,
      inputTokens: info.inputTokens,
      outputTokens: info.outputTokens,
    }))
    .sort((a, b) => b.messageCount - a.messageCount);

  // Build toolsUsed
  const riskScoreToLevel = (s: number): RiskLevel => {
    if (s >= 4) return 'critical';
    if (s >= 3) return 'high';
    if (s >= 2) return 'medium';
    return 'low';
  };

  const toolsUsed: ToolUsageInfo[] = Array.from(toolMap.entries())
    .map(([toolName, info]) => ({
      toolName,
      count: info.count,
      riskTier: riskScoreToLevel(info.maxRiskScore),
    }))
    .sort((a, b) => b.count - a.count);

  return {
    modelsUsed,
    toolsUsed,
    messageBreakdown: breakdown,
    dominantCategory: computeDominantCategory(breakdown),
    hasThinking: breakdown.thinkingBlocks > 0,
    hasToolUse: breakdown.toolUseBlocks > 0,
    classifiedAt: new Date().toISOString(),
  };
}
