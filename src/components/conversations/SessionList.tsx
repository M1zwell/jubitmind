import { Terminal, Cpu, Trash2, FolderOpen } from 'lucide-react';
import type { SessionMeta } from '@/lib/types';
import { RiskBadge } from './RiskBadge';
import { TagChip, inferCategory } from './TagChip';

interface Props {
  sessions: SessionMeta[];
  selected: string | null;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
  isLoading: boolean;
  showProject?: boolean;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / 1048576).toFixed(1)}MB`;
}

function groupByDate(sessions: SessionMeta[]): Record<string, SessionMeta[]> {
  const groups: Record<string, SessionMeta[]> = {};
  const now = new Date();

  for (const s of sessions) {
    const d = new Date(s.updatedAt);
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);

    let label: string;
    if (diffDays === 0) label = 'Today';
    else if (diffDays === 1) label = 'Yesterday';
    else if (diffDays < 7) label = 'Last 7 Days';
    else if (diffDays < 30) label = 'Last 30 Days';
    else label = 'Older';

    if (!groups[label]) groups[label] = [];
    groups[label].push(s);
  }

  return groups;
}

export function SessionList({ sessions, selected, onSelect, onDelete, isLoading, showProject }: Props) {
  if (isLoading) {
    return (
      <div className="w-[320px] flex-shrink-0 border border-[var(--color-border)] rounded bg-[var(--color-bg-secondary)] flex items-center justify-center">
        <span className="text-xs text-[var(--color-text-muted)]">Loading sessions...</span>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="w-[320px] flex-shrink-0 border border-[var(--color-border)] rounded bg-[var(--color-bg-secondary)] flex items-center justify-center">
        <span className="text-xs text-[var(--color-text-muted)]">No conversations yet</span>
      </div>
    );
  }

  const grouped = groupByDate(sessions);

  return (
    <div className="w-[320px] flex-shrink-0 border border-[var(--color-border)] rounded bg-[var(--color-bg-secondary)] overflow-y-auto">
      {Object.entries(grouped).map(([label, items]) => (
        <div key={label}>
          <div className="sticky top-0 bg-[var(--color-bg-secondary)] px-3 py-1.5 text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider border-b border-[var(--color-border)]">
            {label}
            <span className="ml-1 text-[var(--color-text-muted)] opacity-50">
              ({items.length})
            </span>
          </div>
          {items.map((s) => (
            <button
              key={s.sessionId}
              onClick={() => onSelect(s.sessionId)}
              className={`group w-full text-left px-3 py-2 text-xs border-b border-[var(--color-border)] transition-colors ${
                selected === s.sessionId
                  ? 'bg-teal-500/10 border-l-2 border-l-teal-400'
                  : 'hover:bg-[var(--color-bg-tertiary)] border-l-2 border-l-transparent'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                {s.mode === 'claude-cli' ? (
                  <Terminal className="w-3 h-3 text-teal-400 flex-shrink-0" />
                ) : (
                  <Cpu className="w-3 h-3 text-pink-400 flex-shrink-0" />
                )}
                <span
                  className={`text-[9px] px-1 rounded ${
                    s.source === 'dashboard'
                      ? 'bg-teal-500/20 text-teal-300'
                      : 'bg-gray-500/20 text-gray-400'
                  }`}
                >
                  {s.source === 'dashboard' ? 'Dashboard' : 'Claude Code'}
                </span>
                {showProject && s.projectDisplayName && (
                  <span className="text-[9px] px-1 rounded bg-purple-500/20 text-purple-300 truncate max-w-[120px] flex items-center gap-0.5">
                    <FolderOpen className="w-2.5 h-2.5 flex-shrink-0" />
                    {s.projectDisplayName}
                  </span>
                )}
                {s.riskLevel && (
                  <RiskBadge level={s.riskLevel} />
                )}
                {s.model && (
                  <span className="text-[9px] text-[var(--color-text-muted)]">{s.model}</span>
                )}
                <span className="flex-1" />
                {s.source === 'dashboard' && onDelete && (
                  <Trash2
                    className="w-3 h-3 text-[var(--color-text-muted)] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(s.sessionId);
                    }}
                  />
                )}
              </div>
              <div className="text-[var(--color-text-primary)] line-clamp-2 mb-1 leading-relaxed">
                {s.preview || 'No preview'}
              </div>
              {((s.autoTags && s.autoTags.length > 0) || (s.manualTags && s.manualTags.length > 0)) && (
                <div className="flex flex-wrap gap-0.5 mb-1">
                  {(s.autoTags || []).slice(0, 2).map((t) => (
                    <TagChip key={t} name={t} category={inferCategory(t)} />
                  ))}
                  {(s.manualTags || []).slice(0, 1).map((t) => (
                    <TagChip key={t} name={t} category="manual" />
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between text-[var(--color-text-muted)] text-[9px]">
                <span>
                  {s.messageCount > 0 ? `${s.messageCount} msgs` : ''}
                  {s.sizeBytes ? ` ${formatSize(s.sizeBytes)}` : ''}
                </span>
                <span>{timeAgo(s.updatedAt)}</span>
              </div>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
