import { useState } from 'react';
import { useSSE } from '@/hooks/useSSE';
import { useProviders } from '@/hooks/useClaudeApi';
import { Play, Square, RotateCcw, Terminal, Cpu, ChevronDown, History } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { AiProvider } from '@/lib/types';

type Mode = 'claude-cli' | 'ai-chat';

export function CliRunner() {
  const [prompt, setPrompt] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [showSystem, setShowSystem] = useState(false);
  const [mode, setMode] = useState<Mode>('claude-cli');
  const [claudeModel, setClaudeModel] = useState('sonnet');
  const [providerId, setProviderId] = useState('');
  const [modelId, setModelId] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const { messages, status, sessionId, start, stop, reset } = useSSE();

  const { data: providersData } = useProviders();
  const providers = ((providersData?.providers || []) as AiProvider[]).filter((p) => p.enabled && p._hasKey);

  // Auto-select first provider/model
  const selectedProvider = providers.find((p) => p.id === providerId);
  const models = selectedProvider?.models || [];

  const handleRun = () => {
    if (!prompt.trim()) return;

    if (mode === 'claude-cli') {
      start(prompt, claudeModel);
    } else {
      if (!providerId || !modelId) return;
      start(prompt, undefined, {
        providerId,
        model: modelId,
        systemPrompt: systemPrompt || undefined,
        temperature,
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleRun();
    }
  };

  const canRun = prompt.trim() && (mode === 'claude-cli' || (providerId && modelId));

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Header with mode toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-[var(--color-bg-secondary)] rounded p-0.5">
          <button
            onClick={() => setMode('claude-cli')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              mode === 'claude-cli' ? 'bg-teal-500/20 text-teal-400' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <Terminal className="w-3 h-3" />
            Claude CLI
          </button>
          <button
            onClick={() => setMode('ai-chat')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              mode === 'ai-chat' ? 'bg-pink-500/20 text-pink-400' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <Cpu className="w-3 h-3" />
            AI Chat
          </button>
        </div>

        <div className="flex items-center gap-2">
          {mode === 'claude-cli' ? (
            <select
              value={claudeModel}
              onChange={(e) => setClaudeModel(e.target.value)}
              className="text-xs bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded px-2 py-1 text-[var(--color-text-secondary)] focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="sonnet">Sonnet</option>
              <option value="opus">Opus</option>
              <option value="haiku">Haiku</option>
            </select>
          ) : (
            <>
              <select
                value={providerId}
                onChange={(e) => {
                  setProviderId(e.target.value);
                  const p = providers.find((pr) => pr.id === e.target.value);
                  if (p?.models[0]) setModelId(p.models[0].id);
                }}
                className="text-xs bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded px-2 py-1 text-[var(--color-text-secondary)] focus:outline-none focus:ring-1 focus:ring-pink-500 max-w-[150px]"
              >
                <option value="">Provider...</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <select
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                className="text-xs bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded px-2 py-1 text-[var(--color-text-secondary)] focus:outline-none focus:ring-1 focus:ring-pink-500 max-w-[200px]"
              >
                <option value="">Model...</option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <div className="flex items-center gap-1">
                <span className="text-xs text-[var(--color-text-muted)]">T:</span>
                <input
                  type="range" min="0" max="2" step="0.1" value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-16 h-1 accent-pink-500"
                />
                <span className="text-xs text-[var(--color-text-muted)] w-6">{temperature}</span>
              </div>
            </>
          )}
          <span className="text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-tertiary)] px-1.5 py-0.5 rounded">
            {status}
          </span>
          {sessionId && (
            <Link
              to="/history"
              className="inline-flex items-center gap-1 text-[10px] text-[var(--color-text-muted)] bg-[var(--color-bg-tertiary)] px-1.5 py-0.5 rounded hover:text-teal-400 transition-colors"
              title={`Session: ${sessionId.slice(0, 8)}...`}
            >
              <History className="w-2.5 h-2.5" />
              {sessionId.slice(0, 8)}
            </Link>
          )}
        </div>
      </div>

      {/* System Prompt (AI Chat mode only) */}
      {mode === 'ai-chat' && (
        <div>
          <button
            onClick={() => setShowSystem(!showSystem)}
            className="inline-flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] mb-1"
          >
            <ChevronDown className={`w-3 h-3 transition-transform ${showSystem ? '' : '-rotate-90'}`} />
            System prompt
          </button>
          {showSystem && (
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="You are a helpful coding assistant..."
              rows={2}
              className="w-full text-xs bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded p-2 text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-pink-500 resize-none font-mono"
            />
          )}
        </div>
      )}

      {/* Prompt Input */}
      <div className="flex gap-2">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={mode === 'claude-cli' ? 'Enter your prompt... (Cmd+Enter to run)' : 'Ask the AI... (Cmd+Enter to send)'}
          rows={3}
          className={`flex-1 text-xs bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded p-2 text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-1 ${
            mode === 'claude-cli' ? 'focus:ring-teal-500' : 'focus:ring-pink-500'
          } resize-none font-mono`}
        />
        <div className="flex flex-col gap-1">
          {status === 'streaming' ? (
            <button
              onClick={stop}
              className="inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded transition-colors"
            >
              <Square className="w-3 h-3" />
              Stop
            </button>
          ) : (
            <button
              onClick={handleRun}
              disabled={!canRun || status === 'connecting'}
              className={`inline-flex items-center justify-center gap-1 px-3 py-1.5 text-white text-xs font-medium rounded transition-colors disabled:opacity-50 ${
                mode === 'claude-cli' ? 'bg-teal-600 hover:bg-teal-700' : 'bg-pink-600 hover:bg-pink-700'
              }`}
            >
              <Play className="w-3 h-3" />
              Run
            </button>
          )}
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-1 px-3 py-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] text-xs font-medium rounded transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Clear
          </button>
        </div>
      </div>

      {/* Output */}
      <div className="flex-1 min-h-0 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded overflow-auto font-mono text-xs p-3">
        {messages.length === 0 ? (
          <span className="text-[var(--color-text-muted)]">
            {mode === 'claude-cli' ? 'Claude CLI output will appear here...' : 'AI response will appear here...'}
          </span>
        ) : (
          messages.map((msg, i) => {
            if (msg.type === 'error') {
              return <div key={i} className="text-red-400 whitespace-pre-wrap">{msg.content}</div>;
            }
            if (msg.type === 'usage') {
              const u = msg.usage as Record<string, number> | undefined;
              return (
                <div key={i} className="mt-2 text-[var(--color-text-muted)] border-t border-[var(--color-border-muted)] pt-2">
                  Tokens: {u?.prompt_tokens || 0} in / {u?.completion_tokens || 0} out / {u?.total_tokens || 0} total
                </div>
              );
            }
            return (
              <span key={i} className="text-[var(--color-text-secondary)] whitespace-pre-wrap">
                {msg.content || msg.result || JSON.stringify(msg)}
              </span>
            );
          })
        )}
      </div>
    </div>
  );
}
