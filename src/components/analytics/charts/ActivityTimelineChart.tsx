import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  data: Array<{ date: string; count: number }>;
}

export function ActivityTimelineChart({ data }: Props) {
  if (data.length === 0) {
    return <p className="text-xs text-[var(--color-text-muted)] italic text-center py-8">No activity data</p>;
  }

  const formatted = data.map(d => ({
    ...d,
    label: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={formatted} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
        <defs>
          <linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '11px' }}
          labelStyle={{ color: 'var(--color-text-primary)' }}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke="#14b8a6"
          strokeWidth={2}
          fill="url(#activityGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
