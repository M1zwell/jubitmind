import { useState, useRef, useEffect, useCallback } from 'react';
import { Microscope, Send, Square, RotateCcw, FileText, Shield, Code, TrendingUp, MessageSquare, Loader2, ChevronRight, Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useSSE } from '@/hooks/useSSE';
import { api } from '@/lib/api';
import { useConversationSessions, useProjects } from '@/hooks/useConversations';
import type { AnalysisMode, AnalysisChatMessage, AnalysisPrepareResult, ProviderModel } from '@/lib/types';

// --- Analysis prompt templates ---

const ANALYSIS_TEMPLATES: Array<{
  mode: AnalysisMode;
  label: string;
  icon: typeof FileText;
  prompt: string;
  color: string;
}> = [
  {
    mode: 'summary',
    label: 'Summary',
    icon: FileText,
    prompt: 'Provide a concise TL;DR summary of this session. What was accomplished, what were the key decisions, and what was the outcome?',
    color: 'text-blue-400',
  },
  {
    mode: 'security',
    label: 'Security',
    icon: Shield,
    prompt: 'Perform a security audit of this session. Identify sensitive data exposure, dangerous commands, risky operations, and potential vulnerabilities.',
    color: 'text-red-400',
  },
  {
    mode: 'quality',
    label: 'Code Quality',
    icon: Code,
    prompt: 'Review the code quality in this session. Analyze patterns, potential bugs, code style, and suggest improvements.',
    color: 'text-amber-400',
  },
  {
    mode: 'patterns',
    label: 'Patterns',
    icon: TrendingUp,
    prompt: 'Analyze interaction patterns. How effectively did the user and AI collaborate? Were there bottlenecks or particularly productive exchanges?',
    color: 'text-green-400',
  },
  {
    mode: 'custom',
    label: 'Custom',
    icon: MessageSquare,
    prompt: '',
    color: 'text-purple-400',
  },
];

// --- Provider/model state ---

interface ProviderOption {
  id: string;
  name: string;
  models: ProviderModel[];
}

