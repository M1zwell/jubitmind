import fsp from 'fs/promises';
import path from 'path';
import { getAllSessionsUnlimited, type CachedSessionMeta } from './session-cache.js';
import { queryInteractions, getIndexStats } from './interaction-index.js';
import { PATHS } from './config-resolver.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InsightReport {
  id: string;
  timestamp: string;
  type: 'scheduled' | 'on-demand';
  duration_ms: number;
  promptPatterns: {
    commonThemes: Array<{ theme: string; frequency: number; examples: string[] }>;
    recurringRequests: Array<{ pattern: string; count: number }>;
    avgPromptLength: number;
  };
  toolUsageTrends: {
    mostUsedTools: Array<{ tool: string; count: number; riskExposure: number }>;
    toolUsageOverTime: Array<{ date: string; toolCounts: Record<string, number> }>;
    riskExposureTrend: Array<{ date: string; criticalCount: number; highCount: number }>;
  };
  modelComparison: {
    modelsUsed: Array<{ model: string; sessionCount: number; totalTokens: number }>;
    costByModel: Array<{ model: string; estimatedCost: number }>;
  };
  recommendations: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_INTERVAL_MS = 3_600_000; // 1 hour
const REPORTS_DIR = path.join(PATHS.dataDir, 'insights');

// Rough cost estimates per 1M tokens
const COST_PER_MILLION: Record<string, number> = {
  opus: 15.0,
  sonnet: 3.0,
  haiku: 0.25,
  'gpt-4o': 2.5,
  'gpt-4': 30.0,
  'gpt-3.5': 0.5,
  gemini: 1.0,
  deepseek: 0.14,
  mistral: 0.3,
  claude: 3.0,
};

// Common prompt themes (keyword-based detection)
const THEME_KEYWORDS: Record<string, string[]> = {
  'Code Generation': ['create', 'implement', 'write', 'build', 'add', 'function', 'component', 'class'],
  'Bug Fixing': ['fix', 'bug', 'error', 'issue', 'broken', 'crash', 'fail', 'wrong'],
  'Refactoring': ['refactor', 'clean', 'restructure', 'reorganize', 'simplify', 'optimize'],
  'Testing': ['test', 'spec', 'coverage', 'assertion', 'mock', 'verify'],
  'Documentation': ['document', 'readme', 'comment', 'explain', 'describe', 'docs'],
  'Configuration': ['config', 'setup', 'install', 'environment', 'settings', 'env'],
  'DevOps': ['deploy', 'docker', 'ci', 'pipeline', 'build', 'release'],
  'Database': ['sql', 'query', 'migration', 'schema', 'database', 'table'],
  'API Design': ['endpoint', 'route', 'api', 'rest', 'graphql', 'request'],
  'UI/Frontend': ['component', 'style', 'css', 'layout', 'page', 'button', 'form'],
};

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let timer: ReturnType<typeof setInterval> | null = null;
let lastReport: InsightReport | null = null;

// ---------------------------------------------------------------------------
// Core analysis
// ---------------------------------------------------------------------------

