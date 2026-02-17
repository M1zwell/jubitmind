import { useState } from 'react';
import { Code2, Terminal, Clock, MessageSquare, ExternalLink } from 'lucide-react';
import { useAdapterSessions } from '@/hooks/useUnifiedStats';
import { FeedbackWidget } from './FeedbackWidget';

const ADAPTER_ICONS: Record<string, { icon: typeof Code2; color: string }> = {
  codex: { icon: Code2, color: 'text-orange-400' },
  'claude-code': { icon: Terminal, color: 'text-teal-400' },
};

interface Props {
  adapters: string[];
}

export function SessionTraceList({ adapters }: Props) {
  const [selectedAdapter, setSelectedAdapter] = useState<string>('all');

  const activeAdapters = selectedAdapter === 'all' ? adapters : [selectedAdapter];

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase">Source</span>
        <div className="flex gap-1">
          <FilterButton active={selectedAdapter === 'all'} onClick={() => setSelectedAdapter('all')} label="All" />
          {adapters.map((a) => (
            <FilterButton key={a} active={selectedAdapter === a} onClick={() => setSelectedAdapter(a)} label={a} />
          ))}
        </div>
      </div>

      {/* Session lists */}
      {activeAdapters.map((adapterId) => (
        <AdapterSessionPanel key={adapterId} adapterId={adapterId} />
      ))}
    </div>
  );
}

function FilterButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
        active
          ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
          : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] border border-transparent hover:border-[var(--color-border)]'
      }`}
    >
      {label}
    </button>
  );
}

function AdapterSessionPanel({ adapterId }: { adapterId: string }) {
  const { data, isLoading } = useAdapterSessions(adapterId, { limit: 20 });
  const sessions = data?.sessions ?? [];

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-3 h-16 animate-pulse" />
        ))}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-4">
        <p className="text-xs text-[var(--color-text-muted)]">No sessions found for {adapterId}</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {sessions.map((session: Record<string, unknown>) => {
        const sid = session.sessionId as string;
        const preview = (session.preview as string) || '';
        const msgCount = (session.messageCount as number) || 0;
        const createdAt = session.createdAt as string;
        const aid = (session.adapterId as string) || adapterId;
        const projectSlug = session.projectSlug as string;
        const iconConfig = ADAPTER_ICONS[aid] || { icon: Terminal, color: 'text-[var(--color-text-muted)]' };
        const Icon = iconConfig.icon;

        return (
          <div
            key={sid}
            className="relative bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-3 hover:border-[var(--color-border)] hover:bg-[var(--color-bg-tertiary)] transition-colors group"
          >
            <div className="flex items-start gap-2">
              <Icon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${iconConfig.color}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${iconConfig.color} bg-[var(--color-bg-tertiary)]`}>
                    {aid}
                  </span>
                  {projectSlug && (
                    <span className="text-[10px] text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded truncate max-w-[120px]">
                      {projectSlug}
                    </span>
                  )}
                  <span className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    {new Date(createdAt).toLocaleDateString()} {new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)] line-clamp-1">{preview}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-0.5">
                    <MessageSquare className="w-2.5 h-2.5" />
                    {msgCount} msgs
                  </span>
                  <a
                    href={`/history?source=${aid}&sessionId=${sid}`}
                    className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ExternalLink className="w-2.5 h-2.5" />
                    View
                  </a>
                </div>
              </div>
              <div className="flex-shrink-0">
                <FeedbackWidget sessionId={sid} adapterId={aid} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
