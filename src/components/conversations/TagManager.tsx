import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Loader2, ShieldAlert } from 'lucide-react';
import { useSessionRisk, useAddTag, useRemoveTag } from '@/hooks/useConversations';
import { RiskBadge } from './RiskBadge';
import { TagChip, inferCategory } from './TagChip';
import type { RiskLevel } from '@/lib/types';

interface Props {
  sessionId: string;
  project?: string;
}

export function TagManager({ sessionId, project }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [newTag, setNewTag] = useState('');

  const { data, isLoading } = useSessionRisk(sessionId, project);
  const addTag = useAddTag();
  const removeTag = useRemoveTag();

  const handleAddTag = () => {
    const tag = newTag.trim().toLowerCase();
    if (!tag || tag.length > 50) return;
    addTag.mutate({ sessionId, tag, project });
    setNewTag('');
  };

  if (isLoading) {
    return (
      <div className="px-4 py-2 border-b border-[var(--color-border)] flex items-center gap-2">
        <Loader2 className="w-3 h-3 animate-spin text-teal-400" />
        <span className="text-[10px] text-[var(--color-text-muted)]">Analyzing risk & tags...</span>
      </div>
    );
  }

  if (!data) return null;

  const { risk, tags } = data;
  const autoTags = tags.autoTags || [];
  const manualTags = tags.manualTags || [];

  return (
    <div className="border-b border-[var(--color-border)]">
      {/* Collapsed summary bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-2 hover:bg-[var(--color-bg-tertiary)] transition-colors"
      >
        {expanded ? (
          <ChevronDown className="w-3 h-3 text-[var(--color-text-muted)]" />
        ) : (
          <ChevronRight className="w-3 h-3 text-[var(--color-text-muted)]" />
        )}
        <RiskBadge level={risk.maxRisk as RiskLevel} score={risk.maxScore} size="md" />
        <span className="text-[10px] text-[var(--color-text-muted)]">
          {risk.totalToolUses} tool uses
        </span>
        {risk.criticalCount > 0 && (
          <span className="text-[9px] px-1 rounded bg-red-500/20 text-red-400">
            {risk.criticalCount} critical
          </span>
        )}
        {risk.highCount > 0 && (
          <span className="text-[9px] px-1 rounded bg-orange-500/20 text-orange-400">
            {risk.highCount} high
          </span>
        )}
        <span className="flex-1" />
        <div className="flex items-center gap-1 flex-wrap justify-end">
          {autoTags.slice(0, 3).map((t) => (
            <TagChip key={t.name} name={t.name} category={t.category} />
          ))}
          {manualTags.slice(0, 2).map((t) => (
            <TagChip key={t} name={t} category="manual" />
          ))}
          {autoTags.length + manualTags.length > 5 && (
            <span className="text-[9px] text-[var(--color-text-muted)]">
              +{autoTags.length + manualTags.length - 5}
            </span>
          )}
        </div>
      </button>

      {/* Expanded detail panel */}
      {expanded && (
        <div className="px-4 py-3 space-y-3 bg-[var(--color-bg-tertiary)]/50">
          {/* Risk summary */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
              <span className="text-[10px] font-medium text-[var(--color-text-secondary)]">Risk Summary</span>
            </div>
            <div className="flex gap-2 text-[9px]">
              {risk.criticalCount > 0 && (
                <span className="px-1.5 rounded bg-red-500/20 text-red-400">{risk.criticalCount} critical</span>
              )}
              {risk.highCount > 0 && (
                <span className="px-1.5 rounded bg-orange-500/20 text-orange-400">{risk.highCount} high</span>
              )}
              {risk.mediumCount > 0 && (
                <span className="px-1.5 rounded bg-yellow-500/20 text-yellow-400">{risk.mediumCount} medium</span>
              )}
              {risk.lowCount > 0 && (
                <span className="px-1.5 rounded bg-green-500/20 text-green-400">{risk.lowCount} low</span>
              )}
            </div>
          </div>

          {/* Top risks */}
          {risk.topRisks?.length > 0 && (
            <div className="text-[9px] text-[var(--color-text-muted)]">
              Top risks: {risk.topRisks.join(', ')}
            </div>
          )}

          {/* Auto tags by category */}
          {autoTags.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-medium text-[var(--color-text-secondary)]">Auto Tags</span>
              <div className="flex flex-wrap gap-1">
                {autoTags.map((t) => (
                  <TagChip key={t.name} name={t.name} category={t.category} />
                ))}
              </div>
            </div>
          )}

          {/* Manual tags */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-medium text-[var(--color-text-secondary)]">Manual Tags</span>
            <div className="flex flex-wrap gap-1 items-center">
              {manualTags.map((t) => (
                <TagChip
                  key={t}
                  name={t}
                  category="manual"
                  onRemove={() => removeTag.mutate({ sessionId, tag: t, project })}
                />
              ))}
              <div className="inline-flex items-center gap-0.5">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                  placeholder="Add tag..."
                  className="w-20 px-1.5 py-0.5 text-[9px] bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-teal-500/50"
                />
                <button
                  onClick={handleAddTag}
                  disabled={!newTag.trim()}
                  className="p-0.5 text-[var(--color-text-muted)] hover:text-teal-400 disabled:opacity-30 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
