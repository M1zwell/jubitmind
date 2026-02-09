import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Props {
  data: Record<string, number>;
}

export function ModelUsageChart({ data }: Props) {
  const chartData = Object.entries(data)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([model, count]) => ({ model: model.length > 20 ? model.slice(0, 18) + '...' : model, count, fullName: model }));

  if (chartData.length === 0) {
    return <p className="text-xs text-[var(--color-text-muted)] italic text-center py-8">No model usage data</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
        <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
        <YAxis
          type="category"
          dataKey="model"
          width={130}
          tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }}
        />
        <Tooltip
          contentStyle={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '11px' }}
          labelStyle={{ color: 'var(--color-text-primary)' }}
          formatter={(value: number, _name: string, props: { payload: { fullName: string } }) => [value, props.payload.fullName]}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
          {chartData.map((_, i) => (
            <Cell key={i} fill={i === 0 ? '#14b8a6' : i < 3 ? '#2dd4bf' : '#5eead4'} fillOpacity={1 - i * 0.06} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
