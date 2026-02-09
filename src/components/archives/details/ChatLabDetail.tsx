import { Users, Cpu } from 'lucide-react';
import type { UnifiedArchiveItem } from '@/lib/types';

const SPEAKER_COLORS = [
  'border-purple-400/40', 'border-emerald-400/40', 'border-blue-400/40',
  'border-pink-400/40', 'border-yellow-400/40', 'border-cyan-400/40',
  'border-orange-400/40', 'border-red-400/40', 'border-indigo-400/40', 'border-lime-400/40',
];

const SPEAKER_TEXT_COLORS = [
  'text-purple-400', 'text-emerald-400', 'text-blue-400',
  'text-pink-400', 'text-yellow-400', 'text-cyan-400',
  'text-orange-400', 'text-red-400', 'text-indigo-400', 'text-lime-400',
];

interface Props {
  messages: unknown[];
  item: UnifiedArchiveItem;
  participants: unknown[];
}

export function ChatLabDetail({ messages, item, participants }: Props) {
  // Build speaker → color map
  const speakerMap = new Map<string, number>();
  for (const p of participants) {
    const name = ((p as Record<string, unknown>).name || (p as Record<string, unknown>).model_name || '') as string;
    if (name && !speakerMap.has(name)) {
      speakerMap.set(name, speakerMap.size % SPEAKER_COLORS.length);
    }
  }

  return (
    <div className="space-y-3 text-xs">
      {/* Summary */}
      {item.summary && (
        <div className="bg-[var(--color-bg-secondary)] rounded p-2 text-[var(--color-text-secondary)]">
          {item.summary}
        </div>
      )}

      {/* Character roster */}
      {participants.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="flex items-center gap-1 text-[var(--color-text-muted)]">
            <Users className="w-3 h-3" />
            <span className="text-[10px]">{participants.length} characters:</span>
          </span>
          {participants.map((p, i) => {
            const pp = p as Record<string, unknown>;
            const name = (pp.name || pp.model_name || 'Unknown') as string;
            const emoji = pp.emoji as string | undefined;
            const model = (pp.model_name || '') as string;
            const colorIdx = speakerMap.get(name) ?? i % SPEAKER_COLORS.length;
            return (
              <span key={i} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--color-bg-secondary)] text-[10px] ${SPEAKER_TEXT_COLORS[colorIdx]}`}>
                {emoji && <span>{emoji}</span>}
                <span className="font-medium">{name}</span>
                {model && model !== name && (
                  <span className="text-[var(--color-text-muted)]">({model})</span>
                )}
              </span>
            );
          })}
        </div>
      )}

      {/* Multi-speaker messages */}
      {messages.slice(0, 30).map((msg, i) => {
        const m = msg as Record<string, unknown>;
        const participant = m.participant as Record<string, unknown> | undefined;
        const name = (participant?.name || m.role || m.sender || m.model_name || 'unknown') as string;
        const content = (m.content || m.text || m.message || '') as string;
        const isHuman = m.isHuman as boolean;
        const colorIdx = speakerMap.get(name) ?? 0;

        return (
          <div key={i} className={`border-l-2 pl-2 py-1 ${isHuman ? 'border-teal-500/40' : SPEAKER_COLORS[colorIdx]}`}>
            <span className={`font-medium text-[10px] ${isHuman ? 'text-teal-400' : SPEAKER_TEXT_COLORS[colorIdx]}`}>
              {participant?.emoji as string || ''} {name}:
            </span>{' '}
            <span className="text-[var(--color-text-muted)]">
              {typeof content === 'string' ? content.slice(0, 400) : JSON.stringify(content).slice(0, 400)}
            </span>
          </div>
        );
      })}
      {messages.length > 30 && (
        <p className="text-[10px] text-[var(--color-text-muted)] pt-1">+ {messages.length - 30} more messages</p>
      )}
    </div>
  );
}
