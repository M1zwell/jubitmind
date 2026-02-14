import { useState } from 'react';
import { Database, Search, Layers, Download, Zap, Clock, Tag, Brain, Sparkles } from 'lucide-react';
import { useMemorySearch, useMemoryStats, useMemoryIngest, useMemoryCorrelate, useMemoryAutoTier, useEmbeddingsStats, useEmbeddingsBackfill } from '@/hooks/useUnifiedMemory';

type SearchMode = 'keyword' | 'semantic' | 'hybrid';

const LAYER_COLORS: Record<string, string> = {
  hot: 'bg-red-500/20 text-red-400',
  warm: 'bg-amber-500/20 text-amber-400',
  cold: 'bg-blue-500/20 text-blue-400',
};

const SEARCH_MODES: Array<{ mode: SearchMode; label: string; description: string }> = [
  { mode: 'keyword', label: 'Keyword', description: 'FTS5 full-text search' },
  { mode: 'semantic', label: 'Semantic', description: 'Vector similarity search' },
  { mode: 'hybrid', label: 'Hybrid', description: 'Keyword + semantic fusion' },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UnifiedMemoryPage() {
  const [searchText, setSearchText] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('keyword');
  const [selectedAdapters, setSelectedAdapters] = useState<string[]>([]);
  const [selectedLayers, setSelectedLayers] = useState<string[]>([]);

  const { data: stats } = useMemoryStats();
  const { data: embStats } = useEmbeddingsStats();
  const { data: results, isLoading: searching } = useMemorySearch(
    activeSearch ? {
      text: activeSearch,
      mode: searchMode,
      adapters: selectedAdapters.length ? selectedAdapters : undefined,
      layers: selectedLayers.length ? selectedLayers : undefined,
      limit: 50,
    } : undefined,
  );
  const ingestMutation = useMemoryIngest();
  const correlateMutation = useMemoryCorrelate();
  const autoTierMutation = useMemoryAutoTier();
  const backfillMutation = useEmbeddingsBackfill();

  const handleSearch = () => {
    setActiveSearch(searchText);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
            <Database className="w-5 h-5 text-purple-400" />
            Unified Memory
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            Search across all AI tool conversations — keyword, semantic, or hybrid
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => ingestMutation.mutate()}
            disabled={ingestMutation.isPending}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded bg-teal-500/20 text-teal-400 hover:bg-teal-500/30 transition-colors disabled:opacity-50"
          >
            <Download className="w-3 h-3" />
            {ingestMutation.isPending ? 'Ingesting...' : 'Ingest All'}
          </button>
          <button
            onClick={() => correlateMutation.mutate()}
            disabled={correlateMutation.isPending}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors disabled:opacity-50"
          >
            <Zap className="w-3 h-3" />
            {correlateMutation.isPending ? 'Correlating...' : 'Correlate'}
          </button>
          <button
            onClick={() => autoTierMutation.mutate()}
            disabled={autoTierMutation.isPending}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors disabled:opacity-50"
          >
            <Layers className="w-3 h-3" />
            Auto-Tier
          </button>
          <button
            onClick={() => backfillMutation.mutate()}
            disabled={backfillMutation.isPending || !embStats?.ready}
            title={!embStats?.ready ? 'Vector store not ready' : 'Embed all unembedded entries'}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 transition-colors disabled:opacity-50"
          >
            <Brain className="w-3 h-3" />
            {backfillMutation.isPending ? 'Embedding...' : 'Embed All'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] p-3">
            <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">Total Entries</p>
            <p className="text-lg font-semibold text-[var(--color-text-primary)]">{stats.totalEntries.toLocaleString()}</p>
          </div>
          <div className="border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] p-3">
            <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">Adapters</p>
            <p className="text-lg font-semibold text-[var(--color-text-primary)]">{Object.keys(stats.byAdapter).length}</p>
          </div>
          <div className="border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] p-3">
            <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">Storage</p>
            <p className="text-lg font-semibold text-[var(--color-text-primary)]">{formatBytes(stats.totalSizeBytes)}</p>
          </div>
          <div className="border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] p-3">
            <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">Layers</p>
            <div className="flex gap-2 mt-1">
              {Object.entries(stats.byLayer).map(([layer, count]) => (
                <span key={layer} className={`text-[10px] px-1.5 py-0.5 rounded ${LAYER_COLORS[layer] || 'bg-gray-500/20 text-gray-400'}`}>
                  {layer}: {count}
                </span>
              ))}
            </div>
          </div>
          <div className="border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] p-3">
            <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" /> Embeddings
            </p>
            {embStats?.ready ? (
              <div>
                <p className="text-lg font-semibold text-[var(--color-text-primary)]">{embStats.coveragePercent}%</p>
                <p className="text-[9px] text-[var(--color-text-muted)]">
                  {embStats.totalEmbeddings.toLocaleString()} / {embStats.totalEntries.toLocaleString()}
                </p>
              </div>
            ) : (
              <p className="text-xs text-[var(--color-text-muted)] mt-1">Loading...</p>
            )}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] p-4">
        {/* Search Mode Toggle */}
        <div className="flex items-center gap-1 mb-3">
          <span className="text-[10px] text-[var(--color-text-muted)] mr-1.5">Mode:</span>
          {SEARCH_MODES.map(({ mode, label, description }) => (
            <button
              key={mode}
              onClick={() => setSearchMode(mode)}
              title={description}
              disabled={mode !== 'keyword' && !embStats?.ready}
              className={`text-[10px] px-2.5 py-1 rounded-full transition-colors ${
                searchMode === mode
                  ? 'bg-teal-500/20 text-teal-400 font-medium'
                  : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {label}
            </button>
          ))}
          {searchMode !== 'keyword' && !embStats?.ready && (
            <span className="text-[9px] text-amber-400 ml-2">Vector store initializing...</span>
          )}
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-muted)]" />
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={
                searchMode === 'semantic'
                  ? 'Describe what you\'re looking for...'
                  : searchMode === 'hybrid'
                    ? 'Search with keywords + semantic understanding...'
                    : 'Search across all AI tool memories...'
              }
              className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded pl-8 pr-3 py-2 text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={!searchText.trim() || searching}
            className="px-4 py-2 text-xs font-medium rounded bg-teal-500/20 text-teal-400 hover:bg-teal-500/30 transition-colors disabled:opacity-50"
          >
            Search
          </button>
        </div>

        {/* Filters */}
        {stats && Object.keys(stats.byAdapter).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="text-[10px] text-[var(--color-text-muted)] self-center mr-1">Adapters:</span>
            {Object.keys(stats.byAdapter).map((adapter) => (
              <button
                key={adapter}
                onClick={() => setSelectedAdapters((prev) => prev.includes(adapter) ? prev.filter((a) => a !== adapter) : [...prev, adapter])}
                className={`text-[10px] px-2 py-0.5 rounded transition-colors ${
                  selectedAdapters.includes(adapter)
                    ? 'bg-teal-500/20 text-teal-400'
                    : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
                }`}
              >
                {adapter}
              </button>
            ))}
            <span className="text-[10px] text-[var(--color-text-muted)] self-center ml-3 mr-1">Layers:</span>
            {['hot', 'warm', 'cold'].map((layer) => (
              <button
                key={layer}
                onClick={() => setSelectedLayers((prev) => prev.includes(layer) ? prev.filter((l) => l !== layer) : [...prev, layer])}
                className={`text-[10px] px-2 py-0.5 rounded transition-colors ${
                  selectedLayers.includes(layer)
                    ? LAYER_COLORS[layer]
                    : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
                }`}
              >
                {layer}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results */}
      {results && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[var(--color-text-muted)]">
              {results.total} result{results.total !== 1 ? 's' : ''} found
              {results.mode && results.mode !== 'keyword' && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-indigo-500/15 text-indigo-400 rounded text-[9px]">
                  {results.mode}
                </span>
              )}
            </p>
            {results.facets && Object.keys(results.facets.byAdapter).length > 0 && (
              <div className="flex gap-2">
                {Object.entries(results.facets.byAdapter).map(([adapter, count]) => (
                  <span key={adapter} className="text-[10px] text-[var(--color-text-muted)]">
                    {adapter}: {count}
                  </span>
                ))}
              </div>
            )}
          </div>
          {results.entries.map((entry) => (
            <div
              key={entry.id}
              className="border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] p-3"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-medium text-teal-400">{entry.adapterId}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${LAYER_COLORS[entry.layer] || ''}`}>{entry.layer}</span>
                <span className="text-[10px] text-[var(--color-text-muted)]">{entry.role}</span>
                {entry.similarityScore != null && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-indigo-500/15 text-indigo-400 rounded" title="Cosine similarity score">
                    {(entry.similarityScore * 100).toFixed(0)}% match
                  </span>
                )}
                <span className="text-[10px] text-[var(--color-text-muted)] ml-auto">
                  <Clock className="w-2.5 h-2.5 inline mr-0.5" />
                  {new Date(entry.ingestedAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)] line-clamp-3">{entry.content}</p>
              {entry.tags?.length > 0 && (
                <div className="flex gap-1 mt-1.5">
                  {entry.tags.map((tag: string) => (
                    <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] rounded">
                      <Tag className="w-2 h-2 inline mr-0.5" />{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Ingest results notification */}
      {ingestMutation.isSuccess && ingestMutation.data && (
        <div className="border border-green-500/30 rounded-lg bg-green-500/10 p-3">
          <p className="text-xs text-green-400">
            Ingested {ingestMutation.data.ingested} entries from {ingestMutation.data.adapters.length} adapters: {ingestMutation.data.adapters.join(', ')}
          </p>
        </div>
      )}

      {/* Backfill results notification */}
      {backfillMutation.isSuccess && backfillMutation.data && (
        <div className="border border-indigo-500/30 rounded-lg bg-indigo-500/10 p-3">
          <p className="text-xs text-indigo-400">
            Embedded {backfillMutation.data.embedded} entries
            {backfillMutation.data.errors > 0 && ` (${backfillMutation.data.errors} errors)`}
          </p>
        </div>
      )}
    </div>
  );
}
