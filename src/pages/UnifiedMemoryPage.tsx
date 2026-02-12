import { useState } from 'react';
import { Database, Search, Layers, Download, Zap, Clock, Tag } from 'lucide-react';
import { useMemorySearch, useMemoryStats, useMemoryIngest, useMemoryCorrelate, useMemoryAutoTier } from '@/hooks/useUnifiedMemory';

const LAYER_COLORS: Record<string, string> = {
  hot: 'bg-red-500/20 text-red-400',
  warm: 'bg-amber-500/20 text-amber-400',
  cold: 'bg-blue-500/20 text-blue-400',
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UnifiedMemoryPage() {
  const [searchText, setSearchText] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [selectedAdapters, setSelectedAdapters] = useState<string[]>([]);
  const [selectedLayers, setSelectedLayers] = useState<string[]>([]);

  const { data: stats } = useMemoryStats();
  const { data: results, isLoading: searching } = useMemorySearch(
    activeSearch ? { text: activeSearch, adapters: selectedAdapters.length ? selectedAdapters : undefined, layers: selectedLayers.length ? selectedLayers : undefined, limit: 50 } : undefined,
  );
  const ingestMutation = useMemoryIngest();
  const correlateMutation = useMemoryCorrelate();
  const autoTierMutation = useMemoryAutoTier();

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
            Search across all AI tool conversations with full-text search
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
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
        </div>
      )}

      {/* Search */}
      <div className="border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] p-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-muted)]" />
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search across all AI tool memories..."
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
          {(results.entries as Array<{ id: string; adapterId: string; content: string; role: string; layer: string; ingestedAt: string; tags: string[] }>).map((entry) => (
            <div
              key={entry.id}
              className="border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] p-3"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-medium text-teal-400">{entry.adapterId}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${LAYER_COLORS[entry.layer] || ''}`}>{entry.layer}</span>
                <span className="text-[10px] text-[var(--color-text-muted)]">{entry.role}</span>
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
    </div>
  );
}
