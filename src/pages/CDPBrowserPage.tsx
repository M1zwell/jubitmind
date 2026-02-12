import { useState } from 'react';
import { Globe, Wifi, WifiOff, RefreshCw, MonitorSmartphone } from 'lucide-react';
import { useCDPStatus, useCDPConnect, useCDPDisconnect, useCDPAITabs } from '@/hooks/useCDP';

const TOOL_COLORS: Record<string, string> = {
  chatgpt: 'text-green-400',
  'claude-web': 'text-orange-400',
  gemini: 'text-blue-400',
  perplexity: 'text-cyan-400',
  deepseek: 'text-indigo-400',
  qwen: 'text-purple-400',
  kimi: 'text-pink-400',
  jubit: 'text-teal-400',
  'cursor-web': 'text-yellow-400',
  'kilo-web': 'text-lime-400',
  'antigravity-web': 'text-rose-400',
};

export function CDPBrowserPage() {
  const { data: status } = useCDPStatus();
  const { data: aiTabs, refetch: refetchTabs } = useCDPAITabs();
  const connectMutation = useCDPConnect();
  const disconnectMutation = useCDPDisconnect();
  const [host, setHost] = useState('127.0.0.1');
  const [port, setPort] = useState('9222');

  const connected = status?.connected ?? false;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
            <Globe className="w-5 h-5 text-green-400" />
            Browser CDP
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            Connect to Chrome DevTools Protocol to monitor browser-based AI tools
          </p>
        </div>
        <div className="flex items-center gap-2">
          {connected ? (
            <span className="flex items-center gap-1.5 text-xs text-green-400 bg-green-500/10 px-2.5 py-1 rounded">
              <Wifi className="w-3 h-3" /> Connected
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-tertiary)] px-2.5 py-1 rounded">
              <WifiOff className="w-3 h-3" /> Disconnected
            </span>
          )}
        </div>
      </div>

      {/* Connection Controls */}
      <div className="border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] p-4">
        <h2 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">Connection</h2>
        <div className="flex items-end gap-3">
          <div>
            <label className="text-[10px] text-[var(--color-text-muted)] block mb-1">Host</label>
            <input
              value={host}
              onChange={(e) => setHost(e.target.value)}
              className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded px-2 py-1.5 text-xs text-[var(--color-text-primary)] w-36"
              disabled={connected}
            />
          </div>
          <div>
            <label className="text-[10px] text-[var(--color-text-muted)] block mb-1">Port</label>
            <input
              value={port}
              onChange={(e) => setPort(e.target.value)}
              className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded px-2 py-1.5 text-xs text-[var(--color-text-primary)] w-20"
              disabled={connected}
            />
          </div>
          {connected ? (
            <button
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
              className="px-3 py-1.5 text-xs font-medium rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={() => connectMutation.mutate({ host, port: Number(port) })}
              disabled={connectMutation.isPending}
              className="px-3 py-1.5 text-xs font-medium rounded bg-teal-500/20 text-teal-400 hover:bg-teal-500/30 transition-colors disabled:opacity-50"
            >
              {connectMutation.isPending ? 'Connecting...' : 'Connect'}
            </button>
          )}
        </div>
        {connectMutation.isError && (
          <p className="text-xs text-red-400 mt-2">{(connectMutation.error as Error).message}</p>
        )}
        {status?.chromeVersion && (
          <p className="text-[10px] text-[var(--color-text-muted)] mt-2">
            Chrome {status.chromeVersion} &middot; {status.tabCount ?? 0} tabs &middot; {status.aiToolTabs ?? 0} AI tools detected
          </p>
        )}
      </div>

      {/* AI Tool Tabs */}
      {connected && (
        <div className="border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-[var(--color-text-primary)] flex items-center gap-2">
              <MonitorSmartphone className="w-4 h-4 text-teal-400" />
              Detected AI Tools
            </h2>
            <button
              onClick={() => refetchTabs()}
              className="p-1 rounded hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:text-teal-400 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          {aiTabs?.tabs && aiTabs.tabs.length > 0 ? (
            <div className="space-y-2">
              {aiTabs.tabs.map((tab) => (
                <div
                  key={tab.id}
                  className="flex items-center justify-between p-3 rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`text-xs font-medium ${TOOL_COLORS[tab.detectedTool || ''] || 'text-gray-400'}`}>
                      {tab.detectedTool || 'Unknown'}
                    </span>
                    <span className="text-xs text-[var(--color-text-secondary)] truncate">{tab.title}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] text-[var(--color-text-muted)] truncate max-w-[200px]">{tab.url}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[var(--color-text-muted)]">No AI tool tabs detected. Open ChatGPT, Claude.ai, Gemini, etc. in Chrome.</p>
          )}
        </div>
      )}

      {/* Setup Instructions */}
      <div className="border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] p-4">
        <h2 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">Setup Instructions</h2>
        <div className="space-y-3 text-xs text-[var(--color-text-secondary)]">
          <div>
            <p className="font-medium text-[var(--color-text-primary)] mb-1">1. Launch Chrome with remote debugging</p>
            <code className="block bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded px-3 py-2 text-[11px] text-teal-400 font-mono">
              # macOS{'\n'}
              /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222{'\n\n'}
              # Linux{'\n'}
              google-chrome --remote-debugging-port=9222{'\n\n'}
              # Windows{'\n'}
              chrome.exe --remote-debugging-port=9222
            </code>
          </div>
          <div>
            <p className="font-medium text-[var(--color-text-primary)] mb-1">2. Sign in to AI tools</p>
            <p>Navigate to ChatGPT, Claude.ai, Gemini, or other AI tools and sign in normally.</p>
          </div>
          <div>
            <p className="font-medium text-[var(--color-text-primary)] mb-1">3. Connect from JubitMind</p>
            <p>Click "Connect" above. JubitMind will detect open AI tool tabs and can extract conversations.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
