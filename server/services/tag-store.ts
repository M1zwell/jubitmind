import fsp from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import type { AutoTag } from './auto-tagger.js';
import type { SessionRiskSummary } from './risk-scorer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TAGS_STORE_PATH = path.resolve(__dirname, '../../conversations/_tags.json');

export interface TagStoreEntry {
  autoTags: AutoTag[];
  manualTags: string[];
  riskSummary: SessionRiskSummary;
  computedAt: string;
  fileMtime: number;
}

interface TagStore {
  version: number;
  entries: Record<string, TagStoreEntry>;
}

// In-memory cache
let cachedStore: TagStore | null = null;
let cacheLoadedAt = 0;
const CACHE_TTL = 30_000;

async function ensureDir(): Promise<void> {
  await fsp.mkdir(path.dirname(TAGS_STORE_PATH), { recursive: true });
}

async function loadFromDisk(): Promise<TagStore> {
  try {
    const raw = await fsp.readFile(TAGS_STORE_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { version: 1, entries: {} };
  }
}

async function saveToDisk(store: TagStore): Promise<void> {
  await ensureDir();
  const tmpPath = TAGS_STORE_PATH + '.tmp';
  await fsp.writeFile(tmpPath, JSON.stringify(store, null, 2), 'utf-8');
  await fsp.rename(tmpPath, TAGS_STORE_PATH);
}

export async function loadTagStore(): Promise<TagStore> {
  const now = Date.now();
  if (cachedStore && now - cacheLoadedAt < CACHE_TTL) {
    return cachedStore;
  }
  cachedStore = await loadFromDisk();
  cacheLoadedAt = now;
  return cachedStore;
}

export async function getEntry(key: string): Promise<TagStoreEntry | null> {
  const store = await loadTagStore();
  return store.entries[key] || null;
}

export async function saveEntry(key: string, entry: TagStoreEntry): Promise<void> {
  const store = await loadTagStore();
  store.entries[key] = entry;
  cachedStore = store;
  await saveToDisk(store);
}

export async function addManualTag(key: string, tag: string): Promise<TagStoreEntry> {
  const store = await loadTagStore();
  if (!store.entries[key]) {
    store.entries[key] = {
      autoTags: [],
      manualTags: [tag],
      riskSummary: {
        maxRisk: 'low',
        maxScore: 1,
        totalToolUses: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        topRisks: [],
      },
      computedAt: new Date().toISOString(),
      fileMtime: 0,
    };
  } else {
    const entry = store.entries[key];
    if (!entry.manualTags.includes(tag)) {
      entry.manualTags.push(tag);
    }
  }
  cachedStore = store;
  await saveToDisk(store);
  return store.entries[key];
}

export async function removeManualTag(key: string, tag: string): Promise<TagStoreEntry> {
  const store = await loadTagStore();
  if (store.entries[key]) {
    store.entries[key].manualTags = store.entries[key].manualTags.filter((t) => t !== tag);
    cachedStore = store;
    await saveToDisk(store);
    return store.entries[key];
  }
  throw new Error(`No tag entry found for key: ${key}`);
}

export async function getAllUniqueTagNames(): Promise<{ autoTags: string[]; manualTags: string[] }> {
  const store = await loadTagStore();
  const autoSet = new Set<string>();
  const manualSet = new Set<string>();

  for (const entry of Object.values(store.entries)) {
    for (const t of entry.autoTags) autoSet.add(t.name);
    for (const t of entry.manualTags) manualSet.add(t);
  }

  return {
    autoTags: [...autoSet].sort(),
    manualTags: [...manualSet].sort(),
  };
}

export async function pruneStaleEntries(validKeys: Set<string>): Promise<number> {
  const store = await loadTagStore();
  let pruned = 0;
  for (const key of Object.keys(store.entries)) {
    if (!validKeys.has(key)) {
      delete store.entries[key];
      pruned++;
    }
  }
  if (pruned > 0) {
    cachedStore = store;
    await saveToDisk(store);
  }
  return pruned;
}
