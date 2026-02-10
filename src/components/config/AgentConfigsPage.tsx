import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Editor from '@monaco-editor/react';
import {
  FileText,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  Folder,
  User,
  RefreshCw,
  Save,
  RotateCcw,
  Pencil,
  Plus,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';

interface AuditRisk {
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  line?: number;
}

interface ConfigAudit {
  risks: AuditRisk[];
  warnings: string[];
  info: string[];
}

interface AgentConfigFile {
  id: string;
  name: string;
  tool: string;
  format: string;
  scope: 'project' | 'user';
  path: string;
  exists: boolean;
  sizeBytes: number;
  lastModified: string | null;
  content?: string;
  audit?: ConfigAudit;
}

interface AuditSummary {
  total: number;
  found: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  warnings: number;
}

const TOOL_COLORS: Record<string, string> = {
  'Claude Code': 'text-teal-400',
  'Cursor': 'text-blue-400',
  'Windsurf': 'text-cyan-400',
  'GitHub Copilot': 'text-purple-400',
  'Continue.dev': 'text-green-400',
  'Aider': 'text-yellow-400',
  'Codex CLI': 'text-orange-400',
  'Cline': 'text-pink-400',
  'Generic': 'text-gray-400',
};

const SEVERITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
  high: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
  medium: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  low: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
};

const FORMAT_LANGUAGE: Record<string, string> = {
  md: 'markdown',
  json: 'json',
  yaml: 'yaml',
  toml: 'toml',
  txt: 'plaintext',
};

const TEMPLATE_CONTENT: Record<string, string> = {
  md: '# Agent Instructions\n\n## Overview\n\nDescribe the project context and goals.\n\n## Guidelines\n\n- Follow existing code patterns\n- Write clear commit messages\n- Test before committing\n',
  json: '{\n  \n}\n',
  yaml: '# Configuration\n\n',
  toml: '# Configuration\n\n',
  txt: '',
};

