import { useHealth, useCliVersion, useCliDoctor, usePlugins } from '@/hooks/useClaudeApi';
import { Activity, CheckCircle, XCircle, RefreshCw, Stethoscope } from 'lucide-react';

export function UsageDashboard() {
  const { data: health, isLoading: healthLoading } = useHealth();
  const { data: version } = useCliVersion();
  const { data: doctor, refetch: runDoctor, isLoading: doctorLoading, isFetched: doctorFetched } = useCliDoctor();
  const { data: plugins } = usePlugins();

  const h = health as Record<string, string> | undefined;
  const pluginList = (plugins?.plugins || []) as Array<{ name: string; enabled: boolean }>;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-sm font-semibold text-[var(--color-text-primary)]">System Health</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {/* CLI Version */}
        <div className="p-3 bg-[var(--color-bg-secondary)] border border-[var(--color-border-muted)] rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-3.5 h-3.5 text-teal-400" />
            <span className="text-xs font-medium text-[var(--color-text-primary)]">Claude CLI</span>
          </div>
          <div className="text-lg font-semibold text-teal-400 font-mono">
            {version?.version || 'Loading...'}
          </div>
        </div>

        {/* Node Version */}
        <div className="p-3 bg-[var(--color-bg-secondary)] border border-[var(--color-border-muted)] rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-3.5 h-3.5 text-green-400" />
            <span className="text-xs font-medium text-[var(--color-text-primary)]">Node.js</span>
          </div>
          <div className="text-lg font-semibold text-green-400 font-mono">
            {healthLoading ? 'Loading...' : h?.nodeVersion || 'Unknown'}
          </div>
        </div>

        {/* Platform */}
        <div className="p-3 bg-[var(--color-bg-secondary)] border border-[var(--color-border-muted)] rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-xs font-medium text-[var(--color-text-primary)]">Platform</span>
          </div>
          <div className="text-sm font-mono text-[var(--color-text-secondary)]">
            {healthLoading ? 'Loading...' : h?.platform || 'Unknown'}
          </div>
        </div>
      </div>

      {/* Plugins */}
      <div className="p-3 bg-[var(--color-bg-secondary)] border border-[var(--color-border-muted)] rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-medium text-[var(--color-text-primary)]">Plugins</span>
          <span className="text-xs bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] px-1.5 py-0.5 rounded">
            {pluginList.length}
          </span>
        </div>
        {pluginList.length === 0 ? (
          <span className="text-xs text-[var(--color-text-muted)]">No plugins installed</span>
        ) : (
          <div className="space-y-1">
            {pluginList.map((plugin) => (
              <div key={plugin.name} className="flex items-center gap-2 text-xs">
                {plugin.enabled ? (
                  <CheckCircle className="w-3 h-3 text-emerald-500" />
                ) : (
                  <XCircle className="w-3 h-3 text-[var(--color-text-muted)]" />
                )}
                <span className={plugin.enabled ? 'text-[var(--color-text-secondary)]' : 'text-[var(--color-text-muted)]'}>
                  {plugin.name}
                </span>
                <span className={`text-xs px-1 py-0.5 rounded ${plugin.enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]'}`}>
                  {plugin.enabled ? 'enabled' : 'disabled'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Doctor */}
      <div className="p-3 bg-[var(--color-bg-secondary)] border border-[var(--color-border-muted)] rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-3.5 h-3.5 text-teal-400" />
            <span className="text-xs font-medium text-[var(--color-text-primary)]">Doctor</span>
          </div>
          <button
            onClick={() => runDoctor()}
            disabled={doctorLoading}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] rounded transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${doctorLoading ? 'animate-spin' : ''}`} />
            Run Doctor
          </button>
        </div>
        {doctorFetched ? (
          <pre className="text-xs font-mono text-[var(--color-text-secondary)] whitespace-pre-wrap">
            {doctor?.output || 'No output'}
          </pre>
        ) : (
          <span className="text-xs text-[var(--color-text-muted)]">Click "Run Doctor" to check system health</span>
        )}
      </div>

      {/* Project Info */}
      {h && (
        <div className="p-3 bg-[var(--color-bg-secondary)] border border-[var(--color-border-muted)] rounded-lg">
          <span className="text-xs font-medium text-[var(--color-text-primary)] mb-2 block">Project Paths</span>
          <div className="space-y-1">
            {Object.entries(h).map(([key, val]) => (
              <div key={key} className="flex items-center gap-2 text-xs">
                <span className="text-[var(--color-text-muted)] w-24">{key}:</span>
                <span className="text-[var(--color-text-secondary)] font-mono truncate">{val}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
