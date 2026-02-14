/**
 * HybridSearch — Reciprocal Rank Fusion (RRF) of FTS5 keyword + vector similarity results.
 *
 * Runs both search methods in parallel and merges results using:
 *   score(doc) = Σ 1/(k + rank_in_list)
 * where k = 60 (standard RRF constant).
 */

import { memoryStore } from './memory-store.js';
import { vectorStore } from './vector-store.js';
import type { MemoryEntry, MemorySearchQuery, MemorySearchResult } from './types.js';

const RRF_K = 60;

export type SearchMode = 'keyword' | 'semantic' | 'hybrid';

export interface HybridSearchOptions {
  text: string;
  mode?: SearchMode;
  adapters?: string[];
  layers?: Array<'hot' | 'warm' | 'cold'>;
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
  role?: 'user' | 'assistant';
  project?: string;
  limit?: number;
  offset?: number;
}

export interface HybridSearchResultEntry extends MemoryEntry {
  /** Relevance score (higher = more relevant). Only present for semantic/hybrid modes. */
  similarityScore?: number;
}

export interface HybridSearchResult {
  entries: HybridSearchResultEntry[];
  total: number;
  mode: SearchMode;
  facets: MemorySearchResult['facets'];
}

/**
 * Execute a search using the specified mode.
 * - keyword: FTS5 only (existing behavior)
 * - semantic: vector similarity only
 * - hybrid: RRF fusion of both
 */
export async function hybridSearch(options: HybridSearchOptions): Promise<HybridSearchResult> {
  const mode = options.mode ?? 'hybrid';
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;

  if (mode === 'keyword') {
    const result = await memoryStore.search(options as MemorySearchQuery);
    return { ...result, mode, entries: result.entries };
  }

  if (mode === 'semantic') {
    return semanticOnly(options, limit, offset);
  }

  // Hybrid: run both in parallel, fuse with RRF
  return hybridRRF(options, limit, offset);
}

/**
 * Semantic-only search: vector similarity + filter, then hydrate entries from SQLite.
 */
async function semanticOnly(
  options: HybridSearchOptions,
  limit: number,
  offset: number,
): Promise<HybridSearchResult> {
  if (!vectorStore.isReady()) {
    // Fallback to keyword if vector store not initialized
    const result = await memoryStore.search(options as MemorySearchQuery);
    return { ...result, mode: 'keyword', entries: result.entries };
  }

  const vectorResults = await vectorStore.semanticSearch(options.text, {
    adapters: options.adapters,
    layers: options.layers as string[] | undefined,
    project: options.project,
    role: options.role,
    limit: limit + offset, // Fetch extra for offset
  });

  // Apply offset
  const paged = vectorResults.slice(offset, offset + limit);

  // Hydrate entries from memory store
  const entries: HybridSearchResultEntry[] = [];
  for (const vr of paged) {
    const entry = await memoryStore.getEntry(vr.memoryId);
    if (entry) {
      entries.push({ ...entry, similarityScore: vr.score });
    }
  }

  return {
    entries,
    total: vectorResults.length,
    mode: 'semantic',
    facets: buildFacets(entries),
  };
}

/**
 * Hybrid RRF: run FTS5 and vector search in parallel, fuse rankings.
 */
async function hybridRRF(
  options: HybridSearchOptions,
  limit: number,
  offset: number,
): Promise<HybridSearchResult> {
  const fetchLimit = Math.max(limit * 3, 100); // Fetch more for better fusion

  // Run both searches in parallel
  const [keywordResult, vectorResults] = await Promise.all([
    memoryStore.search({ ...options, limit: fetchLimit, offset: 0 } as MemorySearchQuery),
    vectorStore.isReady()
      ? vectorStore.semanticSearch(options.text, {
          adapters: options.adapters,
          layers: options.layers as string[] | undefined,
          project: options.project,
          role: options.role,
          limit: fetchLimit,
        })
      : Promise.resolve([]),
  ]);

  // Build RRF score map
  const scoreMap = new Map<string, { rrfScore: number; vectorScore?: number }>();

  // Add keyword ranks
  keywordResult.entries.forEach((entry, rank) => {
    const existing = scoreMap.get(entry.id) ?? { rrfScore: 0 };
    existing.rrfScore += 1 / (RRF_K + rank + 1);
    scoreMap.set(entry.id, existing);
  });

  // Add vector ranks
  vectorResults.forEach((vr, rank) => {
    const existing = scoreMap.get(vr.memoryId) ?? { rrfScore: 0 };
    existing.rrfScore += 1 / (RRF_K + rank + 1);
    existing.vectorScore = vr.score;
    scoreMap.set(vr.memoryId, existing);
  });

  // Sort by RRF score descending
  const sorted = Array.from(scoreMap.entries())
    .sort((a, b) => b[1].rrfScore - a[1].rrfScore);

  // Apply offset + limit
  const paged = sorted.slice(offset, offset + limit);

  // Build entry map from keyword results for fast lookup
  const entryMap = new Map(keywordResult.entries.map((e) => [e.id, e]));

  // Hydrate entries
  const entries: HybridSearchResultEntry[] = [];
  for (const [id, scores] of paged) {
    let entry = entryMap.get(id);
    if (!entry) {
      entry = (await memoryStore.getEntry(id)) ?? undefined;
    }
    if (entry) {
      entries.push({ ...entry, similarityScore: scores.vectorScore });
    }
  }

  return {
    entries,
    total: sorted.length,
    mode: 'hybrid',
    facets: keywordResult.facets, // Use keyword facets (more complete)
  };
}

/**
 * Build facets from a list of entries.
 */
function buildFacets(entries: MemoryEntry[]): MemorySearchResult['facets'] {
  const byAdapter: Record<string, number> = {};
  const byLayer: Record<string, number> = {};
  const byTag: Record<string, number> = {};
  const byProject: Record<string, number> = {};

  for (const e of entries) {
    byAdapter[e.adapterId] = (byAdapter[e.adapterId] ?? 0) + 1;
    byLayer[e.layer] = (byLayer[e.layer] ?? 0) + 1;
    if (e.project) byProject[e.project] = (byProject[e.project] ?? 0) + 1;
    for (const tag of e.tags) {
      byTag[tag] = (byTag[tag] ?? 0) + 1;
    }
  }

  return { byAdapter, byLayer, byTag, byProject };
}