function SeverityBadge({ severity }: { severity: string }) {
  const c = SEVERITY_COLORS[severity] || SEVERITY_COLORS.low;
  return (
    <span className={`text-[8px] px-1.5 py-0.5 rounded font-medium uppercase ${c.bg} ${c.text}`}>
      {severity}
    </span>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// ---------------------------------------------------------------------------
// Audit panel (shown alongside editor)
// ---------------------------------------------------------------------------

function AuditPanel({ audit }: { audit: ConfigAudit }) {
  return (
    <div className="space-y-1.5 overflow-y-auto max-h-full">
      {audit.risks.map((risk, i) => {
        const c = SEVERITY_COLORS[risk.severity];
        return (
          <div key={i} className={`flex items-start gap-2 px-2 py-1 rounded border ${c.bg} ${c.border}`}>
            <SeverityBadge severity={risk.severity} />
            <span className={`text-[9px] ${c.text} flex-1`}>{risk.message}</span>
            {risk.line && <span className="text-[8px] text-[var(--color-text-muted)] font-mono">L{risk.line}</span>}
          </div>
        );
      })}
      {audit.warnings.map((w, i) => (
        <div key={`w-${i}`} className="flex items-center gap-2 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="w-2.5 h-2.5 text-amber-400 flex-shrink-0" />
          <span className="text-[9px] text-amber-400">{w}</span>
        </div>
      ))}
      {audit.info.map((info, i) => (
        <div key={`i-${i}`} className="flex items-center gap-2 px-2 py-1 rounded bg-[var(--color-bg-tertiary)]">
          <CheckCircle2 className="w-2.5 h-2.5 text-green-400 flex-shrink-0" />
          <span className="text-[9px] text-[var(--color-text-muted)]">{info}</span>
        </div>
      ))}
      {audit.risks.length === 0 && audit.warnings.length === 0 && audit.info.length === 0 && (
        <div className="text-[9px] text-[var(--color-text-muted)] text-center py-2">No issues</div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Config editor (full panel with Monaco + audit sidebar)
// ---------------------------------------------------------------------------

function ConfigEditor({
  config,
  onClose,
  onSaved,
}: {
  config: AgentConfigFile;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [content, setContent] = useState(config.content || TEMPLATE_CONTENT[config.format] || '');
  const [originalContent] = useState(config.content || '');
  const [hasChanges, setHasChanges] = useState(!config.exists);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const saveMutation = useMutation({
    mutationFn: (newContent: string) => api.agentConfigs.save(config.id, newContent),
    onSuccess: () => {
      setSaveStatus('saved');
      setHasChanges(false);
      setTimeout(() => setSaveStatus('idle'), 2000);
      onSaved();
    },
    onError: () => {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    },
  });

  const handleChange = useCallback((value: string | undefined) => {
    const v = value || '';
    setContent(v);
    setHasChanges(v !== originalContent);
  }, [originalContent]);

  const handleSave = () => {
    setSaveStatus('saving');
    saveMutation.mutate(content);
  };

  const handleReset = () => {
    setContent(originalContent);
    setHasChanges(false);
  };

  // Keyboard shortcut: Ctrl/Cmd+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (hasChanges) handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const language = FORMAT_LANGUAGE[config.format] || 'plaintext';
  const audit = config.audit;

  return (
    <div className="flex flex-col h-full">
      {/* Editor toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)] flex-shrink-0 bg-[var(--color-bg-secondary)]">
        <div className="flex items-center gap-2">
          <FileText className={`w-3.5 h-3.5 ${TOOL_COLORS[config.tool] || 'text-gray-400'}`} />
          <span className="text-xs font-medium text-[var(--color-text-primary)]">{config.name}</span>
          <span className={`text-[9px] px-1.5 py-0.5 rounded ${TOOL_COLORS[config.tool] || 'text-gray-400'} bg-[var(--color-bg-tertiary)]`}>
            {config.tool}
          </span>
          {!config.exists && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">new file</span>
          )}
          {hasChanges && <span className="text-[9px] text-yellow-400">unsaved</span>}
          {saveStatus === 'saved' && <span className="text-[9px] text-green-400">saved</span>}
          {saveStatus === 'error' && <span className="text-[9px] text-red-400">save failed</span>}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[8px] text-[var(--color-text-muted)] font-mono mr-2">{config.path}</span>
          <button
            onClick={handleReset}
            disabled={!hasChanges}
            title="Revert changes"
            className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors disabled:opacity-30"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || saveMutation.isPending}
            title="Save (Cmd+S)"
            className="flex items-center gap-1 px-2 py-1 text-[10px] bg-teal-500/20 text-teal-400 rounded hover:bg-teal-500/30 transition-colors disabled:opacity-30"
          >
            <Save className="w-3 h-3" />
            Save
          </button>
          <button
            onClick={onClose}
            title="Close editor"
            className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Editor + Audit panel */}
      <div className="flex-1 min-h-0 flex">
        {/* Monaco editor */}
        <div className="flex-1 min-w-0">
          <Editor
            height="100%"
            language={language}
            value={content}
            onChange={handleChange}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 12,
              lineNumbers: 'on',
              wordWrap: 'on',
              scrollBeyondLastLine: false,
              padding: { top: 8 },
              renderWhitespace: 'selection',
              tabSize: 2,
            }}
          />
        </div>

        {/* Audit sidebar */}
        {audit && (audit.risks.length > 0 || audit.warnings.length > 0 || audit.info.length > 0) && (
          <div className="w-64 flex-shrink-0 border-l border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-2 overflow-y-auto">
            <div className="flex items-center gap-1.5 mb-2">
              <ShieldAlert className="w-3 h-3 text-[var(--color-text-muted)]" />
              <span className="text-[9px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">Audit</span>
            </div>
            <AuditPanel audit={audit} />
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Config list card
// ---------------------------------------------------------------------------

function ConfigCard({
  config,
  isSelected,
  onSelect,
  onEdit,
}: {
  config: AgentConfigFile;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
}) {
  const hasRisks = config.audit && config.audit.risks.length > 0;
  const criticalCount = config.audit?.risks.filter((r) => r.severity === 'critical').length || 0;
  const highCount = config.audit?.risks.filter((r) => r.severity === 'high').length || 0;

  return (
    <div className={`border rounded-lg overflow-hidden transition-colors ${
      isSelected ? 'border-teal-500/50' : hasRisks ? (criticalCount > 0 ? 'border-red-500/30' : 'border-orange-500/30') : 'border-[var(--color-border)]'
    }`}>
      <div className="flex items-center gap-3 px-4 py-3 bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)] transition-colors">
        <button onClick={onSelect} className="flex items-center gap-3 flex-1 min-w-0 text-left">
          <div className="flex-shrink-0">
            {isSelected ? <ChevronDown className="w-3.5 h-3.5 text-[var(--color-text-muted)]" /> : <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />}
          </div>
          <div className="flex-shrink-0">
            {config.exists ? (
              <FileText className={`w-4 h-4 ${TOOL_COLORS[config.tool] || 'text-gray-400'}`} />
            ) : (
              <XCircle className="w-4 h-4 text-[var(--color-text-muted)] opacity-40" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium ${config.exists ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)] opacity-60'}`}>
                {config.name}
              </span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded ${TOOL_COLORS[config.tool] || 'text-gray-400'} bg-[var(--color-bg-tertiary)]`}>
                {config.tool}
              </span>
              <span className="text-[8px] text-[var(--color-text-muted)] px-1 py-0.5 rounded bg-[var(--color-bg-tertiary)]">
                .{config.format}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {config.scope === 'project' ? (
                <span className="text-[9px] text-[var(--color-text-muted)] flex items-center gap-0.5"><Folder className="w-2.5 h-2.5" /> project</span>
              ) : (
                <span className="text-[9px] text-[var(--color-text-muted)] flex items-center gap-0.5"><User className="w-2.5 h-2.5" /> user</span>
              )}
              {config.exists && (
                <>
                  <span className="text-[9px] text-[var(--color-text-muted)]">{formatSize(config.sizeBytes)}</span>
                  {config.lastModified && (
                    <span className="text-[9px] text-[var(--color-text-muted)]">
                      {new Date(config.lastModified).toLocaleDateString()}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {!config.exists && (
              <span className="text-[9px] text-[var(--color-text-muted)] opacity-50">not found</span>
            )}
            {criticalCount > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">{criticalCount} critical</span>}
            {highCount > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400">{highCount} high</span>}
            {config.exists && !hasRisks && config.audit && (
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            )}
          </div>
        </button>
        {/* Edit / Create button */}
        <button
          onClick={onEdit}
          title={config.exists ? 'Edit' : 'Create'}
          className="flex items-center gap-1 px-2 py-1 text-[10px] rounded transition-colors flex-shrink-0 bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:text-teal-400 hover:bg-teal-500/10"
        >
          {config.exists ? <Pencil className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
          {config.exists ? 'Edit' : 'Create'}
        </button>
      </div>

      {/* Expanded audit preview (not editing) */}
      {isSelected && config.exists && config.audit && (
        <div className="px-4 py-3 border-t border-[var(--color-border)]">
          <AuditPanel audit={config.audit} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function AgentConfigsPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<AgentConfigFile | null>(null);
  const [showMissing, setShowMissing] = useState(false);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['agent-configs', 'audit'],
    queryFn: () => api.agentConfigs.audit(),
  });

  const configs = (data?.configs || []) as AgentConfigFile[];
  const summary = data?.summary as AuditSummary | undefined;

  const filtered = showMissing ? configs : configs.filter((c) => c.exists);
  const projectConfigs = filtered.filter((c) => c.scope === 'project');
  const userConfigs = filtered.filter((c) => c.scope === 'user');

  const handleEdit = (config: AgentConfigFile) => {
    setEditingConfig(config);
  };

  const handleEditorClose = () => {
    setEditingConfig(null);
  };

  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: ['agent-configs'] });
  };

  // If editing, show full-screen editor
  if (editingConfig) {
    return (
      <div className="flex flex-col h-full">
        <ConfigEditor
          config={editingConfig}
          onClose={handleEditorClose}
          onSaved={handleSaved}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-teal-400" />
          <h1 className="text-sm font-semibold text-[var(--color-text-primary)]">
            Agent Configs
          </h1>
          {summary && (
            <span className="text-[10px] text-[var(--color-text-muted)]">
              {summary.found}/{summary.total} files found
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMissing(!showMissing)}
            className={`text-[10px] px-2 py-1 rounded transition-colors ${
              showMissing ? 'bg-teal-500/20 text-teal-400' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] bg-[var(--color-bg-secondary)]'
            }`}
          >
            {showMissing ? 'Hide' : 'Show'} missing
          </button>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isFetching ? 'animate-spin' : ''}`} />
            Re-scan
          </button>
        </div>
      </div>

      {/* Audit summary */}
      {summary && (
        <div className="grid grid-cols-6 gap-2 flex-shrink-0">
          <div className="p-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-center">
            <div className="text-lg font-bold text-[var(--color-text-primary)]">{summary.found}</div>
            <div className="text-[9px] text-[var(--color-text-muted)]">Found</div>
          </div>
          <div className="p-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-center">
            <div className={`text-lg font-bold ${summary.critical > 0 ? 'text-red-400' : 'text-green-400'}`}>{summary.critical}</div>
            <div className="text-[9px] text-[var(--color-text-muted)]">Critical</div>
          </div>
          <div className="p-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-center">
            <div className={`text-lg font-bold ${summary.high > 0 ? 'text-orange-400' : 'text-green-400'}`}>{summary.high}</div>
            <div className="text-[9px] text-[var(--color-text-muted)]">High</div>
          </div>
          <div className="p-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-center">
            <div className={`text-lg font-bold ${summary.medium > 0 ? 'text-yellow-400' : 'text-green-400'}`}>{summary.medium}</div>
            <div className="text-[9px] text-[var(--color-text-muted)]">Medium</div>
          </div>
          <div className="p-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-center">
            <div className="text-lg font-bold text-blue-400">{summary.low}</div>
            <div className="text-[9px] text-[var(--color-text-muted)]">Low</div>
          </div>
          <div className="p-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-center">
            <div className={`text-lg font-bold ${summary.warnings > 0 ? 'text-amber-400' : 'text-[var(--color-text-primary)]'}`}>{summary.warnings}</div>
            <div className="text-[9px] text-[var(--color-text-muted)]">Warnings</div>
          </div>
        </div>
      )}

      {/* Config list */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
        {isLoading && (
          <div className="text-xs text-[var(--color-text-muted)] text-center py-8">Scanning agent configs...</div>
        )}

        {!isLoading && projectConfigs.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2 px-1">
              <Folder className="w-3 h-3 text-[var(--color-text-muted)]" />
              <span className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">Project Configs</span>
            </div>
            <div className="space-y-1.5">
              {projectConfigs.map((c) => (
                <ConfigCard
                  key={c.id}
                  config={c}
                  isSelected={selectedId === c.id}
                  onSelect={() => setSelectedId(selectedId === c.id ? null : c.id)}
                  onEdit={() => handleEdit(c)}
                />
              ))}
            </div>
          </div>
        )}

        {!isLoading && userConfigs.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2 px-1">
              <User className="w-3 h-3 text-[var(--color-text-muted)]" />
              <span className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">User/Global Configs</span>
            </div>
            <div className="space-y-1.5">
              {userConfigs.map((c) => (
                <ConfigCard
                  key={c.id}
                  config={c}
                  isSelected={selectedId === c.id}
                  onSelect={() => setSelectedId(selectedId === c.id ? null : c.id)}
                  onEdit={() => handleEdit(c)}
                />
              ))}
            </div>
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-12 space-y-2">
            <ShieldAlert className="w-8 h-8 text-[var(--color-text-muted)] mx-auto opacity-50" />
            <p className="text-xs text-[var(--color-text-muted)]">
              No agent config files found. Click "Show missing" to see all supported formats and create new ones.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
