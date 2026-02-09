import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const TYPE_COLORS: Record<string, string> = {
  chat: '#3b82f6',
  chatab: '#f97316',
  chatlab: '#a855f7',
  'chatlab-agent': '#10b981',
  theater: '#ec4899',
  unknown: '#6b7280',
};

interface Props {
  data: Record<string, number>;
}

export function TypeDistributionChart({ data }: Props) {
  const chartData = Object.entries(data)
    .filter(([, count]) => count > 0)
    .map(([type, count]) => ({ name: type, value: count }));

  if (chartData.length === 0) {
    return <p className="text-xs text-[var(--color-text-muted)] italic text-center py-8">No type data</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={3}
          dataKey="value"
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {chartData.map((entry) => (
            <Cell key={entry.name} fill={TYPE_COLORS[entry.name] || '#6b7280'} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '11px' }}
        />
        <Legend
          wrapperStyle={{ fontSize: '10px' }}
          formatter={(value: string) => <span style={{ color: 'var(--color-text-secondary)' }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
