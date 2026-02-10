import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import readline from 'readline';
import { PATHS } from './config-resolver.js';
import { discoverProjects } from './project-discovery.js';
import { getEntry } from './tag-store.js';
import { classifySession, type SessionClassification } from './session-classifier.js';

export type { SessionClassification } from './session-classifier.js';

export interface CachedSessionMeta {
  sessionId: string;
  projectSlug: string;
  projectDisplayName: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  mode: 'claude-cli';
  preview: string;
  source: 'claude-code';
  sizeBytes: number;
  fileMtime: number;
  // Risk & Tag fields
  riskLevel?: 'critical' | 'high' | 'medium' | 'low';
  riskScore?: number;
  autoTags?: string[];
  manualTags?: string[];
  // Classification fields
  classification?: SessionClassification;
  classificationMtime?: number;
}

// In-memory cache keyed by "projectSlug:sessionId"
const cache = new Map<string, CachedSessionMeta>();
let initialized = false;

function cacheKey(projectSlug: string, sessionId: string): string {
  return `${projectSlug}:${sessionId}`;
}

async function readFirstUserMessage(
  filePath: string,
): Promise<{ content: string; timestamp?: string } | null> {
  try {
    // Read up to 32KB to find the first user message
    const rl = readline.createInterface({
      input: fs.createReadStream(filePath, { start: 0, end: 32768 }),
      crlfDelay: Infinity,
    });

    let firstTimestamp: string | undefined;
    let linesRead = 0;

    for await (const line of rl) {
      if (!line.trim()) continue;
      linesRead++;
      if (linesRead > 20) {
        rl.close();
        break;
      }

      try {
        const parsed = JSON.parse(line);
        if (!firstTimestamp) firstTimestamp = parsed.timestamp;

        // Look for user message with content
        if (parsed.type === 'user' && parsed.message?.content) {
          let preview = '';
          if (typeof parsed.message.content === 'string') {
            preview = parsed.message.content.slice(0, 150);
          } else if (Array.isArray(parsed.message.content)) {
            const textBlock = parsed.message.content.find(
              (b: { type?: string }) => b.type === 'text',
            ) as { text?: string } | undefined;
            preview = textBlock?.text?.slice(0, 150) || '';
          }
          if (preview) {
            rl.close();
            return { content: preview, timestamp: firstTimestamp };
          }
        }
      } catch {
        // skip malformed lines
      }
    }

    return { content: '', timestamp: firstTimestamp };
  } catch {
    return null;
  }
}

/**
 * Refresh the cache for a single project directory.
 * Uses stat() to detect changes - only reads first line of new/modified files.
 */
export async function refreshProject(projectSlug: string, projectDir: string, displayName: string): Promise<void> {
  let files: string[];
  try {
    files = await fsp.readdir(projectDir);
  } catch {
    return;
  }

  const jsonlFiles = files.filter((f) => f.endsWith('.jsonl'));
  const currentKeys = new Set<string>();

  // Process in batches of 20 for concurrency control
  const batches: string[][] = [];
  for (let i = 0; i < jsonlFiles.length; i += 20) {
    batches.push(jsonlFiles.slice(i, i + 20));
  }

  for (const batch of batches) {
    await Promise.all(
      batch.map(async (f) => {
        const sessionId = path.basename(f, '.jsonl');
        const key = cacheKey(projectSlug, sessionId);
        currentKeys.add(key);

        const fullPath = path.join(projectDir, f);
        try {
          const stat = await fsp.stat(fullPath);
          const existing = cache.get(key);

          // Skip if file hasn't changed (same mtime)
          if (existing && existing.fileMtime === stat.mtimeMs) {
            return;
          }

          // File is new or modified - read first line for preview
          const firstLine = await readFirstUserMessage(fullPath);
          const createdAt = firstLine?.timestamp || stat.birthtime.toISOString();

          const meta: CachedSessionMeta = {
            sessionId,
            projectSlug,
            projectDisplayName: displayName,
            createdAt,
            updatedAt: stat.mtime.toISOString(),
            messageCount: 0,
            mode: 'claude-cli',
            preview: firstLine?.content || '',
            source: 'claude-code',
            sizeBytes: stat.size,
            fileMtime: stat.mtimeMs,
          };

          // Load risk/tag data from tag store if available
          try {
            const tagEntry = await getEntry(key);
            if (tagEntry) {
              meta.riskLevel = tagEntry.riskSummary.maxRisk;
              meta.riskScore = tagEntry.riskSummary.maxScore;
              meta.autoTags = tagEntry.autoTags.map((t) => t.name);
              meta.manualTags = tagEntry.manualTags;
            }
          } catch {
            // tag store not available yet
          }

          cache.set(key, meta);
        } catch {
          // skip problematic files
        }
      }),
    );
  }

  // Remove stale entries for this project (files that no longer exist)
  for (const [key] of cache) {
    if (key.startsWith(`${projectSlug}:`) && !currentKeys.has(key)) {
      cache.delete(key);
    }
  }
}

