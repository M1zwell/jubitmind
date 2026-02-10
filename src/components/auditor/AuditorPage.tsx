import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Activity,
  DollarSign,
  HardDrive,
  Play,
  RefreshCw,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { AuditReport } from '@/lib/types';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function SeverityBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    critical: 'bg-red-500/20 text-red-400',
    high: 'bg-orange-500/20 text-orange-400',
    medium: 'bg-yellow-500/20 text-yellow-400',
    low: 'bg-blue-500/20 text-blue-400',
  };
  return (
    <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium uppercase ${colors[level] || 'bg-gray-500/20 text-gray-400'}`}>
      {level}
    </span>
  );
}

function ReportCard({ report, defaultExpanded = false }: { report: AuditReport; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const hasCritical = report.security.criticalFindings > 0;
  const hasHigh = report.security.highFindings > 0;
  const hasBillingAlert = report.billing.alert;

  return (
    <div className={`border rounded-lg overflow-hidden ${
      hasCritical ? 'border-red-500/50' : hasBillingAlert ? 'border-amber-500/50' : 'border-[var(--color-border)]'
    }`}>
      {/* Report header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)] transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown className="w-3.5 h-3.5 text-[var(--color-text-muted)]" /> : <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-[var(--color-text-primary)]">
                {new Date(report.timestamp).toLocaleString()}
              </span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                report.type === 'emergency' ? 'bg-red-500/20 text-red-400' : 'bg-teal-500/20 text-teal-400'
              }`}>
                {report.type}
              </span>
              <span className="text-[9px] text-[var(--color-text-muted)]">
                {report.duration_ms}ms
              </span>
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              {hasCritical && (
                <span className="text-[9px] text-red-400">{report.security.criticalFindings} critical</span>
              )}
              {hasHigh && (
                <span className="text-[9px] text-orange-400">{report.security.highFindings} high</span>
              )}
              {hasBillingAlert && (
                <span className="text-[9px] text-amber-400">billing alert</span>
              )}
              {!hasCritical && !hasHigh && !hasBillingAlert && (
                <span className="text-[9px] text-green-400">all clear</span>
              )}
            </div>
          </div>
        </div>
        <span className="text-[9px] text-[var(--color-text-muted)]">
          {report.security.sessionsScanned} sessions scanned
        </span>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 py-3 space-y-4 border-t border-[var(--color-border)]">
          {/* Security */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
              <span className="text-xs font-medium text-[var(--color-text-primary)]">Security</span>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-2">
              <div className="text-center p-2 rounded bg-[var(--color-bg-tertiary)]">
                <div className="text-lg font-bold text-red-400">{report.security.criticalFindings}</div>
                <div className="text-[9px] text-[var(--color-text-muted)]">Critical</div>
              </div>
              <div className="text-center p-2 rounded bg-[var(--color-bg-tertiary)]">
                <div className="text-lg font-bold text-orange-400">{report.security.highFindings}</div>
                <div className="text-[9px] text-[var(--color-text-muted)]">High</div>
              </div>
              <div className="text-center p-2 rounded bg-[var(--color-bg-tertiary)]">
                <div className="text-lg font-bold text-[var(--color-text-primary)]">{report.security.sessionsScanned}</div>
                <div className="text-[9px] text-[var(--color-text-muted)]">Scanned</div>
              </div>
              <div className="text-center p-2 rounded bg-[var(--color-bg-tertiary)]">
                <div className="text-lg font-bold text-teal-400">{report.security.newSinceLastAudit}</div>
                <div className="text-[9px] text-[var(--color-text-muted)]">New</div>
              </div>
            </div>
            {report.security.topRisks.length > 0 && (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {report.security.topRisks.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px] px-2 py-1 rounded bg-[var(--color-bg-tertiary)]">
                    <SeverityBadge level={r.risk} />
                    <span className="text-[var(--color-text-secondary)] truncate flex-1">{r.detail}</span>
                    <span className="text-[var(--color-text-muted)] font-mono">{r.sessionId.slice(0, 8)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Performance */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-xs font-medium text-[var(--color-text-primary)]">Performance</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 rounded bg-[var(--color-bg-tertiary)]">
                <div className="text-xs font-semibold text-[var(--color-text-primary)]">{formatBytes(report.performance.totalSizeBytes)}</div>
                <div className="text-[9px] text-[var(--color-text-muted)]">Total Storage</div>
              </div>
              <div className="p-2 rounded bg-[var(--color-bg-tertiary)]">
                <div className="text-xs font-semibold text-[var(--color-text-primary)]">{formatBytes(report.performance.avgSessionSizeBytes)}</div>
                <div className="text-[9px] text-[var(--color-text-muted)]">Avg Session</div>
              </div>
              <div className="p-2 rounded bg-[var(--color-bg-tertiary)]">
                <div className={`text-xs font-semibold ${report.performance.sessionsOver10MB > 0 ? 'text-amber-400' : 'text-[var(--color-text-primary)]'}`}>
                  {report.performance.sessionsOver10MB}
                </div>
                <div className="text-[9px] text-[var(--color-text-muted)]">Over 10MB</div>
              </div>
            </div>
          </div>

          {/* Billing */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-3.5 h-3.5 text-green-400" />
              <span className="text-xs font-medium text-[var(--color-text-primary)]">Billing</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded bg-[var(--color-bg-tertiary)]">
                <div className="text-xs font-semibold text-[var(--color-text-primary)]">${report.billing.estimatedCostUsd.toFixed(2)}</div>
                <div className="text-[9px] text-[var(--color-text-muted)]">Estimated Cost</div>
              </div>
              <div className="p-2 rounded bg-[var(--color-bg-tertiary)]">
                <div className={`text-xs font-semibold ${
                  report.billing.costChangePercent > 50 ? 'text-red-400'
                  : report.billing.costChangePercent > 20 ? 'text-amber-400'
                  : 'text-[var(--color-text-primary)]'
                }`}>
                  {report.billing.costChangePercent > 0 ? '+' : ''}{report.billing.costChangePercent}%
                </div>
                <div className="text-[9px] text-[var(--color-text-muted)]">Cost Change</div>
              </div>
            </div>
            {report.billing.alert && report.billing.alertReason && (
              <div className="mt-2 p-2 rounded bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-400">
                {report.billing.alertReason}
              </div>
            )}
          </div>

          {/* Recommendations */}
          {report.recommendations.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-medium text-[var(--color-text-primary)]">Recommendations</span>
              </div>
              <ul className="space-y-1">
                {report.recommendations.map((rec, i) => (
                  <li key={i} className="text-[10px] text-[var(--color-text-secondary)] pl-3 relative before:content-[''] before:absolute before:left-0 before:top-1.5 before:w-1.5 before:h-1.5 before:rounded-full before:bg-[var(--color-text-muted)]">
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AuditorPage() {
  const queryClient = useQueryClient();

  const { data: statusData, isLoading: statusLoading } = useQuery({
    queryKey: ['auditor', 'status'],
    queryFn: () => api.auditor.status(),
    refetchInterval: 30_000,
  });

  const { data: latestData } = useQuery({
    queryKey: ['auditor', 'latest'],
    queryFn: () => api.auditor.latest(),
    refetchInterval: 60_000,
  });

  const { data: historyData } = useQuery({
    queryKey: ['auditor', 'history'],
    queryFn: () => api.auditor.history(),
  });

  const runAudit = useMutation({
    mutationFn: () => api.auditor.run(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auditor'] });
    },
  });

  const latestReport = latestData?.report as AuditReport | null;
  const reports = (historyData?.reports || []) as AuditReport[];

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-teal-400" />
          <h1 className="text-sm font-semibold text-[var(--color-text-primary)]">
            AI Auditor
          </h1>
          {statusData && (
            <span className="text-[10px] text-[var(--color-text-muted)]">
              Last audit: {statusData.lastAudit ? timeAgo(statusData.lastAudit) : 'never'}
            </span>
          )}
        </div>
        <button
          onClick={() => runAudit.mutate()}
          disabled={runAudit.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors disabled:opacity-50"
        >
          {runAudit.isPending ? (
            <RefreshCw className="w-3 h-3 animate-spin" />
          ) : (
            <Play className="w-3 h-3" />
          )}
          {runAudit.isPending ? 'Running...' : 'Emergency Audit'}
        </button>
      </div>

      {/* Status summary cards */}
      {statusData && (
        <div className="grid grid-cols-4 gap-3 flex-shrink-0">
          <div className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
              <span className="text-[10px] text-[var(--color-text-muted)]">Critical</span>
            </div>
            <div className={`text-xl font-bold ${statusData.criticalFindings > 0 ? 'text-red-400' : 'text-green-400'}`}>
              {statusData.criticalFindings}
            </div>
          </div>
          <div className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-[10px] text-[var(--color-text-muted)]">High Risk</span>
            </div>
            <div className={`text-xl font-bold ${statusData.highFindings > 0 ? 'text-orange-400' : 'text-green-400'}`}>
              {statusData.highFindings}
            </div>
          </div>
          <div className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px] text-[var(--color-text-muted)]">Billing</span>
            </div>
            <div className={`text-xl font-bold ${statusData.billingAlert ? 'text-amber-400' : 'text-green-400'}`}>
              {statusData.billingAlert ? 'Alert' : 'OK'}
            </div>
          </div>
          <div className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-3.5 h-3.5 text-teal-400" />
              <span className="text-[10px] text-[var(--color-text-muted)]">Last Audit</span>
            </div>
            <div className="text-sm font-medium text-[var(--color-text-primary)]">
              {statusData.lastAudit ? timeAgo(statusData.lastAudit) : 'N/A'}
            </div>
          </div>
        </div>
      )}

      {/* Reports */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
        {statusLoading && (
          <div className="text-xs text-[var(--color-text-muted)] text-center py-8">Loading auditor data...</div>
        )}
        {!statusLoading && !latestReport && reports.length === 0 && (
          <div className="text-center py-12 space-y-3">
            <ShieldAlert className="w-8 h-8 text-[var(--color-text-muted)] mx-auto opacity-50" />
            <p className="text-xs text-[var(--color-text-muted)]">
              No audit reports yet. The auditor runs automatically every 30 minutes.
            </p>
            <button
              onClick={() => runAudit.mutate()}
              disabled={runAudit.isPending}
              className="px-3 py-1.5 text-xs bg-teal-500/20 text-teal-400 rounded hover:bg-teal-500/30 transition-colors"
            >
              Run First Audit Now
            </button>
          </div>
        )}
        {latestReport && <ReportCard report={latestReport} defaultExpanded={true} />}
        {reports
          .filter((r) => r.id !== latestReport?.id)
          .map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
      </div>
    </div>
  );
}
