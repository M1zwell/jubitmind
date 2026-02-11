import { X, Download, FileText, Shield, Activity, DollarSign, Lightbulb, AlertTriangle } from 'lucide-react';
import type { CombinedReport } from '@/lib/types';
import { api } from '@/lib/api';

interface Props {
  report: CombinedReport;
  onClose: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes > 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
  if (bytes > 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes > 1000) return `${(bytes / 1000).toFixed(1)} KB`;
  return `${bytes} B`;
}

function formatTokens(n: number): string {
  if (n > 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n > 1000) return `${(n / 1000).toFixed(0)}K`;
  return String(n);
}

function HealthBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    healthy: 'bg-green-500/20 text-green-400',
    warning: 'bg-yellow-500/20 text-yellow-400',
    critical: 'bg-red-500/20 text-red-400',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status] || colors.healthy}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export function ReportPreviewDialog({ report, onClose }: Props) {
  const es = report.executiveSummary;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-teal-400" />
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Comprehensive Report</h2>
            <span className="text-xs text-[var(--color-text-muted)]">
              {new Date(report.timestamp).toLocaleString()}
            </span>
          </div>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto px-5 py-4 space-y-5">
          {/* Executive Summary */}
          <div>
            <h3 className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-3">Executive Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Sessions" value={es.totalSessions.toLocaleString()} />
              <StatCard label="Critical" value={String(es.criticalFindings)} alert={es.criticalFindings > 0} />
              <StatCard label="High Risk" value={String(es.highFindings)} alert={es.highFindings > 5} />
              <StatCard label="Est. Cost" value={`$${es.estimatedCostUsd.toFixed(2)}`} />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-[var(--color-text-muted)]">Health:</span>
              <HealthBadge status={es.overallHealthStatus} />
              {es.topThemes.length > 0 && (
                <span className="text-xs text-[var(--color-text-muted)] ml-2">
                  Top: {es.topThemes.join(', ')}
                </span>
              )}
            </div>
          </div>

          {/* Security */}
          <Section icon={Shield} title="Security Findings" iconColor="text-red-400">
            <div className="text-xs text-[var(--color-text-secondary)] space-y-1">
              <p>{report.securityFindings.sessionsScanned} sessions scanned, {report.securityFindings.newSinceLastAudit} new since last audit</p>
              {report.securityFindings.topRisks.length > 0 && (
                <div className="mt-2 space-y-1">
                  {report.securityFindings.topRisks.slice(0, 5).map((r, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${r.risk === 'critical' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                        {r.risk}
                      </span>
                      <span>{r.detail}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Section>

          {/* Performance */}
          <Section icon={Activity} title="Performance" iconColor="text-blue-400">
            <div className="text-xs text-[var(--color-text-secondary)] space-y-1">
              <p>Total storage: {formatBytes(report.performanceMetrics.totalSizeBytes)}</p>
              <p>Average session: {formatBytes(report.performanceMetrics.avgSessionSizeBytes)}</p>
              <p>Sessions over 10MB: {report.performanceMetrics.sessionsOver10MB}</p>
            </div>
          </Section>

          {/* Usage Insights */}
          <Section icon={Lightbulb} title="Usage Insights" iconColor="text-teal-400">
            <div className="text-xs text-[var(--color-text-secondary)] space-y-2">
              <p>Average prompt length: {report.usageInsights.promptPatterns.avgPromptLength} chars</p>
              {report.usageInsights.toolUsageTrends.mostUsedTools.length > 0 && (
                <div>
                  <p className="text-[var(--color-text-muted)] mb-1">Top Tools:</p>
                  <div className="flex flex-wrap gap-1">
                    {report.usageInsights.toolUsageTrends.mostUsedTools.slice(0, 6).map((t) => (
                      <span key={t.tool} className="px-2 py-0.5 bg-[var(--color-bg-tertiary)] rounded text-[10px]">
                        {t.tool} ({t.count})
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {report.usageInsights.modelComparison.modelsUsed.length > 0 && (
                <div>
                  <p className="text-[var(--color-text-muted)] mb-1">Models:</p>
                  <div className="flex flex-wrap gap-1">
                    {report.usageInsights.modelComparison.modelsUsed.map((m) => (
                      <span key={m.model} className="px-2 py-0.5 bg-[var(--color-bg-tertiary)] rounded text-[10px]">
                        {m.model}: {m.sessionCount}s, {formatTokens(m.totalTokens)}t
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* Billing */}
          <Section icon={DollarSign} title="Billing" iconColor="text-green-400">
            <div className="text-xs text-[var(--color-text-secondary)] space-y-1">
              <p>Estimated cost: ${report.billingAnalysis.estimatedCostUsd.toFixed(2)}</p>
              <p>Cost change: {report.billingAnalysis.costChangePercent > 0 ? '+' : ''}{report.billingAnalysis.costChangePercent}%</p>
              {report.billingAnalysis.alert && (
                <p className="text-yellow-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {report.billingAnalysis.alertReason}
                </p>
              )}
            </div>
          </Section>

          {/* Recommendations */}
          {report.recommendations.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Recommendations</h3>
              <div className="space-y-1">
                {report.recommendations.map((rec, i) => (
                  <p key={i} className="text-xs text-[var(--color-text-secondary)] pl-3 border-l-2 border-[var(--color-border)]">
                    {rec}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[var(--color-border)]">
          <a
            href={api.reports.exportUrl('md')}
            download
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Markdown
          </a>
          <a
            href={api.reports.exportUrl('pdf')}
            download
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-teal-500/20 text-teal-400 hover:bg-teal-500/30 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download PDF
          </a>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="bg-[var(--color-bg-tertiary)] rounded-lg px-3 py-2">
      <p className="text-[10px] text-[var(--color-text-muted)] uppercase">{label}</p>
      <p className={`text-sm font-semibold ${alert ? 'text-red-400' : 'text-[var(--color-text-primary)]'}`}>{value}</p>
    </div>
  );
}

function Section({ icon: Icon, title, iconColor, children }: { icon: React.ComponentType<{ className?: string }>; title: string; iconColor: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
        <h3 className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">{title}</h3>
      </div>
      <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-3">
        {children}
      </div>
    </div>
  );
}
