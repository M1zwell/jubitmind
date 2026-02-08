export type RiskLevel = 'critical' | 'high' | 'medium' | 'low';

export interface RiskScore {
  level: RiskLevel;
  score: number;
  reasons: string[];
}

export interface ToolUseDetail {
  toolName: string;
  toolId: string;
  riskLevel: RiskLevel;
  riskScore: number;
  reason: string;
  inputSummary: string;
}

export interface MessageRiskAssessment {
  messageIndex: number;
  risk: RiskScore;
  toolUses: ToolUseDetail[];
}

export interface SessionRiskSummary {
  maxRisk: RiskLevel;
  maxScore: number;
  totalToolUses: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  topRisks: string[];
}

// --- Pattern definitions ---

const CRITICAL_BASH_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\brm\s+(-[a-zA-Z]*r[a-zA-Z]*f|--recursive)\b/, label: 'rm -rf' },
  { pattern: /\bsudo\b/, label: 'sudo' },
  { pattern: /\bgit\s+push\s+(-f|--force)\b/, label: 'git push --force' },
  { pattern: /\bDROP\s+(TABLE|DATABASE|SCHEMA)\b/i, label: 'DROP TABLE/DATABASE' },
  { pattern: /\bTRUNCATE\s+TABLE\b/i, label: 'TRUNCATE TABLE' },
  { pattern: /\bkill\s+-9\b/, label: 'kill -9' },
  { pattern: /\bgit\s+reset\s+--hard\b/, label: 'git reset --hard' },
  { pattern: /\bgit\s+clean\s+-[a-zA-Z]*f/, label: 'git clean -f' },
  { pattern: /\bchmod\s+777\b/, label: 'chmod 777' },
  { pattern: /\bmkfs\b/, label: 'mkfs' },
  { pattern: /\bdd\s+if=/, label: 'dd' },
  { pattern: /\bformat\s+[a-zA-Z]:/i, label: 'format drive' },
];

const CRITICAL_FILE_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\.env($|\.)/, label: '.env file' },
  { pattern: /credentials/i, label: 'credentials file' },
  { pattern: /\/etc\//, label: '/etc/ system config' },
  { pattern: /\.pem$/, label: 'PEM certificate' },
  { pattern: /\.key$/, label: 'private key' },
  { pattern: /id_rsa/, label: 'SSH key' },
  { pattern: /\.ssh\//, label: '.ssh directory' },
  { pattern: /password/i, label: 'password file' },
  { pattern: /secret/i, label: 'secrets file' },
  { pattern: /\.kube\/config/, label: 'kube config' },
  { pattern: /aws\/credentials/, label: 'AWS credentials' },
];

const HIGH_BASH_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bgit\s+push\b/, label: 'git push' },
  { pattern: /\bnpm\s+publish\b/, label: 'npm publish' },
  { pattern: /\bdocker\b/, label: 'docker' },
  { pattern: /\bcurl\s+/, label: 'curl' },
  { pattern: /\bwget\s+/, label: 'wget' },
  { pattern: /\bssh\s+/, label: 'ssh' },
  { pattern: /\bscp\s+/, label: 'scp' },
  { pattern: /\brsync\b/, label: 'rsync' },
  { pattern: /\bnpm\s+install\s+-g\b/, label: 'npm install -g' },
];

const MEDIUM_BASH_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bgit\s+commit\b/, label: 'git commit' },
  { pattern: /\bnpm\s+(install|run|build)\b/, label: 'npm command' },
  { pattern: /\bmake\b/, label: 'make' },
  { pattern: /\bcargo\s+build\b/, label: 'cargo build' },
];

// --- Scoring functions ---

function scoreBashCommand(command: string): { score: number; reason: string } {
  for (const { pattern, label } of CRITICAL_BASH_PATTERNS) {
    if (pattern.test(command)) return { score: 4, reason: `Destructive: ${label}` };
  }
  for (const { pattern, label } of HIGH_BASH_PATTERNS) {
    if (pattern.test(command)) return { score: 3, reason: `External: ${label}` };
  }
  for (const { pattern, label } of MEDIUM_BASH_PATTERNS) {
    if (pattern.test(command)) return { score: 2, reason: `Build: ${label}` };
  }
  return { score: 2, reason: 'System command' };
}

