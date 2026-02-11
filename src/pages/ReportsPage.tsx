import { useState, useEffect } from 'react';
import { FileBarChart, RefreshCw, Download, Clock, Shield, AlertTriangle, Eye } from 'lucide-react';
import { useLatestReport, useReportHistory, useGenerateReport } from '@/hooks/useReports';
import { ReportPreviewDialog } from '@/components/reports/ReportPreviewDialog';
import { api } from '@/lib/api';
import type { CombinedReport } from '@/lib/types';

function formatBytes(bytes: number): string {
  if (bytes > 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes > 1000) return `${(bytes / 1000).toFixed(1)} KB`;
  return `${bytes} B`;
}

export function ReportsPage() {
  const { data: latestData, isLoading } = useLatestReport();
  const { data: historyData } = useReportHistory(10);
  const generateReport = useGenerateReport();
  const [showReport, setShowReport] = useState<CombinedReport | null>(null);
  const [loadingSample, setLoadingSample] = useState(false);

  const report = latestData?.report;

  const viewSample = async () => {
    setLoadingSample(true);
    try {
      const { report: sample } = await api.reports.example();
      setShowReport(sample);
    } catch { /* ignore */ }
    setLoadingSample(false);
  };

  useEffect(() => {
    if (generateReport.isSuccess && generateReport.data?.report) {
      setShowReport(generateReport.data.report);
    }
  }, [generateReport.isSuccess, generateReport.data]);

  return (
    <div className="h-full flex flex-col overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <FileBarChart className="w-5 h-5 text-teal-400" />
          <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Reports</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={viewSample}
            disabled={loadingSample}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors disabled:opacity-50"
          >
            {loadingSample ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
            Sample
          </button>
          {report && (
            <a
              href={api.reports.exportUrl('pdf')}
              download
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download PDF
            </a>
          )}
          <button
            onClick={() => generateReport.mutate(undefined)}
            disabled={generateReport.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-teal-500/20 text-teal-400 hover:bg-teal-500/30 transition-colors disabled:opacity-50"
          >
            {generateReport.isPending ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileBarChart className="w-3.5 h-3.5" />
            )}
            {generateReport.isPending ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <RefreshCw className="w-6 h-6 text-teal-400 animate-spin" />
        </div>
      ) : !report ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <FileBarChart className="w-12 h-12 text-[var(--color-text-muted)] mb-3" />
          <p className="text-sm text-[var(--color-text-secondary)] mb-1">No reports generated yet</p>
          <p className="text-xs text-[var(--color-text-muted)] mb-4">
            Generate a comprehensive report combining security audit and usage insights.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => generateReport.mutate(undefined)}
              disabled={generateReport.isPending}
              className="flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium bg-teal-500/20 text-teal-400 hover:bg-teal-500/30 transition-colors disabled:opacity-50"
            >
              <FileBarChart className="w-4 h-4" />
              Generate Your First Report
            </button>
            <button
              onClick={viewSample}
              disabled={loadingSample}
              className="flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors disabled:opacity-50"
            >
              {loadingSample ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
              View Sample
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Latest Report Summary */}
          <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-medium text-[var(--color-text-primary)]">Latest Report</h2>
                <HealthBadge status={report.executiveSummary.overallHealthStatus} />
              </div>
              <span className="text-xs text-[var(--color-text-muted)]">
                {new Date(report.timestamp).toLocaleString()} ({report.duration_ms}ms)
              </span>
            </div>

            {/* Key metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
              <MetricCard label="Sessions" value={report.executiveSummary.totalSessions.toLocaleString()} />
              <MetricCard label="Critical" value={String(report.executiveSummary.criticalFindings)} alert={report.executiveSummary.criticalFindings > 0} />
              <MetricCard label="High Risk" value={String(report.executiveSummary.highFindings)} alert={report.executiveSummary.highFindings > 5} />
              <MetricCard label="Est. Cost" value={`$${report.executiveSummary.estimatedCostUsd.toFixed(2)}`} />
              <MetricCard label="Storage" value={formatBytes(report.performanceMetrics.totalSizeBytes)} />
            </div>

            {/* Security findings */}
            {report.securityFindings.topRisks.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Shield className="w-3.5 h-3.5 text-red-400" />
                  <h3 className="text-xs font-medium text-[var(--color-text-muted)]">Top Security Risks</h3>
                </div>
                <div className="space-y-1">
                  {report.securityFindings.topRisks.slice(0, 5).map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${r.risk === 'critical' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                        {r.risk}
                      </span>
                      <span>{r.detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {report.recommendations.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-[var(--color-text-muted)] mb-2">Recommendations</h3>
                <div className="space-y-1">
                  {report.recommendations.slice(0, 5).map((rec, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-[var(--color-text-secondary)]">
                      {rec.startsWith('URGENT') || rec.startsWith('BILLING ALERT') ? (
                        <AlertTriangle className="w-3 h-3 text-yellow-400 mt-0.5 flex-shrink-0" />
                      ) : (
                        <span className="text-[var(--color-text-muted)]">-</span>
                      )}
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setShowReport(report)}
              className="mt-3 text-xs text-teal-400 hover:text-teal-300 transition-colors"
            >
              View full report...
            </button>
          </div>

          {/* Report History */}
          {historyData && historyData.reports.length > 1 && (
            <div>
              <h2 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">Report History</h2>
              <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border)]">
                      <th className="text-left px-4 py-2 text-xs text-[var(--color-text-muted)]">Date</th>
                      <th className="text-center px-4 py-2 text-xs text-[var(--color-text-muted)]">Health</th>
                      <th className="text-right px-4 py-2 text-xs text-[var(--color-text-muted)]">Sessions</th>
                      <th className="text-right px-4 py-2 text-xs text-[var(--color-text-muted)]">Critical</th>
                      <th className="text-right px-4 py-2 text-xs text-[var(--color-text-muted)]">Cost</th>
                      <th className="text-right px-4 py-2 text-xs text-[var(--color-text-muted)]">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyData.reports.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b border-[var(--color-border)]/50 last:border-0 cursor-pointer hover:bg-[var(--color-bg-tertiary)]"
                        onClick={() => setShowReport(r)}
                      >
                        <td className="px-4 py-2 text-[var(--color-text-primary)] flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-[var(--color-text-muted)]" />
                          {new Date(r.timestamp).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <HealthBadge status={r.executiveSummary.overallHealthStatus} />
                        </td>
                        <td className="px-4 py-2 text-right text-[var(--color-text-secondary)]">
                          {r.executiveSummary.totalSessions.toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-right text-[var(--color-text-secondary)]">
                          {r.executiveSummary.criticalFindings}
                        </td>
                        <td className="px-4 py-2 text-right text-[var(--color-text-secondary)]">
                          ${r.executiveSummary.estimatedCostUsd.toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-right text-[var(--color-text-muted)]">
                          {r.duration_ms}ms
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {showReport && (
        <ReportPreviewDialog report={showReport} onClose={() => setShowReport(null)} />
      )}
    </div>
  );
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

function MetricCard({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="bg-[var(--color-bg-tertiary)] rounded px-3 py-2">
      <p className="text-[10px] text-[var(--color-text-muted)] uppercase">{label}</p>
      <p className={`text-sm font-semibold ${alert ? 'text-red-400' : 'text-[var(--color-text-primary)]'}`}>{value}</p>
    </div>
  );
}
