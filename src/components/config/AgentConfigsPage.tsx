import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  ChevronDown,
  ChevronRight,
  Folder,
  User,
  RefreshCw,
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

function ConfigDetailView({ config }: { config: AgentConfigFile }) {
  const [showContent, setShowContent] = useState(false);
  const { audit, content } = config;

  return (
    <div className="space-y-3">
      {/* Audit results */}
      {audit && (
        <div className="space-y-2">
          {audit.risks.length > 0 && (
            <div className="space-y-1">
              {audit.risks.map((risk, i) => {
                const c = SEVERITY_COLORS[risk.severity];
                return (
                  <div key={i} className={`flex items-start gap-2 px-3 py-1.5 rounded border ${c.bg} ${c.border}`}>
                    <SeverityBadge severity={risk.severity} />
                    <span className={`text-[10px] ${c.text} flex-1`}>{risk.message}</span>
                    {risk.line && <span className="text-[9px] text-[var(--color-text-muted)] font-mono">L{risk.line}</span>}
                  </div>
                );
              })}
            </div>
          )}
          {audit.warnings.map((w, i) => (
            <div key={`w-${i}`} className="flex items-center gap-2 px-3 py-1.5 rounded bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0" />
              <span className="text-[10px] text-amber-400">{w}</span>
            </div>
          ))}
          {audit.info.map((info, i) => (
            <div key={`i-${i}`} className="flex items-center gap-2 px-3 py-1.5 rounded bg-[var(--color-bg-tertiary)]">
              <CheckCircle2 className="w-3 h-3 text-green-400 flex-shrink-0" />
              <span className="text-[10px] text-[var(--color-text-muted)]">{info}</span>
            </div>
          ))}
        </div>
      )}

      {/* Content viewer */}
      {content && (
        <div>
          <button
            onClick={() => setShowContent(!showContent)}
            className="flex items-center gap-1.5 text-[10px] text-teal-400 hover:text-teal-300 transition-colors"
          >
            <Eye className="w-3 h-3" />
            {showContent ? 'Hide' : 'View'} content ({content.split('\n').length} lines)
          </button>
          {showContent && (
            <pre className="mt-2 p-3 rounded bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-[9px] text-[var(--color-text-secondary)] font-mono overflow-x-auto max-h-[400px] overflow-y-auto whitespace-pre-wrap break-words leading-relaxed">
              {content}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

function ConfigCard({ config, onSelect, isSelected }: { config: AgentConfigFile; onSelect: () => void; isSelected: boolean }) {
  const hasRisks = config.audit && config.audit.risks.length > 0;
  const criticalCount = config.audit?.risks.filter((r) => r.severity === 'critical').length || 0;
  const highCount = config.audit?.risks.filter((r) => r.severity === 'high').length || 0;

  return (
    <div className={`border rounded-lg overflow-hidden transition-colors ${
      isSelected ? 'border-teal-500/50' : hasRisks ? (criticalCount > 0 ? 'border-red-500/30' : 'border-orange-500/30') : 'border-[var(--color-border)]'
    }`}>
      <button
        onClick={onSelect}
        className="w-full flex items-center gap-3 px-4 py-3 bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)] transition-colors text-left"
      >
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
      {isSelected && config.exists && config.audit && (
        <div className="px-4 py-3 border-t border-[var(--color-border)]">
          <ConfigDetailView config={config} />
        </div>
      )}
    </div>
  );
}

export function AgentConfigsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showMissing, setShowMissing] = useState(false);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['agent-configs', 'audit'],
    queryFn: () => api.agentConfigs.audit(),
  });

  const configs = (data?.configs || []) as AgentConfigFile[];
  const summary = data?.summary as AuditSummary | undefined;

  const filtered = showMissing ? configs : configs.filter((c) => c.exists);

  // Group by scope
  const projectConfigs = filtered.filter((c) => c.scope === 'project');
  const userConfigs = filtered.filter((c) => c.scope === 'user');

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
                />
              ))}
            </div>
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-12 space-y-2">
            <ShieldAlert className="w-8 h-8 text-[var(--color-text-muted)] mx-auto opacity-50" />
            <p className="text-xs text-[var(--color-text-muted)]">
              No agent config files found. Click "Show missing" to see all supported formats.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
