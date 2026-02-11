import { getAuthToken } from '@/hooks/useAuth';

const BASE = '/api';

function buildHeaders(includeAuth = false): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (includeAuth) {
    const token = getAuthToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

async function authRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = buildHeaders(true);
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { ...headers, ...(options?.headers as Record<string, string> || {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  // System
  health: () => request<Record<string, unknown>>('/system/health'),
  cliVersion: () => request<{ version: string }>('/cli/version'),
  cliDoctor: () => request<{ output: string }>('/cli/doctor'),
  plugins: () => request<{ plugins: unknown[] }>('/plugins/list'),

  // CLI
  cliRun: (body: { prompt: string; model?: string }) =>
    request<Record<string, unknown>>('/cli/run', { method: 'POST', body: JSON.stringify(body) }),
  cliCancel: () =>
    request<{ ok: boolean }>('/cli/cancel', { method: 'POST' }),

  // MCP
  mcpServers: () => request<{ servers: unknown[] }>('/mcp/servers'),
  mcpAdd: (body: Record<string, unknown>) =>
    request<{ ok: boolean }>('/mcp/add', { method: 'POST', body: JSON.stringify(body) }),
  mcpRemove: (name: string) =>
    request<{ ok: boolean }>(`/mcp/${name}`, { method: 'DELETE' }),
  mcpTest: (name: string) =>
    request<{ status: string; message?: string }>(`/mcp/${name}/test`, { method: 'POST' }),

  // Config
  settings: () => request<{ content: string }>('/config/settings'),
  saveSettings: (content: string) =>
    request<{ ok: boolean }>('/config/settings', { method: 'PUT', body: JSON.stringify({ content }) }),
  claudeMd: () => request<{ content: string }>('/config/claude-md'),
  saveClaudeMd: (content: string) =>
    request<{ ok: boolean }>('/config/claude-md', { method: 'PUT', body: JSON.stringify({ content }) }),
  permissions: () => request<{ permissions: unknown[] }>('/config/permissions'),

  // Skills & Commands
  skills: () => request<{ skills: unknown[] }>('/skills/list'),
  skill: (name: string) => request<{ skill: unknown }>(`/skills/${name}`),
  commandTree: () => request<{ tree: unknown[] }>('/commands/tree'),
  commandContent: (path: string) => request<{ content: string }>(`/commands/${path}`),

  // Memory
  memoryProjects: () => request<{ projects: unknown[] }>('/memory/projects'),
  memoryContent: (project: string) => request<{ content: string }>(`/memory/${encodeURIComponent(project)}`),
  saveMemory: (project: string, content: string) =>
    request<{ ok: boolean }>(`/memory/${encodeURIComponent(project)}`, { method: 'PUT', body: JSON.stringify({ content }) }),

  // Providers
  providers: () => request<{ providers: unknown[] }>('/providers'),
  addProvider: (body: Record<string, unknown>) =>
    request<{ ok: boolean }>('/providers', { method: 'POST', body: JSON.stringify(body) }),
  updateProvider: (id: string, body: Record<string, unknown>) =>
    request<{ ok: boolean }>(`/providers/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteProvider: (id: string) =>
    request<{ ok: boolean }>(`/providers/${id}`, { method: 'DELETE' }),
  testProvider: (id: string) =>
    request<{ ok: boolean; latencyMs: number; error?: string }>(`/providers/${id}/test`, { method: 'POST' }),
  discoverModels: (id: string) =>
    request<{ models: unknown[]; count: number }>(`/providers/${id}/discover`, { method: 'POST' }),
  providerChatCancel: () =>
    request<{ ok: boolean }>('/providers/chat/cancel', { method: 'POST' }),

  // Projects
  projects: () =>
    request<{ projects: import('./types').ProjectInfo[] }>('/conversations/projects'),

  // Conversations
  conversationSessions: (params?: {
    source?: string; project?: string; limit?: number; minRisk?: string; tags?: string[];
    model?: string[]; tools?: string[]; category?: string; hasThinking?: boolean;
  }) => {
    const query = new URLSearchParams();
    if (params?.source) query.set('source', params.source);
    if (params?.project) query.set('project', params.project);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.minRisk) query.set('minRisk', params.minRisk);
    if (params?.tags?.length) query.set('tags', params.tags.join(','));
    if (params?.model?.length) query.set('model', params.model.join(','));
    if (params?.tools?.length) query.set('tools', params.tools.join(','));
    if (params?.category) query.set('category', params.category);
    if (params?.hasThinking) query.set('hasThinking', 'true');
    return request<{ sessions: unknown[]; total: number }>(`/conversations/sessions?${query}`);
  },
  conversationFacets: () =>
    request<{
      models: Array<{ family: string; count: number }>;
      tools: Array<{ name: string; count: number }>;
      categories: Array<{ name: string; count: number }>;
      thinkingSessions: number;
    }>('/conversations/facets'),
  classificationStatus: () =>
    request<{ total: number; classified: number; pending: number; running: boolean }>('/conversations/classification-status'),
  conversationMessages: (sessionId: string, offset = 0, limit = 50, project?: string) => {
    const params = new URLSearchParams({
      offset: String(offset),
      limit: String(limit),
    });
    if (project) params.set('project', project);
    return request<{ messages: unknown[]; offset: number; limit: number; hasMore: boolean }>(
      `/conversations/sessions/${sessionId}/messages?${params}`,
    );
  },
  deleteConversation: (sessionId: string) =>
    request<{ ok: boolean }>(`/conversations/sessions/${sessionId}`, { method: 'DELETE' }),
  globalHistory: () =>
    request<{ history: Array<{ display: string; timestamp: number; project: string }> }>('/conversations/history'),
  conversationStats: () =>
    request<{ stats: Record<string, unknown> | null }>('/conversations/stats'),

  // Risk & Tags
  sessionRisk: (sessionId: string, project?: string) => {
    const params = new URLSearchParams();
    if (project) params.set('project', project);
    return request<{
      risk: import('./types').SessionRiskSummary;
      tags: import('./types').SessionTags;
      messages: import('./types').MessageRiskAssessment[];
    }>(`/conversations/sessions/${sessionId}/risk?${params}`);
  },
  addSessionTag: (sessionId: string, tag: string, project?: string) => {
    const params = new URLSearchParams();
    if (project) params.set('project', project);
    return request<{ ok: boolean; tags: import('./types').SessionTags }>(
      `/conversations/sessions/${sessionId}/tags?${params}`,
      { method: 'POST', body: JSON.stringify({ tag }) },
    );
  },
  removeSessionTag: (sessionId: string, tag: string, project?: string) => {
    const params = new URLSearchParams();
    if (project) params.set('project', project);
    return request<{ ok: boolean; tags: import('./types').SessionTags }>(
      `/conversations/sessions/${sessionId}/tags/${encodeURIComponent(tag)}?${params}`,
      { method: 'DELETE' },
    );
  },
  allTags: () =>
    request<{ tags: string[]; autoTagNames: string[] }>('/conversations/tags'),

  // Cloud sync
  cloudImport: (data: { conversations: unknown[] }) =>
    request<{ imported: number; sessionIds: string[] }>('/conversations/cloud/import', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  cloudExport: (sessionId: string, project?: string) => {
    const params = new URLSearchParams({ sessionId });
    if (project) params.set('project', project);
    return request<{ session: unknown }>(`/conversations/cloud/export?${params}`);
  },

  // Analysis
  analysisPrepare: (body: { sessionId: string; projectSlug?: string }) =>
    request<import('./types').AnalysisPrepareResult>('/analysis/prepare', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  analysisModels: () =>
    request<{ providers: Array<{ id: string; name: string; models: import('./types').ProviderModel[] }> }>('/analysis/models'),
  analysisCancel: () =>
    request<{ ok: boolean }>('/analysis/stream/cancel', { method: 'POST' }),

  // Adapters (AI tool monitoring)
  adapters: {
    list: () => request<import('@/hooks/useUnifiedStats').AdapterInfo[]>('/adapters'),
    sessions: (adapterId: string, options?: { limit?: number; offset?: number; project?: string }) => {
      const query = new URLSearchParams();
      if (options?.limit) query.set('limit', String(options.limit));
      if (options?.offset) query.set('offset', String(options.offset));
      if (options?.project) query.set('project', options.project);
      return request<{ sessions: unknown[]; available: boolean }>(`/adapters/${adapterId}/sessions?${query}`);
    },
    stats: (adapterId: string) =>
      request<{ stats: unknown; available: boolean }>(`/adapters/${adapterId}/stats`),
    unifiedStats: () =>
      request<import('@/hooks/useUnifiedStats').UnifiedStatsData>('/adapters/stats/unified'),
  },

  // LiteLLM proxy
  litellm: {
    models: () => request<{ models: unknown[]; count: number }>('/litellm/models'),
    modelsByProvider: () => request<{ providers: unknown[] }>('/litellm/models/by-provider'),
    spend: () => request<{ spend: unknown; dbConfigured: boolean }>('/litellm/spend'),
    config: () => request<{ available: boolean; totalModels?: number; providers?: string[] }>('/litellm/config'),
  },

  // Auditor
  auditor: {
    status: () => request<{ running: boolean; lastAudit: string | null; criticalFindings: number; highFindings: number; billingAlert: boolean }>('/auditor/status'),
    latest: () => request<{ report: import('./types').AuditReport | null }>('/auditor/reports/latest'),
    history: (limit?: number) => {
      const query = limit ? `?limit=${limit}` : '';
      return request<{ reports: import('./types').AuditReport[]; count: number }>(`/auditor/reports${query}`);
    },
    run: () => request<{ report: import('./types').AuditReport }>('/auditor/run', { method: 'POST' }),
  },

  // Agent Configs
  agentConfigs: {
    list: () => request<{ configs: unknown[] }>('/agent-configs'),
    audit: () => request<{ configs: unknown[]; summary: unknown }>('/agent-configs/audit'),
    get: (id: string) => request<{ config: unknown }>(`/agent-configs/${id}`),
    save: (id: string, content: string) =>
      request<{ ok: boolean; config: unknown }>(`/agent-configs/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ content }),
      }),
  },

  // Explorer (cross-session interaction browsing)
  explorer: {
    interactions: (params?: {
      category?: string; toolName?: string; toolRiskTier?: string;
      modelFamily?: string; projectSlug?: string;
      dateFrom?: string; dateTo?: string; search?: string;
      limit?: number; offset?: number; sortBy?: string; sortOrder?: string;
    }) => {
      const query = new URLSearchParams();
      if (params?.category) query.set('category', params.category);
      if (params?.toolName) query.set('toolName', params.toolName);
      if (params?.toolRiskTier) query.set('toolRiskTier', params.toolRiskTier);
      if (params?.modelFamily) query.set('modelFamily', params.modelFamily);
      if (params?.projectSlug) query.set('projectSlug', params.projectSlug);
      if (params?.dateFrom) query.set('dateFrom', params.dateFrom);
      if (params?.dateTo) query.set('dateTo', params.dateTo);
      if (params?.search) query.set('search', params.search);
      if (params?.limit) query.set('limit', String(params.limit));
      if (params?.offset) query.set('offset', String(params.offset));
      if (params?.sortBy) query.set('sortBy', params.sortBy);
      if (params?.sortOrder) query.set('sortOrder', params.sortOrder);
      return request<import('./types').InteractionQueryResult>(`/explorer/interactions?${query}`);
    },
    interactionContent: (id: string) =>
      request<{ content: string; sessionId: string; projectSlug: string }>(`/explorer/interactions/${encodeURIComponent(id)}/content`),
    facets: () =>
      request<import('./types').ExplorerFacets>('/explorer/facets'),
  },

  // Extractions (LangExtract sidecar)
  extractions: {
    status: () => request<import('./types').SidecarStatus>('/extractions/status'),
    schemas: () => request<{ schemas: import('./types').ExtractionSchema[] }>('/extractions/schemas'),
    providers: () => request<{ providers: import('./types').ProviderPreset[] }>('/extractions/providers'),
    config: () => request<import('./types').SidecarConfig>('/extractions/config'),
    updateConfig: (body: Partial<import('./types').SidecarConfig>) =>
      request<{ ok: boolean }>('/extractions/config', { method: 'POST', body: JSON.stringify(body) }),
    run: (body: { sessionId: string; schemaName: string; projectSlug?: string; modelId?: string; extractionPasses?: number }) =>
      request<{ result: import('./types').ExtractionResult }>('/extractions/run', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    results: (sessionId: string) =>
      request<{ results: import('./types').ExtractionResult[] }>(`/extractions/results/${sessionId}`),
    allResults: (params?: { limit?: number; offset?: number }) => {
      const query = new URLSearchParams();
      if (params?.limit) query.set('limit', String(params.limit));
      if (params?.offset) query.set('offset', String(params.offset));
      return request<{ results: import('./types').ExtractionResult[]; total: number }>(`/extractions/results?${query}`);
    },
    visualizeUrl: (resultId: string) => `/api/extractions/visualize/${resultId}`,
  },

  // Insights (cross-session AI-powered analysis)
  insights: {
    status: () => request<{ running: boolean; lastInsight: string | null }>('/insights/status'),
    latest: () => request<{ report: import('./types').InsightReport | null }>('/insights/reports/latest'),
    history: (limit?: number) => {
      const query = limit ? `?limit=${limit}` : '';
      return request<{ reports: import('./types').InsightReport[]; count: number }>(`/insights/reports${query}`);
    },
    run: () => request<{ report: import('./types').InsightReport }>('/insights/run', { method: 'POST' }),
  },

  // Combined Reports
  reports: {
    generate: () => request<{ report: import('./types').CombinedReport }>('/reports/generate', { method: 'POST' }),
    latest: () => request<{ report: import('./types').CombinedReport | null }>('/reports/latest'),
    history: (limit?: number) => {
      const query = limit ? `?limit=${limit}` : '';
      return request<{ reports: import('./types').CombinedReport[]; count: number }>(`/reports/history${query}`);
    },
    exportUrl: (format: 'pdf' | 'md') => `/api/reports/export?format=${format}`,
  },

  // Archives (unified Supabase + local)
  archives: {
    list: (params?: { source?: string; search?: string; limit?: number; offset?: number; productType?: string; visibility?: string }) => {
      const query = new URLSearchParams();
      if (params?.source) query.set('source', params.source);
      if (params?.search) query.set('search', params.search);
      if (params?.limit) query.set('limit', String(params.limit));
      if (params?.offset) query.set('offset', String(params.offset));
      if (params?.productType) query.set('productType', params.productType);
      if (params?.visibility) query.set('visibility', params.visibility);
      return authRequest<import('./types').ArchiveListResponse>(`/archives?${query}`);
    },
    get: (id: string, source?: string) => {
      const query = source ? `?source=${source}` : '';
      return authRequest<{ item: import('./types').UnifiedArchiveItem; messages?: unknown[]; participants?: unknown[] }>(`/archives/${id}${query}`);
    },
    stats: () => authRequest<{ stats: import('./types').ArchiveStats }>('/archives/stats'),
    delete: (id: string, source: string) =>
      authRequest<{ ok: boolean }>(`/archives/${id}?source=${source}`, { method: 'DELETE' }),
    analytics: () => authRequest<{ analytics: import('./types').AnalyticsData }>('/archives/analytics'),
    export: async (id: string, source: string) => {
      const headers = buildHeaders(true);
      const res = await fetch(`${BASE}/archives/${id}/export?source=${source}`, { headers });
      if (!res.ok) throw new Error('Export failed');
      return res.json();
    },
  },
};