/**
 * Refresh all projects. Called periodically by the polling endpoint.
 */
export async function refreshAll(): Promise<void> {
  const projects = await discoverProjects();

  // Refresh projects in parallel (limit concurrency to 3)
  const chunks: typeof projects[] = [];
  for (let i = 0; i < projects.length; i += 3) {
    chunks.push(projects.slice(i, i + 3));
  }

  for (const chunk of chunks) {
    await Promise.all(
      chunk.map((p) => refreshProject(p.slug, p.fullPath, p.displayName)),
    );
  }

  initialized = true;
}

/**
 * Get all sessions across all projects, sorted by updatedAt descending.
 */
export async function getAllSessions(limit = 100): Promise<CachedSessionMeta[]> {
  if (!initialized) {
    await refreshAll();
  }

  const sessions = Array.from(cache.values());
  sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return sessions.slice(0, limit);
}

/**
 * Get sessions for a specific project.
 */
export async function getSessionsForProject(
  projectSlug: string,
  limit = 100,
): Promise<CachedSessionMeta[]> {
  if (!initialized) {
    await refreshAll();
  }

  const sessions: CachedSessionMeta[] = [];
  for (const [key, meta] of cache) {
    if (key.startsWith(`${projectSlug}:`)) {
      sessions.push(meta);
    }
  }

  sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return sessions.slice(0, limit);
}

/**
 * Resolve the full file path for a session given its project slug.
 */
export function resolveSessionPath(projectSlug: string, sessionId: string): string {
  return path.join(PATHS.projectsDir, projectSlug, `${sessionId}.jsonl`);
}

/**
 * Get cache stats for debugging.
 */
export function getCacheStats(): { totalEntries: number; initialized: boolean } {
  return { totalEntries: cache.size, initialized };
}

// ---------------------------------------------------------------------------
// Classification support
// ---------------------------------------------------------------------------

let classificationRunning = false;

/**
 * Background-classify all sessions that lack classification data.
 * Processes in batches to avoid blocking the event loop.
 */
export async function classifyPendingSessions(): Promise<void> {
  if (classificationRunning) return;
  classificationRunning = true;

  try {
    const entries = Array.from(cache.entries());
    const pending = entries.filter(
      ([, meta]) => !meta.classification || meta.classificationMtime !== meta.fileMtime,
    );

    if (pending.length === 0) {
      classificationRunning = false;
      return;
    }

    console.log(`[classifier] Classifying ${pending.length} sessions...`);
    const start = Date.now();

    // Process in batches of 5 to avoid excessive file reads
    for (let i = 0; i < pending.length; i += 5) {
      const batch = pending.slice(i, i + 5);
      await Promise.all(
        batch.map(async ([key, meta]) => {
          try {
            const sessionPath = resolveSessionPath(meta.projectSlug, meta.sessionId);
            const classification = await classifySession(sessionPath);
            meta.classification = classification;
            meta.classificationMtime = meta.fileMtime;
            cache.set(key, meta);
          } catch {
            // skip sessions that fail to classify
          }
        }),
      );
    }

    console.log(`[classifier] Classification complete in ${Date.now() - start}ms`);
  } finally {
    classificationRunning = false;
  }
}

/**
 * Classify a single session on-demand. Updates the cache.
 */
export async function classifySingleSession(
  projectSlug: string,
  sessionId: string,
): Promise<SessionClassification | null> {
  const key = cacheKey(projectSlug, sessionId);
  const meta = cache.get(key);
  if (!meta) return null;

  try {
    const sessionPath = resolveSessionPath(projectSlug, sessionId);
    const classification = await classifySession(sessionPath);
    meta.classification = classification;
    meta.classificationMtime = meta.fileMtime;
    cache.set(key, meta);
    return classification;
  } catch {
    return null;
  }
}

/**
 * Get classification progress status.
 */
export function getClassificationStatus(): {
  total: number;
  classified: number;
  pending: number;
  running: boolean;
} {
  let classified = 0;
  let total = 0;

  for (const meta of cache.values()) {
    total++;
    if (meta.classification && meta.classificationMtime === meta.fileMtime) {
      classified++;
    }
  }

  return { total, classified, pending: total - classified, running: classificationRunning };
}

/**
 * Get all cached sessions without limit (used by indexer and facets).
 */
export function getAllSessionsUnlimited(): CachedSessionMeta[] {
  return Array.from(cache.values());
}
