import { useQuery } from '@tanstack/react-query';
import { BarChart3, RefreshCw, Cloud, HardDrive, Archive, Cpu, Shield, ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { SignInBanner } from '@/components/auth/SignInBanner';
import { ModelUsageChart } from './charts/ModelUsageChart';
import { TypeDistributionChart } from './charts/TypeDistributionChart';
import { ActivityTimelineChart } from './charts/ActivityTimelineChart';
import { RiskDistributionChart } from './charts/RiskDistributionChart';
import { TopModelsTable } from './TopModelsTable';
import { CostSummaryCard } from './CostSummaryCard';
import { JUBIT_BASE } from '@/lib/config';

export function AnalyticsDashboard() {
  const { user } = useAuth();

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['archives-analytics', user?.id ?? 'anon'],
    queryFn: () => api.archives.analytics(),
    staleTime: 60_000,
  });

  const analytics = data?.analytics;
  const totalModels = analytics ? Object.keys(analytics.modelUsage).length : 0;
  const totalTypes = analytics ? Object.keys(analytics.typeDistribution).length : 0;
  const totalRisk = analytics
    ? analytics.riskDistribution.critical + analytics.riskDistribution.high + analytics.riskDistribution.medium + analytics.riskDistribution.low
    : 0;

  return (
    <div className="h-full flex flex-col overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-teal-400" />
          <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Analytics</h1>
          {analytics && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-tertiary)] px-2 py-0.5 rounded flex items-center gap-1">
                <Cloud className="w-3 h-3" />
                {analytics.totalArchives} cloud
              </span>
              <span className="text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-tertiary)] px-2 py-0.5 rounded flex items-center gap-1">
                <HardDrive className="w-3 h-3" />
                {analytics.totalLocal} local
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`${JUBIT_BASE}/theater`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium text-blue-400 hover:bg-blue-500/10 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            jubit.ai
          </a>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-1.5 rounded text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <SignInBanner
        feature="cloud analytics"
        detail="Model usage, activity timeline, arena leaderboard, and cost tracking"
      />

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-3 h-20 animate-pulse">
                <div className="h-3 w-16 bg-[var(--color-bg-tertiary)] rounded mb-2" />
                <div className="h-6 w-12 bg-[var(--color-bg-tertiary)] rounded" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-4 h-72 animate-pulse">
                <div className="h-4 w-32 bg-[var(--color-bg-tertiary)] rounded mb-4" />
                <div className="h-48 bg-[var(--color-bg-tertiary)] rounded" />
              </div>
            ))}
          </div>
        </div>
      ) : !analytics ? (
        <div className="flex flex-col items-center justify-center h-48 text-[var(--color-text-muted)]">
          <BarChart3 className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-sm">No analytics data available</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Quick stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              icon={Archive}
              label="Total Archives"
              value={analytics.totalArchives + analytics.totalLocal}
              sub={`${analytics.totalArchives} cloud + ${analytics.totalLocal} local`}
              color="text-teal-400"
            />
            <StatCard
              icon={Cpu}
              label="Unique Models"
              value={totalModels}
              sub={totalModels > 0 ? `across ${totalTypes} archive types` : 'no model data yet'}
              color="text-blue-400"
            />
            <StatCard
              icon={Shield}
              label="Risk Flags"
              value={totalRisk}
              sub={totalRisk > 0 ? `${analytics.riskDistribution.critical} critical, ${analytics.riskDistribution.high} high` : 'no flagged sessions'}
              color={analytics.riskDistribution.critical > 0 ? 'text-red-400' : 'text-emerald-400'}
            />
            <StatCard
              icon={BarChart3}
              label="Arena Battles"
              value={analytics.costEstimate.arenaCount}
              sub={analytics.costEstimate.totalCents > 0 ? `$${(analytics.costEstimate.totalCents / 100).toFixed(2)} total cost` : 'no cost data yet'}
              color="text-orange-400"
            />
          </div>

          {/* Cost + Arena summary (only show if there's arena data) */}
          {analytics.costEstimate.arenaCount > 0 && (
            <CostSummaryCard
              totalCents={analytics.costEstimate.totalCents}
              arenaCount={analytics.costEstimate.arenaCount}
            />
          )}

          {/* Charts grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <ChartPanel title="Model Usage (Top 10)">
              <ModelUsageChart data={analytics.modelUsage} />
            </ChartPanel>

            <ChartPanel title="Archive Types">
              <TypeDistributionChart data={analytics.typeDistribution} />
            </ChartPanel>

            <ChartPanel title="Risk Levels" hint="From local Claude Code sessions">
              <RiskDistributionChart data={analytics.riskDistribution} />
            </ChartPanel>
          </div>

          {/* Activity timeline - full width */}
          <ChartPanel title="Activity Timeline">
            <ActivityTimelineChart data={analytics.activityTimeline} />
          </ChartPanel>

          {/* Top Models table */}
          <ChartPanel title="Arena Leaderboard">
            <TopModelsTable data={analytics.topModels} />
          </ChartPanel>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  sub: string;
  color: string;
}) {
  return (
    <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-3">
      <div className="flex items-center gap-1.5 text-[var(--color-text-muted)] mb-1">
        <Icon className="w-3 h-3" />
        <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-xl font-semibold ${color}`}>{value}</p>
      <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{sub}</p>
    </div>
  );
}

function ChartPanel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">{title}</h3>
        {hint && <span className="text-[10px] text-[var(--color-text-muted)] italic">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