function scoreFilePath(filePath: string): { score: number; reason: string } {
  for (const { pattern, label } of CRITICAL_FILE_PATTERNS) {
    if (pattern.test(filePath)) return { score: 4, reason: `Sensitive: ${label}` };
  }
  return { score: 2, reason: 'File modification' };
}

function riskLevelFromScore(score: number): RiskLevel {
  if (score >= 4) return 'critical';
  if (score >= 3) return 'high';
  if (score >= 2) return 'medium';
  return 'low';
}

export function scoreToolUseBlock(block: {
  type: string;
  name?: string;
  id?: string;
  input?: Record<string, unknown>;
}): ToolUseDetail {
  const name = block.name || 'unknown';
  const id = block.id || '';
  const input = (block.input || {}) as Record<string, unknown>;

  let score: number;
  let reason: string;
  let inputSummary: string;

  switch (name) {
    case 'Bash': {
      const cmd = String(input.command || '');
      const result = scoreBashCommand(cmd);
      score = result.score;
      reason = result.reason;
      inputSummary = cmd.length > 100 ? cmd.slice(0, 100) + '...' : cmd;
      break;
    }
    case 'Write':
    case 'Edit': {
      const fp = String(input.file_path || '');
      const result = scoreFilePath(fp);
      score = result.score;
      reason = result.reason;
      inputSummary = `${name}: ${fp}`;
      break;
    }
    case 'Read':
    case 'Glob':
    case 'Grep': {
      score = 1;
      reason = 'Read-only operation';
      inputSummary = `${name}: ${String(input.file_path || input.pattern || input.path || '')}`;
      break;
    }
    case 'WebFetch':
    case 'WebSearch': {
      score = 3;
      reason = 'External web access';
      inputSummary = `${name}: ${String(input.url || input.query || '')}`;
      break;
    }
    case 'Task':
    case 'TaskCreate': {
      score = 2;
      reason = 'Subagent/task operation';
      inputSummary = `${name}: ${String(input.description || input.prompt || '').slice(0, 80)}`;
      break;
    }
    default: {
      if (name.startsWith('mcp__')) {
        score = 3;
        const parts = name.split('__');
        reason = `MCP: ${parts[1] || name}`;
        inputSummary = `${parts.slice(1).join(' > ')}`;
      } else {
        score = 2;
        reason = `Tool: ${name}`;
        inputSummary = name;
      }
    }
  }

  return {
    toolName: name,
    toolId: id,
    riskLevel: riskLevelFromScore(score),
    riskScore: score,
    reason,
    inputSummary,
  };
}

export function scoreMessageContent(
  content: unknown,
  messageIndex: number,
): MessageRiskAssessment {
  const toolUses: ToolUseDetail[] = [];

  if (Array.isArray(content)) {
    for (const block of content) {
      if (block && typeof block === 'object' && block.type === 'tool_use') {
        toolUses.push(scoreToolUseBlock(block));
      }
    }
  }

  if (toolUses.length === 0) {
    return {
      messageIndex,
      risk: { level: 'low', score: 1, reasons: [] },
      toolUses: [],
    };
  }

  const maxScore = Math.max(...toolUses.map((t) => t.riskScore));
  const reasons = toolUses
    .filter((t) => t.riskScore >= 3)
    .map((t) => t.reason);

  return {
    messageIndex,
    risk: {
      level: riskLevelFromScore(maxScore),
      score: maxScore,
      reasons,
    },
    toolUses,
  };
}

export function computeSessionRisk(
  assessments: MessageRiskAssessment[],
): SessionRiskSummary {
  let maxScore = 1;
  let totalToolUses = 0;
  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;
  const allReasons: string[] = [];

  for (const a of assessments) {
    for (const t of a.toolUses) {
      totalToolUses++;
      if (t.riskScore > maxScore) maxScore = t.riskScore;
      switch (t.riskLevel) {
        case 'critical': criticalCount++; break;
        case 'high': highCount++; break;
        case 'medium': mediumCount++; break;
        case 'low': lowCount++; break;
      }
      if (t.riskScore >= 3) allReasons.push(t.reason);
    }
  }

  // Deduplicate and take top 5 reasons
  const topRisks = [...new Set(allReasons)].slice(0, 5);

  return {
    maxRisk: riskLevelFromScore(maxScore),
    maxScore,
    totalToolUses,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    topRisks,
  };
}
