import { useState } from 'react';
import { Scan, Play, AlertCircle, ChevronDown, ChevronRight, Shield, Code, GitBranch, Landmark, Settings2, Check, Key, Globe, Eye, Crosshair, Layers } from 'lucide-react';
import {
  useExtractionStatus,
  useExtractionSchemas,
  useRunExtraction,
  useAllExtractionResults,
  useExtractionProviders,
  useExtractionConfig,
  useUpdateExtractionConfig,
} from '@/hooks/useExtractions';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import type { ExtractionResult, ExtractionEntity, SidecarStatus, ProviderPreset } from '@/lib/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCHEMA_ICONS: Record<string, typeof Shield> = {
  'permission-grant': Shield,
  'risk-event': AlertCircle,
  'code-artifact': Code,
  'intent-shift': GitBranch,
  'architecture-decision': Landmark,
  'all': Layers,
};

const ENTITY_COLORS: Record<string, string> = {
  'permission-grant': 'text-orange-400 bg-orange-500/10',
  'risk-event': 'text-red-400 bg-red-500/10',
  'code-artifact': 'text-blue-400 bg-blue-500/10',
  'intent-shift': 'text-purple-400 bg-purple-500/10',
  'architecture-decision': 'text-emerald-400 bg-emerald-500/10',
};

