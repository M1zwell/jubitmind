import { useState } from 'react';
import { ThumbsUp, RefreshCw, Activity, MessageSquare, Zap, TrendingUp } from 'lucide-react';
import { useUnifiedStats } from '@/hooks/useUnifiedStats';
import { useFeedbackStats } from '@/hooks/useFeedback';
import { SourceSplitChart } from '@/components/usage-feedback/SourceSplitChart';
import { AdapterStatsTable } from '@/components/usage-feedback/AdapterStatsTable';
import { SessionTraceList } from '@/components/usage-feedback/SessionTraceList';
import { FeedbackByAdapterChart } from '@/components/usage-feedback/FeedbackByAdapterChart';
import { RecentFeedbackList } from '@/components/usage-feedback/RecentFeedbackList';

type Tab = 'usage' | 'sessions' | 'feedback';

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

export function UsageFeedbackPage() {
  const [activeTab, setActiveTab] = useState<Tab>('usage');
  const { data: statsData, isLoading: statsLoading, refetch: refetchStats, isFetching: statsFetching } = useUnifiedStats();
  const { data: feedbackData, isLoading: fbLoading, refetch: refetchFb, isFetching: fbFetching } = useFeedbackStats();

  const isFetching = statsFetching || fbFetching;
  const totals = statsData?.totals;
  const adapters = statsData?.adapters ?? [];
  const activeAdapterIds = adapters.filter((a) => a.totalSessions > 0).map((a) => a.adapterId);

  function handleRefresh() {
    refetchStats();
    refetchFb();
  }

  return (
    <div className="h-full flex flex-col overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <ThumbsUp className="w-5 h-5 text-teal-400" />
          <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Usage & Feedback</h1>
          {totals && (
            <span className="text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-tertiary)] px-2 py-0.5 rounded">
              {activeAdapterIds.length} active sources
            </span>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={isFetching}
          className="p-1.5 rounded text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-[var(--color-bg-secondary)] p-1 rounded-lg w-fit border border-[var(--color-border)]">
        {(['usage', 'sessions', 'feedback'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              activeTab === tab
                ? 'bg-teal-500/20 text-teal-400'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
            }`}
          >
            {tab === 'usage' ? 'Usage' : tab === 'sessions' ? 'Sessions' : 'Feedback'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
        {activeTab === 'usage' && (
          <UsageTab totals={totals} adapters={adapters} loading={statsLoading} feedbackStats={feedbackData} />
        )}
        {activeTab === 'sessions' && (
          <SessionTraceList adapters={activeAdapterIds} />
        )}
        {activeTab === 'feedback' && (
          <FeedbackTab stats={feedbackData} loading={fbLoading} />
        )}
      </div>
    </div>
  );
}

// ---- Usage tab ----

function UsageTab({
  totals,
  adapters,
  loading,
  feedbackStats,
}: {
  totals?: { totalSessions: number; totalMessages: number; totalTokens: number; totalCostUsd: number };
  adapters: Array<{
    adapterId: string; name: string; totalSessions: number; totalMessages: number;
    totalTokens?: number; totalCostUsd?: number; modelUsage?: Record<string, number>;
  }>;
  loading: boolean;
  feedbackStats?: import('@/lib/types').FeedbackStats;
}) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-3 h-20 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg h-48 animate-pulse" />
          <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg h-48 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Activity} label="Sessions" value={formatNum(totals?.totalSessions ?? 0)} color="text-teal-400" />
        <StatCard icon={MessageSquare} label="Messages" value={formatNum(totals?.totalMessages ?? 0)} color="text-blue-400" />
        <StatCard icon={Zap} label="Tokens" value={formatNum(totals?.totalTokens ?? 0)} color="text-amber-400" />
        <StatCard
          icon={TrendingUp}
          label="Satisfaction"
          value={feedbackStats ? `${Math.round(feedbackStats.positiveRate * 100)}%` : '—'}
          color="text-emerald-400"
          sub={feedbackStats ? `${feedbackStats.totalRatings} ratings` : undefined}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SourceSplitChart adapters={adapters} />
        <AdapterStatsTable adapters={adapters} />
      </div>
    </div>
  );
}

// ---- Feedback tab ----

function FeedbackTab({ stats, loading }: { stats?: import('@/lib/types').FeedbackStats; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-3 h-20 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return <p className="text-xs text-[var(--color-text-muted)]">Failed to load feedback data</p>;
  }

  return (
    <div className="space-y-4">
      {/* Feedback stat cards */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={ThumbsUp} label="Positive" value={String(stats.positiveCount)} color="text-emerald-400" />
        <StatCard icon={ThumbsUp} label="Negative" value={String(stats.negativeCount)} color="text-red-400" />
        <StatCard
          icon={TrendingUp}
          label="Satisfaction"
          value={`${Math.round(stats.positiveRate * 100)}%`}
          color="text-teal-400"
          sub={`${stats.totalRatings} total`}
        />
      </div>

      {/* Charts and lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FeedbackByAdapterChart stats={stats} />
        <RecentFeedbackList stats={stats} />
      </div>
    </div>
  );
}

// ---- Stat card component ----

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: string;
  sub?: string;
}) {
  return (
    <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={`w-3.5 h-3.5 ${color}`} />
        <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">{label}</span>
      </div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{sub}</div>}
    </div>
  );
}
