// Known Claude Code configuration paths — resolved server-side
export const PAGES = {
  terminal: '/terminal',
  mcp: '/mcp',
  permissions: '/permissions',
  settings: '/settings',
  claudeMd: '/claude-md',
  skills: '/skills',
  commands: '/commands',
  memory: '/memory',
  health: '/health',
} as const;

export type PageKey = keyof typeof PAGES;
