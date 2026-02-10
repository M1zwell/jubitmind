import { useState } from 'react';
import {
  Layers, User, Bot, Brain, Wrench, FileOutput,
  ChevronDown, ChevronRight, ExternalLink, Search, X,
} from 'lucide-react';
import { useExplorerInteractions, useExplorerFacets, useInteractionContent } from '@/hooks/useExplorer';
import type { IndexedInteraction, RiskLevel } from '@/lib/types';

type CategoryTab = '' | 'user-prompt' | 'assistant-text' | 'thinking' | 'tool-use' | 'tool-result';

const TABS: Array<{ key: CategoryTab; label: string; icon: typeof Layers }> = [
  { key: '', label: 'All', icon: Layers },
  { key: 'user-prompt', label: 'User Prompts', icon: User },
  { key: 'thinking', label: 'Planning & Thinking', icon: Brain },
  { key: 'tool-use', label: 'Tool Calls', icon: Wrench },
  { key: 'tool-result', label: 'Tool Results', icon: FileOutput },
  { key: 'assistant-text', label: 'Model Outputs', icon: Bot },
];

const RISK_COLORS: Record<string, string> = {
  critical: 'text-red-400 bg-red-500/10',
  high: 'text-orange-400 bg-orange-500/10',
  medium: 'text-amber-400 bg-amber-500/10',
  low: 'text-green-400 bg-green-500/10',
};

const CATEGORY_ICONS: Record<string, typeof User> = {
  'user-prompt': User,
  'assistant-text': Bot,
  'thinking': Brain,
  'tool-use': Wrench,
  'tool-result': FileOutput,
};

