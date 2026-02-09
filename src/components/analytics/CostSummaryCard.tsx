import { DollarSign, Swords } from 'lucide-react';

interface Props {
  totalCents: number;
  arenaCount: number;
}

export function CostSummaryCard({ totalCents, arenaCount }: Props) {
  const dollars = (totalCents / 100).toFixed(2);

  return (
    <div className="flex items-center gap-4">
      <div className="flex-1 bg-[var(--color-bg-secondary)] rounded-lg p-3 border border-[var(--color-border)]">
        <div className="flex items-center gap-1.5 text-[var(--color-text-muted)] mb-1">
          <DollarSign className="w-3 h-3" />
          <span className="text-[10px] font-medium uppercase tracking-wider">Arena Cost</span>
        </div>
        <p className="text-lg font-semibold text-emerald-400">${dollars}</p>
        <p className="text-[10px] text-[var(--color-text-muted)]">from engagement signals</p>
      </div>

      <div className="flex-1 bg-[var(--color-bg-secondary)] rounded-lg p-3 border border-[var(--color-border)]">
        <div className="flex items-center gap-1.5 text-[var(--color-text-muted)] mb-1">
          <Swords className="w-3 h-3" />
          <span className="text-[10px] font-medium uppercase tracking-wider">Arena Battles</span>
        </div>
        <p className="text-lg font-semibold text-orange-400">{arenaCount}</p>
        <p className="text-[10px] text-[var(--color-text-muted)]">total comparisons</p>
      </div>
    </div>
  );
}
