import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Archive, Cloud, HardDrive, BarChart3, RefreshCw, ChevronDown, ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import type { UnifiedArchiveItem, ProductType } from '@/lib/types';
import { ArchiveCard } from '@/components/archives/ArchiveCard';
import { ArchiveDetailRouter } from '@/components/archives/details/ArchiveDetailRouter';
import { SkeletonCard } from '@/components/shared/SkeletonCard';
import { SkeletonDetail } from '@/components/shared/SkeletonDetail';
import { SignInBanner } from '@/components/auth/SignInBanner';
import { getSourceLink } from '@/lib/config';

type SourceFilter = 'all' | 'supabase' | 'local';

const PRODUCT_TYPE_FILTERS: { value: ProductType | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'chat', label: 'Chat' },
  { value: 'chatab', label: 'Arena' },
  { value: 'chatlab', label: 'ChatLab' },
  { value: 'chatlab-agent', label: 'Agent' },
  { value: 'theater', label: 'Theater' },
];

const VISIBILITY_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'private', label: 'Private' },
  { value: 'public', label: 'Public' },
] as const;

export function ArchivedDiscussions() {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [source, setSource] = useState<SourceFilter>('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [productType, setProductType] = useState<ProductType | 'all'>('all');
  const [visibility, setVisibility] = useState<string>('all');

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['archives', source, search, limit, offset, productType, visibility, user?.id ?? 'anon'],
    queryFn: () => api.archives.list({
      source,
      search: search || undefined,
      limit,
      offset,
      productType: productType !== 'all' ? productType : undefined,
      visibility: visibility !== 'all' ? visibility : undefined,
    }),
    staleTime: 30_000,
  });

  const { data: stats } = useQuery({
    queryKey: ['archives-stats', user?.id ?? 'anon'],
    queryFn: () => api.archives.stats(),
    staleTime: 60_000,
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, itemSource }: { id: string; itemSource: string }) => api.archives.delete(id, itemSource),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archives'] });
      queryClient.invalidateQueries({ queryKey: ['archives-stats'] });
      setDeleteConfirm(null);
    },
  });

  const expandedItem = expandedId ? data?.items.find(i => i.id === expandedId) : null;

  const { data: expandedDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['archive-detail', expandedId],
    queryFn: () => api.archives.get(expandedId!, expandedItem?.source),
    enabled: !!expandedId,
  });

  const handleExport = useCallback(async (item: UnifiedArchiveItem) => {
    try {
      const data = await api.archives.export(item.id, item.source);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `archive-${item.title.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 50)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[Archives] Export failed:', err);
    }
  }, []);

  const items = data?.items || [];
  const total = data?.total || 0;
  const hasMore = offset + limit < total;

  const sourceStats = useMemo(() => {
    const s = stats?.stats;
    if (!s) return { local: 0, supabase: 0, byType: {} as Record<string, number> };
    return {
      local: (s.local as { sessions: number })?.sessions || 0,
      supabase: ((s.supabase as { rooms: number; chats: number })?.rooms || 0) + ((s.supabase as { rooms: number; chats: number })?.chats || 0),
      byType: (s.supabase as { byType?: Record<string, number> })?.byType || {},
    };
  }, [stats]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Archive className="w-5 h-5 text-teal-400" />
          <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Archived Discussions</h1>
          <span className="text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-tertiary)] px-2 py-0.5 rounded">
            {total} total
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-1.5 rounded text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <SignInBanner
        feature="cloud archives"
        detail="View and manage archives synced from jubit.ai"
      />

      {/* Stats bar */}
      <div className="flex items-center gap-4 mb-3 text-xs text-[var(--color-text-muted)]">
        <span className="flex items-center gap-1">
          <HardDrive className="w-3 h-3" />
          {sourceStats.local} local sessions
        </span>
        {user && (
          <>
            <span className="flex items-center gap-1">
              <Cloud className="w-3 h-3" />
              {sourceStats.supabase} cloud archives
            </span>
            {Object.keys(sourceStats.byType).length > 0 && (
              <span className="text-[var(--color-text-muted)]">
                ({Object.entries(sourceStats.byType).map(([k, v]) => `${v} ${k}`).join(', ')})
              </span>
            )}
          </>
        )}
        {!user && (
          <span className="text-[var(--color-text-muted)]">Sign in for cloud archives</span>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex items-center gap-2">
          {/* Source tabs */}
          <div className="flex rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] overflow-hidden">
            {([
              { value: 'all' as SourceFilter, label: 'All', icon: BarChart3 },
              { value: 'supabase' as SourceFilter, label: 'Cloud', icon: Cloud },
              { value: 'local' as SourceFilter, label: 'Local', icon: HardDrive },
            ]).map(tab => (
              <button
                key={tab.value}
                onClick={() => { setSource(tab.value); setOffset(0); }}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors ${
                  source === tab.value
                    ? 'bg-teal-500/20 text-teal-400'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                <tab.icon className="w-3 h-3" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
              placeholder="Search archives..."
              className="w-full pl-7 pr-3 py-1.5 text-xs rounded bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-teal-500/50"
            />
          </div>
        </div>

        {/* Product type filter pills + visibility filter */}
        {(source === 'all' || source === 'supabase') && user && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {PRODUCT_TYPE_FILTERS.map(f => (
                <button
                  key={f.value}
                  onClick={() => { setProductType(f.value); setOffset(0); }}
                  className={`px-2 py-1 text-[10px] font-medium rounded transition-colors ${
                    productType === f.value
                      ? 'bg-teal-500/20 text-teal-400'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="w-px h-4 bg-[var(--color-border)]" />
            <div className="flex items-center gap-1">
              {VISIBILITY_FILTERS.map(f => (
                <button
                  key={f.value}
                  onClick={() => { setVisibility(f.value); setOffset(0); }}
                  className={`px-2 py-1 text-[10px] font-medium rounded transition-colors ${
                    visibility === f.value
                      ? 'bg-teal-500/20 text-teal-400'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-[var(--color-text-muted)]">
            <Archive className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">No archives found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {items.map((item) => (
              <div key={`${item.source}-${item.id}`}>
                <ArchiveCard
                  item={item}
                  onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  onDelete={item.source.startsWith('supabase') ? () => setDeleteConfirm(item.id) : undefined}
                  onExport={item.source.startsWith('supabase') ? () => handleExport(item) : undefined}
                />

                {/* Expanded detail */}
                {expandedId === item.id && (
                  <div className="mt-1 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg p-3 max-h-96 overflow-auto">
                    {/* Detail header with source link */}
                    {(() => {
                      const link = getSourceLink(item);
                      if (!link) return null;
                      return (
                        <div className="flex items-center justify-end mb-2">
                          {link.comingSoon ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]">
                              <ExternalLink className="w-3 h-3" />
                              {link.label} - Coming Soon
                            </span>
                          ) : (
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-blue-400 hover:bg-blue-500/10 transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                              {link.label} on jubit.ai
                            </a>
                          )}
                        </div>
                      );
                    })()}

                    {detailLoading ? (
                      <SkeletonDetail />
                    ) : expandedDetail ? (
                      <ArchiveDetailRouter
                        item={item}
                        detail={{
                          messages: (expandedDetail.messages || []) as unknown[],
                          participants: (expandedDetail.participants || []) as unknown[],
                        }}
                      />
                    ) : null}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {hasMore && (
          <div className="flex justify-center py-4">
            <button
              onClick={() => setOffset(offset + limit)}
              className="flex items-center gap-1 px-4 py-2 text-xs rounded bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-teal-500/30 transition-colors"
            >
              <ChevronDown className="w-3 h-3" />
              Load more ({total - offset - limit} remaining)
            </button>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-4 max-w-sm" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm text-[var(--color-text-primary)] mb-3">Delete this archive permanently?</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-3 py-1.5 text-xs rounded bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const item = items.find(i => i.id === deleteConfirm);
                  if (item) deleteMutation.mutate({ id: item.id, itemSource: item.source });
                }}
                disabled={deleteMutation.isPending}
                className="px-3 py-1.5 text-xs rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
