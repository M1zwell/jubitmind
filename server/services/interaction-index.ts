import fs from 'fs';
import readline from 'readline';
import { getAllSessionsUnlimited, resolveSessionPath, type CachedSessionMeta } from './session-cache.js';
import { scoreToolUseBlock, type RiskLevel } from './risk-scorer.js';
import { deriveModelFamily } from './session-classifier.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

export interface InteractionQuery {
  category?: string;
  toolName?: string;
  toolRiskTier?: string;
  modelFamily?: string;
  projectSlug?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'riskTier';
  sortOrder?: 'asc' | 'desc';
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

// ---------------------------------------------------------------------------
// In-memory index
// ---------------------------------------------------------------------------

let interactions: IndexedInteraction[] = [];
let indexedSessionMtimes = new Map<string, number>(); // "project:sessionId" -> mtime
let building = false;

// ---------------------------------------------------------------------------
// Index building
// ---------------------------------------------------------------------------

async function indexSession(meta: CachedSessionMeta): Promise<IndexedInteraction[]> {
  const results: IndexedInteraction[] = [];
  const sessionPath = resolveSessionPath(meta.projectSlug, meta.sessionId);

  let rl: readline.Interface;
  try {
    rl = readline.createInterface({
      input: fs.createReadStream(sessionPath),
      crlfDelay: Infinity,
    });
  } catch {
    return results;
  }

  let msgIdx = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(line);
    } catch {
      continue;
    }

    const msgType = parsed.type as string | undefined;
    if (msgType !== 'user' && msgType !== 'assistant') continue;

    const timestamp = (parsed.timestamp as string) || meta.createdAt;
    const message = parsed.message as { role?: string; content?: unknown; model?: string } | undefined;

    if (msgType === 'user') {
      // Extract user prompt text
      let preview = '';
      const content = message?.content;
      if (typeof content === 'string') {
        preview = content.slice(0, 200);
      } else if (Array.isArray(content)) {
        const textBlock = content.find((b: Record<string, unknown>) => b?.type === 'text') as { text?: string } | undefined;
        preview = textBlock?.text?.slice(0, 200) || '';
      }
      if (preview) {
        results.push({
          id: `${meta.projectSlug}:${meta.sessionId}:${msgIdx}:0`,
          sessionId: meta.sessionId,
          projectSlug: meta.projectSlug,
          projectDisplayName: meta.projectDisplayName,
          timestamp,
          category: 'user-prompt',
          preview,
        });
      }
      msgIdx++;
      continue;
    }

    // Assistant message — iterate content blocks
    const modelId = (message?.model as string) || '';
    const modelFamily = modelId ? deriveModelFamily(modelId) : undefined;
    const content = message?.content;

    if (typeof content === 'string') {
      results.push({
        id: `${meta.projectSlug}:${meta.sessionId}:${msgIdx}:0`,
        sessionId: meta.sessionId,
        projectSlug: meta.projectSlug,
        projectDisplayName: meta.projectDisplayName,
        timestamp,
        category: 'assistant-text',
        modelFamily,
        preview: content.slice(0, 200),
      });
    } else if (Array.isArray(content)) {
      let blockIdx = 0;
      for (const block of content) {
        if (!block || typeof block !== 'object') continue;
        const b = block as Record<string, unknown>;
        const blockType = b.type as string;

        switch (blockType) {
          case 'text': {
            const text = (b.text as string) || '';
            if (text.length > 10) { // Skip trivial text blocks
              results.push({
                id: `${meta.projectSlug}:${meta.sessionId}:${msgIdx}:${blockIdx}`,
                sessionId: meta.sessionId,
                projectSlug: meta.projectSlug,
                projectDisplayName: meta.projectDisplayName,
                timestamp,
                category: 'assistant-text',
                modelFamily,
                preview: text.slice(0, 200),
              });
            }
            break;
          }
          case 'thinking': {
            const text = (b.text as string) || '';
            if (text.length > 10) {
              results.push({
                id: `${meta.projectSlug}:${meta.sessionId}:${msgIdx}:${blockIdx}`,
                sessionId: meta.sessionId,
                projectSlug: meta.projectSlug,
                projectDisplayName: meta.projectDisplayName,
                timestamp,
                category: 'thinking',
                modelFamily,
                preview: text.slice(0, 200),
              });
            }
            break;
          }
          case 'tool_use': {
            const toolName = (b.name as string) || 'unknown';
            const scored = scoreToolUseBlock(b as { type: string; name?: string; id?: string; input?: Record<string, unknown> });
            const input = (b.input || {}) as Record<string, unknown>;
            const inputPreview = String(
              input.command || input.file_path || input.pattern || input.query || input.url || input.prompt || toolName,
            ).slice(0, 200);

            results.push({
              id: `${meta.projectSlug}:${meta.sessionId}:${msgIdx}:${blockIdx}`,
              sessionId: meta.sessionId,
              projectSlug: meta.projectSlug,
              projectDisplayName: meta.projectDisplayName,
              timestamp,
              category: 'tool-use',
              toolName,
              toolRiskTier: scored.riskLevel,
              modelFamily,
              preview: `${toolName}: ${inputPreview}`,
            });
            break;
          }
          case 'tool_result': {
            const resultContent = typeof b.content === 'string' ? b.content : '';
            if (resultContent.length > 10) {
              results.push({
                id: `${meta.projectSlug}:${meta.sessionId}:${msgIdx}:${blockIdx}`,
                sessionId: meta.sessionId,
                projectSlug: meta.projectSlug,
                projectDisplayName: meta.projectDisplayName,
                timestamp,
                category: 'tool-result',
                modelFamily,
                preview: resultContent.slice(0, 200),
              });
            }
            break;
          }
        }
        blockIdx++;
      }
    }

