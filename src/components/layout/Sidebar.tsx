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
} from 'lucide-react';

const NAV_SECTIONS = [
  {
    label: 'CLI',
    items: [
      { to: '/terminal', icon: Terminal, label: 'Terminal' },
    ],
  },
  {
    label: 'Configuration',
    items: [
      { to: '/providers', icon: Cpu, label: 'AI Providers' },
      { to: '/mcp', icon: Server, label: 'MCP Servers' },
      { to: '/permissions', icon: Shield, label: 'Permissions' },
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
  {
    label: 'System',
    items: [
      { to: '/history', icon: History, label: 'History' },
      { to: '/archived-discussions', icon: Archive, label: 'Archives' },
      { to: '/analytics', icon: BarChart3, label: 'Analytics' },
      { to: '/health', icon: Activity, label: 'Health' },
    ],
  },
];

export function Sidebar() {
  return (
    <aside className="w-64 flex-shrink-0 bg-[var(--color-bg-secondary)] border-r border-[var(--color-border)] flex flex-col h-full overflow-y-auto">
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

      <div className="px-4 py-3 border-t border-[var(--color-border)]">
        <span className="text-xs text-[var(--color-text-muted)]">localhost:8081</span>
      </div>
    </aside>
  );
}