function analyzePromptPatterns(sessions: CachedSessionMeta[]): InsightReport['promptPatterns'] {
  // Get user prompts from interaction index
  const promptResult = queryInteractions({ category: 'user-prompt', limit: 200 });
  const prompts = promptResult.items;

  // Average prompt length
  const lengths = prompts.map((p) => p.preview.length);
  const avgPromptLength = lengths.length > 0 ? Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length) : 0;

  // Theme detection
  const themeCounts = new Map<string, { count: number; examples: string[] }>();

  for (const prompt of prompts) {
    const text = prompt.preview.toLowerCase();
    for (const [theme, keywords] of Object.entries(THEME_KEYWORDS)) {
      const matches = keywords.filter((kw) => text.includes(kw));
      if (matches.length >= 1) {
        const existing = themeCounts.get(theme) || { count: 0, examples: [] };
        existing.count++;
        if (existing.examples.length < 3) {
          existing.examples.push(prompt.preview.slice(0, 80));
        }
        themeCounts.set(theme, existing);
      }
    }
  }

  const commonThemes = Array.from(themeCounts.entries())
    .map(([theme, data]) => ({ theme, frequency: data.count, examples: data.examples }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 8);

  // Recurring requests (simple word frequency on first 3 words)
  const phrases = new Map<string, number>();
  for (const prompt of prompts) {
    const words = prompt.preview.toLowerCase().split(/\s+/).slice(0, 4).join(' ');
    if (words.length > 5) {
      phrases.set(words, (phrases.get(words) || 0) + 1);
    }
  }

  const recurringRequests = Array.from(phrases.entries())
    .filter(([, count]) => count >= 2)
    .map(([pattern, count]) => ({ pattern, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return { commonThemes, recurringRequests, avgPromptLength };
}

function analyzeToolUsage(): InsightReport['toolUsageTrends'] {
  // Get tool calls from interaction index
  const toolResult = queryInteractions({ category: 'tool-use', limit: 200 });
  const toolCalls = toolResult.items;

  // Most used tools
  const toolStats = new Map<string, { count: number; riskExposure: number }>();
  for (const call of toolCalls) {
    const existing = toolStats.get(call.toolName || 'unknown') || { count: 0, riskExposure: 0 };
    existing.count++;
    const riskScore = call.toolRiskTier === 'critical' ? 4 : call.toolRiskTier === 'high' ? 3 : call.toolRiskTier === 'medium' ? 2 : 1;
    existing.riskExposure += riskScore;
    toolStats.set(call.toolName || 'unknown', existing);
  }

  const mostUsedTools = Array.from(toolStats.entries())
    .map(([tool, data]) => ({ tool, count: data.count, riskExposure: data.riskExposure }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  // Tool usage over time (group by day)
  const byDay = new Map<string, Record<string, number>>();
  for (const call of toolCalls) {
    const day = call.timestamp.split('T')[0];
    if (!byDay.has(day)) byDay.set(day, {});
    const counts = byDay.get(day)!;
    counts[call.toolName || 'unknown'] = (counts[call.toolName || 'unknown'] || 0) + 1;
  }

  const toolUsageOverTime = Array.from(byDay.entries())
    .map(([date, toolCounts]) => ({ date, toolCounts }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30); // last 30 days

  // Risk exposure trend (by day)
  const riskByDay = new Map<string, { criticalCount: number; highCount: number }>();
  for (const call of toolCalls) {
    const day = call.timestamp.split('T')[0];
    const existing = riskByDay.get(day) || { criticalCount: 0, highCount: 0 };
    if (call.toolRiskTier === 'critical') existing.criticalCount++;
    if (call.toolRiskTier === 'high') existing.highCount++;
    riskByDay.set(day, existing);
  }

  const riskExposureTrend = Array.from(riskByDay.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30);

  return { mostUsedTools, toolUsageOverTime, riskExposureTrend };
}

function analyzeModels(sessions: CachedSessionMeta[]): InsightReport['modelComparison'] {
  const modelStats = new Map<string, { sessionCount: number; totalTokens: number }>();

  for (const session of sessions) {
    const c = session.classification;
    if (!c) continue;

    for (const model of c.modelsUsed) {
      const existing = modelStats.get(model.modelFamily) || { sessionCount: 0, totalTokens: 0 };
      existing.sessionCount++;
      existing.totalTokens += model.inputTokens + model.outputTokens;
      modelStats.set(model.modelFamily, existing);
    }
  }

  const modelsUsed = Array.from(modelStats.entries())
    .map(([model, data]) => ({ model, ...data }))
    .sort((a, b) => b.sessionCount - a.sessionCount);

  const costByModel = modelsUsed.map(({ model, totalTokens }) => ({
    model,
    estimatedCost: (totalTokens / 1_000_000) * (COST_PER_MILLION[model] || 3.0),
  }));

  return { modelsUsed, costByModel };
}

function generateRecommendations(
  prompts: InsightReport['promptPatterns'],
  tools: InsightReport['toolUsageTrends'],
  models: InsightReport['modelComparison'],
): string[] {
  const recommendations: string[] = [];

  // Check for high critical risk exposure
  const criticalTools = tools.mostUsedTools.filter((t) => t.riskExposure > t.count * 3);
  if (criticalTools.length > 0) {
    recommendations.push(
      `High risk exposure: ${criticalTools.map((t) => t.tool).join(', ')} have elevated risk scores. Consider reviewing permission settings.`,
    );
  }

  // Check for model cost optimization
  const expensiveModels = models.costByModel.filter((m) => m.estimatedCost > 1);
  if (expensiveModels.length > 0) {
    const total = expensiveModels.reduce((sum, m) => sum + m.estimatedCost, 0);
    recommendations.push(
      `Estimated spend: $${total.toFixed(2)} across ${expensiveModels.length} models. Consider using cheaper models for simpler tasks.`,
    );
  }

  // Check for thinking usage
  const indexStats = getIndexStats();
  if (indexStats.totalInteractions > 100) {
    recommendations.push(
      `${indexStats.totalInteractions.toLocaleString()} interactions indexed across ${indexStats.sessionsIndexed} sessions.`,
    );
  }

  // Check for recurring patterns
  if (prompts.recurringRequests.length > 3) {
    recommendations.push(
      `${prompts.recurringRequests.length} recurring request patterns detected. Consider creating templates or skills for common prompts.`,
    );
  }

  if (recommendations.length === 0) {
    recommendations.push('No significant issues detected. Your AI usage patterns look healthy.');
  }

  return recommendations;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function runInsightsNow(type: 'scheduled' | 'on-demand' = 'on-demand'): Promise<InsightReport> {
  const start = Date.now();
  const sessions = getAllSessionsUnlimited();

  const promptPatterns = analyzePromptPatterns(sessions);
  const toolUsageTrends = analyzeToolUsage();
  const modelComparison = analyzeModels(sessions);
  const recommendations = generateRecommendations(promptPatterns, toolUsageTrends, modelComparison);

  const report: InsightReport = {
    id: `insight-${Date.now()}`,
    timestamp: new Date().toISOString(),
    type,
    duration_ms: Date.now() - start,
    promptPatterns,
    toolUsageTrends,
    modelComparison,
    recommendations,
  };

  // Persist report
  try {
    await fsp.mkdir(REPORTS_DIR, { recursive: true });
    await fsp.writeFile(
      path.join(REPORTS_DIR, `${report.id}.json`),
      JSON.stringify(report, null, 2),
    );
  } catch {
    // non-critical
  }

  lastReport = report;
  return report;
}

export async function getLatestInsight(): Promise<InsightReport | null> {
  if (lastReport) return lastReport;

  try {
    const files = await fsp.readdir(REPORTS_DIR);
    const sorted = files
      .filter((f) => f.endsWith('.json'))
      .sort()
      .reverse();

    if (sorted.length === 0) return null;

    const content = await fsp.readFile(path.join(REPORTS_DIR, sorted[0]), 'utf-8');
    lastReport = JSON.parse(content);
    return lastReport;
  } catch {
    return null;
  }
}

export async function getInsightHistory(limit = 20): Promise<InsightReport[]> {
  try {
    const files = await fsp.readdir(REPORTS_DIR);
    const sorted = files
      .filter((f) => f.endsWith('.json'))
      .sort()
      .reverse()
      .slice(0, limit);

    const reports: InsightReport[] = [];
    for (const file of sorted) {
      try {
        const content = await fsp.readFile(path.join(REPORTS_DIR, file), 'utf-8');
        reports.push(JSON.parse(content));
      } catch {
        // skip
      }
    }
    return reports;
  } catch {
    return [];
  }
}

export function startInsightsAgent(): void {
  if (timer) return;
  console.log('[insights] Agent started (interval: 1h)');

  // Run first insight after 30 seconds (let indexes build first)
  setTimeout(() => {
    runInsightsNow('scheduled').catch(() => {});
  }, 30_000);

  timer = setInterval(() => {
    runInsightsNow('scheduled').catch(() => {});
  }, DEFAULT_INTERVAL_MS);
}

export function stopInsightsAgent(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

export function getInsightsStatus(): { running: boolean; lastInsight: string | null } {
  return {
    running: !!timer,
    lastInsight: lastReport?.timestamp || null,
  };
}
