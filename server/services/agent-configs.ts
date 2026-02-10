import fsp from 'fs/promises';
import path from 'path';
import os from 'os';
import { PATHS } from './config-resolver.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentConfigFile {
  id: string;
  name: string;
  tool: string;
  format: 'md' | 'json' | 'yaml' | 'toml' | 'txt';
  scope: 'project' | 'user' | 'system';
  path: string;
  exists: boolean;
  sizeBytes: number;
  lastModified: string | null;
  content?: string;
  audit?: ConfigAudit;
}

export interface ConfigAudit {
  risks: AuditRisk[];
  warnings: string[];
  info: string[];
}

export interface AuditRisk {
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  line?: number;
}

// ---------------------------------------------------------------------------
// Config file definitions
// ---------------------------------------------------------------------------

interface ConfigDef {
  id: string;
  name: string;
  tool: string;
  format: 'md' | 'json' | 'yaml' | 'toml' | 'txt';
  scope: 'project' | 'user';
  /** Paths relative to project root (scope=project) or home dir (scope=user) */
  paths: string[];
}

const CONFIG_DEFS: ConfigDef[] = [
  // --- Project-level ---
  {
    id: 'claude-md',
    name: 'CLAUDE.md',
    tool: 'Claude Code',
    format: 'md',
    scope: 'project',
    paths: ['CLAUDE.md'],
  },
  {
    id: 'cursorrules',
    name: '.cursorrules',
    tool: 'Cursor',
    format: 'md',
    scope: 'project',
    paths: ['.cursorrules', '.cursor/rules/rules.md', '.cursor/rules.md'],
  },
  {
    id: 'windsurfrules',
    name: '.windsurfrules',
    tool: 'Windsurf',
    format: 'md',
    scope: 'project',
    paths: ['.windsurfrules'],
  },
  {
    id: 'copilot-instructions',
    name: 'copilot-instructions.md',
    tool: 'GitHub Copilot',
    format: 'md',
    scope: 'project',
    paths: ['.github/copilot-instructions.md'],
  },
  {
    id: 'continue-config',
    name: 'config.json',
    tool: 'Continue.dev',
    format: 'json',
    scope: 'project',
    paths: ['.continue/config.json'],
  },
  {
    id: 'aider-conf',
    name: '.aider.conf.yml',
    tool: 'Aider',
    format: 'yaml',
    scope: 'project',
    paths: ['.aider.conf.yml', '.aider.model.settings.yml'],
  },
  {
    id: 'codex-instructions',
    name: 'codex instructions',
    tool: 'Codex CLI',
    format: 'md',
    scope: 'project',
    paths: ['codex.md', '.codex/instructions.md', 'CODEX.md'],
  },
  {
    id: 'agents-md',
    name: 'AGENTS.md',
    tool: 'Generic',
    format: 'md',
    scope: 'project',
    paths: ['AGENTS.md', 'agents.md', '.agents.md'],
  },
  {
    id: 'conventions-md',
    name: 'CONVENTIONS.md',
    tool: 'Generic',
    format: 'md',
    scope: 'project',
    paths: ['CONVENTIONS.md', 'conventions.md'],
  },
  {
    id: 'ai-prompts',
    name: 'AI Prompts',
    tool: 'Generic',
    format: 'md',
    scope: 'project',
    paths: ['.ai/prompts/system.md', '.ai/config.json', '.ai/config.yaml'],
  },
  {
    id: 'clinerules',
    name: '.clinerules',
    tool: 'Cline',
    format: 'md',
    scope: 'project',
    paths: ['.clinerules', '.cline/rules.md'],
  },

  // --- User-level ---
  {
    id: 'claude-global-settings',
    name: 'settings.json',
    tool: 'Claude Code',
    format: 'json',
    scope: 'user',
    paths: ['.claude/settings.json'],
  },
  {
    id: 'claude-global-md',
    name: 'Global CLAUDE.md',
    tool: 'Claude Code',
    format: 'md',
    scope: 'user',
    paths: ['.claude/CLAUDE.md'],
  },
  {
    id: 'continue-global',
    name: 'Global config.json',
    tool: 'Continue.dev',
    format: 'json',
    scope: 'user',
    paths: ['.continue/config.json'],
  },
  {
    id: 'aider-global',
    name: 'Global .aider.conf.yml',
    tool: 'Aider',
    format: 'yaml',
    scope: 'user',
    paths: ['.aider.conf.yml'],
  },
  {
    id: 'cursorrules-global',
    name: 'Global .cursorrules',
    tool: 'Cursor',
    format: 'md',
    scope: 'user',
    paths: ['.cursorrules'],
  },
  {
    id: 'codex-global',
    name: 'Global Codex config',
    tool: 'Codex CLI',
    format: 'md',
    scope: 'user',
    paths: ['.codex/instructions.md', '.codex/config.json'],
  },
];

