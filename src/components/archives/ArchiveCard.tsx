import { MessageSquare, Users, ArrowBigUp, Clock, Cpu, HardDrive, Cloud, Trash2 } from 'lucide-react';
import type { UnifiedArchiveItem } from '@/lib/types';
import { RiskBadge } from '@/components/conversations/RiskBadge';

const SOURCE_CONFIG = {
  'supabase-room': { label: 'Discussion', color: 'bg-purple-500/20 text-purple-400', icon: Cloud },
  'supabase-chat': { label: 'Chat', color: 'bg-blue-500/20 text-blue-400', icon: Cloud },
  'local-claude': { label: 'Claude Code', color: 'bg-teal-500/20 text-teal-400', icon: HardDrive },
} as const;

interface ArchiveCardProps {
  item: UnifiedArchiveItem;
  onClick?: () => void;
  onDelete?: () => void;
}

export function ArchiveCard({ item, onClick, onDelete }: ArchiveCardProps) {
  const cfg = SOURCE_CONFIG[item.source];
  const Icon = cfg.icon;
  const timeAgo = formatTimeAgo(item.createdAt);

  return (
    <div
      onClick={onClick}
      className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-3 hover:border-teal-500/30 transition-colors cursor-pointer group"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${cfg.color}`}>
            <Icon className="w-2.5 h-2.5" />
            {cfg.label}
          </span>
          {item.riskLevel && <RiskBadge level={item.riskLevel} size="sm" />}
        </div>
        <div className="flex items-center gap-1">
          {onDelete && item.source.startsWith('supabase') && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-red-400 transition-all"
              title="Delete"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
          <span className="text-[10px] text-[var(--color-text-muted)] whitespace-nowrap">{timeAgo}</span>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-sm font-medium text-[var(--color-text-primary)] truncate mb-1">
        {item.title}
      </h3>

      {/* Preview */}
      {item.preview && (
        <p className="text-xs text-[var(--color-text-muted)] line-clamp-2 mb-2">
          {item.preview}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center gap-3 text-[10px] text-[var(--color-text-muted)]">
        <span className="flex items-center gap-0.5">
          <MessageSquare className="w-2.5 h-2.5" />
          {item.messageCount}
        </span>

        {item.participants && item.participants.length > 0 && (
          <span className="flex items-center gap-0.5">
            <Users className="w-2.5 h-2.5" />
            {item.participants.length}
          </span>
        )}

        {item.models && item.models.length > 0 && (
          <span className="flex items-center gap-0.5">
            <Cpu className="w-2.5 h-2.5" />
            {item.models.slice(0, 2).join(', ')}
          </span>
        )}

        {item.upvotes != null && item.upvotes > 0 && (
          <span className="flex items-center gap-0.5">
            <ArrowBigUp className="w-2.5 h-2.5" />
            {item.upvotes}
          </span>
        )}

        {item.project && (
          <span className="flex items-center gap-0.5 truncate">
            <Clock className="w-2.5 h-2.5" />
            {item.project.replace(/^-Users-[^-]+-/, '')}
          </span>
        )}
      </div>

      {/* Tags */}
      {item.tags && item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {item.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]">
              {tag}
            </span>
          ))}
          {item.tags.length > 4 && (
            <span className="text-[10px] text-[var(--color-text-muted)]">+{item.tags.length - 4}</span>
          )}
        </div>
      )}
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}
