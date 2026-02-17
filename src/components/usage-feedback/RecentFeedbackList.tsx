import { ThumbsUp, ThumbsDown, Clock } from 'lucide-react';
import type { FeedbackStats } from '@/lib/types';

interface Props {
  stats: FeedbackStats;
}

export function RecentFeedbackList({ stats }: Props) {
  const { recentFeedback, topTags } = stats;

  return (
    <div className="space-y-3">
      {/* Top tags */}
      {topTags.length > 0 && (
        <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-4">
          <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Top Tags</h3>
          <div className="flex flex-wrap gap-1.5">
            {topTags.map((t) => (
              <span
                key={t.tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] border border-[var(--color-border-muted)]"
              >
                {t.tag}
                <span className="text-[var(--color-text-muted)]">{t.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recent feedback list */}
      <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-4">
        <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)] mb-3">Recent Feedback</h3>
        {recentFeedback.length === 0 ? (
          <p className="text-xs text-[var(--color-text-muted)]">No feedback submitted yet</p>
        ) : (
          <div className="space-y-2">
            {recentFeedback.map((fb) => (
              <div
                key={fb.id}
                className="flex items-start gap-2 py-2 border-b border-[var(--color-border-muted)] last:border-0"
              >
                {fb.rating === 'positive' ? (
                  <ThumbsUp className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                ) : (
                  <ThumbsDown className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-medium text-[var(--color-text-secondary)]">{fb.adapterId}</span>
                    <span className="text-[10px] text-[var(--color-text-muted)] font-mono">{fb.sessionId.slice(0, 8)}...</span>
                    <span className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-0.5 ml-auto">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(fb.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  {fb.comment && (
                    <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2">{fb.comment}</p>
                  )}
                  {fb.tags && fb.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {fb.tags.map((tag) => (
                        <span key={tag} className="px-1.5 py-0 rounded text-[9px] bg-teal-500/10 text-teal-400">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
