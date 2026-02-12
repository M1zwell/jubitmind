import { NavLink } from 'react-router-dom';
import {
  Terminal,
  Server,
  Shield,
  Settings,
  FileText,
  Puzzle,
  FolderTree,
  Brain,
  Activity,
  Cpu,
  History,
  Archive,
  BarChart3,
  MessageSquare,
  Users,
  Microscope,
  LayoutDashboard,
  Router,
  ShieldAlert,
  ShieldCheck,
  Layers,
  Lightbulb,
  Scan,
  FileBarChart,
  LogIn,
  Cloud,
  ExternalLink,
  User,
  Download,
  Globe,
  Database,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { JUBIT_BASE } from '@/lib/config';

const IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true';

const NAV_SECTIONS = [
  {
    label: 'Monitor',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/terminal', icon: Terminal, label: 'Terminal' },
    ],
  },
  {
    label: 'Data & Insights',
    items: [
      { to: '/history', icon: History, label: 'History' },
      { to: '/archived-discussions', icon: Archive, label: 'Archives' },
      { to: '/analytics', icon: BarChart3, label: 'Analytics' },
      { to: '/explorer', icon: Layers, label: 'Explorer' },
      { to: '/auditor', icon: ShieldAlert, label: 'Auditor' },
      { to: '/insights', icon: Lightbulb, label: 'Insights' },
      { to: '/extractions', icon: Scan, label: 'Extractions' },
      { to: '/reports', icon: FileBarChart, label: 'Reports' },
      { to: '/health', icon: Activity, label: 'Health' },
      { to: '/browser', icon: Globe, label: 'Browser CDP' },
      { to: '/unified-memory', icon: Database, label: 'Memory Store' },
    ],
  },
  {
    label: 'Analysis',
    items: [
      { to: '/analysis', icon: Microscope, label: 'Session Analysis' },
    ],
  },
  {
    label: 'Routing',
    items: [
      { to: '/litellm', icon: Router, label: 'LiteLLM' },
    ],
  },
  {
    label: 'Configuration',
    items: [
      { to: '/providers', icon: Cpu, label: 'AI Providers' },
      { to: '/mcp', icon: Server, label: 'MCP Servers' },
      { to: '/permissions', icon: Shield, label: 'Permissions' },
      { to: '/agent-configs', icon: ShieldCheck, label: 'Agent Configs' },
      { to: '/settings', icon: Settings, label: 'Settings' },
      { to: '/claude-md', icon: FileText, label: 'CLAUDE.md' },
    ],
  },
  {
    label: 'Knowledge',
    items: [
      { to: '/skills', icon: Puzzle, label: 'Skills' },
      { to: '/commands', icon: FolderTree, label: 'Commands' },
      { to: '/memory', icon: Brain, label: 'Memory' },
    ],
  },
  {
    label: 'Jubit AI',
    items: [
      { to: '/chatab', icon: MessageSquare, label: 'ChatAB' },
      { to: '/chatlab', icon: Users, label: 'ChatLab' },
    ],
  },
];

export function Sidebar() {
  const { user, loading, signIn, enabled } = useAuth();

  return (
    <aside className="w-64 flex-shrink-0 bg-[var(--color-bg-secondary)] border-r border-[var(--color-border)] flex flex-col h-full overflow-y-auto">
      {IS_DEMO && (
        <div className="px-3 py-2 bg-teal-500/15 border-b border-teal-500/30">
          <p className="text-[11px] font-medium text-teal-400">Demo Mode — Sample Data</p>
          <a
            href="https://github.com/M1zwell/jubitmind/releases/latest"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-teal-300 hover:text-teal-200 transition-colors mt-0.5"
          >
            <Download className="w-2.5 h-2.5" />
            Download JubitMind v0.78.0
          </a>
        </div>
      )}
      <div className="px-4 py-3 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-teal-500 flex items-center justify-center">
            <Terminal className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-[var(--color-text-primary)]">JubitMind</span>
        </div>
        <span className="text-xs text-[var(--color-text-muted)] mt-0.5 block">AI Interaction Audit</span>
      </div>

      <nav className="flex-1 py-2">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-1">
            <div className="px-4 py-1.5">
              <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                {section.label}
              </span>
            </div>
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-4 py-1.5 mx-2 rounded text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-teal-500/20 text-teal-400'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]'
                  }`
                }
              >
                <item.icon className="w-3.5 h-3.5" />
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="px-4 py-3 border-t border-[var(--color-border)] space-y-2">
        {enabled && !loading && user ? (
          <div className="flex items-center gap-2">
            {user.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url} alt="" className="w-5 h-5 rounded-full flex-shrink-0" />
            ) : (
              <User className="w-4 h-4 text-[var(--color-text-muted)] flex-shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs text-[var(--color-text-secondary)] truncate">{user.email || 'User'}</p>
              <p className="text-[10px] text-teal-400 flex items-center gap-1">
                <Cloud className="w-2.5 h-2.5" />
                Connected
              </p>
            </div>
          </div>
        ) : enabled && !loading ? (
          <button
            onClick={() => signIn('google')}
            className="flex items-center gap-1.5 w-full px-2 py-1.5 rounded text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-teal-400 transition-colors"
          >
            <LogIn className="w-3.5 h-3.5" />
            Sign in for cloud sync
          </button>
        ) : null}
        <a
          href={JUBIT_BASE}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[10px] text-[var(--color-text-muted)] hover:text-blue-400 transition-colors"
        >
          <ExternalLink className="w-2.5 h-2.5" />
          jubit.ai
        </a>
      </div>
    </aside>
  );
}
