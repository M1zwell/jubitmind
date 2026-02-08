const BASE = '/api';

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
  conversationSessions: (params?: { source?: string; project?: string; limit?: number; minRisk?: string; tags?: string[] }) => {
    const query = new URLSearchParams();
    if (params?.source) query.set('source', params.source);
    if (params?.project) query.set('project', params.project);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.minRisk) query.set('minRisk', params.minRisk);
    if (params?.tags?.length) query.set('tags', params.tags.join(','));
    return request<{ sessions: unknown[]; total: number }>(`/conversations/sessions?${query}`);
  },
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
};