function InteractionCard({
  item,
  isExpanded,
  onToggle,
}: {
  item: IndexedInteraction;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const { data: contentData } = useInteractionContent(isExpanded ? item.id : null);
  const Icon = CATEGORY_ICONS[item.category] || Layers;
  const riskClass = item.toolRiskTier ? RISK_COLORS[item.toolRiskTier] : '';

  return (
    <div className="border border-[var(--color-border)] rounded bg-[var(--color-bg-secondary)] hover:border-[var(--color-border-hover)] transition-colors">
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-2 p-2.5 text-left"
      >
        <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
          {isExpanded ? <ChevronDown className="w-3 h-3 text-[var(--color-text-muted)]" /> : <ChevronRight className="w-3 h-3 text-[var(--color-text-muted)]" />}
          <Icon className="w-3.5 h-3.5 text-teal-400" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs text-[var(--color-text-primary)] line-clamp-2 leading-relaxed">
            {item.preview}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[9px] text-[var(--color-text-muted)]">
              {new Date(item.timestamp).toLocaleString()}
            </span>
            {item.modelFamily && (
              <span className="text-[9px] px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded">
                {item.modelFamily}
              </span>
            )}
            {item.toolName && (
              <span className="text-[9px] px-1.5 py-0.5 bg-amber-500/10 text-amber-400 rounded">
                {item.toolName}
              </span>
            )}
            {item.toolRiskTier && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded ${riskClass}`}>
                {item.toolRiskTier}
              </span>
            )}
            <span className="text-[9px] text-[var(--color-text-muted)] truncate">
              {item.projectDisplayName}
            </span>
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-[var(--color-border)] p-3">
          {contentData ? (
            <pre className="text-[11px] text-[var(--color-text-secondary)] whitespace-pre-wrap break-words max-h-96 overflow-y-auto font-mono leading-relaxed">
              {contentData.content}
            </pre>
          ) : (
            <p className="text-[10px] text-[var(--color-text-muted)]">Loading...</p>
          )}
          <div className="mt-2 pt-2 border-t border-[var(--color-border)]">
            <a
              href={`/history`}
              className="inline-flex items-center gap-1 text-[10px] text-teal-400 hover:text-teal-300 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Open in Session
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export function InteractionExplorerPage() {
  const [activeTab, setActiveTab] = useState<CategoryTab>('');
  const [toolFilter, setToolFilter] = useState<string | undefined>(undefined);
  const [modelFilter, setModelFilter] = useState<string | undefined>(undefined);
  const [riskFilter, setRiskFilter] = useState<string | undefined>(undefined);
  const [projectFilter, setProjectFilter] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const query = {
    category: activeTab || undefined,
    toolName: toolFilter,
    modelFamily: modelFilter,
    toolRiskTier: riskFilter,
    projectSlug: projectFilter,
    search: searchQuery || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  };

  const { data, isLoading } = useExplorerInteractions(query);
  const { data: facetsData } = useExplorerFacets();

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-teal-400" />
          <h1 className="text-sm font-semibold text-[var(--color-text-primary)]">
            Interaction Explorer
          </h1>
          {data && (
            <span className="text-[10px] text-[var(--color-text-muted)]">
              {data.total.toLocaleString()} interactions
            </span>
          )}
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-1 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded p-1 flex-shrink-0 overflow-x-auto">
        {TABS.map((tab) => {
          const count = tab.key
            ? data?.facets?.byCategory?.[tab.key] || 0
            : data?.total || 0;
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setPage(0); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] rounded whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'bg-teal-500/20 text-teal-400'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              <tab.icon className="w-3 h-3" />
              {tab.label}
              <span className="text-[9px] opacity-60">{count.toLocaleString()}</span>
            </button>
          );
        })}
      </div>

      {/* Main content */}
      <div className="flex-1 min-h-0 flex gap-3">
        {/* Filter sidebar */}
        <div className="w-48 flex-shrink-0 border border-[var(--color-border)] rounded bg-[var(--color-bg-secondary)] p-2.5 overflow-y-auto space-y-3">
          {/* Search */}
          <div>
            <label className="text-[9px] uppercase tracking-wider text-[var(--color-text-muted)] font-medium">Search</label>
            <div className="relative mt-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--color-text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                placeholder="Search content..."
                className="w-full pl-7 pr-2 py-1 text-[10px] bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-teal-500/50"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-1.5 top-1/2 -translate-y-1/2">
                  <X className="w-3 h-3 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]" />
                </button>
              )}
            </div>
          </div>

          {/* Tool filter */}
          {facetsData && facetsData.tools.length > 0 && (
            <div>
              <label className="text-[9px] uppercase tracking-wider text-[var(--color-text-muted)] font-medium">Tool</label>
              <div className="mt-1 space-y-0.5 max-h-32 overflow-y-auto">
                <button
                  onClick={() => { setToolFilter(undefined); setPage(0); }}
                  className={`w-full text-left text-[10px] px-1.5 py-0.5 rounded transition-colors ${!toolFilter ? 'text-teal-400 bg-teal-500/10' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'}`}
                >
                  All
                </button>
                {facetsData.tools.slice(0, 12).map((t) => (
                  <button
                    key={t.name}
                    onClick={() => { setToolFilter(t.name); setPage(0); }}
                    className={`w-full text-left text-[10px] px-1.5 py-0.5 rounded transition-colors flex justify-between ${toolFilter === t.name ? 'text-teal-400 bg-teal-500/10' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'}`}
                  >
                    <span>{t.name}</span>
                    <span className="opacity-50">{t.count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Model filter */}
          {facetsData && facetsData.models.length > 0 && (
            <div>
              <label className="text-[9px] uppercase tracking-wider text-[var(--color-text-muted)] font-medium">Model</label>
              <div className="mt-1 space-y-0.5">
                <button
                  onClick={() => { setModelFilter(undefined); setPage(0); }}
                  className={`w-full text-left text-[10px] px-1.5 py-0.5 rounded transition-colors ${!modelFilter ? 'text-teal-400 bg-teal-500/10' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'}`}
                >
                  All
                </button>
                {facetsData.models.map((m) => (
                  <button
                    key={m.name}
                    onClick={() => { setModelFilter(m.name); setPage(0); }}
                    className={`w-full text-left text-[10px] px-1.5 py-0.5 rounded transition-colors flex justify-between ${modelFilter === m.name ? 'text-teal-400 bg-teal-500/10' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'}`}
                  >
                    <span>{m.name}</span>
                    <span className="opacity-50">{m.count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Risk tier filter */}
          {facetsData && facetsData.riskTiers.length > 0 && (
            <div>
              <label className="text-[9px] uppercase tracking-wider text-[var(--color-text-muted)] font-medium">Risk Tier</label>
              <div className="mt-1 space-y-0.5">
                <button
                  onClick={() => { setRiskFilter(undefined); setPage(0); }}
                  className={`w-full text-left text-[10px] px-1.5 py-0.5 rounded transition-colors ${!riskFilter ? 'text-teal-400 bg-teal-500/10' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'}`}
                >
                  All
                </button>
                {facetsData.riskTiers.map((r) => (
                  <button
                    key={r.name}
                    onClick={() => { setRiskFilter(r.name); setPage(0); }}
                    className={`w-full text-left text-[10px] px-1.5 py-0.5 rounded transition-colors flex justify-between ${riskFilter === r.name ? 'text-teal-400 bg-teal-500/10' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'}`}
                  >
                    <span className={RISK_COLORS[r.name]?.split(' ')[0] || ''}>{r.name}</span>
                    <span className="opacity-50">{r.count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Project filter */}
          {facetsData && facetsData.projects.length > 1 && (
            <div>
              <label className="text-[9px] uppercase tracking-wider text-[var(--color-text-muted)] font-medium">Project</label>
              <div className="mt-1 space-y-0.5 max-h-32 overflow-y-auto">
                <button
                  onClick={() => { setProjectFilter(undefined); setPage(0); }}
                  className={`w-full text-left text-[10px] px-1.5 py-0.5 rounded transition-colors ${!projectFilter ? 'text-teal-400 bg-teal-500/10' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'}`}
                >
                  All
                </button>
                {facetsData.projects.slice(0, 10).map((p) => (
                  <button
                    key={p.slug}
                    onClick={() => { setProjectFilter(p.slug); setPage(0); }}
                    className={`w-full text-left text-[10px] px-1.5 py-0.5 rounded transition-colors flex justify-between ${projectFilter === p.slug ? 'text-teal-400 bg-teal-500/10' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'}`}
                  >
                    <span className="truncate">{p.displayName}</span>
                    <span className="opacity-50 flex-shrink-0 ml-1">{p.count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Results list */}
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-xs text-[var(--color-text-muted)]">Loading interactions...</p>
            </div>
          ) : !data || data.items.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-xs text-[var(--color-text-muted)]">No interactions found</p>
            </div>
          ) : (
            <>
              <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5">
                {data.items.map((item) => (
                  <InteractionCard
                    key={item.id}
                    item={item}
                    isExpanded={expandedId === item.id}
                    onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between flex-shrink-0 pt-2 border-t border-[var(--color-border)]">
                  <span className="text-[10px] text-[var(--color-text-muted)]">
                    Page {page + 1} of {totalPages} ({data.total.toLocaleString()} total)
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage(Math.max(0, page - 1))}
                      disabled={page === 0}
                      className="px-2 py-0.5 text-[10px] bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded disabled:opacity-30 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                    >
                      Prev
                    </button>
                    <button
                      onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                      disabled={page >= totalPages - 1}
                      className="px-2 py-0.5 text-[10px] bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded disabled:opacity-30 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