const ALIGNMENT_LABELS: Record<string, { label: string; color: string }> = {
  'match_exact': { label: 'exact', color: 'text-green-400' },
  'match_fuzzy': { label: 'fuzzy', color: 'text-amber-400' },
  'match_greater': { label: 'wider', color: 'text-blue-400' },
  'match_lesser': { label: 'partial', color: 'text-orange-400' },
};

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: SidecarStatus | undefined }) {
  if (!status) return <span className="text-[9px] px-1.5 py-0.5 bg-gray-500/10 text-gray-400 rounded">checking...</span>;
  if (!status.available) {
    return (
      <span className="text-[9px] px-1.5 py-0.5 bg-red-500/10 text-red-400 rounded flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Sidecar offline
      </span>
    );
  }
  return (
    <span className="text-[9px] px-1.5 py-0.5 bg-green-500/10 text-green-400 rounded flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> v{status.version || '?'}
      {status.activeProvider && <span className="ml-1 text-[var(--color-text-muted)]">({status.activeProvider})</span>}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Provider configuration panel
// ---------------------------------------------------------------------------

function ProviderConfigPanel({ onClose }: { onClose: () => void }) {
  const { data: providersData } = useExtractionProviders();
  const { data: config } = useExtractionConfig();
  const updateConfig = useUpdateExtractionConfig();

  const [provider, setProvider] = useState(config?.provider || 'gemini');
  const [modelId, setModelId] = useState(config?.model_id || '');
  const [apiKey, setApiKey] = useState('');
  const [apiBase, setApiBase] = useState(config?.api_base || '');
  const [ollamaUrl, setOllamaUrl] = useState(config?.ollama_url || 'http://localhost:11434');
  const [maxCharBuffer, setMaxCharBuffer] = useState(config?.max_char_buffer || 2000);
  const [extractionPasses, setExtractionPasses] = useState(config?.extraction_passes || 1);
  const [temperature, setTemperature] = useState(config?.temperature ?? 0.0);

  const providers = providersData?.providers || [];
  const activePreset = providers.find((p: ProviderPreset) => p.id === provider);

  const handleSave = () => {
    const update: Record<string, unknown> = { provider, model_id: modelId, max_char_buffer: maxCharBuffer, extraction_passes: extractionPasses, temperature };
    if (apiKey) update.api_key = apiKey;
    if (apiBase) update.api_base = apiBase;
    if (provider === 'ollama') update.ollama_url = ollamaUrl;
    updateConfig.mutate(update);
  };

  const handleProviderChange = (id: string) => {
    setProvider(id);
    const preset = providers.find((p: ProviderPreset) => p.id === id);
    if (preset) {
      setModelId(preset.defaultModel);
      if (preset.defaultApiBase) setApiBase(preset.defaultApiBase);
      else if (id !== 'openai-compatible') setApiBase('');
    }
  };

  return (
    <div className="border border-[var(--color-border)] rounded bg-[var(--color-bg-secondary)] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-teal-400" />
          <h3 className="text-xs font-semibold text-[var(--color-text-primary)]">LLM Provider Configuration</h3>
        </div>
        <button onClick={onClose} className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">Close</button>
      </div>

      {/* Provider selector */}
      <div>
        <label className="text-[9px] text-[var(--color-text-muted)] block mb-1.5">Provider</label>
        <div className="grid grid-cols-3 gap-1.5">
          {providers.map((p: ProviderPreset) => (
            <button
              key={p.id}
              onClick={() => handleProviderChange(p.id)}
              className={`text-[10px] px-2.5 py-1.5 rounded border transition-colors text-left ${
                provider === p.id
                  ? 'border-teal-500/50 bg-teal-500/10 text-teal-400'
                  : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)]'
              }`}
            >
              <div className="flex items-center gap-1.5">
                {provider === p.id && <Check className="w-3 h-3" />}
                <span className="font-medium">{p.name}</span>
              </div>
              <div className="text-[8px] text-[var(--color-text-muted)] mt-0.5 flex items-center gap-1">
                {p.hasKey ? (
                  <><Key className="w-2.5 h-2.5 text-green-400" /> Key detected</>
                ) : p.needsKey ? (
                  <><Key className="w-2.5 h-2.5 text-amber-400" /> Key needed</>
                ) : (
                  <><Globe className="w-2.5 h-2.5" /> No key needed</>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Model ID */}
      <div>
        <label className="text-[9px] text-[var(--color-text-muted)] block mb-1">Model ID</label>
        <input
          type="text"
          value={modelId}
          onChange={(e) => setModelId(e.target.value)}
          placeholder={activePreset?.defaultModel || 'model-name'}
          className="w-full text-[10px] bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border border-[var(--color-border)] rounded px-2 py-1.5"
        />
      </div>

      {/* API Key (for providers that need it) */}
      {activePreset?.needsKey && (
        <div>
          <label className="text-[9px] text-[var(--color-text-muted)] block mb-1">
            API Key {activePreset.hasKey && <span className="text-green-400">(detected from env)</span>}
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={activePreset.hasKey ? 'Using env var — leave blank to keep' : 'sk-...'}
            className="w-full text-[10px] bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border border-[var(--color-border)] rounded px-2 py-1.5"
          />
          {activePreset.keyEnvVars.length > 0 && (
            <p className="text-[8px] text-[var(--color-text-muted)] mt-0.5">
              Or set env var: {activePreset.keyEnvVars.join(' / ')}
            </p>
          )}
        </div>
      )}

      {/* API Base URL (for custom endpoints) */}
      {(provider === 'openai-compatible' || provider === 'deepseek' || provider === 'qwen') && (
        <div>
          <label className="text-[9px] text-[var(--color-text-muted)] block mb-1">API Base URL</label>
          <input
            type="text"
            value={apiBase}
            onChange={(e) => setApiBase(e.target.value)}
            placeholder={activePreset?.defaultApiBase || 'http://localhost:4000/v1'}
            className="w-full text-[10px] bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border border-[var(--color-border)] rounded px-2 py-1.5"
          />
        </div>
      )}

      {/* Ollama URL */}
      {provider === 'ollama' && (
        <div>
          <label className="text-[9px] text-[var(--color-text-muted)] block mb-1">Ollama URL</label>
          <input
            type="text"
            value={ollamaUrl}
            onChange={(e) => setOllamaUrl(e.target.value)}
            placeholder="http://localhost:11434"
            className="w-full text-[10px] bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border border-[var(--color-border)] rounded px-2 py-1.5"
          />
        </div>
      )}

      {/* Quality settings */}
      <div className="border-t border-[var(--color-border)] pt-3">
        <label className="text-[9px] text-[var(--color-text-muted)] block mb-1.5 font-medium">Extraction Quality</label>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[8px] text-[var(--color-text-muted)] block mb-0.5">Chunk Size (chars)</label>
            <input type="number" value={maxCharBuffer} onChange={(e) => setMaxCharBuffer(Number(e.target.value))}
              className="w-full text-[10px] bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border border-[var(--color-border)] rounded px-2 py-1" />
            <p className="text-[7px] text-[var(--color-text-muted)] mt-0.5">1000=detail, 3000=context</p>
          </div>
          <div>
            <label className="text-[8px] text-[var(--color-text-muted)] block mb-0.5">Passes</label>
            <select value={extractionPasses} onChange={(e) => setExtractionPasses(Number(e.target.value))}
              className="w-full text-[10px] bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border border-[var(--color-border)] rounded px-2 py-1">
              <option value={1}>1 (fast)</option>
              <option value={2}>2 (thorough)</option>
              <option value={3}>3 (max recall)</option>
            </select>
            <p className="text-[7px] text-[var(--color-text-muted)] mt-0.5">More passes = more cost</p>
          </div>
          <div>
            <label className="text-[8px] text-[var(--color-text-muted)] block mb-0.5">Temperature</label>
            <input type="number" step="0.1" min="0" max="2" value={temperature} onChange={(e) => setTemperature(Number(e.target.value))}
              className="w-full text-[10px] bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border border-[var(--color-border)] rounded px-2 py-1" />
            <p className="text-[7px] text-[var(--color-text-muted)] mt-0.5">0=deterministic</p>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-[9px] text-[var(--color-text-muted)]">
          {config?.hasApiKey ? 'API key configured' : 'No API key set'}
        </span>
        <button
          onClick={handleSave}
          disabled={updateConfig.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-teal-500/20 text-teal-400 rounded hover:bg-teal-500/30 transition-colors disabled:opacity-50"
        >
          {updateConfig.isPending ? 'Saving...' : updateConfig.isSuccess ? 'Saved!' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Entity card
// ---------------------------------------------------------------------------

function EntityCard({ entity }: { entity: ExtractionEntity }) {
  const colorClass = ENTITY_COLORS[entity.type] || 'text-gray-400 bg-gray-500/10';
  const [expanded, setExpanded] = useState(false);
  const alignment = entity.alignment ? ALIGNMENT_LABELS[entity.alignment] : null;

  return (
    <div className="border border-[var(--color-border)] rounded bg-[var(--color-bg-secondary)] p-3">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${colorClass}`}>{entity.type}</span>
          {alignment && (
            <span className={`text-[8px] flex items-center gap-0.5 ${alignment.color}`}>
              <Crosshair className="w-2.5 h-2.5" />
              {alignment.label}
            </span>
          )}
        </div>
        <span className="text-[9px] text-[var(--color-text-muted)]">{(entity.confidence * 100).toFixed(0)}%</span>
      </div>
      <p className="text-[11px] text-[var(--color-text-primary)] leading-relaxed mb-1">{entity.value}</p>

      {/* Source grounding */}
      {(entity.sourceStart > 0 || entity.sourceEnd > 0) && entity.sourceText && entity.sourceText !== entity.value && (
        <div className="text-[9px] text-[var(--color-text-muted)] mb-1.5 flex items-center gap-1">
          <Crosshair className="w-2.5 h-2.5 flex-shrink-0" />
          chars {entity.sourceStart}–{entity.sourceEnd}
          {entity.sourceText.length <= 100 && (
            <span className="text-[var(--color-text-secondary)] italic truncate ml-1">"{entity.sourceText}"</span>
          )}
        </div>
      )}

      {entity.metadata && Object.keys(entity.metadata).length > 0 && (
        <>
          <button onClick={() => setExpanded(!expanded)} className="text-[9px] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] flex items-center gap-1">
            {expanded ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
            Attributes ({Object.keys(entity.metadata).length})
          </button>
          {expanded && (
            <div className="mt-1.5 pl-3 border-l-2 border-[var(--color-border)] space-y-0.5">
              {Object.entries(entity.metadata).map(([key, val]) => (
                <div key={key} className="text-[9px]">
                  <span className="text-[var(--color-text-muted)]">{key}:</span>{' '}
                  <span className="text-[var(--color-text-secondary)]">{String(val)}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Result card
// ---------------------------------------------------------------------------

function ResultCard({ result }: { result: ExtractionResult }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = SCHEMA_ICONS[result.schemaName] || Scan;
  const colorClass = ENTITY_COLORS[result.schemaName] || 'text-gray-400 bg-gray-500/10';

  const openVisualization = () => {
    window.open(api.extractions.visualizeUrl(result.id), '_blank');
  };

  return (
    <div className="border border-[var(--color-border)] rounded bg-[var(--color-bg-secondary)]">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between p-3 text-left">
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown className="w-3 h-3 text-[var(--color-text-muted)]" /> : <ChevronRight className="w-3 h-3 text-[var(--color-text-muted)]" />}
          <Icon className="w-3.5 h-3.5 text-teal-400" />
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${colorClass}`}>{result.schemaName}</span>
          <span className="text-[10px] text-[var(--color-text-primary)]">{result.totalEntities} entities</span>
          <span className="text-[9px] text-[var(--color-text-muted)]">session: {result.sessionId.slice(0, 8)}...</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-[var(--color-text-muted)]">{result.provider}/{result.modelUsed}</span>
          <span className="text-[9px] text-[var(--color-text-muted)]">{result.duration_ms}ms</span>
          {result.textLength && <span className="text-[9px] text-[var(--color-text-muted)]">{(result.textLength / 1000).toFixed(1)}k chars</span>}
          <span className="text-[9px] text-[var(--color-text-muted)]">{new Date(result.timestamp).toLocaleString()}</span>
        </div>
      </button>
      {expanded && (
        <div className="border-t border-[var(--color-border)] p-3">
          {/* Visualization button */}
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={(e) => { e.stopPropagation(); openVisualization(); }}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] bg-teal-500/10 text-teal-400 rounded hover:bg-teal-500/20 transition-colors"
            >
              <Eye className="w-3 h-3" />
              Open Interactive Visualization
            </button>
            <span className="text-[8px] text-[var(--color-text-muted)]">
              Color-coded entity spans in original text context
            </span>
          </div>

          {result.entities.length > 0 ? (
            <div className="space-y-2">
              {result.entities.map((entity, i) => <EntityCard key={i} entity={entity} />)}
            </div>
          ) : (
            <p className="text-[10px] text-[var(--color-text-muted)]">No entities extracted</p>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function ExtractionsPage() {
  const { data: status, isLoading: statusLoading } = useExtractionStatus();
  const { data: schemasData } = useExtractionSchemas();
  const { data: resultsData, isLoading: resultsLoading } = useAllExtractionResults(50);
  const runExtraction = useRunExtraction();

  const [selectedSchema, setSelectedSchema] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  const { data: sessionsData } = useQuery({
    queryKey: ['extraction-sessions'],
    queryFn: () => api.conversationSessions({ limit: 100 }),
    staleTime: 60_000,
  });

  const schemas = schemasData?.schemas || [];
  const results = resultsData?.results || [];
  const sessions = (sessionsData?.sessions || []) as Array<{ sessionId: string; preview: string; projectSlug?: string }>;
  const sidecarAvailable = status?.available ?? false;
  const providerNeedsKey = status?.activeProvider !== 'ollama' && status?.activeProvider !== 'openai-compatible';
  const canExtract = sidecarAvailable && (status?.hasApiKey || !providerNeedsKey);

  const handleRun = () => {
    if (!selectedSchema || !selectedSession) return;
    const session = sessions.find((s) => s.sessionId === selectedSession);
    runExtraction.mutate({ sessionId: selectedSession, schemaName: selectedSchema, projectSlug: session?.projectSlug });
  };

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Scan className="w-4 h-4 text-teal-400" />
          <h1 className="text-sm font-semibold text-[var(--color-text-primary)]">Extractions</h1>
          <StatusBadge status={status} />
          {status?.activeModel && (
            <span className="text-[9px] px-1.5 py-0.5 bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] rounded">
              {status.activeModel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {sidecarAvailable && (
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`flex items-center gap-1 px-2 py-1 text-[10px] rounded transition-colors ${
                showSettings ? 'bg-teal-500/20 text-teal-400' : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              <Settings2 className="w-3 h-3" />
              Settings
            </button>
          )}
        </div>
      </div>

      {/* Sidecar offline banner */}
      {!statusLoading && !sidecarAvailable && (
        <div className="border border-amber-500/30 rounded bg-amber-500/5 p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[11px] text-amber-400 font-medium">LangExtract sidecar is not running</p>
              <p className="text-[10px] text-[var(--color-text-muted)] mt-1">Start it with:</p>
              <code className="block mt-1 px-2 py-1 bg-[var(--color-bg-tertiary)] rounded text-[9px] text-[var(--color-text-secondary)]">
                cd sidecar && pip install -r requirements.txt && python main.py
              </code>
            </div>
          </div>
        </div>
      )}

      {/* Settings panel */}
      {showSettings && sidecarAvailable && (
        <ProviderConfigPanel onClose={() => setShowSettings(false)} />
      )}

      {/* No API key warning */}
      {sidecarAvailable && !canExtract && !showSettings && (
        <div className="border border-amber-500/30 rounded bg-amber-500/5 p-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] text-amber-400">No API key configured — set one in Settings to run extractions</span>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded hover:bg-amber-500/30"
          >
            Configure
          </button>
        </div>
      )}

      {/* Extraction controls */}
      {canExtract && (
        <div className="border border-[var(--color-border)] rounded bg-[var(--color-bg-secondary)] p-3">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="text-[9px] text-[var(--color-text-muted)] block mb-1">Session</label>
              <select value={selectedSession} onChange={(e) => setSelectedSession(e.target.value)} className="w-full text-[10px] bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border border-[var(--color-border)] rounded px-2 py-1.5">
                <option value="">Select a session...</option>
                {sessions.map((s) => (
                  <option key={s.sessionId} value={s.sessionId}>{s.preview?.slice(0, 60) || s.sessionId.slice(0, 12)}</option>
                ))}
              </select>
            </div>
            <div className="w-52">
              <label className="text-[9px] text-[var(--color-text-muted)] block mb-1">Schema</label>
              <select value={selectedSchema} onChange={(e) => setSelectedSchema(e.target.value)} className="w-full text-[10px] bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border border-[var(--color-border)] rounded px-2 py-1.5">
                <option value="">Select a schema...</option>
                {schemas.map((s) => (
                  <option key={s.name} value={s.name}>{s.name} — {s.entityTypes.join(', ')}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleRun}
              disabled={!selectedSchema || !selectedSession || runExtraction.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-teal-500/20 text-teal-400 rounded hover:bg-teal-500/30 transition-colors disabled:opacity-50"
            >
              <Play className="w-3 h-3" />
              {runExtraction.isPending ? 'Extracting...' : 'Extract'}
            </button>
          </div>

          {runExtraction.isSuccess && runExtraction.data?.result && (
            <div className="mt-2 border-t border-[var(--color-border)] pt-2 flex items-center justify-between">
              <span className="text-[10px] text-green-400 font-medium">
                {runExtraction.data.result.totalEntities} entities found ({runExtraction.data.result.duration_ms}ms)
              </span>
              <button
                onClick={() => window.open(api.extractions.visualizeUrl(runExtraction.data.result.id), '_blank')}
                className="flex items-center gap-1 text-[9px] text-teal-400 hover:text-teal-300"
              >
                <Eye className="w-3 h-3" /> View Visualization
              </button>
            </div>
          )}
          {runExtraction.isError && (
            <div className="mt-2 text-[10px] text-red-400">Error: {(runExtraction.error as Error).message}</div>
          )}
        </div>
      )}

      {/* Results */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
        {resultsLoading ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-xs text-[var(--color-text-muted)]">Loading...</p>
          </div>
        ) : results.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center space-y-2">
              <Scan className="w-8 h-8 text-[var(--color-text-muted)] mx-auto opacity-30" />
              <p className="text-xs text-[var(--color-text-muted)]">No extractions yet</p>
              <p className="text-[10px] text-[var(--color-text-muted)]">
                {sidecarAvailable ? 'Configure a provider, select a session and schema, then click Extract' : 'Start the sidecar to begin'}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-[var(--color-text-primary)]">Extraction History</h2>
              <span className="text-[9px] text-[var(--color-text-muted)]">{resultsData?.total || results.length} total</span>
            </div>
            {results.map((result) => <ResultCard key={result.id} result={result} />)}
          </>
        )}
      </div>
    </div>
  );
}
