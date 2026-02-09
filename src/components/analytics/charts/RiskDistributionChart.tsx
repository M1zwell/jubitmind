import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const RISK_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
};

interface Props {
  data: { critical: number; high: number; medium: number; low: number };
}

export function RiskDistributionChart({ data }: Props) {
  const chartData = [
    { level: 'Critical', count: data.critical, color: RISK_COLORS.critical },
    { level: 'High', count: data.high, color: RISK_COLORS.high },
    { level: 'Medium', count: data.medium, color: RISK_COLORS.medium },
    { level: 'Low', count: data.low, color: RISK_COLORS.low },
  ];

  const hasData = chartData.some(d => d.count > 0);
  if (!hasData) {
    return <p className="text-xs text-[var(--color-text-muted)] italic text-center py-8">No risk data (local sessions only)</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
        <XAxis
          dataKey="level"
          tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
        />
        <YAxis
          tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '11px' }}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {chartData.map((entry) => (
            <Cell key={entry.level} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
