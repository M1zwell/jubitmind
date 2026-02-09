import { Link } from 'react-router-dom';
import { MessageSquare, Users, ArrowBigUp, Clock, Cpu, HardDrive, Trash2, Download, Trophy, ExternalLink, Zap } from 'lucide-react';
import type { UnifiedArchiveItem } from '@/lib/types';
import { RiskBadge } from '@/components/conversations/RiskBadge';
import { ProductTypeBadge } from '@/components/archives/ProductTypeBadge';
import { VisibilityBadge } from '@/components/archives/VisibilityBadge';
import { getSourceLink } from '@/lib/config';

interface ArchiveCardProps {
  item: UnifiedArchiveItem;
  onClick?: () => void;
  onDelete?: () => void;
  onExport?: () => void;
}

export function ArchiveCard({ item, onClick, onDelete, onExport }: ArchiveCardProps) {
  const timeAgo = formatTimeAgo(item.createdAt);
  const isSupabaseRoom = item.source === 'supabase-room';
  const arenaWinner = item.arenaMetadata?.winner_model as string | undefined;
  const sourceLink = getSourceLink(item);
  const engagementSignals = item.arenaMetadata?.engagement_signals;
  const totalCost = engagementSignals
    ? Object.values(engagementSignals).reduce((sum, s) => sum + (s?.cost_cents || 0), 0)
    : 0;

  return (
    <div
      onClick={onClick}
      className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-3 hover:border-teal-500/30 transition-colors cursor-pointer group"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {isSupabaseRoom ? (
            <>
              <ProductTypeBadge type={item.productType || 'unknown'} />
              <VisibilityBadge visibility={item.visibility || 'private'} />
            </>
          ) : item.source === 'supabase-chat' ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/20 text-blue-400">
              Chat
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-teal-500/20 text-teal-400">
              <HardDrive className="w-2.5 h-2.5" />
              Claude Code
            </span>
          )}
          {item.riskLevel && <RiskBadge level={item.riskLevel} size="sm" />}
        </div>
        <div className="flex items-center gap-1">
          {onExport && item.source.startsWith('supabase') && (
            <button
              onClick={(e) => { e.stopPropagation(); onExport(); }}
              className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-teal-500/20 text-teal-400 transition-all"
              title="Export JSON"
            >
              <Download className="w-3 h-3" />
            </button>
          )}
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

      {/* Arena winner + engagement */}
      {arenaWinner && (
        <div className="flex items-center gap-2 mb-1">
          <span className="flex items-center gap-1 text-[10px] text-orange-400">
            <Trophy className="w-2.5 h-2.5" />
            Winner: {arenaWinner}
          </span>
          {totalCost > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-yellow-400">
              <Zap className="w-2.5 h-2.5" />
              ${(totalCost / 100).toFixed(3)}
            </span>
          )}
        </div>
      )}

      {/* Preview */}
      {(item.summary || item.preview) && (
        <p className="text-xs text-[var(--color-text-muted)] line-clamp-2 mb-2">
          {item.summary || item.preview}
        </p>
      )}

      {/* Model chips */}
      {item.models && item.models.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap mb-2">
          {item.models.slice(0, 3).map((model) => (
            <span key={model} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[var(--color-bg-tertiary)] text-[10px] text-[var(--color-text-secondary)]">
              <Cpu className="w-2.5 h-2.5 text-[var(--color-text-muted)]" />
              {model}
            </span>
          ))}
          {item.models.length > 3 && (
            <span className="text-[10px] text-[var(--color-text-muted)]">+{item.models.length - 3}</span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-3 text-[10px] text-[var(--color-text-muted)]">
        <span className="flex items-center gap-0.5">
          <MessageSquare className="w-2.5 h-2.5" />
          {item.messageCount}
        </span>

        {item.participants && item.participants.length > 0 && (
          <span className={`flex items-center gap-0.5 ${item.participants.length > 2 ? 'text-purple-400' : ''}`}>
            <Users className="w-2.5 h-2.5" />
            {item.participants.length}
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

      {/* Source link - always visible for cloud archives */}
      {sourceLink && (
        <div className="mt-2">
          {sourceLink.comingSoon ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]">
              <ExternalLink className="w-3 h-3" />
              {sourceLink.label} - Coming Soon
            </span>
          ) : sourceLink.internal ? (
            <Link
              to={sourceLink.url}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              {sourceLink.label}
            </Link>
          ) : (
            <a
              href={sourceLink.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              {sourceLink.label}
            </a>
          )}
        </div>
      )}

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
