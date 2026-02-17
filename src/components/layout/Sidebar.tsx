import { useState, useEffect, useCallback, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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
  ThumbsUp,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { JUBIT_BASE } from '@/lib/config';
import { PAGES } from '@/lib/paths';

const IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true';

// --- Types ---

type SidebarSectionKey = 'monitor' | 'data' | 'insights' | 'ops' | 'routing' | 'configuration' | 'knowledge';

interface SidebarNavItem {
  to: string;
  icon: LucideIcon;
  label: string;
}

interface SidebarSection {
  key: SidebarSectionKey;
  label: string;
  items: SidebarNavItem[];
}

// --- Navigation Structure ---

const NAV_SECTIONS: SidebarSection[] = [
  {
    key: 'monitor',
    label: 'Monitor',
    items: [
      { to: PAGES.dashboard, icon: LayoutDashboard, label: 'Dashboard' },
      { to: PAGES.terminal, icon: Terminal, label: 'Terminal' },
    ],
  },
  {
    key: 'data',
    label: 'Data',
    items: [
      { to: PAGES.history, icon: History, label: 'History' },
      { to: PAGES.archives, icon: Archive, label: 'Archives' },
      { to: PAGES.explorer, icon: Layers, label: 'Explorer' },
      { to: PAGES.extractions, icon: Scan, label: 'Extractions' },
      { to: PAGES.memoryStore, icon: Database, label: 'Memory Store' },
    ],
  },
  {
    key: 'insights',
    label: 'Insights',
    items: [
      { to: PAGES.analytics, icon: BarChart3, label: 'Analytics' },
      { to: PAGES.insights, icon: Lightbulb, label: 'Insights' },
      { to: PAGES.reports, icon: FileBarChart, label: 'Reports' },
      { to: PAGES.sessionAnalysis, icon: Microscope, label: 'Session Analysis' },
      { to: PAGES.usageFeedback, icon: ThumbsUp, label: 'Usage & Feedback' },
    ],
  },
  {
    key: 'ops',
    label: 'Ops',
    items: [
      { to: PAGES.auditor, icon: ShieldAlert, label: 'Auditor' },
      { to: PAGES.health, icon: Activity, label: 'Health' },
      { to: PAGES.browserCdp, icon: Globe, label: 'Browser CDP' },
    ],
  },
  {
    key: 'routing',
    label: 'Routing',
    items: [
      { to: PAGES.litellm, icon: Router, label: 'LiteLLM' },
    ],
  },
  {
    key: 'configuration',
    label: 'Configuration',
    items: [
      { to: PAGES.providers, icon: Cpu, label: 'AI Providers' },
      { to: PAGES.mcp, icon: Server, label: 'MCP Servers' },
      { to: PAGES.permissions, icon: Shield, label: 'Permissions' },
      { to: PAGES.agentConfigs, icon: ShieldCheck, label: 'Agent Configs' },
      { to: PAGES.settings, icon: Settings, label: 'Settings' },
      { to: PAGES.claudeMd, icon: FileText, label: 'CLAUDE.md' },
    ],
  },
  {
    key: 'knowledge',
    label: 'Knowledge',
    items: [
      { to: PAGES.skills, icon: Puzzle, label: 'Skills' },
      { to: PAGES.commands, icon: FolderTree, label: 'Commands' },
      { to: PAGES.memory, icon: Brain, label: 'Memory' },
    ],
  },
];

const FOOTER_LINKS: SidebarNavItem[] = [
  { to: PAGES.chatab, icon: MessageSquare, label: 'ChatAB' },
  { to: PAGES.chatlab, icon: Users, label: 'ChatLab' },
];

// --- Collapse State ---

const STORAGE_KEY = 'jm.sidebar.sectionState.v1';

type SectionState = Partial<Record<SidebarSectionKey, boolean>>;

const DEFAULT_EXPANDED: SidebarSectionKey[] = ['monitor', 'data'];

function findSectionForPath(pathname: string): SidebarSectionKey | null {
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      if (item.to === '/' ? pathname === '/' : pathname.startsWith(item.to)) {
        return section.key;
      }
    }
  }
  return null;
}

function loadSectionState(): SectionState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
    // Validate all keys are known section keys and values are booleans
    const validKeys = new Set<string>(NAV_SECTIONS.map(s => s.key));
    for (const [k, v] of Object.entries(parsed)) {
      if (!validKeys.has(k) || typeof v !== 'boolean') return null;
    }
    return parsed as SectionState;
  } catch {
    return null;
  }
}

function buildDefaultState(activeSection: SidebarSectionKey | null): SectionState {
  const state: SectionState = {};
  for (const section of NAV_SECTIONS) {
    state[section.key] = DEFAULT_EXPANDED.includes(section.key) || section.key === activeSection;
  }
  return state;
}

function useSectionCollapse() {
  const { pathname } = useLocation();
  const activeSection = useMemo(() => findSectionForPath(pathname), [pathname]);

  const [expanded, setExpanded] = useState<SectionState>(() => {
    return loadSectionState() ?? buildDefaultState(activeSection);
  });

  // Auto-expand the section containing the active route
  useEffect(() => {
    if (activeSection && !expanded[activeSection]) {
      setExpanded(prev => ({ ...prev, [activeSection]: true }));
    }
  }, [activeSection]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(expanded));
    } catch {
      // localStorage full or unavailable — ignore
    }
  }, [expanded]);

  const toggle = useCallback((key: SidebarSectionKey) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const isExpanded = useCallback((key: SidebarSectionKey) => {
    return expanded[key] ?? false;
  }, [expanded]);

  return { toggle, isExpanded, activeSection };
}

// --- Component ---

export function Sidebar() {
  const { user, loading, signIn, enabled } = useAuth();
  const { toggle, isExpanded, activeSection } = useSectionCollapse();
  const { pathname } = useLocation();

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
        {NAV_SECTIONS.map((section) => {
          const open = isExpanded(section.key);
          const isActive = section.key === activeSection;
          return (
            <div key={section.key} className="mb-1">
              <button
                onClick={() => toggle(section.key)}
                className="flex items-center justify-between w-full px-4 py-1.5 group"
              >
                <span className={`text-xs font-medium uppercase tracking-wider ${
                  isActive ? 'text-teal-400' : 'text-[var(--color-text-muted)]'
                }`}>
                  {section.label}
                </span>
                {open
                  ? <ChevronDown className="w-3 h-3 text-[var(--color-text-muted)] group-hover:text-[var(--color-text-secondary)] transition-colors" />
                  : <ChevronRight className="w-3 h-3 text-[var(--color-text-muted)] group-hover:text-[var(--color-text-secondary)] transition-colors" />
                }
              </button>
              {open && section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive: linkActive }) =>
                    `flex items-center gap-2.5 px-4 py-1.5 mx-2 rounded text-xs font-medium transition-colors ${
                      linkActive
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
          );
        })}
      </nav>

      <div className="px-4 py-3 border-t border-[var(--color-border)] space-y-2">
        {/* Secondary nav links (Jubit AI) */}
        <div className="flex items-center gap-2 pb-2 border-b border-[var(--color-border)]">
          {FOOTER_LINKS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors ${
                pathname === item.to
                  ? 'bg-teal-500/20 text-teal-400'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]'
              }`}
            >
              <item.icon className="w-3 h-3" />
              {item.label}
            </NavLink>
          ))}
        </div>
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
