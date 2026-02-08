export interface McpServer {
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  source: 'mcp-config' | 'settings-local';
  scope?: 'local' | 'user' | 'project';
  status?: 'connected' | 'failed' | 'unknown';
}

export interface Permission {
  raw: string;
  category: 'bash' | 'mcp' | 'web' | 'filesystem' | 'skill' | 'other';
  tool: string;
  pattern?: string;
  hasSecret: boolean;
}

export interface Skill {
  name: string;
  displayName?: string;
  description?: string;
  version?: string;
  path: string;
  content?: string;
  metadata?: Record<string, unknown>;
}

export interface CommandFile {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: CommandFile[];
}

export interface MemoryProject {
  name: string;
  path: string;
  hasMemory: boolean;
}

export interface SystemHealth {
  cliVersion: string;
  nodeVersion: string;
  platform: string;
  projectRoot: string;
  claudeDir: string;
}

export interface CliRunRequest {
  prompt: string;
  model?: string;
  allowedTools?: string[];
  sessionId?: string;
  continueSession?: boolean;
}

export interface CliRunResponse {
  type: string;
  subtype: string;
  is_error: boolean;
  result: string;
  session_id: string;
  total_cost_usd: number;
  duration_ms: number;
  usage?: Record<string, unknown>;
}

export interface StreamMessage {
  type: string;
  subtype?: string;
  content?: string;
  result?: string;
  session_id?: string;
  timestamp: number;
}

export interface PluginInfo {
  name: string;
  enabled: boolean;
  version?: string;
  description?: string;
}

// --- AI Providers ---

export interface ProviderModel {
  id: string;
  name: string;
  contextWindow?: number;
  maxTokens?: number;
}

export interface AiProvider {
  id: string;
  name: string;
  apiBase: string;
  apiKey: string;
  _hasKey?: boolean;
  models: ProviderModel[];
  enabled: boolean;
  autoDiscover?: boolean;
}

export interface ProviderTestResult {
  ok: boolean;
  latencyMs: number;
  error?: string;
}

// --- Conversation History ---

export interface ConversationMessage {
  type: 'user' | 'assistant' | 'system';
  message: { role: string; content: string | ContentBlock[] };
  sessionId: string;
  timestamp: string;
  uuid: string;
  parentUuid?: string;
  cwd?: string;
  gitBranch?: string;
  metadata?: {
    mode?: 'claude-cli' | 'ai-chat';
    model?: string;
    providerId?: string;
    temperature?: number;
    usage?: Record<string, unknown>;
  };
}

export interface ContentBlock {
  type: string;
  text?: string;
  name?: string;
  input?: Record<string, unknown>;
  content?: string | ContentBlock[];
  tool_use_id?: string;
}

export interface SessionMeta {
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  mode: 'claude-cli' | 'ai-chat';
  model?: string;
  providerId?: string;
  preview: string;
  source: 'dashboard' | 'claude-code' | 'cloud';
  projectSlug?: string;
  projectDisplayName?: string;
  sizeBytes?: number;
  riskLevel?: RiskLevel;
  riskScore?: number;
  autoTags?: string[];
  manualTags?: string[];
}

// --- Projects ---

export interface ProjectInfo {
  slug: string;
  displayName: string;
  fullPath: string;
  originalPath: string;
  sessionCount: number;
  totalSizeBytes: number;
  lastActivity: string;
}

// --- Risk Scoring ---

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low';

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
  risk: { level: RiskLevel; score: number; reasons: string[] };
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

export interface AutoTag {
  name: string;
  category: 'technical' | 'sensitivity' | 'operational';
  confidence: number;
}

export interface SessionTags {
  autoTags: AutoTag[];
  manualTags: string[];
  computedAt: string;
}
