import type { AdapterStatsEntry } from '@/hooks/useUnifiedStats';

interface Props {
  adapters: AdapterStatsEntry[];
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

export function AdapterStatsTable({ adapters }: Props) {
  const sorted = [...adapters].sort((a, b) => b.totalSessions - a.totalSessions);

  return (
    <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-4">
      <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)] mb-3">Adapter Breakdown</h3>
      {sorted.length === 0 ? (
        <p className="text-xs text-[var(--color-text-muted)]">No adapters with data</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                <th className="text-left py-1.5 font-medium">Source</th>
                <th className="text-right py-1.5 font-medium">Sessions</th>
                <th className="text-right py-1.5 font-medium">Messages</th>
                <th className="text-right py-1.5 font-medium">Tokens</th>
                <th className="text-right py-1.5 font-medium">Models</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((a) => (
                <tr key={a.adapterId} className="border-b border-[var(--color-border-muted)] hover:bg-[var(--color-bg-tertiary)]">
                  <td className="py-1.5 text-[var(--color-text-secondary)]">{a.name}</td>
                  <td className="py-1.5 text-right text-teal-400 font-medium">{formatNum(a.totalSessions)}</td>
                  <td className="py-1.5 text-right text-[var(--color-text-secondary)]">{formatNum(a.totalMessages)}</td>
                  <td className="py-1.5 text-right text-[var(--color-text-muted)]">
                    {a.totalTokens ? formatNum(a.totalTokens) : '—'}
                  </td>
                  <td className="py-1.5 text-right text-[var(--color-text-muted)]">
                    {a.modelUsage ? Object.keys(a.modelUsage).join(', ') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
