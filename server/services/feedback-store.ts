import fsp from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { PATHS } from './config-resolver.js';

// ---- Types ----

export interface SessionFeedback {
  id: string;
  sessionId: string;
  adapterId: string;
  rating: 'positive' | 'negative';
  comment?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackStats {
  totalRatings: number;
  positiveCount: number;
  negativeCount: number;
  positiveRate: number;
  byAdapter: Record<string, { positive: number; negative: number }>;
  recentFeedback: SessionFeedback[];
  topTags: Array<{ tag: string; count: number }>;
}

interface FeedbackStore {
  version: 1;
  entries: Record<string, SessionFeedback>; // keyed by feedback ID
}

// ---- Storage paths ----

const FEEDBACK_DIR = path.join(PATHS.dataDir, 'feedback');
const FEEDBACK_FILE = path.join(FEEDBACK_DIR, 'feedback.json');

// ---- In-memory cache ----

let cachedStore: FeedbackStore | null = null;
let cacheLoadedAt = 0;
const CACHE_TTL = 30_000;

// ---- Internal helpers ----

async function ensureDir(): Promise<void> {
  await fsp.mkdir(FEEDBACK_DIR, { recursive: true });
}

async function loadFromDisk(): Promise<FeedbackStore> {
  try {
    const raw = await fsp.readFile(FEEDBACK_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { version: 1, entries: {} };
  }
}

async function saveToDisk(store: FeedbackStore): Promise<void> {
  await ensureDir();
  const tmpPath = FEEDBACK_FILE + '.tmp';
  await fsp.writeFile(tmpPath, JSON.stringify(store, null, 2), 'utf-8');
  await fsp.rename(tmpPath, FEEDBACK_FILE);
}

async function loadStore(): Promise<FeedbackStore> {
  const now = Date.now();
  if (cachedStore && now - cacheLoadedAt < CACHE_TTL) {
    return cachedStore;
  }
  cachedStore = await loadFromDisk();
  cacheLoadedAt = now;
  return cachedStore;
}

// ---- Exported API ----

/** Get feedback for a specific session (by sessionId + adapterId) */
export async function getFeedback(sessionId: string, adapterId?: string): Promise<SessionFeedback | null> {
  const store = await loadStore();
  for (const entry of Object.values(store.entries)) {
    if (entry.sessionId === sessionId && (!adapterId || entry.adapterId === adapterId)) {
      return entry;
    }
  }
  return null;
}

/** Create or update feedback for a session (upsert by sessionId + adapterId) */
export async function upsertFeedback(data: {
  sessionId: string;
  adapterId: string;
  rating: 'positive' | 'negative';
  comment?: string;
  tags?: string[];
}): Promise<SessionFeedback> {
  const store = await loadStore();
  const now = new Date().toISOString();

  // Check for existing feedback on this session+adapter
  let existing: SessionFeedback | null = null;
  for (const entry of Object.values(store.entries)) {
    if (entry.sessionId === data.sessionId && entry.adapterId === data.adapterId) {
      existing = entry;
      break;
    }
  }

  if (existing) {
    existing.rating = data.rating;
    existing.comment = data.comment;
    existing.tags = data.tags;
    existing.updatedAt = now;
    cachedStore = store;
    await saveToDisk(store);
    return existing;
  }

  const entry: SessionFeedback = {
    id: crypto.randomUUID(),
    sessionId: data.sessionId,
    adapterId: data.adapterId,
    rating: data.rating,
    comment: data.comment?.slice(0, 2000),
    tags: data.tags?.slice(0, 10),
    createdAt: now,
    updatedAt: now,
  };

  store.entries[entry.id] = entry;
  cachedStore = store;
  await saveToDisk(store);
  return entry;
}

/** Delete feedback by ID */
export async function deleteFeedback(id: string): Promise<boolean> {
  const store = await loadStore();
  if (!store.entries[id]) return false;
  delete store.entries[id];
  cachedStore = store;
  await saveToDisk(store);
  return true;
}

/** List feedback with optional filters */
export async function listFeedback(options?: {
  adapterId?: string;
  rating?: string;
  limit?: number;
  offset?: number;
}): Promise<{ entries: SessionFeedback[]; total: number }> {
  const store = await loadStore();
  let entries = Object.values(store.entries);

  if (options?.adapterId) {
    entries = entries.filter((e) => e.adapterId === options.adapterId);
  }
  if (options?.rating) {
    entries = entries.filter((e) => e.rating === options.rating);
  }

  // Sort by updatedAt descending
  entries.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const total = entries.length;
  const offset = options?.offset ?? 0;
  const limit = options?.limit ?? 50;

  return {
    entries: entries.slice(offset, offset + limit),
    total,
  };
}

/** Get aggregated feedback statistics */
export async function getFeedbackStats(): Promise<FeedbackStats> {
  const store = await loadStore();
  const all = Object.values(store.entries);

  const positiveCount = all.filter((e) => e.rating === 'positive').length;
  const negativeCount = all.filter((e) => e.rating === 'negative').length;
  const totalRatings = all.length;

  const byAdapter: Record<string, { positive: number; negative: number }> = {};
  for (const entry of all) {
    if (!byAdapter[entry.adapterId]) {
      byAdapter[entry.adapterId] = { positive: 0, negative: 0 };
    }
    byAdapter[entry.adapterId][entry.rating]++;
  }

  // Top tags
  const tagCounts: Record<string, number> = {};
  for (const entry of all) {
    for (const tag of entry.tags || []) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }
  const topTags = Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  // Recent feedback (last 10)
  const recentFeedback = [...all]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 10);

  return {
    totalRatings,
    positiveCount,
    negativeCount,
    positiveRate: totalRatings > 0 ? positiveCount / totalRatings : 0,
    byAdapter,
    recentFeedback,
    topTags,
  };
}
