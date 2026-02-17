import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { AdapterStatsEntry } from '@/hooks/useUnifiedStats';

const COLORS = ['#14b8a6', '#3b82f6', '#a855f7', '#f59e0b', '#ef4444', '#10b981', '#6366f1', '#ec4899'];

interface Props {
  adapters: AdapterStatsEntry[];
}

export function SourceSplitChart({ adapters }: Props) {
  const data = adapters
    .filter((a) => a.totalSessions > 0)
    .map((a) => ({ name: a.name, value: a.totalSessions }))
    .sort((a, b) => b.value - a.value);

  if (data.length === 0) {
    return (
      <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-4">
        <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)] mb-3">Sessions by Source</h3>
        <p className="text-xs text-[var(--color-text-muted)]">No session data available</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-4">
      <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)] mb-3">Sessions by Source</h3>
      <div className="flex items-center gap-4">
        <div className="w-40 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} innerRadius={30}>
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#2a2a2a', border: '1px solid #404040', borderRadius: '6px', fontSize: '11px' }}
                labelStyle={{ color: '#fafafa' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-1">
          {data.map((d, i) => (
            <div key={d.name} className="flex items-center gap-2 text-xs">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <span className="text-[var(--color-text-secondary)] truncate">{d.name}</span>
              <span className="ml-auto text-[var(--color-text-muted)]">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
