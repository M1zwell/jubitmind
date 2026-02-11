import fsp from 'fs/promises';
import path from 'path';
import { jsPDF } from 'jspdf';
import { runInsightsNow, getLatestInsight, type InsightReport } from './insights-agent.js';
import { runAuditNow, getLatestReport as getLatestAudit, type AuditReport } from './auditor-agent.js';

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

const REPORTS_DIR = path.join(process.cwd(), 'data', 'reports');

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
// Markdown export
// ---------------------------------------------------------------------------

function formatTokens(n: number): string {
  if (n > 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n > 1000) return `${(n / 1000).toFixed(0)}K`;
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
// PDF export (server-side, no DOM required)
// ---------------------------------------------------------------------------

export function exportCombinedPdf(report: CombinedReport): Buffer {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = 20;

  const checkPage = (needed: number) => {
    if (y + needed > pdf.internal.pageSize.getHeight() - 15) {
      pdf.addPage();
      y = 20;
    }
  };

  const heading = (text: string, size = 14) => {
    checkPage(15);
    pdf.setFontSize(size);
    pdf.setTextColor(20, 184, 166);
    pdf.text(text, margin, y);
    y += size * 0.5 + 3;
  };

  const label = (text: string) => {
    checkPage(8);
    pdf.setFontSize(9);
    pdf.setTextColor(150);
    pdf.text(text, margin, y);
    y += 5;
  };

  const body = (text: string) => {
    checkPage(8);
    pdf.setFontSize(10);
    pdf.setTextColor(60);
    const lines = pdf.splitTextToSize(text, contentW);
    pdf.text(lines, margin, y);
    y += lines.length * 4.5;
  };

  const bullet = (text: string) => {
    checkPage(8);
    pdf.setFontSize(9);
    pdf.setTextColor(80);
    const lines = pdf.splitTextToSize(text, contentW - 5);
    pdf.text('\u2022', margin, y);
    pdf.text(lines, margin + 5, y);
    y += lines.length * 4.2;
  };

  // Title
  heading('JubitMind Comprehensive Report', 18);
  label(`Generated: ${new Date(report.timestamp).toLocaleString()} | Duration: ${report.duration_ms}ms`);
  y += 5;

  // Executive Summary
  heading('Executive Summary');
  const es = report.executiveSummary;
  const healthBadge = es.overallHealthStatus === 'healthy' ? 'Healthy' :
    es.overallHealthStatus === 'warning' ? 'Warning' : 'Critical';
  bullet(`Health Status: ${healthBadge}`);
  bullet(`Sessions Scanned: ${es.totalSessions.toLocaleString()}`);
  bullet(`Critical Findings: ${es.criticalFindings} | High Findings: ${es.highFindings}`);
  bullet(`Estimated Cost: $${es.estimatedCostUsd.toFixed(2)}`);
  if (es.topThemes.length > 0) {
    bullet(`Top Themes: ${es.topThemes.join(', ')}`);
  }
  y += 3;

  // Security
  heading('Security Findings');
  bullet(`Sessions scanned: ${report.securityFindings.sessionsScanned}`);
  bullet(`Critical: ${report.securityFindings.criticalFindings} | High: ${report.securityFindings.highFindings}`);
  for (const r of report.securityFindings.topRisks.slice(0, 5)) {
    bullet(`[${r.risk}] ${r.detail} (session: ${r.sessionId.slice(0, 12)}...)`);
  }
  y += 3;

  // Performance
  heading('Performance');
  bullet(`Total storage: ${formatBytes(report.performanceMetrics.totalSizeBytes)}`);
  bullet(`Average session: ${formatBytes(report.performanceMetrics.avgSessionSizeBytes)}`);
  bullet(`Sessions over 10MB: ${report.performanceMetrics.sessionsOver10MB}`);
  y += 3;

  // Usage Insights
  heading('Usage Insights');
  bullet(`Average prompt length: ${report.usageInsights.promptPatterns.avgPromptLength} chars`);
  if (report.usageInsights.promptPatterns.commonThemes.length > 0) {
    label('Common Themes:');
    for (const t of report.usageInsights.promptPatterns.commonThemes.slice(0, 5)) {
      bullet(`${t.theme}: ${t.frequency} occurrences`);
    }
  }
  y += 2;

  if (report.usageInsights.toolUsageTrends.mostUsedTools.length > 0) {
    label('Most Used Tools:');
    for (const t of report.usageInsights.toolUsageTrends.mostUsedTools.slice(0, 8)) {
      bullet(`${t.tool}: ${t.count} uses (risk: ${t.riskExposure})`);
    }
  }
  y += 2;

  if (report.usageInsights.modelComparison.modelsUsed.length > 0) {
    label('Model Comparison:');
    for (const m of report.usageInsights.modelComparison.modelsUsed) {
      const cost = report.usageInsights.modelComparison.costByModel.find((c) => c.model === m.model);
      bullet(`${m.model}: ${m.sessionCount} sessions, ${formatTokens(m.totalTokens)} tokens, ~$${cost?.estimatedCost?.toFixed(2) || '0.00'}`);
    }
  }
  y += 3;

  // Billing
  heading('Billing Analysis');
  bullet(`Estimated cost: $${report.billingAnalysis.estimatedCostUsd.toFixed(2)}`);
  bullet(`Cost change: ${report.billingAnalysis.costChangePercent > 0 ? '+' : ''}${report.billingAnalysis.costChangePercent}%`);
  if (report.billingAnalysis.alert) {
    bullet(`Alert: ${report.billingAnalysis.alertReason}`);
  }
  y += 3;

  // Recommendations
  if (report.recommendations.length > 0) {
    heading('Recommendations');
    for (const rec of report.recommendations) {
      bullet(rec);
    }
  }

  // Footer
  checkPage(15);
  y += 5;
  pdf.setDrawColor(200);
  pdf.line(margin, y, pageW - margin, y);
  y += 5;
  pdf.setFontSize(8);
  pdf.setTextColor(150);
  pdf.text('Generated by JubitMind', margin, y);

  return Buffer.from(pdf.output('arraybuffer'));
}
