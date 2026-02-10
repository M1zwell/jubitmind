import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import type { InsightReport } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function formatTokens(n: number): string {
  if (n > 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n > 1000) return `${(n / 1000).toFixed(0)}K`;
  return String(n);
}

function ts(report: InsightReport): string {
  return new Date(report.timestamp).toLocaleString();
}

// ---------------------------------------------------------------------------
// Markdown Export
// ---------------------------------------------------------------------------

export function exportInsightsMarkdown(report: InsightReport): void {
  const lines: string[] = [];

  lines.push('# JubitMind Insights Report');
  lines.push('');
  lines.push(`> Generated: ${ts(report)} | Duration: ${report.duration_ms}ms | Type: ${report.type}`);
  lines.push('');

  // Prompt Patterns
  lines.push('## Prompt Patterns');
  lines.push('');
  lines.push(`- **Average prompt length:** ${report.promptPatterns.avgPromptLength} chars`);
  lines.push('');

  if (report.promptPatterns.commonThemes.length > 0) {
    lines.push('### Common Themes');
    lines.push('');
    lines.push('| Theme | Frequency |');
    lines.push('|-------|-----------|');
    for (const t of report.promptPatterns.commonThemes) {
      lines.push(`| ${t.theme} | ${t.frequency} |`);
    }
    lines.push('');
  }

  if (report.promptPatterns.recurringRequests.length > 0) {
    lines.push('### Recurring Requests');
    lines.push('');
    lines.push('| Pattern | Count |');
    lines.push('|---------|-------|');
    for (const r of report.promptPatterns.recurringRequests) {
      lines.push(`| ${r.pattern} | ${r.count} |`);
    }
    lines.push('');
  }

  // Tool Usage
  lines.push('## Tool Usage Trends');
  lines.push('');

  if (report.toolUsageTrends.mostUsedTools.length > 0) {
    lines.push('### Most Used Tools');
    lines.push('');
    lines.push('| Tool | Count | Risk Exposure |');
    lines.push('|------|-------|---------------|');
    for (const t of report.toolUsageTrends.mostUsedTools) {
      lines.push(`| ${t.tool} | ${t.count} | ${t.riskExposure} |`);
    }
    lines.push('');
  }

  if (report.toolUsageTrends.riskExposureTrend.length > 0) {
    lines.push('### Risk Exposure Trend');
    lines.push('');
    lines.push('| Date | Critical | High |');
    lines.push('|------|----------|------|');
    for (const d of report.toolUsageTrends.riskExposureTrend) {
      lines.push(`| ${d.date} | ${d.criticalCount} | ${d.highCount} |`);
    }
    lines.push('');
  }

  // Model Comparison
  lines.push('## Model Comparison');
  lines.push('');

  if (report.modelComparison.modelsUsed.length > 0) {
    lines.push('| Model | Sessions | Tokens | Est. Cost |');
    lines.push('|-------|----------|--------|-----------|');
    for (const m of report.modelComparison.modelsUsed) {
      const cost = report.modelComparison.costByModel.find((c) => c.model === m.model);
      lines.push(`| ${m.model} | ${m.sessionCount} | ${formatTokens(m.totalTokens)} | $${cost?.estimatedCost?.toFixed(2) || '0.00'} |`);
    }
    lines.push('');
  }

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
  lines.push('*Exported from JubitMind*');

  const md = lines.join('\n');
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  downloadBlob(blob, `jubitmind-insights-${report.id}.md`);
}

// ---------------------------------------------------------------------------
// PNG Export
// ---------------------------------------------------------------------------

export async function exportInsightsPng(element: HTMLElement, report: InsightReport): Promise<void> {
  const dataUrl = await toPng(element, {
    pixelRatio: 2,
    backgroundColor: '#1a1a1a',
  });
  const link = document.createElement('a');
  link.download = `jubitmind-insights-${report.id}.png`;
  link.href = dataUrl;
  link.click();
}

// ---------------------------------------------------------------------------
// PDF Export
// ---------------------------------------------------------------------------

export async function exportInsightsPdf(element: HTMLElement, report: InsightReport): Promise<void> {
  const dataUrl = await toPng(element, {
    pixelRatio: 2,
    backgroundColor: '#1a1a1a',
  });

  const img = new Image();
  img.src = dataUrl;
  await new Promise<void>((resolve) => {
    img.onload = () => resolve();
  });

  const pxWidth = img.width;
  const pxHeight = img.height;

  // A4 landscape or portrait depending on aspect ratio
  const isWide = pxWidth > pxHeight * 1.2;
  const orientation = isWide ? 'landscape' : 'portrait';
  const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' });

  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const usableW = pageW - margin * 2;
  const usableH = pageH - margin * 2 - 12; // 12mm for header

  // Header
  pdf.setFontSize(14);
  pdf.setTextColor(20, 184, 166); // teal
  pdf.text('JubitMind Insights Report', margin, margin + 6);
  pdf.setFontSize(8);
  pdf.setTextColor(150);
  pdf.text(`Generated: ${ts(report)} | ${report.type}`, margin, margin + 12);

  // Scale image to fit page
  const scale = Math.min(usableW / pxWidth, usableH / pxHeight);
  const imgW = pxWidth * scale;
  const imgH = pxHeight * scale;

  pdf.addImage(dataUrl, 'PNG', margin, margin + 16, imgW, imgH);
  pdf.save(`jubitmind-insights-${report.id}.pdf`);
}