// ---------------------------------------------------------------------------
// Audit patterns
// ---------------------------------------------------------------------------

const AUDIT_PATTERNS: Array<{
  pattern: RegExp;
  severity: AuditRisk['severity'];
  message: string;
}> = [
  // Critical: secrets/credentials in config
  { pattern: /(?:api[_-]?key|secret|token|password)\s*[:=]\s*["']?[A-Za-z0-9_\-]{20,}/i, severity: 'critical', message: 'Possible API key or secret exposed in config file' },
  { pattern: /sk-[a-zA-Z0-9]{20,}/, severity: 'critical', message: 'OpenAI API key detected in config' },
  { pattern: /sk-ant-[a-zA-Z0-9]{20,}/, severity: 'critical', message: 'Anthropic API key detected in config' },
  { pattern: /ghp_[a-zA-Z0-9]{36}/, severity: 'critical', message: 'GitHub personal access token detected' },
  { pattern: /xai-[a-zA-Z0-9]{20,}/, severity: 'critical', message: 'xAI API key detected in config' },

  // High: dangerous permissions
  { pattern: /\brm\s+(-[a-zA-Z]*r[a-zA-Z]*f|--recursive)\b/, severity: 'high', message: 'Destructive command pattern (rm -rf) referenced' },
  { pattern: /\bsudo\b/, severity: 'high', message: 'Sudo/elevated privilege referenced' },
  { pattern: /\bgit\s+push\s+(-f|--force)\b/, severity: 'high', message: 'Force push referenced' },
  { pattern: /\bchmod\s+777\b/, severity: 'high', message: 'Insecure permissions (chmod 777) referenced' },
  { pattern: /allow.*all.*tools/i, severity: 'high', message: 'Overly permissive tool access configured' },
  { pattern: /no[_-]?verify|skip[_-]?hooks/i, severity: 'high', message: 'Hook/verification bypass configured' },

  // Medium: broad permissions
  { pattern: /\bBash\(\*\)/, severity: 'medium', message: 'Unrestricted Bash access configured' },
  { pattern: /auto[_-]?approve|auto[_-]?accept/i, severity: 'medium', message: 'Auto-approval mechanism configured' },
  { pattern: /disable[_-]?safety|unsafe/i, severity: 'medium', message: 'Safety mechanisms may be disabled' },
  { pattern: /\beval\b/i, severity: 'medium', message: 'Eval usage referenced (code injection risk)' },

  // Low: informational
  { pattern: /TODO|FIXME|HACK|WORKAROUND/i, severity: 'low', message: 'Contains TODO/FIXME markers' },
  { pattern: /deprecated/i, severity: 'low', message: 'References deprecated functionality' },
];

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

async function resolveFile(
  basePath: string,
  candidates: string[],
): Promise<{ path: string; stat: Awaited<ReturnType<typeof fsp.stat>> } | null> {
  for (const rel of candidates) {
    const full = path.join(basePath, rel);
    try {
      const stat = await fsp.stat(full);
      if (stat.isFile()) return { path: full, stat };
    } catch {
      // not found, try next
    }
  }
  return null;
}

function auditContent(content: string, format: string): ConfigAudit {
  const risks: AuditRisk[] = [];
  const warnings: string[] = [];
  const info: string[] = [];

  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const { pattern, severity, message } of AUDIT_PATTERNS) {
      if (pattern.test(line)) {
        risks.push({ severity, message, line: i + 1 });
      }
    }
  }

  // Format-specific checks
  if (format === 'json') {
    try {
      JSON.parse(content);
    } catch {
      warnings.push('Invalid JSON syntax');
    }
  }

  // Size warnings
  if (content.length > 50_000) {
    warnings.push(`Large config file (${(content.length / 1024).toFixed(0)}KB) — may slow down AI context loading`);
  }

  if (lines.length > 500) {
    info.push(`${lines.length} lines — consider splitting into focused sections`);
  }

  if (risks.length === 0 && warnings.length === 0) {
    info.push('No security issues detected');
  }

  return { risks, warnings, info };
}

