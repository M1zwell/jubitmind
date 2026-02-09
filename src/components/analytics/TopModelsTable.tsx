import { Trophy, Cpu } from 'lucide-react';

interface Props {
  data: Array<{ model: string; wins: number; appearances: number }>;
}

export function TopModelsTable({ data }: Props) {
  if (data.length === 0) {
    return <p className="text-xs text-[var(--color-text-muted)] italic text-center py-4">No arena data</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
            <th className="text-left py-1.5 px-2 font-medium">#</th>
            <th className="text-left py-1.5 px-2 font-medium">Model</th>
            <th className="text-right py-1.5 px-2 font-medium">Wins</th>
            <th className="text-right py-1.5 px-2 font-medium">Battles</th>
            <th className="text-right py-1.5 px-2 font-medium">Win Rate</th>
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 10).map((row, i) => {
            const winRate = row.appearances > 0 ? ((row.wins / row.appearances) * 100).toFixed(0) : '0';
            return (
              <tr key={row.model} className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-bg-tertiary)] transition-colors">
                <td className="py-1.5 px-2 text-[var(--color-text-muted)]">
                  {i === 0 ? <Trophy className="w-3 h-3 text-orange-400 inline" /> : i + 1}
                </td>
                <td className="py-1.5 px-2">
                  <span className="inline-flex items-center gap-1 text-[var(--color-text-secondary)]">
                    <Cpu className="w-2.5 h-2.5 text-[var(--color-text-muted)]" />
                    {row.model}
                  </span>
                </td>
                <td className="py-1.5 px-2 text-right text-orange-400 font-medium">{row.wins}</td>
                <td className="py-1.5 px-2 text-right text-[var(--color-text-muted)]">{row.appearances}</td>
                <td className="py-1.5 px-2 text-right">
                  <span className={`font-medium ${Number(winRate) >= 60 ? 'text-emerald-400' : Number(winRate) >= 40 ? 'text-yellow-400' : 'text-[var(--color-text-muted)]'}`}>
                    {winRate}%
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
