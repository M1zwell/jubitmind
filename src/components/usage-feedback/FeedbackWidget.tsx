import { useState } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare, X } from 'lucide-react';
import { useSessionFeedback, useSubmitFeedback } from '@/hooks/useFeedback';

interface Props {
  sessionId: string;
  adapterId: string;
}

const QUICK_TAGS = ['helpful', 'accurate', 'fast', 'slow', 'inaccurate', 'creative'];

export function FeedbackWidget({ sessionId, adapterId }: Props) {
  const { data } = useSessionFeedback(sessionId, adapterId);
  const submit = useSubmitFeedback();
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const existing = data?.feedback;
  const currentRating = existing?.rating;

  function handleRate(rating: 'positive' | 'negative') {
    submit.mutate({ sessionId, adapterId, rating, comment: comment || undefined, tags: selectedTags.length > 0 ? selectedTags : undefined });
    setShowComment(false);
    setComment('');
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => handleRate('positive')}
        disabled={submit.isPending}
        className={`p-1 rounded transition-colors ${
          currentRating === 'positive'
            ? 'text-emerald-400 bg-emerald-500/20'
            : 'text-[var(--color-text-muted)] hover:text-emerald-400 hover:bg-emerald-500/10'
        }`}
        title="Positive"
      >
        <ThumbsUp className="w-3 h-3" />
      </button>
      <button
        onClick={() => handleRate('negative')}
        disabled={submit.isPending}
        className={`p-1 rounded transition-colors ${
          currentRating === 'negative'
            ? 'text-red-400 bg-red-500/20'
            : 'text-[var(--color-text-muted)] hover:text-red-400 hover:bg-red-500/10'
        }`}
        title="Negative"
      >
        <ThumbsDown className="w-3 h-3" />
      </button>
      <button
        onClick={() => setShowComment(!showComment)}
        className={`p-1 rounded transition-colors ${
          showComment ? 'text-teal-400 bg-teal-500/20' : 'text-[var(--color-text-muted)] hover:text-teal-400'
        }`}
        title="Add comment"
      >
        <MessageSquare className="w-3 h-3" />
      </button>

      {showComment && (
        <div className="absolute right-0 top-full mt-1 z-20 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-3 shadow-lg w-64">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase">Feedback</span>
            <button onClick={() => setShowComment(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="flex flex-wrap gap-1 mb-2">
            {QUICK_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                  selectedTags.includes(tag)
                    ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                    : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] border border-transparent hover:border-[var(--color-border)]'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Optional comment..."
            rows={2}
            className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded px-2 py-1 text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] resize-none focus:outline-none focus:border-teal-500/50"
          />
          <div className="flex gap-1 mt-2">
            <button
              onClick={() => handleRate('positive')}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
            >
              <ThumbsUp className="w-2.5 h-2.5" /> Good
            </button>
            <button
              onClick={() => handleRate('negative')}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30"
            >
              <ThumbsDown className="w-2.5 h-2.5" /> Poor
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
