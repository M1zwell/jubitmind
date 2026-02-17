import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { FeedbackStats } from '@/lib/types';

interface Props {
  stats: FeedbackStats;
}

export function FeedbackByAdapterChart({ stats }: Props) {
  const data = Object.entries(stats.byAdapter).map(([adapter, counts]) => ({
    name: adapter,
    positive: counts.positive,
    negative: counts.negative,
  }));

  if (data.length === 0) {
    return (
      <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-4">
        <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)] mb-3">Feedback by Source</h3>
        <p className="text-xs text-[var(--color-text-muted)]">No feedback data yet</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-4">
      <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)] mb-3">Feedback by Source</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" barSize={14}>
            <XAxis type="number" tick={{ fontSize: 10, fill: '#a3a3a3' }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#d4d4d4' }} axisLine={false} tickLine={false} width={100} />
            <Tooltip
              contentStyle={{ background: '#2a2a2a', border: '1px solid #404040', borderRadius: '6px', fontSize: '11px' }}
              labelStyle={{ color: '#fafafa' }}
            />
            <Bar dataKey="positive" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]}>
              {data.map((_, i) => <Cell key={i} />)}
            </Bar>
            <Bar dataKey="negative" stackId="a" fill="#ef4444" radius={[0, 4, 4, 0]}>
              {data.map((_, i) => <Cell key={i} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-4 mt-2 justify-center">
        <span className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
          <span className="w-2 h-2 rounded-full bg-emerald-500" /> Positive
        </span>
        <span className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
          <span className="w-2 h-2 rounded-full bg-red-500" /> Negative
        </span>
      </div>
    </div>
  );
}