    msgIdx++;
  }

  return results;
}

/**
 * Build/rebuild the interaction index from the session cache.
 * Only re-indexes sessions whose mtime has changed.
 */
export async function buildInteractionIndex(): Promise<void> {
  if (building) return;
  building = true;

  try {
    const allSessions = getAllSessionsUnlimited();
    const start = Date.now();
    let newCount = 0;

    // Find sessions that need indexing
    const toIndex: CachedSessionMeta[] = [];
    const currentKeys = new Set<string>();

    for (const session of allSessions) {
      const key = `${session.projectSlug}:${session.sessionId}`;
      currentKeys.add(key);
      const prevMtime = indexedSessionMtimes.get(key);
      if (prevMtime !== session.fileMtime) {
        toIndex.push(session);
      }
    }

    if (toIndex.length > 0) {
      // Remove stale interactions for sessions being re-indexed
      const reindexKeys = new Set(toIndex.map(s => `${s.projectSlug}:${s.sessionId}`));
      interactions = interactions.filter(
        (i) => !reindexKeys.has(`${i.projectSlug}:${i.sessionId}`),
      );

      // Index in batches of 5
      for (let i = 0; i < toIndex.length; i += 5) {
        const batch = toIndex.slice(i, i + 5);
        const results = await Promise.all(batch.map(indexSession));
        for (const sessionInteractions of results) {
          interactions.push(...sessionInteractions);
          newCount += sessionInteractions.length;
        }
      }

      // Update mtime tracking
      for (const session of toIndex) {
        indexedSessionMtimes.set(`${session.projectSlug}:${session.sessionId}`, session.fileMtime);
      }
    }

    // Remove interactions for deleted sessions
    const staleKeys = new Set<string>();
    for (const key of indexedSessionMtimes.keys()) {
      if (!currentKeys.has(key)) staleKeys.add(key);
    }
    if (staleKeys.size > 0) {
      interactions = interactions.filter(
        (i) => !staleKeys.has(`${i.projectSlug}:${i.sessionId}`),
      );
      for (const key of staleKeys) indexedSessionMtimes.delete(key);
    }

    // Sort by timestamp descending (most recent first)
    interactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (toIndex.length > 0) {
      console.log(`[explorer] Indexed ${toIndex.length} sessions (${newCount} interactions) in ${Date.now() - start}ms. Total: ${interactions.length}`);
    }
  } finally {
    building = false;
  }
}

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

const RISK_ORDER: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

export function queryInteractions(query: InteractionQuery): InteractionQueryResult {
  let filtered = interactions;

  // Apply filters
  if (query.category) {
    filtered = filtered.filter((i) => i.category === query.category);
  }
  if (query.toolName) {
    filtered = filtered.filter((i) => i.toolName === query.toolName);
  }
  if (query.toolRiskTier) {
    filtered = filtered.filter((i) => i.toolRiskTier === query.toolRiskTier);
  }
  if (query.modelFamily) {
    filtered = filtered.filter((i) => i.modelFamily === query.modelFamily);
  }
  if (query.projectSlug) {
    filtered = filtered.filter((i) => i.projectSlug === query.projectSlug);
  }
  if (query.dateFrom) {
    const from = new Date(query.dateFrom).getTime();
    filtered = filtered.filter((i) => new Date(i.timestamp).getTime() >= from);
  }
  if (query.dateTo) {
    const to = new Date(query.dateTo).getTime();
    filtered = filtered.filter((i) => new Date(i.timestamp).getTime() <= to);
  }
  if (query.search) {
    const term = query.search.toLowerCase();
    filtered = filtered.filter((i) => i.preview.toLowerCase().includes(term));
  }

  // Compute facets from filtered results
  const facets = {
    byCategory: {} as Record<string, number>,
    byTool: {} as Record<string, number>,
    byModel: {} as Record<string, number>,
    byRiskTier: {} as Record<string, number>,
  };
  for (const item of filtered) {
    facets.byCategory[item.category] = (facets.byCategory[item.category] || 0) + 1;
    if (item.toolName) facets.byTool[item.toolName] = (facets.byTool[item.toolName] || 0) + 1;
    if (item.modelFamily) facets.byModel[item.modelFamily] = (facets.byModel[item.modelFamily] || 0) + 1;
    if (item.toolRiskTier) facets.byRiskTier[item.toolRiskTier] = (facets.byRiskTier[item.toolRiskTier] || 0) + 1;
  }

  const total = filtered.length;

  // Sort
  if (query.sortBy === 'riskTier') {
    filtered = [...filtered].sort((a, b) => {
      const diff = (RISK_ORDER[b.toolRiskTier || 'low'] || 0) - (RISK_ORDER[a.toolRiskTier || 'low'] || 0);
      return query.sortOrder === 'asc' ? -diff : diff;
    });
  } else if (query.sortOrder === 'asc') {
    filtered = [...filtered].reverse();
  }
  // Default is already sorted by timestamp desc

  // Paginate
  const offset = query.offset || 0;
  const limit = Math.min(query.limit || 50, 200);
  const items = filtered.slice(offset, offset + limit);

  return { items, total, facets };
}

