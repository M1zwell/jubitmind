/**
 * BackfillEmbeddings — Batch-embed existing memory entries into the vector store.
 *
 * Processes entries that exist in SQLite but not in the vector store.
 * Resumable: tracks progress via the vector store's existing/missing entries.
 */

import { memoryStore } from './memory-store.js';
import { vectorStore } from './vector-store.js';

const BACKFILL_BATCH_SIZE = 50;

export interface BackfillProgress {
  total: number;
  embedded: number;
  skipped: number;
  errors: number;
  done: boolean;
}

export type BackfillProgressCallback = (progress: BackfillProgress) => void;

/**
 * Backfill embeddings for all memory entries that don't yet have vector representations.
 *
 * @param onProgress - Optional callback for progress updates
 * @returns Final progress stats
 */
export async function backfillEmbeddings(
  onProgress?: BackfillProgressCallback,
): Promise<BackfillProgress> {
  if (!vectorStore.isReady()) {
    throw new Error('VectorStore not initialized. Call vectorStore.initialize() first.');
  }

  // Get IDs already embedded
  const embeddedIds = vectorStore.getEmbeddedIds();

  // Get all entries from memory store (paginated)
  let offset = 0;
  const limit = 200;
  let allUnembedded: string[] = [];

  // Discover unembedded entries
  while (true) {
    const result = await memoryStore.search({ limit, offset });
    if (result.entries.length === 0) break;

    for (const entry of result.entries) {
      if (!embeddedIds.has(entry.id)) {
        allUnembedded.push(entry.id);
      }
    }

    offset += limit;
    if (offset >= result.total) break;
  }

  const progress: BackfillProgress = {
    total: allUnembedded.length,
    embedded: 0,
    skipped: 0,
    errors: 0,
    done: false,
  };

  onProgress?.(progress);

  if (allUnembedded.length === 0) {
    progress.done = true;
    onProgress?.(progress);
    return progress;
  }

  // Process in batches
  for (let i = 0; i < allUnembedded.length; i += BACKFILL_BATCH_SIZE) {
    const batchIds = allUnembedded.slice(i, i + BACKFILL_BATCH_SIZE);

    // Hydrate entries
    const entries = [];
    for (const id of batchIds) {
      const entry = await memoryStore.getEntry(id);
      if (entry) {
        entries.push(entry);
      } else {
        progress.skipped++;
      }
    }

    // Embed batch
    try {
      const embedded = await vectorStore.embedBatch(entries);
      progress.embedded += embedded;
    } catch (err) {
      console.error('[Backfill] Batch error:', err);
      progress.errors += entries.length;
    }

    onProgress?.(progress);
  }

  progress.done = true;
  onProgress?.(progress);
  return progress;
}
