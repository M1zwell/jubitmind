import { Trophy, Zap } from 'lucide-react';
import type { UnifiedArchiveItem } from '@/lib/types';

interface Props {
  messages: unknown[];
  item: UnifiedArchiveItem;
  participants: unknown[];
}

export function ArenaDetail({ messages, item, participants }: Props) {
  const arena = item.arenaMetadata;
  const modelsCompared = (arena?.models_compared as string[]) || [];
  const winner = arena?.winner_model as string | undefined;
  const voteType = arena?.vote_type as string | undefined;
  const signals = arena?.engagement_signals as Record<string, Record<string, unknown>> | undefined;

  // Split messages by model for side-by-side
  const modelA = modelsCompared[0];
  const modelB = modelsCompared[1];

  return (
    <div className="space-y-3 text-xs">
      {/* Arena header */}
      <div className="bg-orange-500/5 border border-orange-500/20 rounded p-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1 text-orange-400 font-medium">
            <Trophy className="w-3 h-3" />
            Arena Battle
          </div>
          {voteType && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400">{voteType}</span>
          )}
        </div>

        {/* Models compared */}
        <div className="flex items-center gap-2 mb-2">
          {modelsCompared.map((model, i) => (
            <span key={i} className={`flex-1 px-2 py-1 rounded text-center text-[10px] font-medium ${
              model === winner
                ? 'bg-orange-500/20 text-orange-400 ring-1 ring-orange-500/30'
                : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]'
            }`}>
              {model === winner && <Trophy className="w-2.5 h-2.5 inline mr-1" />}
              {model}
            </span>
          ))}
        </div>

        {/* Engagement signals */}
        {signals && (
          <div className="grid grid-cols-2 gap-2">
            {modelsCompared.map((model) => {
              const s = signals[model] as Record<string, unknown> | undefined;
              if (!s) return null;
              return (
                <div key={model} className="bg-[var(--color-bg-secondary)] rounded p-1.5">
                  <div className="text-[10px] font-medium text-[var(--color-text-secondary)] mb-1 truncate">{model}</div>
                  <div className="flex flex-wrap gap-2 text-[9px] text-[var(--color-text-muted)]">
                    {s.token_count != null && <span>{s.token_count as number} tokens</span>}
                    {s.response_time_ms != null && <span>{((s.response_time_ms as number) / 1000).toFixed(1)}s</span>}
                    {s.cost_cents != null && <span>${((s.cost_cents as number) / 100).toFixed(3)}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Messages */}
      {messages.slice(0, 30).map((msg, i) => {
        const m = msg as Record<string, unknown>;
        const role = (m.role || m.sender || m.model_name || 'unknown') as string;
        const content = (m.content || m.text || m.message || '') as string;
        const isModelA = role === modelA || (m.model_name as string) === modelA;

        return (
          <div key={i} className={`border-l-2 pl-2 py-1 ${
            isModelA ? 'border-orange-400/40' : 'border-blue-400/40'
          }`}>
            <span className={`font-medium text-[10px] ${
              isModelA ? 'text-orange-400' : 'text-blue-400'
            }`}>{role}: </span>
            <span className="text-[var(--color-text-muted)]">
              {typeof content === 'string' ? content.slice(0, 400) : JSON.stringify(content).slice(0, 400)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