export function SessionAnalysisPage() {
  // Session selection
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionStats, setSessionStats] = useState<AnalysisPrepareResult | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Provider/model
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [selectedProvider, setSelectedProvider] = useState('litellm');
  const [selectedModel, setSelectedModel] = useState('');

  // Chat
  const [chatMessages, setChatMessages] = useState<AnalysisChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [analysisSessionId, setAnalysisSessionId] = useState(() => crypto.randomUUID());
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Hooks
  const { data: projectsData } = useProjects();
  const { data: sessionsData } = useConversationSessions(
    'claude-code',
    selectedProject || undefined,
  );
  const sse = useSSE();

  // Load providers on mount
  useEffect(() => {
    api.analysisModels().then(data => {
      setProviders(data.providers);
      if (data.providers.length > 0) {
        const litellm = data.providers.find(p => p.id === 'litellm');
        const defaultProvider = litellm || data.providers[0];
        setSelectedProvider(defaultProvider.id);
        if (defaultProvider.models.length > 0) {
          setSelectedModel(defaultProvider.models[0].id);
        }
      }
    }).catch(() => {});
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Accumulate streaming content
  useEffect(() => {
    if (sse.status === 'streaming' && sse.messages.length > 0) {
      const content = sse.messages
        .filter(m => m.type === 'content' || (!m.type && m.content))
        .map(m => m.content || '')
        .join('');

      setChatMessages(prev => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        if (lastIdx >= 0 && updated[lastIdx].role === 'assistant' && updated[lastIdx].isStreaming) {
          updated[lastIdx] = { ...updated[lastIdx], content, isStreaming: true };
        }
        return updated;
      });
    }

    if (sse.status === 'done') {
      setChatMessages(prev => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        if (lastIdx >= 0 && updated[lastIdx].isStreaming) {
          updated[lastIdx] = { ...updated[lastIdx], isStreaming: false };
        }
        return updated;
      });
    }
  }, [sse.messages, sse.status]);

  // Select session
  const handleSelectSession = useCallback(async (sessionId: string, projectSlug?: string) => {
    setSelectedSessionId(sessionId);
    setSessionStats(null);
    setLoadingStats(true);
    try {
      const stats = await api.analysisPrepare({ sessionId, projectSlug });
      setSessionStats(stats);
    } catch (err) {
      console.error('Failed to prepare session:', err);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // Send analysis prompt
  const handleSend = useCallback((prompt: string, mode: AnalysisMode = 'custom') => {
    if (!prompt.trim() || !selectedSessionId || !selectedProvider || !selectedModel) return;

    // Find project slug for the session
    const session = sessionsData?.sessions?.find(
      (s: Record<string, unknown>) => s.sessionId === selectedSessionId,
    ) as Record<string, unknown> | undefined;
    const projectSlug = (session?.projectSlug as string) || undefined;

    // Add user message to chat
    setChatMessages(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: 'user',
        content: prompt,
        timestamp: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
        isStreaming: true,
      },
    ]);

    setInputValue('');

    // Start SSE stream
    sse.start(prompt, undefined, undefined, {
      providerId: selectedProvider,
      model: selectedModel,
      sessionId: selectedSessionId,
      projectSlug,
      analysisSessionId,
      mode,
    });
  }, [selectedSessionId, selectedProvider, selectedModel, analysisSessionId, sessionsData, sse]);

  // Template click
  const handleTemplateClick = useCallback((template: typeof ANALYSIS_TEMPLATES[0]) => {
    if (template.mode === 'custom') {
      // Focus input
      return;
    }
    handleSend(template.prompt, template.mode);
  }, [handleSend]);

  // New analysis
  const handleNewAnalysis = useCallback(() => {
    setChatMessages([]);
    setAnalysisSessionId(crypto.randomUUID());
    sse.reset();
  }, [sse]);

  // Get models for selected provider
  const currentProvider = providers.find(p => p.id === selectedProvider);
  const models = currentProvider?.models || [];

  const sessions = (sessionsData?.sessions || []) as Array<Record<string, unknown>>;
  const projects = projectsData?.projects || [];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Microscope className="w-5 h-5 text-violet-400" />
          <div>
            <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Session Analysis</h1>
            <p className="text-[10px] text-[var(--color-text-muted)]">
              Analyze Claude Code sessions with LLM
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Provider selector */}
          {providers.length > 1 && (
            <select
              value={selectedProvider}
              onChange={e => {
                setSelectedProvider(e.target.value);
                const prov = providers.find(p => p.id === e.target.value);
                if (prov?.models[0]) setSelectedModel(prov.models[0].id);
              }}
              className="text-xs bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] border border-[var(--color-border)] rounded px-2 py-1"
            >
              {providers.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
          {/* Model selector */}
          <select
            value={selectedModel}
            onChange={e => setSelectedModel(e.target.value)}
            className="text-xs bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] border border-[var(--color-border)] rounded px-2 py-1 max-w-[200px]"
          >
            {models.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main content: sidebar + chat */}
      <div className="flex-1 flex gap-3 min-h-0">
        {/* Session picker sidebar */}
        <div className="w-64 flex-shrink-0 flex flex-col border border-[var(--color-border)] rounded-lg overflow-hidden bg-[var(--color-bg-secondary)]">
          {/* Project filter */}
          <div className="p-2 border-b border-[var(--color-border)]">
            <select
              value={selectedProject}
              onChange={e => setSelectedProject(e.target.value)}
              className="w-full text-xs bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] border border-[var(--color-border)] rounded px-2 py-1"
            >
              <option value="">All Projects</option>
              {projects.map(p => (
                <option key={p.slug} value={p.slug}>{p.displayName}</option>
              ))}
            </select>
          </div>
          {/* Session list */}
          <div className="flex-1 overflow-y-auto">
            {sessions.length === 0 ? (
              <div className="p-4 text-center text-xs text-[var(--color-text-muted)]">
                No sessions found
              </div>
            ) : (
              sessions.map((s) => {
                const id = s.sessionId as string;
                const isSelected = id === selectedSessionId;
                return (
                  <button
                    key={id}
                    onClick={() => handleSelectSession(id, s.projectSlug as string | undefined)}
                    className={`w-full text-left px-3 py-2 border-b border-[var(--color-border)] transition-colors ${
                      isSelected
                        ? 'bg-violet-500/10 border-l-2 border-l-violet-400'
                        : 'hover:bg-[var(--color-bg-tertiary)]'
                    }`}
                  >
                    <div className="text-xs font-medium text-[var(--color-text-primary)] truncate">
                      {(s.projectDisplayName as string) || 'Session'}
                    </div>
                    <div className="text-[10px] text-[var(--color-text-muted)] truncate mt-0.5">
                      {(s.preview as string)?.slice(0, 60) || 'No preview'}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] text-[var(--color-text-muted)]">
                        {s.messageCount as number} msgs
                      </span>
                      <span className="text-[9px] text-[var(--color-text-muted)]">
                        {new Date(s.updatedAt as string).toLocaleDateString()}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col border border-[var(--color-border)] rounded-lg overflow-hidden">
          {!selectedSessionId ? (
            // Empty state
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Microscope className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-3 opacity-30" />
                <p className="text-sm text-[var(--color-text-muted)]">Select a session to analyze</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  Choose from the list on the left
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Session info + analysis mode buttons */}
              <div className="p-3 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                {loadingStats ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-400" />
                    <span className="text-xs text-[var(--color-text-muted)]">Loading session...</span>
                  </div>
                ) : sessionStats ? (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                        <span>{sessionStats.messageCount} messages</span>
                        <span className="text-[var(--color-border)]">|</span>
                        <span>~{(sessionStats.estimatedTokens / 1000).toFixed(0)}K tokens</span>
                        {sessionStats.truncated && (
                          <span className="text-amber-400">(truncated)</span>
                        )}
                      </div>
                      {chatMessages.length > 0 && (
                        <button
                          onClick={handleNewAnalysis}
                          className="flex items-center gap-1 text-[10px] text-violet-400 hover:text-violet-300 transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" />
                          New Analysis
                        </button>
                      )}
                    </div>
                    {/* Analysis mode buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {ANALYSIS_TEMPLATES.map(t => (
                        <button
                          key={t.mode}
                          onClick={() => handleTemplateClick(t)}
                          disabled={sse.status === 'streaming' || sse.status === 'connecting'}
                          className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium border border-[var(--color-border)] hover:bg-[var(--color-bg-tertiary)] transition-colors disabled:opacity-40 ${t.color}`}
                        >
                          <t.icon className="w-3 h-3" />
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Chat messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {chatMessages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <ChevronRight className="w-8 h-8 text-[var(--color-text-muted)] mx-auto mb-2 opacity-20" />
                      <p className="text-xs text-[var(--color-text-muted)]">
                        Click an analysis mode above or type a question
                      </p>
                    </div>
                  </div>
                ) : (
                  chatMessages.map(msg => (
                    <div
                      key={msg.id}
                      className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Bot className="w-3.5 h-3.5 text-violet-400" />
                        </div>
                      )}
                      <div
                        className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-blue-500/15 text-[var(--color-text-primary)]'
                            : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] border border-[var(--color-border)]'
                        }`}
                      >
                        {msg.role === 'assistant' ? (
                          <div className="prose prose-invert prose-xs max-w-none [&_p]:my-1 [&_li]:my-0.5 [&_h1]:text-sm [&_h2]:text-xs [&_h3]:text-xs [&_code]:text-[10px] [&_pre]:text-[10px]">
                            {msg.content ? (
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            ) : msg.isStreaming ? (
                              <div className="flex items-center gap-1.5">
                                <Loader2 className="w-3 h-3 animate-spin text-violet-400" />
                                <span className="text-[var(--color-text-muted)]">Analyzing...</span>
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          msg.content
                        )}
                      </div>
                      {msg.role === 'user' && (
                        <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <User className="w-3.5 h-3.5 text-blue-400" />
                        </div>
                      )}
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input bar */}
              <div className="p-3 border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey && inputValue.trim()) {
                        handleSend(inputValue, 'custom');
                      }
                    }}
                    placeholder="Ask about this session..."
                    disabled={sse.status === 'streaming' || sse.status === 'connecting'}
                    className="flex-1 bg-[var(--color-bg-tertiary)] text-xs text-[var(--color-text-primary)] border border-[var(--color-border)] rounded-lg px-3 py-2 placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-violet-500/50 disabled:opacity-50"
                  />
                  {sse.status === 'streaming' || sse.status === 'connecting' ? (
                    <button
                      onClick={() => {
                        sse.stop();
                        api.analysisCancel().catch(() => {});
                      }}
                      className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                    >
                      <Square className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => inputValue.trim() && handleSend(inputValue, 'custom')}
                      disabled={!inputValue.trim()}
                      className="p-2 rounded-lg bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 transition-colors disabled:opacity-30"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
