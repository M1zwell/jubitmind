import { useState, useEffect } from 'react';
import { RefreshCw, LayoutDashboard, FileBarChart, Download, Apple, Monitor } from 'lucide-react';
import { useAdapterList, useUnifiedStats } from '@/hooks/useUnifiedStats';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useConversationStats } from '@/hooks/useConversations';
import { useGenerateReport } from '@/hooks/useReports';
import { StatsCards } from './StatsCards';
import { ToolStatusGrid } from './ToolStatusGrid';
import { RecentSessions } from './RecentSessions';
import { ReportPreviewDialog } from '../reports/ReportPreviewDialog';
import type { CombinedReport } from '@/lib/types';

const IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true';
const RELEASE_URL = 'https://github.com/M1zwell/jubitmind/releases/latest';
const DMG_URL = 'https://github.com/M1zwell/jubitmind/releases/latest/download/JubitMind-0.78.0-arm64.dmg';
const EXE_URL = 'https://github.com/M1zwell/jubitmind/releases/latest/download/JubitMind-Setup-0.78.0.exe';

export function HomePage() {
  const { data: adapters, isLoading: adaptersLoading, refetch: refetchAdapters } = useAdapterList();
  const { data: stats, isLoading: statsLoading, refetch: refetchStats, isFetching } = useUnifiedStats();
  const { data: convStats } = useConversationStats();
  const generateReport = useGenerateReport();
  const [showReport, setShowReport] = useState<CombinedReport | null>(null);

  const { data: recentData } = useQuery({
    queryKey: ['adapter-sessions', 'claude-code', { limit: 8 }],
    queryFn: () => api.adapters.sessions('claude-code', { limit: 8 }),
    staleTime: 30_000,
  });

  // Listen for menu-triggered report generation (Electron)
  useEffect(() => {
    const jm = (window as unknown as { jubitmind?: { onMenuExportReport?: (cb: () => void) => () => void } }).jubitmind;
    if (jm?.onMenuExportReport) {
      const cleanup = jm.onMenuExportReport(() => {
        if (!generateReport.isPending) {
          generateReport.mutate(undefined);
        }
      });
      return cleanup;
    }
  }, [generateReport]);

  // Show dialog when report is generated
  useEffect(() => {
    if (generateReport.isSuccess && generateReport.data?.report) {
      setShowReport(generateReport.data.report);
    }
  }, [generateReport.isSuccess, generateReport.data]);

  const isLoading = adaptersLoading || statsLoading;
  const availableCount = adapters?.filter((a) => a.available).length || 0;
  const totalCount = adapters?.length || 0;

  const handleRefresh = () => {
    refetchAdapters();
    refetchStats();
  };

  return (
    <div className="h-full flex flex-col overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="w-5 h-5 text-teal-400" />
          <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Dashboard</h1>
          <span className="text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-tertiary)] px-2 py-0.5 rounded">
            Local AI Monitor
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => generateReport.mutate(undefined)}
            disabled={generateReport.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-teal-500/20 text-teal-400 hover:bg-teal-500/30 transition-colors disabled:opacity-50"
          >
            <FileBarChart className={`w-3.5 h-3.5 ${generateReport.isPending ? 'animate-pulse' : ''}`} />
            {generateReport.isPending ? 'Generating...' : 'Generate Report'}
          </button>
          <button
            onClick={handleRefresh}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Download Banner (demo mode only) */}
      {IS_DEMO && (
        <div className="mb-4 rounded-lg border border-teal-500/30 bg-gradient-to-r from-teal-500/10 to-cyan-500/10 p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-sm font-semibold text-teal-300 flex items-center gap-2">
                <Download className="w-4 h-4" />
                Download JubitMind v0.78.0
              </h2>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                Free desktop app — monitor your AI coding sessions locally.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={DMG_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]/80 border border-[var(--color-border)] transition-colors"
              >
                <Apple className="w-3.5 h-3.5" />
                macOS (ARM)
              </a>
              <a
                href={EXE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]/80 border border-[var(--color-border)] transition-colors"
              >
                <Monitor className="w-3.5 h-3.5" />
                Windows (x64)
              </a>
              <a
                href={RELEASE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-teal-400 hover:text-teal-300 transition-colors underline"
              >
                All releases
              </a>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <RefreshCw className="w-6 h-6 text-teal-400 animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Stats */}
          <StatsCards
            totalSessions={stats?.totals.totalSessions || 0}
            totalMessages={stats?.totals.totalMessages || (convStats?.stats as Record<string, unknown>)?.totalMessages as number || 0}
            totalTokens={stats?.totals.totalTokens || 0}
            totalCostUsd={stats?.totals.totalCostUsd || 0}
            availableTools={availableCount}
            totalTools={totalCount}
          />

          {/* Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* AI Tools */}
            <div>
              <h2 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">AI Tools</h2>
              {adapters && <ToolStatusGrid adapters={adapters} />}
            </div>

            {/* Recent Sessions */}
            <div>
              <h2 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">Recent Sessions</h2>
              <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-2">
                <RecentSessions
                  sessions={
                    recentData?.sessions?.map((s: Record<string, unknown>) => ({
                      sessionId: s.sessionId as string,
                      adapterId: 'claude-code',
                      preview: s.preview as string,
                      updatedAt: s.updatedAt as string,
                      projectDisplayName: s.projectDisplayName as string | undefined,
                    })) || []
                  }
                />
              </div>
            </div>
          </div>

          {/* Per-adapter stats breakdown */}
          {stats?.adapters && stats.adapters.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">Usage by Tool</h2>
              <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border)]">
                      <th className="text-left px-4 py-2 text-xs text-[var(--color-text-muted)]">Tool</th>
                      <th className="text-right px-4 py-2 text-xs text-[var(--color-text-muted)]">Sessions</th>
                      <th className="text-right px-4 py-2 text-xs text-[var(--color-text-muted)]">Messages</th>
                      <th className="text-right px-4 py-2 text-xs text-[var(--color-text-muted)]">Tokens</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.adapters.map((a) => (
                      <tr key={a.adapterId} className="border-b border-[var(--color-border)]/50 last:border-0">
                        <td className="px-4 py-2 text-[var(--color-text-primary)]">{a.name}</td>
                        <td className="px-4 py-2 text-right text-[var(--color-text-secondary)]">{a.totalSessions.toLocaleString()}</td>
                        <td className="px-4 py-2 text-right text-[var(--color-text-secondary)]">{a.totalMessages.toLocaleString()}</td>
                        <td className="px-4 py-2 text-right text-[var(--color-text-secondary)]">
                          {a.totalTokens ? `${(a.totalTokens / 1_000_000).toFixed(1)}M` : '--'}
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

      {/* Report Preview Dialog */}
      {showReport && (
        <ReportPreviewDialog report={showReport} onClose={() => setShowReport(null)} />
      )}
    </div>
  );
}
