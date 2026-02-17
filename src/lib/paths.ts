// Single source of truth for all sidebar navigation paths
export const PAGES = {
  // Monitor
  dashboard: '/',
  terminal: '/terminal',
  // Data
  history: '/history',
  archives: '/archived-discussions',
  explorer: '/explorer',
  extractions: '/extractions',
  memoryStore: '/unified-memory',
  // Insights
  analytics: '/analytics',
  insights: '/insights',
  reports: '/reports',
  sessionAnalysis: '/analysis',
  usageFeedback: '/usage-feedback',
  // Ops
  auditor: '/auditor',
  health: '/health',
  browserCdp: '/browser',
  // Routing
  litellm: '/litellm',
  // Configuration
  providers: '/providers',
  mcp: '/mcp',
  permissions: '/permissions',
  agentConfigs: '/agent-configs',
  settings: '/settings',
  claudeMd: '/claude-md',
  // Knowledge
  skills: '/skills',
  commands: '/commands',
  memory: '/memory',
  // Secondary (footer)
  chatab: '/chatab',
  chatlab: '/chatlab',
} as const;

export type PageKey = keyof typeof PAGES;

// All valid app paths for allowlist validation
export const ALL_VALID_PATHS = new Set(Object.values(PAGES));
