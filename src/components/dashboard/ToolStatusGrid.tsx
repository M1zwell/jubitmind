import {
  Terminal, MousePointer2, GitBranch, ArrowRight, Wind, Sparkles,
  CheckCircle2, XCircle, Code2, Gauge, Wand2, Rocket, Blocks,
} from 'lucide-react';
import type { AdapterInfo } from '@/hooks/useUnifiedStats';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Terminal, MousePointer2, GitBranch, ArrowRight, Wind, Sparkles,
  Code2, Gauge, Wand2, Rocket, Blocks,
};

const CATEGORY_COLORS: Record<string, string> = {
  cli: 'text-teal-400',
  ide: 'text-blue-400',
  extension: 'text-purple-400',
  'api-router': 'text-amber-400',
};

interface Props {
  adapters: AdapterInfo[];
}

export function ToolStatusGrid({ adapters }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {adapters.map((a) => {
        const Icon = ICON_MAP[a.icon] || Terminal;
        return (
          <div
            key={a.id}
            className={`relative p-4 rounded-lg border transition-colors ${
              a.available
                ? 'bg-[var(--color-bg-secondary)] border-[var(--color-border)] hover:border-teal-500/50'
                : 'bg-[var(--color-bg-secondary)]/50 border-[var(--color-border)]/50 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <Icon className={`w-5 h-5 ${CATEGORY_COLORS[a.category] || 'text-gray-400'}`} />
              {a.available ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-gray-500" />
              )}
            </div>
            <h3 className="text-sm font-medium text-[var(--color-text-primary)]">{a.name}</h3>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{a.category}</p>
            {a.available && a.sessionCount !== undefined && (
              <p className="text-xs text-teal-400 mt-1">{a.sessionCount} sessions</p>
            )}
            {!a.available && (
              <p className="text-xs text-[var(--color-text-muted)] mt-1">Not installed</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
