import { useMcpServers } from '@/hooks/useClaudeApi';
import { Server, RefreshCw, Plus, Circle } from 'lucide-react';
import type { McpServer } from '@/lib/types';

export function McpOverview() {
  const { data, isLoading, refetch } = useMcpServers();
  const servers = (data?.servers || []) as McpServer[];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-semibold text-[var(--color-text-primary)]">MCP Servers</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] rounded transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button className="inline-flex items-center gap-1 px-2 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium rounded transition-colors">
            <Plus className="w-3 h-3" />
            Add Server
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-xs text-[var(--color-text-muted)]">Loading servers...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {servers.map((server) => (
            <div
              key={server.name}
              className="group p-3 bg-[var(--color-bg-secondary)] border border-[var(--color-border-muted)] rounded-lg hover:border-[var(--color-border)] transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Server className="w-3.5 h-3.5 text-teal-400" />
                  <span className="text-xs font-medium text-[var(--color-text-primary)]">{server.name}</span>
                </div>
                <Circle
                  className={`w-2 h-2 ${
                    server.status === 'connected'
                      ? 'text-emerald-500 fill-emerald-500'
                      : server.status === 'failed'
                        ? 'text-red-500 fill-red-500'
                        : 'text-yellow-500 fill-yellow-500'
                  }`}
                />
              </div>
              <div className="text-xs text-[var(--color-text-muted)] font-mono truncate">
                {server.command} {server.args?.join(' ')}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] px-1.5 py-0.5 rounded">
                  {server.source}
                </span>
                {server.env && Object.keys(server.env).length > 0 && (
                  <span className="text-xs bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] px-1.5 py-0.5 rounded">
                    {Object.keys(server.env).length} env vars
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