/**
 * Discover all known agent config files, checking both project and user scope.
 */
export async function discoverConfigs(includeContent = false): Promise<AgentConfigFile[]> {
  const projectRoot = PATHS.projectRoot || process.cwd();
  const homeDir = os.homedir();
  const results: AgentConfigFile[] = [];

  for (const def of CONFIG_DEFS) {
    const basePath = def.scope === 'project' ? projectRoot : homeDir;
    const resolved = await resolveFile(basePath, def.paths);

    const entry: AgentConfigFile = {
      id: def.id,
      name: def.name,
      tool: def.tool,
      format: def.format,
      scope: def.scope,
      path: resolved?.path || path.join(basePath, def.paths[0]),
      exists: !!resolved,
      sizeBytes: Number(resolved?.stat.size || 0),
      lastModified: resolved?.stat.mtime.toISOString() || null,
    };

    if (includeContent && resolved) {
      try {
        entry.content = await fsp.readFile(resolved.path, 'utf-8');
        entry.audit = auditContent(entry.content, def.format);
      } catch {
        // read error
      }
    }

    results.push(entry);
  }

  return results;
}

/**
 * Get a single config file by ID with content and audit.
 */
export async function getConfigById(id: string): Promise<AgentConfigFile | null> {
  const all = await discoverConfigs(true);
  return all.find((c) => c.id === id) || null;
}

/**
 * Save content to a config file. Creates parent directories if needed.
 * Returns the updated config with fresh audit.
 */
export async function saveConfig(id: string, content: string): Promise<AgentConfigFile> {
  const def = CONFIG_DEFS.find((d) => d.id === id);
  if (!def) throw new Error(`Unknown config id: ${id}`);

  const projectRoot = PATHS.projectRoot || process.cwd();
  const homeDir = os.homedir();
  const basePath = def.scope === 'project' ? projectRoot : homeDir;

  // Try to find existing file first, otherwise use the first candidate path
  const resolved = await resolveFile(basePath, def.paths);
  const targetPath = resolved?.path || path.join(basePath, def.paths[0]);

  // Ensure parent directory exists
  await fsp.mkdir(path.dirname(targetPath), { recursive: true });

  // Write the file
  await fsp.writeFile(targetPath, content, 'utf-8');

  // Return updated config with fresh audit
  const stat = await fsp.stat(targetPath);
  return {
    id: def.id,
    name: def.name,
    tool: def.tool,
    format: def.format,
    scope: def.scope,
    path: targetPath,
    exists: true,
    sizeBytes: Number(stat.size),
    lastModified: stat.mtime.toISOString(),
    content,
    audit: auditContent(content, def.format),
  };
}

/**
 * Run audit across all discovered configs and return summary.
 */
export async function auditAllConfigs(): Promise<{
  configs: AgentConfigFile[];
  summary: {
    total: number;
    found: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    warnings: number;
  };
}> {
  const configs = await discoverConfigs(true);
  const found = configs.filter((c) => c.exists);

  let critical = 0;
  let high = 0;
  let medium = 0;
  let low = 0;
  let warnings = 0;

  for (const config of found) {
    if (config.audit) {
      for (const risk of config.audit.risks) {
        switch (risk.severity) {
          case 'critical': critical++; break;
          case 'high': high++; break;
          case 'medium': medium++; break;
          case 'low': low++; break;
        }
      }
      warnings += config.audit.warnings.length;
    }
  }

  return {
    configs,
    summary: {
      total: configs.length,
      found: found.length,
      critical,
      high,
      medium,
      low,
      warnings,
    },
  };
}