/**
 * Get full content of a specific interaction by its ID.
 */
export async function getInteractionContent(
  id: string,
): Promise<{ content: string; sessionId: string; projectSlug: string } | null> {
  // Parse ID: "projectSlug:sessionId:msgIdx:blockIdx"
  const parts = id.split(':');
  if (parts.length < 4) return null;

  const projectSlug = parts[0];
  const sessionId = parts[1];
  const targetMsgIdx = parseInt(parts[2]);
  const targetBlockIdx = parseInt(parts[3]);

  const sessionPath = resolveSessionPath(projectSlug, sessionId);

  let rl: readline.Interface;
  try {
    rl = readline.createInterface({
      input: fs.createReadStream(sessionPath),
      crlfDelay: Infinity,
    });
  } catch {
    return null;
  }

  let msgIdx = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(line);
    } catch {
      continue;
    }

    const msgType = parsed.type as string;
    if (msgType !== 'user' && msgType !== 'assistant') continue;

    if (msgIdx === targetMsgIdx) {
      rl.close();
      const message = parsed.message as { content?: unknown } | undefined;
      const content = message?.content;

      if (typeof content === 'string') {
        return { content, sessionId, projectSlug };
      }

      if (Array.isArray(content)) {
        if (targetBlockIdx === 0 && msgType === 'user') {
          // User message — combine all text blocks
          const text = content
            .filter((b: Record<string, unknown>) => b?.type === 'text')
            .map((b: Record<string, unknown>) => b.text as string)
            .join('\n');
          return { content: text || JSON.stringify(content), sessionId, projectSlug };
        }

        const block = content[targetBlockIdx] as Record<string, unknown> | undefined;
        if (!block) return { content: JSON.stringify(content), sessionId, projectSlug };

        const blockType = block.type as string;
        if (blockType === 'text' || blockType === 'thinking') {
          return { content: (block.text as string) || '', sessionId, projectSlug };
        }
        if (blockType === 'tool_use') {
          return {
            content: JSON.stringify({ name: block.name, input: block.input }, null, 2),
            sessionId,
            projectSlug,
          };
        }
        if (blockType === 'tool_result') {
          return {
            content: typeof block.content === 'string' ? block.content : JSON.stringify(block.content),
            sessionId,
            projectSlug,
          };
        }
        return { content: JSON.stringify(block, null, 2), sessionId, projectSlug };
      }

      return { content: JSON.stringify(content), sessionId, projectSlug };
    }

    msgIdx++;
  }

  return null;
}

/**
 * Get explorer facets from the full index.
 */
export function getExplorerFacets(): ExplorerFacets {
  const categories = new Map<string, number>();
  const tools = new Map<string, number>();
  const models = new Map<string, number>();
  const riskTiers = new Map<string, number>();
  const projects = new Map<string, { displayName: string; count: number }>();

  for (const item of interactions) {
    categories.set(item.category, (categories.get(item.category) || 0) + 1);
    if (item.toolName) tools.set(item.toolName, (tools.get(item.toolName) || 0) + 1);
    if (item.modelFamily) models.set(item.modelFamily, (models.get(item.modelFamily) || 0) + 1);
    if (item.toolRiskTier) riskTiers.set(item.toolRiskTier, (riskTiers.get(item.toolRiskTier) || 0) + 1);

    const proj = projects.get(item.projectSlug);
    if (proj) {
      proj.count++;
    } else {
      projects.set(item.projectSlug, { displayName: item.projectDisplayName, count: 1 });
    }
  }

  const toArray = (map: Map<string, number>) =>
    Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

  return {
    categories: toArray(categories),
    tools: toArray(tools),
    models: toArray(models),
    riskTiers: toArray(riskTiers),
    projects: Array.from(projects.entries())
      .map(([slug, { displayName, count }]) => ({ slug, displayName, count }))
      .sort((a, b) => b.count - a.count),
  };
}

/**
 * Get index stats.
 */
export function getIndexStats(): { totalInteractions: number; sessionsIndexed: number; building: boolean } {
  return {
    totalInteractions: interactions.length,
    sessionsIndexed: indexedSessionMtimes.size,
    building,
  };
}
