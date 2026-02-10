import { Clock, Terminal } from 'lucide-react';

interface Session {
  sessionId: string;
  adapterId: string;
  preview: string;
  updatedAt: string;
  projectDisplayName?: string;
}

interface Props {
  sessions: Session[];
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function RecentSessions({ sessions }: Props) {
  if (!sessions.length) {
    return (
      <div className="text-center py-8 text-[var(--color-text-muted)] text-sm">
        No recent sessions found
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {sessions.map((s) => (
        <div
          key={s.sessionId}
          className="flex items-start gap-3 p-3 rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-colors cursor-default"
        >
          <Terminal className="w-4 h-4 text-teal-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[var(--color-text-primary)] truncate">
              {s.preview || 'No preview'}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              {s.projectDisplayName && (
                <span className="text-xs text-[var(--color-text-muted)]">{s.projectDisplayName}</span>
              )}
              <span className="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {timeAgo(s.updatedAt)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
