import { useQuery } from '@tanstack/react-query';
import { RefreshCw, Router, Cpu, Database } from 'lucide-react';
import { api } from '@/lib/api';

interface LiteLLMModel {
  modelName: string;
  provider: string;
  underlyingModel: string;
  apiBase?: string;
}

interface ProviderSummary {
  provider: string;
  count: number;
  models: string[];
}

const PROVIDER_COLORS: Record<string, string> = {
  anthropic: 'text-orange-400 bg-orange-500/10',
  dashscope: 'text-blue-400 bg-blue-500/10',
  openai: 'text-green-400 bg-green-500/10',
  gemini: 'text-purple-400 bg-purple-500/10',
  deepseek: 'text-cyan-400 bg-cyan-500/10',
  xai: 'text-red-400 bg-red-500/10',
  'ai21': 'text-yellow-400 bg-yellow-500/10',
  groq: 'text-pink-400 bg-pink-500/10',
  mistral: 'text-indigo-400 bg-indigo-500/10',
};

export function RoutingDashboard() {
  const { data: modelsData, isLoading: modelsLoading, refetch, isFetching } = useQuery<{ models: LiteLLMModel[]; count: number }>({
    queryKey: ['litellm-models'],
    queryFn: () => api.litellm.models(),
    staleTime: 120_000,
  });

  const { data: providersData } = useQuery<{ providers: ProviderSummary[] }>({
    queryKey: ['litellm-providers'],
    queryFn: () => api.litellm.modelsByProvider(),
    staleTime: 120_000,
  });

  const { data: spendData } = useQuery({
    queryKey: ['litellm-spend'],
    queryFn: () => api.litellm.spend(),
    staleTime: 60_000,
  });

  const { data: configData } = useQuery({
    queryKey: ['litellm-config'],
    queryFn: () => api.litellm.config(),
    staleTime: 120_000,
  });

  return (
    <div className="h-full flex flex-col overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Router className="w-5 h-5 text-amber-400" />
          <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">LiteLLM Routing</h1>
          {configData?.available && (
            <span className="text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-tertiary)] px-2 py-0.5 rounded">
              {configData.totalModels} models / {configData.providers?.length} providers
            </span>
          )}
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {modelsLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <RefreshCw className="w-6 h-6 text-amber-400 animate-spin" />
        </div>
      ) : !configData?.available ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <Database className="w-12 h-12 text-[var(--color-text-muted)] mb-4" />
          <p className="text-[var(--color-text-secondary)] mb-2">LiteLLM config not found</p>
          <p className="text-xs text-[var(--color-text-muted)]">
            Place config.yaml at ../litellm-proxy/config.yaml
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Provider Cards */}
          <div>
            <h2 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">Providers</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {providersData?.providers?.map((p) => {
                const colorClass = PROVIDER_COLORS[p.provider] || 'text-gray-400 bg-gray-500/10';
                return (
                  <div
                    key={p.provider}
                    className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-4"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Cpu className={`w-4 h-4 ${colorClass.split(' ')[0]}`} />
                      <span className="text-sm font-medium text-[var(--color-text-primary)] capitalize">
                        {p.provider}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-[var(--color-text-primary)]">{p.count}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">models</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Spend Data */}
          {spendData?.dbConfigured === false && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
              <p className="text-sm text-amber-400">
                Set LITELLM_DB_URL environment variable to enable spend tracking from LiteLLM PostgreSQL.
              </p>
            </div>
          )}

          {/* Model Table */}
          <div>
            <h2 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">
              All Models ({modelsData?.count || 0})
            </h2>
            <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg overflow-hidden">
              <div className="max-h-[500px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-[var(--color-bg-secondary)]">
                    <tr className="border-b border-[var(--color-border)]">
                      <th className="text-left px-4 py-2 text-xs text-[var(--color-text-muted)]">Model Name</th>
                      <th className="text-left px-4 py-2 text-xs text-[var(--color-text-muted)]">Provider</th>
                      <th className="text-left px-4 py-2 text-xs text-[var(--color-text-muted)]">Underlying Model</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modelsData?.models?.map((m, i) => {
                      const colorClass = PROVIDER_COLORS[m.provider] || 'text-gray-400 bg-gray-500/10';
                      return (
                        <tr key={i} className="border-b border-[var(--color-border)]/50 last:border-0 hover:bg-[var(--color-bg-tertiary)]">
                          <td className="px-4 py-2 text-[var(--color-text-primary)] font-mono text-xs">{m.modelName}</td>
                          <td className="px-4 py-2">
                            <span className={`text-xs px-2 py-0.5 rounded ${colorClass}`}>
                              {m.provider}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-[var(--color-text-muted)] font-mono text-xs">{m.underlyingModel}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
