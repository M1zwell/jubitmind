import { useState } from 'react';
import { Lightbulb, Play, Clock, TrendingUp, Wrench, Cpu, MessageSquare, ChevronDown, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Cell } from 'recharts';
import { useLatestInsight, useInsightHistory, useRunInsights } from '@/hooks/useInsights';
import type { InsightReport } from '@/lib/types';

const RISK_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#22c55e',
};

function PromptPatternsCard({ data }: { data: InsightReport['promptPatterns'] }) {
  return (
    <div className="border border-[var(--color-border)] rounded bg-[var(--color-bg-secondary)] p-4">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="w-4 h-4 text-teal-400" />
        <h3 className="text-xs font-semibold text-[var(--color-text-primary)]">Prompt Patterns</h3>
        <span className="text-[9px] text-[var(--color-text-muted)]">Avg {data.avgPromptLength} chars</span>
      </div>

      {data.commonThemes.length > 0 && (
        <div className="mb-3">
          <p className="text-[9px] uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Common Themes</p>
          <div className="flex flex-wrap gap-1.5">
            {data.commonThemes.map((theme) => (
              <span
                key={theme.theme}
                className="text-[10px] px-2 py-0.5 bg-teal-500/10 text-teal-400 rounded"
                title={theme.examples.join('\n')}
              >
                {theme.theme} ({theme.frequency})
              </span>
            ))}
          </div>
        </div>
      )}

      {data.recurringRequests.length > 0 && (
        <div>
          <p className="text-[9px] uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Recurring Requests</p>
          <div className="space-y-1">
            {data.recurringRequests.slice(0, 5).map((req) => (
              <div key={req.pattern} className="flex items-center justify-between text-[10px]">
                <span className="text-[var(--color-text-secondary)] truncate mr-2">"{req.pattern}"</span>
                <span className="text-[var(--color-text-muted)] flex-shrink-0">{req.count}x</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ToolUsageCard({ data }: { data: InsightReport['toolUsageTrends'] }) {
  const chartData = data.mostUsedTools.slice(0, 10).map((t) => ({
    name: t.tool,
    count: t.count,
    risk: t.riskExposure,
  }));

  const riskData = data.riskExposureTrend.slice(-14).map((d) => ({
    date: d.date.slice(5), // MM-DD
    critical: d.criticalCount,
    high: d.highCount,
  }));

  return (
    <div className="border border-[var(--color-border)] rounded bg-[var(--color-bg-secondary)] p-4">
      <div className="flex items-center gap-2 mb-3">
        <Wrench className="w-4 h-4 text-amber-400" />
        <h3 className="text-xs font-semibold text-[var(--color-text-primary)]">Tool Usage Trends</h3>
      </div>

      {chartData.length > 0 && (
        <div className="mb-3">
          <p className="text-[9px] uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Most Used Tools</p>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 50, right: 10, top: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 9, fill: '#9ca3af' }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: '#9ca3af' }} width={50} />
                <Tooltip
                  contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '4px', fontSize: '10px' }}
                  labelStyle={{ color: '#d1d5db' }}
                />
                <Bar dataKey="count" fill="#14b8a6" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {riskData.length > 0 && (
        <div>
          <p className="text-[9px] uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Risk Exposure Trend</p>
          <div className="h-24">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={riskData} margin={{ left: 0, right: 10, top: 5, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 8, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 8, fill: '#9ca3af' }} width={25} />
                <Tooltip
                  contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '4px', fontSize: '10px' }}
                />
                <Line type="monotone" dataKey="critical" stroke="#ef4444" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="high" stroke="#f97316" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

function ModelComparisonCard({ data }: { data: InsightReport['modelComparison'] }) {
  return (
    <div className="border border-[var(--color-border)] rounded bg-[var(--color-bg-secondary)] p-4">
      <div className="flex items-center gap-2 mb-3">
        <Cpu className="w-4 h-4 text-blue-400" />
        <h3 className="text-xs font-semibold text-[var(--color-text-primary)]">Model Comparison</h3>
      </div>

      {data.modelsUsed.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                <th className="text-left py-1.5 font-medium">Model</th>
                <th className="text-right py-1.5 font-medium">Sessions</th>
                <th className="text-right py-1.5 font-medium">Tokens</th>
                <th className="text-right py-1.5 font-medium">Est. Cost</th>
              </tr>
            </thead>
            <tbody>
              {data.modelsUsed.map((model) => {
                const cost = data.costByModel.find((c) => c.model === model.model);
                return (
                  <tr key={model.model} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="py-1.5 text-[var(--color-text-primary)]">
                      <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded">
                        {model.model}
                      </span>
                    </td>
                    <td className="py-1.5 text-right text-[var(--color-text-secondary)]">
                      {model.sessionCount}
                    </td>
                    <td className="py-1.5 text-right text-[var(--color-text-secondary)]">
                      {model.totalTokens > 1_000_000
                        ? `${(model.totalTokens / 1_000_000).toFixed(1)}M`
                        : model.totalTokens > 1000
                          ? `${(model.totalTokens / 1000).toFixed(0)}K`
                          : model.totalTokens}
                    </td>
                    <td className="py-1.5 text-right text-[var(--color-text-secondary)]">
                      ${cost?.estimatedCost?.toFixed(2) || '0.00'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {data.modelsUsed.length === 0 && (
        <p className="text-[10px] text-[var(--color-text-muted)]">No model data available yet</p>
      )}
    </div>
  );
}

function ReportHistoryItem({ report }: { report: InsightReport }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border border-[var(--color-border)] rounded bg-[var(--color-bg-secondary)]">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-2.5 text-left"
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown className="w-3 h-3 text-[var(--color-text-muted)]" /> : <ChevronRight className="w-3 h-3 text-[var(--color-text-muted)]" />}
          <span className="text-[10px] text-[var(--color-text-primary)]">
            {new Date(report.timestamp).toLocaleString()}
          </span>
          <span className="text-[9px] px-1.5 py-0.5 bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] rounded">
            {report.type}
          </span>
        </div>
        <span className="text-[9px] text-[var(--color-text-muted)]">{report.duration_ms}ms</span>
      </button>
      {expanded && (
        <div className="border-t border-[var(--color-border)] p-3 space-y-2">
          <div className="text-[10px] text-[var(--color-text-secondary)]">
            <strong>Themes:</strong> {report.promptPatterns.commonThemes.map((t) => t.theme).join(', ') || 'None'}
          </div>
          <div className="text-[10px] text-[var(--color-text-secondary)]">
            <strong>Top Tools:</strong> {report.toolUsageTrends.mostUsedTools.slice(0, 5).map((t) => `${t.tool} (${t.count})`).join(', ') || 'None'}
          </div>
          <div className="text-[10px] text-[var(--color-text-secondary)]">
            <strong>Models:</strong> {report.modelComparison.modelsUsed.map((m) => `${m.model} (${m.sessionCount})`).join(', ') || 'None'}
          </div>
        </div>
      )}
    </div>
  );
}

export function InsightsPage() {
  const { data: latestData, isLoading: latestLoading } = useLatestInsight();
  const { data: historyData } = useInsightHistory(10);
  const runInsights = useRunInsights();

  const report = latestData?.report;

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-yellow-400" />
          <h1 className="text-sm font-semibold text-[var(--color-text-primary)]">Insights</h1>
          {report && (
            <span className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Last run: {new Date(report.timestamp).toLocaleTimeString()} ({report.duration_ms}ms)
            </span>
          )}
        </div>
        <button
          onClick={() => runInsights.mutate()}
          disabled={runInsights.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-teal-500/20 text-teal-400 rounded hover:bg-teal-500/30 transition-colors disabled:opacity-50"
        >
          <Play className="w-3 h-3" />
          {runInsights.isPending ? 'Running...' : 'Run Now'}
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3">
        {latestLoading ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-xs text-[var(--color-text-muted)]">Loading insights...</p>
          </div>
        ) : !report ? (
          <div className="flex items-center justify-center h-48">
            <div className="text-center space-y-2">
              <Lightbulb className="w-8 h-8 text-[var(--color-text-muted)] mx-auto opacity-30" />
              <p className="text-xs text-[var(--color-text-muted)]">No insights generated yet</p>
              <p className="text-[10px] text-[var(--color-text-muted)]">Click "Run Now" to generate your first insight report</p>
            </div>
          </div>
        ) : (
          <>
            {/* Three card grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <PromptPatternsCard data={report.promptPatterns} />
              <ToolUsageCard data={report.toolUsageTrends} />
              <ModelComparisonCard data={report.modelComparison} />
            </div>

            {/* Recommendations */}
            {report.recommendations.length > 0 && (
              <div className="border border-[var(--color-border)] rounded bg-[var(--color-bg-secondary)] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <h3 className="text-xs font-semibold text-[var(--color-text-primary)]">Recommendations</h3>
                </div>
                <ul className="space-y-1.5">
                  {report.recommendations.map((rec, i) => (
                    <li key={i} className="text-[11px] text-[var(--color-text-secondary)] flex items-start gap-2">
                      <span className="text-teal-400 flex-shrink-0 mt-0.5">-</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Report History */}
            {historyData && historyData.reports.length > 1 && (
              <div>
                <h3 className="text-xs font-semibold text-[var(--color-text-primary)] mb-2">Report History</h3>
                <div className="space-y-1.5">
                  {historyData.reports.slice(1).map((r) => (
                    <ReportHistoryItem key={r.id} report={r} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
