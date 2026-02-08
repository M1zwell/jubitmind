import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Archive, Cloud, HardDrive, BarChart3, RefreshCw, ChevronDown } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import type { UnifiedArchiveItem } from '@/lib/types';
import { ArchiveCard } from '@/components/archives/ArchiveCard';
import { LoginButton } from '@/components/auth/LoginButton';

type SourceFilter = 'all' | 'supabase' | 'local';

export function ArchivedDiscussions() {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [source, setSource] = useState<SourceFilter>('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['archives', source, search, limit, offset, user?.id ?? 'anon'],
    queryFn: () => api.archives.list({ source, search: search || undefined, limit, offset }),
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

  const { data: expandedDetail } = useQuery({
    queryKey: ['archive-detail', expandedId],
    queryFn: () => {
      const item = data?.items.find(i => i.id === expandedId);
      return api.archives.get(expandedId!, item?.source);
    },
    enabled: !!expandedId,
  });

  const items = data?.items || [];
  const total = data?.total || 0;
  const hasMore = offset + limit < total;

  const sourceStats = useMemo(() => {
    const s = stats?.stats;
    if (!s) return { local: 0, supabase: 0 };
    return {
      local: (s.local as { sessions: number })?.sessions || 0,
      supabase: ((s.supabase as { rooms: number; chats: number })?.rooms || 0) + ((s.supabase as { rooms: number; chats: number })?.chats || 0),
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
          <LoginButton />
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 mb-3 text-xs text-[var(--color-text-muted)]">
        <span className="flex items-center gap-1">
          <HardDrive className="w-3 h-3" />
          {sourceStats.local} local sessions
        </span>
        {user && (
          <span className="flex items-center gap-1">
            <Cloud className="w-3 h-3" />
            {sourceStats.supabase} cloud archives
          </span>
        )}
        {!user && (
          <span className="text-yellow-500/80">Sign in to see cloud archives</span>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4">
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

      {/* List */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="w-5 h-5 text-[var(--color-text-muted)] animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-[var(--color-text-muted)]">
            <Archive className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">No archives found</p>
            {source === 'supabase' && !user && (
              <p className="text-xs mt-1">Sign in to view cloud archives</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {items.map((item) => (
              <div key={`${item.source}-${item.id}`}>
                <ArchiveCard
                  item={item}
                  onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  onDelete={item.source.startsWith('supabase') ? () => setDeleteConfirm(item.id) : undefined}
                />

                {/* Expanded detail */}
                {expandedId === item.id && expandedDetail && (
                  <div className="mt-1 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg p-3 max-h-64 overflow-auto">
                    <div className="text-xs text-[var(--color-text-muted)] space-y-2">
                      {renderMessages(expandedDetail.messages || [])}
                    </div>
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

function renderMessages(messages: unknown[]): React.ReactNode {
  if (!messages || messages.length === 0) {
    return <p className="italic">No messages to display</p>;
  }

  return messages.slice(0, 20).map((msg, i) => {
    const m = msg as Record<string, unknown>;
    const role = (m.role || m.sender || m.model_name || 'unknown') as string;
    const content = (m.content || m.text || m.message || '') as string;

    return (
      <div key={i} className="border-l-2 border-[var(--color-border)] pl-2 py-1">
        <span className="font-medium text-[var(--color-text-secondary)]">{role}: </span>
        <span className="text-[var(--color-text-muted)]">{typeof content === 'string' ? content.slice(0, 300) : JSON.stringify(content).slice(0, 300)}</span>
      </div>
    );
  });
}
