import { useState } from 'react';
import { useProviders, useUpdateProvider, useTestProvider, useDeleteProvider, useAddProvider, useDiscoverModels } from '@/hooks/useClaudeApi';
import {
  Cpu, Plus, RefreshCw, Circle, Trash2, Power, PowerOff,
  Eye, EyeOff, TestTube, Search as SearchIcon, Globe, ChevronDown, ChevronUp,
} from 'lucide-react';
import type { AiProvider, ProviderTestResult } from '@/lib/types';

export function ProvidersPage() {
  const { data, isLoading, refetch } = useProviders();
  const updateMutation = useUpdateProvider();
  const testMutation = useTestProvider();
  const deleteMutation = useDeleteProvider();
  const addMutation = useAddProvider();
  const discoverMutation = useDiscoverModels();

  const [testResults, setTestResults] = useState<Record<string, ProviderTestResult>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [editingKey, setEditingKey] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [newProvider, setNewProvider] = useState({ id: '', name: '', apiBase: '', apiKey: '' });

  const providers = (data?.providers || []) as AiProvider[];

  const handleTest = async (id: string) => {
    const result = await testMutation.mutateAsync(id);
    setTestResults((prev) => ({ ...prev, [id]: result }));
  };

  const handleToggle = (provider: AiProvider) => {
    updateMutation.mutate({ id: provider.id, enabled: !provider.enabled });
  };

  const handleSaveKey = (id: string) => {
    const key = editingKey[id];
    if (key !== undefined) {
      updateMutation.mutate({ id, apiKey: key });
      setEditingKey((prev) => { const n = { ...prev }; delete n[id]; return n; });
    }
  };

  const handleAdd = () => {
    if (!newProvider.id || !newProvider.name || !newProvider.apiBase) return;
    addMutation.mutate({ ...newProvider, models: [], enabled: true }, {
      onSuccess: () => {
        setNewProvider({ id: '', name: '', apiBase: '', apiKey: '' });
        setShowAdd(false);
      },
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold text-[var(--color-text-primary)]">AI Providers</h1>
          <span className="text-xs text-[var(--color-text-muted)]">{providers.length} providers configured</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] rounded transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="inline-flex items-center gap-1 px-2 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium rounded transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add Provider
          </button>
        </div>
      </div>

      {/* Add Provider Form */}
      {showAdd && (
        <div className="p-3 bg-[var(--color-bg-secondary)] border border-teal-500/30 rounded-lg space-y-2">
          <span className="text-xs font-medium text-teal-400">New Provider</span>
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="ID (e.g. deepseek)" value={newProvider.id} onChange={(e) => setNewProvider((p) => ({ ...p, id: e.target.value }))}
              className="text-xs bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded px-2 py-1.5 text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-teal-500" />
            <input placeholder="Display Name" value={newProvider.name} onChange={(e) => setNewProvider((p) => ({ ...p, name: e.target.value }))}
              className="text-xs bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded px-2 py-1.5 text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-teal-500" />
            <input placeholder="API Base URL" value={newProvider.apiBase} onChange={(e) => setNewProvider((p) => ({ ...p, apiBase: e.target.value }))}
              className="text-xs bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded px-2 py-1.5 text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-teal-500" />
            <input placeholder="API Key" type="password" value={newProvider.apiKey} onChange={(e) => setNewProvider((p) => ({ ...p, apiKey: e.target.value }))}
              className="text-xs bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded px-2 py-1.5 text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-teal-500" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={!newProvider.id || !newProvider.name || !newProvider.apiBase}
              className="px-2 py-1 bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium rounded disabled:opacity-50">Save</button>
            <button onClick={() => setShowAdd(false)}
              className="px-2 py-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] rounded">Cancel</button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-xs text-[var(--color-text-muted)]">Loading providers...</div>
      ) : (
        <div className="space-y-2">
          {providers.map((provider) => {
            const test = testResults[provider.id];
            const isExpanded = expanded[provider.id];
            const isEditing = editingKey[provider.id] !== undefined;

            return (
              <div key={provider.id} className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-muted)] rounded-lg overflow-hidden">
                {/* Header */}
                <div className="p-3 flex items-center gap-3">
                  <Cpu className={`w-4 h-4 flex-shrink-0 ${provider.enabled ? 'text-teal-400' : 'text-[var(--color-text-muted)]'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-[var(--color-text-primary)]">{provider.name}</span>
                      <span className="text-xs bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] px-1.5 py-0.5 rounded font-mono">{provider.id}</span>
                      {provider.enabled ? (
                        <span className="text-xs bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">enabled</span>
                      ) : (
                        <span className="text-xs bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] px-1.5 py-0.5 rounded">disabled</span>
                      )}
                      {test && (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${test.ok ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                          {test.ok ? `${test.latencyMs}ms` : 'failed'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Globe className="w-2.5 h-2.5 text-[var(--color-text-muted)]" />
                      <span className="text-xs text-[var(--color-text-muted)] font-mono truncate">{provider.apiBase}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleTest(provider.id)} disabled={!provider._hasKey || testMutation.isPending}
                      className="p-1.5 text-[var(--color-text-muted)] hover:text-teal-400 hover:bg-[var(--color-bg-tertiary)] rounded transition-colors disabled:opacity-30" title="Test Connection">
                      <TestTube className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleToggle(provider)}
                      className="p-1.5 text-[var(--color-text-muted)] hover:text-teal-400 hover:bg-[var(--color-bg-tertiary)] rounded transition-colors" title={provider.enabled ? 'Disable' : 'Enable'}>
                      {provider.enabled ? <Power className="w-3.5 h-3.5" /> : <PowerOff className="w-3.5 h-3.5" />}
                    </button>
                    {provider.autoDiscover && (
                      <button onClick={() => discoverMutation.mutate(provider.id)} disabled={!provider._hasKey}
                        className="p-1.5 text-[var(--color-text-muted)] hover:text-purple-400 hover:bg-[var(--color-bg-tertiary)] rounded transition-colors disabled:opacity-30" title="Auto-discover Models">
                        <SearchIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button onClick={() => deleteMutation.mutate(provider.id)}
                      className="p-1.5 text-[var(--color-text-muted)] hover:text-red-400 hover:bg-[var(--color-bg-tertiary)] rounded transition-colors" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setExpanded((prev) => ({ ...prev, [provider.id]: !isExpanded }))}
                      className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] rounded transition-colors">
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-3 pb-3 border-t border-[var(--color-border-muted)] pt-2 space-y-2">
                    {/* API Key */}
                    <div>
                      <span className="text-xs text-[var(--color-text-muted)]">API Key</span>
                      <div className="flex items-center gap-2 mt-1">
                        {isEditing ? (
                          <>
                            <input
                              type={showKeys[provider.id] ? 'text' : 'password'}
                              value={editingKey[provider.id]}
                              onChange={(e) => setEditingKey((prev) => ({ ...prev, [provider.id]: e.target.value }))}
                              className="flex-1 text-xs bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded px-2 py-1 text-[var(--color-text-primary)] font-mono focus:outline-none focus:ring-1 focus:ring-teal-500"
                              placeholder="sk-..."
                            />
                            <button onClick={() => handleSaveKey(provider.id)} className="px-2 py-1 bg-teal-600 text-white text-xs rounded">Save</button>
                            <button onClick={() => setEditingKey((prev) => { const n = { ...prev }; delete n[provider.id]; return n; })} className="px-2 py-1 text-xs text-[var(--color-text-muted)]">Cancel</button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-xs font-mono text-[var(--color-text-secondary)]">
                              {showKeys[provider.id] ? provider.apiKey : (provider._hasKey ? provider.apiKey : 'Not set')}
                            </span>
                            <button onClick={() => setShowKeys((prev) => ({ ...prev, [provider.id]: !prev[provider.id] }))}
                              className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
                              {showKeys[provider.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                            <button onClick={() => setEditingKey((prev) => ({ ...prev, [provider.id]: '' }))}
                              className="px-2 py-1 text-xs text-teal-400 hover:bg-teal-500/10 rounded">Edit</button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Models */}
                    <div>
                      <span className="text-xs text-[var(--color-text-muted)]">Models ({provider.models.length})</span>
                      <div className="mt-1 space-y-0.5">
                        {provider.models.map((model) => (
                          <div key={model.id} className="flex items-center gap-2 px-2 py-1 rounded bg-[var(--color-bg-tertiary)]">
                            <Circle className="w-1.5 h-1.5 text-teal-400 fill-teal-400" />
                            <span className="text-xs font-mono text-[var(--color-text-secondary)]">{model.id}</span>
                            <span className="text-xs text-[var(--color-text-muted)]">{model.name}</span>
                            {model.contextWindow && (
                              <span className="text-xs text-[var(--color-text-muted)] ml-auto">{(model.contextWindow / 1000).toFixed(0)}k ctx</span>
                            )}
                          </div>
                        ))}
                        {provider.models.length === 0 && (
                          <span className="text-xs text-[var(--color-text-muted)]">No models configured</span>
                        )}
                      </div>
                    </div>

                    {/* Test Error */}
                    {test && !test.ok && test.error && (
                      <div className="text-xs bg-red-500/10 text-red-400 p-2 rounded font-mono">{test.error}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
