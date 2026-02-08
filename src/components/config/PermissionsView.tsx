import { useState, useMemo } from 'react';
import { usePermissions } from '@/hooks/useClaudeApi';
import { Shield, Search, Terminal, Globe, Server, FileText, Puzzle } from 'lucide-react';
import type { Permission } from '@/lib/types';

const CATEGORY_ICONS: Record<string, typeof Terminal> = {
  bash: Terminal,
  mcp: Server,
  web: Globe,
  filesystem: FileText,
  skill: Puzzle,
  other: Shield,
};

const CATEGORY_COLORS: Record<string, string> = {
  bash: 'text-orange-400 bg-orange-500/10',
  mcp: 'text-blue-400 bg-blue-500/10',
  web: 'text-purple-400 bg-purple-500/10',
  filesystem: 'text-green-400 bg-green-500/10',
  skill: 'text-pink-400 bg-pink-500/10',
  other: 'text-gray-400 bg-gray-500/10',
};

export function PermissionsView() {
  const { data, isLoading } = usePermissions();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const permissions = (data?.permissions || []) as Permission[];

  const filtered = useMemo(() => {
    return permissions.filter((p) => {
      if (activeCategory && p.category !== activeCategory) return false;
      if (search && !p.raw.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [permissions, search, activeCategory]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    permissions.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, [permissions]);

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold text-[var(--color-text-primary)]">Permissions</h1>
          <span className="text-xs text-[var(--color-text-muted)]">{permissions.length} rules configured</span>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder="Search permissions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-6 pr-3 py-1.5 text-xs border border-[var(--color-border)] rounded bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
        {Object.entries(categoryCounts).map(([cat, count]) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
            className={`px-2 py-1 text-xs rounded whitespace-nowrap transition-colors ${
              activeCategory === cat
                ? 'bg-teal-500 text-white'
                : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)]'
            }`}
          >
            {cat} ({count})
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-xs text-[var(--color-text-muted)]">Loading permissions...</div>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto">
          <div className="space-y-0.5">
            {filtered.map((perm, i) => {
              const Icon = CATEGORY_ICONS[perm.category] || Shield;
              const colorClass = CATEGORY_COLORS[perm.category] || CATEGORY_COLORS.other;
              return (
                <div
                  key={i}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[var(--color-bg-tertiary)] transition-colors group"
                >
                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded ${colorClass}`}>
                    <Icon className="w-3 h-3" />
                  </span>
                  <span className="text-xs font-mono text-[var(--color-text-secondary)] flex-1 truncate">
                    {perm.raw}
                  </span>
                  {perm.hasSecret && (
                    <span className="text-xs bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">secret</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
