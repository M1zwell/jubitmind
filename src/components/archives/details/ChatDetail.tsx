import type { UnifiedArchiveItem } from '@/lib/types';

interface Props {
  messages: unknown[];
  item: UnifiedArchiveItem;
}

export function ChatDetail({ messages, item }: Props) {
  if (!messages.length) {
    return <p className="text-xs italic text-[var(--color-text-muted)]">No messages to display</p>;
  }

  return (
    <div className="space-y-1.5">
      {item.summary && (
        <div className="bg-[var(--color-bg-secondary)] rounded p-2 text-xs text-[var(--color-text-secondary)] mb-2">
          {item.summary}
        </div>
      )}
      {messages.slice(0, 30).map((msg, i) => {
        const m = msg as Record<string, unknown>;
        const role = (m.role || m.sender || m.model_name || 'unknown') as string;
        const content = (m.content || m.text || m.message || '') as string;
        const isUser = role === 'user' || (m.isHuman as boolean);

        return (
          <div key={i} className={`border-l-2 pl-2 py-1 text-xs ${isUser ? 'border-teal-500/40' : 'border-[var(--color-border)]'}`}>
            <span className={`font-medium ${isUser ? 'text-teal-400' : 'text-[var(--color-text-secondary)]'}`}>{role}: </span>
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
