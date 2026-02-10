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
  classification?: SessionClassification;
}

// --- Session Classification ---

export interface ModelUsageInfo {
  modelId: string;
  modelFamily: string;
  messageCount: number;
  inputTokens: number;
  outputTokens: number;
}

export interface ToolUsageInfo {
  toolName: string;
  count: number;
  riskTier: RiskLevel;
}

export interface MessageBreakdown {
  userPrompts: number;
  assistantText: number;
  thinkingBlocks: number;
  toolUseBlocks: number;
  toolResultBlocks: number;
  totalMessages: number;
}

export interface SessionClassification {
  modelsUsed: ModelUsageInfo[];
  toolsUsed: ToolUsageInfo[];
  messageBreakdown: MessageBreakdown;
  dominantCategory: 'prompt-heavy' | 'tool-heavy' | 'planning-heavy' | 'balanced';
  hasThinking: boolean;
  hasToolUse: boolean;
  classifiedAt: string;
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

// --- Unified Archives ---

export type ProductType = 'chat' | 'chatab' | 'chatlab' | 'chatlab-agent' | 'theater' | 'unknown';
export type VisibilityType = 'private' | 'public' | 'shared';

export interface EngagementSignals {
  cost_cents?: number;
  response_time_ms?: number;
  token_count?: number;
  dwell_ms?: number;
  scroll_depth?: number;
  copied?: boolean;
  [key: string]: unknown;
}

export interface ArenaMetadata {
  battle_id?: string;
  task_type?: string;
  models_compared?: string[];
  winner_model?: string;
  vote_type?: string;
  engagement_signals?: Record<string, EngagementSignals>;
}

export interface UnifiedArchiveItem {
  id: string;
  source: 'supabase-room' | 'supabase-chat' | 'local-claude';
  title: string;
  preview: string;
  messageCount: number;
  participants?: string[];
  models?: string[];
  createdAt: string;
  endedAt?: string;
  riskLevel?: RiskLevel;
  riskScore?: number;
  upvotes?: number;
  tags?: string[];
  userId?: string;
  project?: string;
  productType?: ProductType;
  visibility?: VisibilityType;
  arenaMetadata?: ArenaMetadata;
  summary?: string;
}

export interface ArchiveListResponse {
  items: UnifiedArchiveItem[];
  total: number;
  offset: number;
  limit: number;
}

export interface ArchiveStats {
  local: { sessions: number };
  supabase: { rooms: number; chats: number; byType?: Record<string, number> };
}

export interface AnalyticsData {
  modelUsage: Record<string, number>;
  typeDistribution: Record<string, number>;
  activityTimeline: Array<{ date: string; count: number }>;
  riskDistribution: { critical: number; high: number; medium: number; low: number };
  costEstimate: { totalCents: number; arenaCount: number };
  topModels: Array<{ model: string; wins: number; appearances: number }>;
  totalArchives: number;
  totalLocal: number;
}

// --- Session Analysis ---

export type AnalysisMode = 'summary' | 'security' | 'quality' | 'patterns' | 'custom';

export interface AnalysisChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
}

export interface AnalysisPrepareResult {
  sessionId: string;
  messageCount: number;
  estimatedTokens: number;
  preview: string;
  truncated: boolean;
}

// --- Interaction Explorer ---

export interface IndexedInteraction {
  id: string;
  sessionId: string;
  projectSlug: string;
  projectDisplayName: string;
  timestamp: string;
  category: 'user-prompt' | 'assistant-text' | 'thinking' | 'tool-use' | 'tool-result';
  toolName?: string;
  toolRiskTier?: RiskLevel;
  modelFamily?: string;
  preview: string;
}

export interface InteractionQueryResult {
  items: IndexedInteraction[];
  total: number;
  facets: {
    byCategory: Record<string, number>;
    byTool: Record<string, number>;
    byModel: Record<string, number>;
    byRiskTier: Record<string, number>;
  };
}

export interface ExplorerFacets {
  categories: Array<{ name: string; count: number }>;
  tools: Array<{ name: string; count: number }>;
  models: Array<{ name: string; count: number }>;
  riskTiers: Array<{ name: string; count: number }>;
  projects: Array<{ slug: string; displayName: string; count: number }>;
}

// --- Insights ---

export interface InsightReport {
  id: string;
  timestamp: string;
  type: 'scheduled' | 'on-demand';
  duration_ms: number;
  promptPatterns: {
    commonThemes: Array<{ theme: string; frequency: number; examples: string[] }>;
    recurringRequests: Array<{ pattern: string; count: number }>;
    avgPromptLength: number;
  };
  toolUsageTrends: {
    mostUsedTools: Array<{ tool: string; count: number; riskExposure: number }>;
    toolUsageOverTime: Array<{ date: string; toolCounts: Record<string, number> }>;
    riskExposureTrend: Array<{ date: string; criticalCount: number; highCount: number }>;
  };
  modelComparison: {
    modelsUsed: Array<{ model: string; sessionCount: number; totalTokens: number }>;
    costByModel: Array<{ model: string; estimatedCost: number }>;
  };
  recommendations: string[];
  aiSummary?: string;
}

// --- Auditor ---

export interface AuditReport {
  id: string;
  timestamp: string;
  type: 'scheduled' | 'emergency';
  duration_ms: number;
  security: {
    criticalFindings: number;
    highFindings: number;
    sessionsScanned: number;
    topRisks: Array<{ sessionId: string; risk: string; detail: string }>;
    newSinceLastAudit: number;
  };
  performance: {
    totalSessions: number;
    totalSizeBytes: number;
    largestSession: { id: string; sizeBytes: number };
    avgSessionSizeBytes: number;
    sessionsOver10MB: number;
  };
  billing: {
    estimatedCostUsd: number;
    costChangePercent: number;
    topModels: Array<{ model: string; tokens: number }>;
    alert: boolean;
    alertReason?: string;
  };
  recommendations: string[];
}
