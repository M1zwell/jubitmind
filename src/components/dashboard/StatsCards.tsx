import { MessageSquare, Hash, Coins, Layers } from 'lucide-react';

interface Props {
  totalSessions: number;
  totalMessages: number;
  totalTokens: number;
  totalCostUsd: number;
  availableTools: number;
  totalTools: number;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function StatsCards({ totalSessions, totalMessages, totalTokens, totalCostUsd, availableTools, totalTools }: Props) {
  const cards = [
    { label: 'AI Tools', value: `${availableTools}/${totalTools}`, sublabel: 'detected', icon: Layers, color: 'text-purple-400' },
    { label: 'Sessions', value: formatNumber(totalSessions), sublabel: 'total', icon: Hash, color: 'text-teal-400' },
    { label: 'Messages', value: formatNumber(totalMessages), sublabel: 'exchanged', icon: MessageSquare, color: 'text-blue-400' },
    { label: 'Cost', value: totalCostUsd > 0 ? `$${totalCostUsd.toFixed(2)}` : '--', sublabel: 'estimated', icon: Coins, color: 'text-amber-400' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">{c.label}</span>
            <c.icon className={`w-4 h-4 ${c.color}`} />
          </div>
          <p className="text-2xl font-bold text-[var(--color-text-primary)]">{c.value}</p>
          <p className="text-xs text-[var(--color-text-muted)]">{c.sublabel}</p>
        </div>
      ))}
    </div>
  );
}
