import fsp from 'fs/promises';
import path from 'path';
import { jsPDF } from 'jspdf';
import { runInsightsNow, getLatestInsight, type InsightReport } from './insights-agent.js';
import { runAuditNow, getLatestReport as getLatestAudit, type AuditReport } from './auditor-agent.js';
import { PATHS } from './config-resolver.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CombinedReport {
  id: string;
  timestamp: string;
  duration_ms: number;
  executiveSummary: {
    totalSessions: number;
    criticalFindings: number;
    highFindings: number;
    estimatedCostUsd: number;
    topThemes: string[];
    overallHealthStatus: 'healthy' | 'warning' | 'critical';
  };
  securityFindings: AuditReport['security'];
  performanceMetrics: AuditReport['performance'];
  usageInsights: {
    promptPatterns: InsightReport['promptPatterns'];
    toolUsageTrends: InsightReport['toolUsageTrends'];
    modelComparison: InsightReport['modelComparison'];
  };
  billingAnalysis: AuditReport['billing'];
  recommendations: string[];
  sourceReports: {
    insightId: string;
    auditId: string;
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REPORTS_DIR = path.join(PATHS.dataDir, 'reports');

// ---------------------------------------------------------------------------
// Report persistence
// ---------------------------------------------------------------------------

async function ensureReportsDir(): Promise<void> {
  await fsp.mkdir(REPORTS_DIR, { recursive: true });
}

async function saveReport(report: CombinedReport): Promise<void> {
  await ensureReportsDir();
  const filename = `${report.id}.json`;
  await fsp.writeFile(path.join(REPORTS_DIR, filename), JSON.stringify(report, null, 2), 'utf-8');
}

async function listReportFiles(): Promise<string[]> {
  try {
    await ensureReportsDir();
    const files = await fsp.readdir(REPORTS_DIR);
    return files
      .filter((f) => f.startsWith('report-') && f.endsWith('.json'))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Core generation
// ---------------------------------------------------------------------------

export async function generateCombinedReport(): Promise<CombinedReport> {
  const start = Date.now();

  // Run both analyses in parallel; if one is already running, fall back to latest
  const [insight, audit] = await Promise.all([
    runInsightsNow('on-demand').catch(() => getLatestInsight()),
    runAuditNow().catch(() => getLatestAudit()),
  ]);

  if (!insight || !audit) {
    throw new Error('Failed to generate both insight and audit reports');
  }

  // Merge recommendations, deduplicate, sort by severity
  const allRecs = [...audit.recommendations, ...insight.recommendations];
  const uniqueRecs = [...new Set(allRecs)];
  uniqueRecs.sort((a, b) => {
    const priority = (s: string) => {
      if (s.startsWith('URGENT')) return 0;
      if (s.startsWith('BILLING ALERT')) return 1;
      if (s.includes('critical') || s.includes('Critical')) return 2;
      return 3;
    };
    return priority(a) - priority(b);
  });

  // Determine health status
  let overallHealthStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
  if (audit.security.criticalFindings > 0 || audit.billing.alert) {
    overallHealthStatus = 'critical';
  } else if (audit.security.highFindings > 5 || audit.performance.sessionsOver10MB > 0) {
    overallHealthStatus = 'warning';
  }

  const topThemes = insight.promptPatterns.commonThemes
    .slice(0, 5)
    .map((t) => t.theme);

  const report: CombinedReport = {
    id: `report-${Date.now()}`,
    timestamp: new Date().toISOString(),
    duration_ms: Date.now() - start,
    executiveSummary: {
      totalSessions: audit.performance.totalSessions,
      criticalFindings: audit.security.criticalFindings,
      highFindings: audit.security.highFindings,
      estimatedCostUsd: audit.billing.estimatedCostUsd,
      topThemes,
      overallHealthStatus,
    },
    securityFindings: audit.security,
    performanceMetrics: audit.performance,
    usageInsights: {
      promptPatterns: insight.promptPatterns,
      toolUsageTrends: insight.toolUsageTrends,
      modelComparison: insight.modelComparison,
    },
    billingAnalysis: audit.billing,
    recommendations: uniqueRecs,
    sourceReports: {
      insightId: insight.id,
      auditId: audit.id,
    },
  };

  await saveReport(report);
  return report;
}

// ---------------------------------------------------------------------------
// Read reports
// ---------------------------------------------------------------------------

export async function getLatestCombinedReport(): Promise<CombinedReport | null> {
  const files = await listReportFiles();
  if (files.length === 0) return null;

  try {
    const raw = await fsp.readFile(path.join(REPORTS_DIR, files[0]), 'utf-8');
    return JSON.parse(raw) as CombinedReport;
  } catch {
    return null;
  }
}

export async function getCombinedReportHistory(limit = 10): Promise<CombinedReport[]> {
  const files = await listReportFiles();
  const reports: CombinedReport[] = [];

  for (const file of files.slice(0, limit)) {
    try {
      const raw = await fsp.readFile(path.join(REPORTS_DIR, file), 'utf-8');
      reports.push(JSON.parse(raw) as CombinedReport);
    } catch {
      // skip
    }
  }

  return reports;
}

// ---------------------------------------------------------------------------
// Example / demo report with rich sample data
// ---------------------------------------------------------------------------

export function generateExampleReport(): CombinedReport {
  return {
    id: 'report-example-demo',
    timestamp: new Date().toISOString(),
    duration_ms: 142,
    executiveSummary: {
      totalSessions: 1847,
      criticalFindings: 12,
      highFindings: 34,
      estimatedCostUsd: 2847.63,
      topThemes: ['Code Generation', 'Bug Fixing', 'Refactoring', 'API Design', 'Testing', 'DevOps'],
      overallHealthStatus: 'warning',
    },
    securityFindings: {
      criticalFindings: 12,
      highFindings: 34,
      sessionsScanned: 1847,
      topRisks: [
        { sessionId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', risk: 'critical', detail: 'Hardcoded AWS credentials detected in session output' },
        { sessionId: 'b2c3d4e5-f6a7-8901-bcde-f12345678901', risk: 'critical', detail: 'Database connection string with plaintext password' },
        { sessionId: 'c3d4e5f6-a7b8-9012-cdef-123456789012', risk: 'critical', detail: 'Private SSH key content exposed in prompt' },
        { sessionId: 'd4e5f6a7-b8c9-0123-defa-234567890123', risk: 'high', detail: 'Unvalidated user input passed to shell command' },
        { sessionId: 'e5f6a7b8-c9d0-1234-efab-345678901234', risk: 'high', detail: 'JWT secret stored in frontend configuration' },
        { sessionId: 'f6a7b8c9-d0e1-2345-fabc-456789012345', risk: 'high', detail: 'SQL injection vulnerability in generated query builder' },
      ],
      newSinceLastAudit: 8,
    },
    performanceMetrics: {
      totalSessions: 1847,
      totalSizeBytes: 14_800_000_000,
      avgSessionSizeBytes: 8_012_000,
      sessionsOver10MB: 284,
      largestSession: { id: 'abc123-largest-session-id', sizeBytes: 847_000_000 },
    },
    usageInsights: {
      promptPatterns: {
        avgPromptLength: 342,
        commonThemes: [
          { theme: 'Code Generation', frequency: 487, examples: ['generate a REST API endpoint', 'create React component'] },
          { theme: 'Bug Fixing', frequency: 312, examples: ['fix this TypeError', 'debug auth flow'] },
          { theme: 'Refactoring', frequency: 256, examples: ['refactor to use hooks', 'extract utility function'] },
          { theme: 'API Design', frequency: 198, examples: ['design GraphQL schema', 'add pagination'] },
          { theme: 'Testing', frequency: 174, examples: ['write unit tests', 'add integration tests'] },
          { theme: 'DevOps', frequency: 142, examples: ['set up CI/CD', 'configure Docker'] },
        ],
        recurringRequests: [
          { pattern: 'fix this error', count: 89 },
          { pattern: 'write a function that', count: 67 },
          { pattern: 'refactor this code', count: 54 },
        ],
      },
      toolUsageTrends: {
        mostUsedTools: [
          { tool: 'Edit', count: 4823, riskExposure: 1 },
          { tool: 'Read', count: 3912, riskExposure: 0 },
          { tool: 'Write', count: 2847, riskExposure: 5 },
          { tool: 'Bash', count: 2134, riskExposure: 18 },
          { tool: 'Glob', count: 1567, riskExposure: 0 },
          { tool: 'Grep', count: 1234, riskExposure: 0 },
          { tool: 'TodoWrite', count: 892, riskExposure: 0 },
          { tool: 'Task', count: 456, riskExposure: 3 },
          { tool: 'WebFetch', count: 234, riskExposure: 4 },
          { tool: 'NotebookEdit', count: 89, riskExposure: 0 },
        ],
        toolUsageOverTime: [
          { date: '2026-02-05', toolCounts: { Edit: 680, Read: 520, Bash: 310, Write: 400 } },
          { date: '2026-02-06', toolCounts: { Edit: 720, Read: 580, Bash: 340, Write: 420 } },
          { date: '2026-02-07', toolCounts: { Edit: 650, Read: 490, Bash: 290, Write: 380 } },
          { date: '2026-02-08', toolCounts: { Edit: 710, Read: 550, Bash: 320, Write: 410 } },
          { date: '2026-02-09', toolCounts: { Edit: 690, Read: 510, Bash: 300, Write: 390 } },
        ],
        riskExposureTrend: [
          { date: '2026-02-05', criticalCount: 2, highCount: 6 },
          { date: '2026-02-06', criticalCount: 3, highCount: 8 },
          { date: '2026-02-07', criticalCount: 1, highCount: 5 },
          { date: '2026-02-08', criticalCount: 4, highCount: 9 },
          { date: '2026-02-09', criticalCount: 2, highCount: 6 },
        ],
      },
      modelComparison: {
        modelsUsed: [
          { model: 'claude-opus-4', sessionCount: 724, totalTokens: 847_000_000 },
          { model: 'claude-sonnet-4', sessionCount: 612, totalTokens: 234_000_000 },
          { model: 'claude-haiku-3.5', sessionCount: 356, totalTokens: 45_600_000 },
          { model: 'gpt-4o', sessionCount: 155, totalTokens: 89_200_000 },
        ],
        costByModel: [
          { model: 'claude-opus-4', estimatedCost: 1847.32 },
          { model: 'claude-sonnet-4', estimatedCost: 584.50 },
          { model: 'claude-haiku-3.5', estimatedCost: 22.80 },
          { model: 'gpt-4o', estimatedCost: 393.01 },
        ],
      },
    },
    billingAnalysis: {
      estimatedCostUsd: 2847.63,
      costChangePercent: 23,
      topModels: [
        { model: 'claude-opus-4', tokens: 847_000_000 },
        { model: 'claude-sonnet-4', tokens: 234_000_000 },
        { model: 'gpt-4o', tokens: 89_200_000 },
        { model: 'claude-haiku-3.5', tokens: 45_600_000 },
      ],
      alert: true,
      alertReason: 'Monthly spend increased 23% — Opus usage up 40% from last period',
    },
    recommendations: [
      'URGENT: 12 critical security findings detected across 8 sessions. Review immediately and rotate exposed credentials.',
      'BILLING ALERT: Monthly cost rose 23% to $2,847.63. Consider routing simple tasks to Haiku to reduce Opus spend.',
      '284 sessions exceed 10MB. Implement session size limits or auto-archival for sessions over 50MB.',
      'Average session size is 8.0MB across 1,847 sessions. Consider compressing or distilling older sessions.',
      'Total storage is 14.8GB. Implement data retention policies to prevent unbounded growth.',
      'Bash tool has high risk exposure with 2,134 invocations. Consider restricting shell commands to an allowlist.',
      '89 repetitive "fix this error" prompts detected. Create a debugging template or skill to reduce token waste.',
      'claude-haiku-3.5 is 81x cheaper per token than Opus. Route code review and formatting tasks to Haiku.',
      'Consider enabling real-time alerting for credential exposure patterns in AI sessions.',
      '174 testing-related sessions detected. Integrate CI/CD pipeline to reduce manual test-via-AI cycles.',
    ],
    sourceReports: {
      insightId: 'insight-example',
      auditId: 'audit-example',
    },
  };
}

// ---------------------------------------------------------------------------
// Markdown export
// ---------------------------------------------------------------------------

function formatTokens(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return String(n);
}

function formatBytes(bytes: number): string {
  if (bytes > 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
  if (bytes > 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes > 1000) return `${(bytes / 1000).toFixed(1)} KB`;
  return `${bytes} B`;
}

export function exportCombinedMarkdown(report: CombinedReport): string {
  const lines: string[] = [];
  const ts = new Date(report.timestamp).toLocaleString();

  lines.push('# JubitMind Comprehensive Report');
  lines.push('');
  lines.push(`> Generated: ${ts} | Duration: ${report.duration_ms}ms`);
  lines.push('');

  // Executive Summary
  lines.push('## Executive Summary');
  lines.push('');
  const es = report.executiveSummary;
  const healthBadge = es.overallHealthStatus === 'healthy' ? 'Healthy' :
    es.overallHealthStatus === 'warning' ? 'Warning' : 'Critical';
  lines.push(`- **Health Status:** ${healthBadge}`);
  lines.push(`- **Sessions Scanned:** ${es.totalSessions.toLocaleString()}`);
  lines.push(`- **Critical Findings:** ${es.criticalFindings}`);
  lines.push(`- **High Findings:** ${es.highFindings}`);
  lines.push(`- **Estimated Cost:** $${es.estimatedCostUsd.toFixed(2)}`);
  if (es.topThemes.length > 0) {
    lines.push(`- **Top Themes:** ${es.topThemes.join(', ')}`);
  }
  lines.push('');

  // Security
  lines.push('## Security Findings');
  lines.push('');
  lines.push(`- Sessions scanned: ${report.securityFindings.sessionsScanned}`);
  lines.push(`- Critical findings: ${report.securityFindings.criticalFindings}`);
  lines.push(`- High findings: ${report.securityFindings.highFindings}`);
  lines.push(`- New since last audit: ${report.securityFindings.newSinceLastAudit}`);
  lines.push('');

  if (report.securityFindings.topRisks.length > 0) {
    lines.push('### Top Risks');
    lines.push('');
    lines.push('| Session | Risk | Detail |');
    lines.push('|---------|------|--------|');
    for (const r of report.securityFindings.topRisks.slice(0, 10)) {
      lines.push(`| ${r.sessionId.slice(0, 12)}... | ${r.risk} | ${r.detail} |`);
    }
    lines.push('');
  }

  // Performance
  lines.push('## Performance');
  lines.push('');
  const perf = report.performanceMetrics;
  lines.push(`- Total storage: ${formatBytes(perf.totalSizeBytes)}`);
  lines.push(`- Average session size: ${formatBytes(perf.avgSessionSizeBytes)}`);
  lines.push(`- Sessions over 10MB: ${perf.sessionsOver10MB}`);
  if (perf.largestSession.id) {
    lines.push(`- Largest session: ${perf.largestSession.id.slice(0, 12)}... (${formatBytes(perf.largestSession.sizeBytes)})`);
  }
  lines.push('');

  // Usage Insights
  lines.push('## Usage Insights');
  lines.push('');

  // Prompt patterns
  const pp = report.usageInsights.promptPatterns;
  lines.push(`- **Average prompt length:** ${pp.avgPromptLength} chars`);
  lines.push('');

  if (pp.commonThemes.length > 0) {
    lines.push('### Common Themes');
    lines.push('');
    lines.push('| Theme | Frequency |');
    lines.push('|-------|-----------|');
    for (const t of pp.commonThemes) {
      lines.push(`| ${t.theme} | ${t.frequency} |`);
    }
    lines.push('');
  }

  // Tool usage
  const tools = report.usageInsights.toolUsageTrends;
  if (tools.mostUsedTools.length > 0) {
    lines.push('### Most Used Tools');
    lines.push('');
    lines.push('| Tool | Count | Risk Exposure |');
    lines.push('|------|-------|---------------|');
    for (const t of tools.mostUsedTools.slice(0, 10)) {
      lines.push(`| ${t.tool} | ${t.count} | ${t.riskExposure} |`);
    }
    lines.push('');
  }

  // Model comparison
  const models = report.usageInsights.modelComparison;
  if (models.modelsUsed.length > 0) {
    lines.push('### Model Comparison');
    lines.push('');
    lines.push('| Model | Sessions | Tokens | Est. Cost |');
    lines.push('|-------|----------|--------|-----------|');
    for (const m of models.modelsUsed) {
      const cost = models.costByModel.find((c) => c.model === m.model);
      lines.push(`| ${m.model} | ${m.sessionCount} | ${formatTokens(m.totalTokens)} | $${cost?.estimatedCost?.toFixed(2) || '0.00'} |`);
    }
    lines.push('');
  }

  // Billing
  lines.push('## Billing Analysis');
  lines.push('');
  const billing = report.billingAnalysis;
  lines.push(`- **Estimated cost:** $${billing.estimatedCostUsd.toFixed(2)}`);
  lines.push(`- **Cost change:** ${billing.costChangePercent > 0 ? '+' : ''}${billing.costChangePercent}%`);
  if (billing.alert) {
    lines.push(`- **Alert:** ${billing.alertReason}`);
  }
  lines.push('');

  // Recommendations
  if (report.recommendations.length > 0) {
    lines.push('## Recommendations');
    lines.push('');
    for (const rec of report.recommendations) {
      lines.push(`- ${rec}`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('*Generated by JubitMind*');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// PDF export with infographics (server-side, no DOM required)
// ---------------------------------------------------------------------------

// Color palette
const TEAL = [20, 184, 166] as const;
const RED = [248, 81, 73] as const;
const ORANGE = [249, 115, 22] as const;
const YELLOW = [234, 179, 8] as const;
const GREEN = [34, 197, 94] as const;
const BLUE = [59, 130, 246] as const;
const PURPLE = [168, 85, 247] as const;
const GRAY_BG = [241, 245, 249] as const;
const GRAY_BORDER = [203, 213, 225] as const;
const DARK_TEXT = [30, 41, 59] as const;
const MID_TEXT = [100, 116, 139] as const;
const LIGHT_TEXT = [148, 163, 184] as const;

const CHART_COLORS = [TEAL, BLUE, PURPLE, ORANGE, GREEN, YELLOW, RED] as const;

export function exportCombinedPdf(report: CombinedReport): Buffer {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = 0;

  // ---- Helpers ----

  const setColor = (c: readonly [number, number, number]) => pdf.setTextColor(c[0], c[1], c[2]);
  const setFill = (c: readonly [number, number, number]) => pdf.setFillColor(c[0], c[1], c[2]);
  const setDraw = (c: readonly [number, number, number]) => pdf.setDrawColor(c[0], c[1], c[2]);

  const checkPage = (needed: number) => {
    if (y + needed > pageH - 15) {
      pdf.addPage();
      y = 15;
    }
  };

  const sectionHeading = (text: string) => {
    checkPage(18);
    y += 4;
    setFill(TEAL);
    pdf.rect(margin, y - 2, 3, 10, 'F'); // teal accent bar
    pdf.setFontSize(13);
    setColor(DARK_TEXT);
    pdf.text(text, margin + 6, y + 5);
    y += 14;
  };

  const subHeading = (text: string) => {
    checkPage(10);
    pdf.setFontSize(9);
    setColor(MID_TEXT);
    pdf.text(text, margin, y);
    y += 5;
  };

  // Draw a stat card (rounded box with value + label)
  const statCard = (x: number, cardY: number, w: number, h: number, value: string, label: string, accent: readonly [number, number, number]) => {
    // Background
    setFill(GRAY_BG);
    pdf.roundedRect(x, cardY, w, h, 2, 2, 'F');
    // Accent top line
    setFill(accent);
    pdf.rect(x, cardY, w, 1.5, 'F');
    // Value
    pdf.setFontSize(16);
    setColor(DARK_TEXT);
    pdf.text(value, x + w / 2, cardY + 12, { align: 'center' });
    // Label
    pdf.setFontSize(7);
    setColor(MID_TEXT);
    pdf.text(label, x + w / 2, cardY + 18, { align: 'center' });
  };

  // Draw a horizontal bar chart
  const hBarChart = (items: Array<{ label: string; value: number; color?: readonly [number, number, number] }>, maxBarW: number) => {
    if (items.length === 0) return;
    const maxVal = Math.max(...items.map((i) => i.value), 1);
    const barH = 5;
    const rowH = 9;
    const labelW = 35;

    checkPage(items.length * rowH + 5);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const bx = margin + labelW;
      const by = y + i * rowH;
      const barW = (item.value / maxVal) * maxBarW;
      const color = item.color || CHART_COLORS[i % CHART_COLORS.length];

      // Label
      pdf.setFontSize(8);
      setColor(DARK_TEXT);
      const truncated = item.label.length > 18 ? item.label.slice(0, 17) + '...' : item.label;
      pdf.text(truncated, margin, by + barH - 0.5);

      // Bar background
      setFill(GRAY_BG);
      pdf.roundedRect(bx, by, maxBarW, barH, 1, 1, 'F');

      // Bar fill
      if (barW > 1) {
        setFill(color);
        pdf.roundedRect(bx, by, barW, barH, 1, 1, 'F');
      }

      // Value label
      pdf.setFontSize(7);
      setColor(MID_TEXT);
      pdf.text(String(item.value), bx + maxBarW + 2, by + barH - 0.5);
    }

    y += items.length * rowH + 3;
  };

  // Draw a mini donut / ring segment chart
  const donutChart = (cx: number, cy: number, r: number, segments: Array<{ value: number; color: readonly [number, number, number]; label: string }>) => {
    const total = segments.reduce((s, seg) => s + seg.value, 0);
    if (total === 0) return;

    let startAngle = -Math.PI / 2; // start from top
    const thickness = r * 0.35;

    for (const seg of segments) {
      const sweep = (seg.value / total) * Math.PI * 2;
      const endAngle = startAngle + sweep;

      // Draw arc using many small line segments
      setFill(seg.color);
      const steps = Math.max(Math.ceil(sweep / 0.05), 4);
      const points: Array<[number, number]> = [];

      // Outer arc
      for (let i = 0; i <= steps; i++) {
        const a = startAngle + (sweep * i) / steps;
        points.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
      }
      // Inner arc (reverse)
      for (let i = steps; i >= 0; i--) {
        const a = startAngle + (sweep * i) / steps;
        points.push([cx + Math.cos(a) * (r - thickness), cy + Math.sin(a) * (r - thickness)]);
      }

      // Draw filled polygon using triangle fan
      if (points.length > 2) {
        pdf.setLineWidth(0);
        setFill(seg.color);
        for (let i = 1; i < points.length - 1; i++) {
          pdf.triangle(
            points[0][0], points[0][1],
            points[i][0], points[i][1],
            points[i + 1][0], points[i + 1][1],
            'F',
          );
        }
      }

      startAngle = endAngle;
    }

    // Center circle (white)
    setFill([255, 255, 255]);
    // Draw a small circle by using many tiny triangles
    const innerR = r - thickness - 0.3;
    for (let i = 0; i < 60; i++) {
      const a1 = (i / 60) * Math.PI * 2;
      const a2 = ((i + 1) / 60) * Math.PI * 2;
      pdf.triangle(
        cx, cy,
        cx + Math.cos(a1) * innerR, cy + Math.sin(a1) * innerR,
        cx + Math.cos(a2) * innerR, cy + Math.sin(a2) * innerR,
        'F',
      );
    }
  };

  // Draw a risk severity gauge (horizontal segmented bar)
  const riskGauge = (x: number, gaugeY: number, w: number, critical: number, high: number, total: number) => {
    const h = 8;
    const safe = Math.max(total - critical - high, 0);

    // Background
    setFill([230, 240, 230]);
    pdf.roundedRect(x, gaugeY, w, h, 2, 2, 'F');

    if (total > 0) {
      const cW = (critical / total) * w;
      const hW = (high / total) * w;
      const sW = (safe / total) * w;

      let cx = x;
      if (sW > 0) { setFill(GREEN); pdf.rect(cx, gaugeY, sW, h, 'F'); cx += sW; }
      if (hW > 0) { setFill(ORANGE); pdf.rect(cx, gaugeY, hW, h, 'F'); cx += hW; }
      if (cW > 0) { setFill(RED); pdf.rect(cx, gaugeY, cW, h, 'F'); }

      // Round corners overlay
      setFill([255, 255, 255]);
      // top-left and bottom-left rounding via small white circles if safe
      // (skip for simplicity - rounded rect edges are fine)
    }

    // Labels below gauge
    const labelY = gaugeY + h + 4;
    pdf.setFontSize(7);
    setColor(GREEN); pdf.text(`Safe: ${safe}`, x, labelY);
    setColor(ORANGE); pdf.text(`High: ${high}`, x + w * 0.4, labelY);
    setColor(RED); pdf.text(`Critical: ${critical}`, x + w * 0.75, labelY);
  };

  // Draw a table row
  const tableRow = (cols: Array<{ text: string; width: number; align?: 'left' | 'right' | 'center' }>, rowY: number, isHeader: boolean) => {
    let cx = margin;
    for (const col of cols) {
      pdf.setFontSize(isHeader ? 7 : 8);
      if (isHeader) {
        setColor(MID_TEXT);
      } else {
        setColor(DARK_TEXT);
      }
      const align = col.align || 'left';
      const tx = align === 'right' ? cx + col.width - 1 : align === 'center' ? cx + col.width / 2 : cx + 1;
      pdf.text(col.text, tx, rowY, { align });
      cx += col.width;
    }
  };

  // ============================================================
  // PAGE 1: Header + Executive Summary + Security
  // ============================================================

  // Header banner
  setFill(TEAL);
  pdf.rect(0, 0, pageW, 28, 'F');
  pdf.setFontSize(20);
  pdf.setTextColor(255, 255, 255);
  pdf.text('JubitMind', margin, 13);
  pdf.setFontSize(10);
  pdf.text('Comprehensive Report', margin, 20);
  pdf.setFontSize(8);
  pdf.text(new Date(report.timestamp).toLocaleString(), pageW - margin, 13, { align: 'right' });
  pdf.text(`Generated in ${report.duration_ms}ms`, pageW - margin, 20, { align: 'right' });
  y = 35;

  // Health status badge (top right area)
  const es = report.executiveSummary;
  const healthColor = es.overallHealthStatus === 'healthy' ? GREEN :
    es.overallHealthStatus === 'warning' ? YELLOW : RED;
  const healthLabel = es.overallHealthStatus.toUpperCase();
  const badgeW = pdf.getTextWidth(healthLabel) * 0.35 + 10;
  setFill(healthColor);
  pdf.roundedRect(pageW - margin - badgeW, 30, badgeW, 7, 2, 2, 'F');
  pdf.setFontSize(8);
  pdf.setTextColor(255, 255, 255);
  pdf.text(healthLabel, pageW - margin - badgeW / 2, 35, { align: 'center' });

  // ---- Executive Summary stat cards ----
  y = 40;
  const cardW = (contentW - 12) / 4; // 4 cards with 4mm gaps
  const cardH = 22;
  statCard(margin, y, cardW, cardH, es.totalSessions.toLocaleString(), 'SESSIONS SCANNED', BLUE);
  statCard(margin + cardW + 4, y, cardW, cardH, String(es.criticalFindings), 'CRITICAL FINDINGS', RED);
  statCard(margin + (cardW + 4) * 2, y, cardW, cardH, String(es.highFindings), 'HIGH FINDINGS', ORANGE);
  statCard(margin + (cardW + 4) * 3, y, cardW, cardH,
    es.estimatedCostUsd > 0 ? `$${es.estimatedCostUsd.toFixed(2)}` : '$0.00',
    'ESTIMATED COST', GREEN);
  y += cardH + 6;

  // Top themes pills
  if (es.topThemes.length > 0) {
    pdf.setFontSize(7);
    setColor(MID_TEXT);
    pdf.text('TOP THEMES', margin, y);
    y += 4;
    let pillX = margin;
    for (const theme of es.topThemes) {
      const tw = pdf.getTextWidth(theme) * 0.35 + 6;
      if (pillX + tw > pageW - margin) { pillX = margin; y += 7; }
      setFill(GRAY_BG);
      setDraw(GRAY_BORDER);
      pdf.roundedRect(pillX, y - 3, tw, 6, 1.5, 1.5, 'FD');
      pdf.setFontSize(7);
      setColor(DARK_TEXT);
      pdf.text(theme, pillX + 3, y + 0.5);
      pillX += tw + 2;
    }
    y += 8;
  }

  // ---- Security Section with Risk Gauge ----
  sectionHeading('Security Overview');

  // Risk gauge
  riskGauge(margin, y, contentW * 0.6, report.securityFindings.criticalFindings, report.securityFindings.highFindings, report.securityFindings.sessionsScanned);

  // Session stats next to gauge
  const gaugeStatsX = margin + contentW * 0.65;
  pdf.setFontSize(8);
  setColor(DARK_TEXT);
  pdf.text(`${report.securityFindings.sessionsScanned} sessions scanned`, gaugeStatsX, y + 3);
  pdf.text(`${report.securityFindings.newSinceLastAudit} new since last audit`, gaugeStatsX, y + 8);
  y += 18;

  // Top risks table
  if (report.securityFindings.topRisks.length > 0) {
    subHeading('Top Risks');
    const riskCols = [
      { text: 'SEVERITY', width: 22 },
      { text: 'DETAIL', width: contentW - 22 },
    ];
    // Header row
    setFill(GRAY_BG);
    pdf.rect(margin, y - 2.5, contentW, 6, 'F');
    tableRow(riskCols.map((c) => ({ ...c, align: 'left' as const })), y, true);
    y += 6;

    for (const r of report.securityFindings.topRisks.slice(0, 6)) {
      checkPage(8);
      const sevColor = r.risk === 'critical' ? RED : ORANGE;
      setFill(sevColor);
      pdf.roundedRect(margin + 1, y - 2.5, 18, 5, 1, 1, 'F');
      pdf.setFontSize(6);
      pdf.setTextColor(255, 255, 255);
      pdf.text(r.risk.toUpperCase(), margin + 10, y, { align: 'center' });
      pdf.setFontSize(8);
      setColor(DARK_TEXT);
      pdf.text(r.detail.slice(0, 60), margin + 23, y);
      y += 6;
    }
    y += 3;
  }

  // ============================================================
  // PAGE 2: Tool Usage + Model Comparison charts
  // ============================================================
  pdf.addPage();
  y = 15;

  // ---- Tool Usage bar chart ----
  sectionHeading('Tool Usage');
  const tools = report.usageInsights.toolUsageTrends.mostUsedTools.slice(0, 10);
  if (tools.length > 0) {
    hBarChart(
      tools.map((t, i) => ({
        label: t.tool,
        value: t.count,
        color: CHART_COLORS[i % CHART_COLORS.length],
      })),
      contentW - 50,
    );
  }

  // ---- Theme Distribution donut + Model Comparison side by side ----
  const themes = report.usageInsights.promptPatterns.commonThemes.slice(0, 6);
  const models = report.usageInsights.modelComparison.modelsUsed;

  checkPage(65);

  if (themes.length > 0 || models.length > 0) {
    const halfW = contentW / 2;

    // Left: Theme donut chart
    if (themes.length > 0) {
      sectionHeading('Prompt Themes');
      const donutY = y + 18;
      const donutR = 14;
      const donutCx = margin + 20;

      donutChart(
        donutCx, donutY, donutR,
        themes.map((t, i) => ({
          value: t.frequency,
          color: CHART_COLORS[i % CHART_COLORS.length],
          label: t.theme,
        })),
      );

      // Legend next to donut
      let ly = donutY - donutR + 2;
      for (let i = 0; i < themes.length; i++) {
        const color = CHART_COLORS[i % CHART_COLORS.length];
        setFill(color);
        pdf.rect(donutCx + donutR + 8, ly, 3, 3, 'F');
        pdf.setFontSize(7);
        setColor(DARK_TEXT);
        pdf.text(`${themes[i].theme} (${themes[i].frequency})`, donutCx + donutR + 13, ly + 2.5);
        ly += 5;
      }

      y = donutY + donutR + 8;
    }

    // Model comparison bar chart
    if (models.length > 0) {
      sectionHeading('Model Comparison');

      // Table with visual bars
      const colModel = 30;
      const colSessions = 20;
      const colTokens = 22;
      const colCost = 20;
      const colBar = contentW - colModel - colSessions - colTokens - colCost - 5;

      // Header
      checkPage(10);
      setFill(GRAY_BG);
      pdf.rect(margin, y - 2.5, contentW, 6, 'F');
      pdf.setFontSize(7);
      setColor(MID_TEXT);
      pdf.text('MODEL', margin + 1, y);
      pdf.text('SESSIONS', margin + colModel + 1, y);
      pdf.text('TOKENS', margin + colModel + colSessions + 1, y);
      pdf.text('COST', margin + colModel + colSessions + colTokens + 1, y);
      pdf.text('DISTRIBUTION', margin + colModel + colSessions + colTokens + colCost + 1, y);
      y += 7;

      const maxSessions = Math.max(...models.map((m) => m.sessionCount), 1);

      for (let i = 0; i < Math.min(models.length, 8); i++) {
        checkPage(9);
        const m = models[i];
        const cost = report.usageInsights.modelComparison.costByModel.find((c) => c.model === m.model);
        const color = CHART_COLORS[i % CHART_COLORS.length];

        pdf.setFontSize(8);
        setColor(DARK_TEXT);
        const mName = m.model.length > 14 ? m.model.slice(0, 13) + '...' : m.model;
        pdf.text(mName, margin + 1, y);
        pdf.text(String(m.sessionCount), margin + colModel + 1, y);
        pdf.text(formatTokens(m.totalTokens), margin + colModel + colSessions + 1, y);
        pdf.text(`$${cost?.estimatedCost?.toFixed(0) || '0'}`, margin + colModel + colSessions + colTokens + 1, y);

        // Distribution bar
        const barX = margin + colModel + colSessions + colTokens + colCost + 1;
        const barW = (m.sessionCount / maxSessions) * colBar;
        setFill(GRAY_BG);
        pdf.roundedRect(barX, y - 3, colBar, 4.5, 1, 1, 'F');
        if (barW > 1) {
          setFill(color);
          pdf.roundedRect(barX, y - 3, barW, 4.5, 1, 1, 'F');
        }

        y += 7;
      }
      y += 3;
    }
  }

  // ---- Performance metrics cards row ----
  checkPage(35);
  sectionHeading('Performance');

  const perf = report.performanceMetrics;
  const perfCardW = (contentW - 8) / 3;
  statCard(margin, y, perfCardW, cardH, formatBytes(perf.totalSizeBytes), 'TOTAL STORAGE', BLUE);
  statCard(margin + perfCardW + 4, y, perfCardW, cardH, formatBytes(perf.avgSessionSizeBytes), 'AVG SESSION', TEAL);
  statCard(margin + (perfCardW + 4) * 2, y, perfCardW, cardH, String(perf.sessionsOver10MB), 'OVER 10MB', perf.sessionsOver10MB > 0 ? ORANGE : GREEN);
  y += cardH + 6;

  // ---- Billing section ----
  checkPage(30);
  sectionHeading('Billing Analysis');

  const billing = report.billingAnalysis;
  const billCardW = (contentW - 4) / 2;
  statCard(margin, y, billCardW, cardH, `$${billing.estimatedCostUsd.toFixed(2)}`, 'ESTIMATED COST', billing.estimatedCostUsd > 100 ? RED : GREEN);
  const changeLabel = `${billing.costChangePercent > 0 ? '+' : ''}${billing.costChangePercent}%`;
  statCard(margin + billCardW + 4, y, billCardW, cardH, changeLabel, 'COST CHANGE', billing.costChangePercent > 50 ? RED : billing.costChangePercent > 0 ? YELLOW : GREEN);
  y += cardH + 2;

  if (billing.alert) {
    checkPage(10);
    setFill([254, 243, 199]); // light yellow bg
    pdf.roundedRect(margin, y, contentW, 8, 2, 2, 'F');
    pdf.setFontSize(8);
    setColor(ORANGE);
    pdf.text(`\u26A0 ${billing.alertReason}`, margin + 3, y + 5);
    y += 12;
  }

  // ---- Cost by Model mini bar chart (in billing section) ----
  const costModels = report.usageInsights.modelComparison.costByModel.filter((c) => c.estimatedCost > 0);
  if (costModels.length > 0) {
    checkPage(costModels.length * 9 + 12);
    subHeading('COST BY MODEL');
    hBarChart(
      costModels.slice(0, 5).map((c, i) => ({
        label: c.model,
        value: Math.round(c.estimatedCost * 100) / 100,
        color: CHART_COLORS[i % CHART_COLORS.length],
      })),
      contentW - 50,
    );
  }

  // ---- Token distribution summary ----
  const totalTokens = report.usageInsights.modelComparison.modelsUsed.reduce((s, m) => s + m.totalTokens, 0);
  if (totalTokens > 0) {
    checkPage(14);
    const tokenCardW = (contentW - 4) / 2;
    statCard(margin, y, tokenCardW, cardH, formatTokens(totalTokens), 'TOTAL TOKENS', PURPLE);
    const modelCount = report.usageInsights.modelComparison.modelsUsed.length;
    statCard(margin + tokenCardW + 4, y, tokenCardW, cardH, String(modelCount), 'MODELS USED', BLUE);
    y += cardH + 6;
  }

  // ---- Recommendations (flows naturally, no forced page break) ----
  if (report.recommendations.length > 0) {
    checkPage(20);
    sectionHeading('Recommendations');

    for (let i = 0; i < report.recommendations.length; i++) {
      const rec = report.recommendations[i];
      checkPage(14);

      const isUrgent = rec.startsWith('URGENT') || rec.startsWith('BILLING ALERT');
      const bgColor = isUrgent ? [254, 226, 226] as const : GRAY_BG; // light red or gray
      const accentColor = isUrgent ? RED : TEAL;

      setFill(bgColor);
      const textLines = pdf.splitTextToSize(rec, contentW - 14);
      const boxH = Math.max(textLines.length * 4 + 4, 10);
      pdf.roundedRect(margin, y, contentW, boxH, 2, 2, 'F');

      // Left accent bar
      setFill(accentColor);
      pdf.rect(margin, y, 2.5, boxH, 'F');

      // Number badge
      setFill(accentColor);
      const badgeSize = 5;
      pdf.circle(margin + 7, y + boxH / 2, badgeSize / 2, 'F');
      pdf.setFontSize(7);
      pdf.setTextColor(255, 255, 255);
      pdf.text(String(i + 1), margin + 7, y + boxH / 2 + 1, { align: 'center' });

      // Recommendation text
      pdf.setFontSize(8);
      setColor(DARK_TEXT);
      pdf.text(textLines, margin + 12, y + 4.5);
      y += boxH + 1.5;
    }
  }

  // ---- Footer on every page ----
  const totalPages = pdf.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    setDraw(GRAY_BORDER);
    pdf.line(margin, pageH - 10, pageW - margin, pageH - 10);
    pdf.setFontSize(7);
    setColor(LIGHT_TEXT);
    pdf.text('Generated by JubitMind', margin, pageH - 6);
    pdf.text(`Page ${p} of ${totalPages}`, pageW - margin, pageH - 6, { align: 'right' });
  }

  return Buffer.from(pdf.output('arraybuffer'));
}
