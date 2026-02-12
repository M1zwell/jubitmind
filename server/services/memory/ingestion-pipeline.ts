import { registry } from '../adapters/index.js';
import { memoryStore } from './memory-store.js';

/**
 * Ingest data from all available adapters into the unified memory store.
 *
 * For each adapter: discover sessions (limit: 100), fetch messages per session
 * (limit: 200), and feed them into the memory store for deduplication and indexing.
 */
export async function ingestAllAdapters(): Promise<{
  totalIngested: number;
  byAdapter: Record<string, number>;
  errors: Array<{ adapterId: string; error: string }>;
}> {
  const adapters = await registry.getAvailable();
  let totalIngested = 0;
  const byAdapter: Record<string, number> = {};
  const errors: Array<{ adapterId: string; error: string }> = [];

  for (const adapter of adapters) {
    try {
      const sessions = await adapter.discoverSessions({ limit: 100 });
      let adapterTotal = 0;

      for (const session of sessions) {
        try {
          const messages = await adapter.getMessages(session.sessionId, { limit: 200 });
          const ingested = await memoryStore.ingestFromAdapter(
            adapter.id,
            messages,
            session.sessionId,
            session.projectSlug,
          );
          adapterTotal += ingested;
        } catch (err) {
          errors.push({
            adapterId: adapter.id,
            error: `Session ${session.sessionId}: ${err instanceof Error ? err.message : String(err)}`,
          });
        }
      }

      byAdapter[adapter.id] = adapterTotal;
      totalIngested += adapterTotal;
    } catch (err) {
      errors.push({
        adapterId: adapter.id,
        error: `Discovery failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  return { totalIngested, byAdapter, errors };
}

/**
 * Simple cross-tool correlation: find entries from different adapters with
 * similar timestamps (within 1 hour) and overlapping topics/tags, then create
 * 'cross-tool' relationships between them.
 *
 * Returns the count of new relationships created.
 */
export async function correlateMemories(): Promise<number> {
  const ONE_HOUR_MS = 60 * 60 * 1000;
  let newRelationships = 0;

  // Get all entries grouped by adapter, ordered by document date
  const allResults = await memoryStore.search({ limit: 5000 });
  const entries = allResults.entries;

  if (entries.length < 2) return 0;

  // Build a map of adapter -> entries for efficient cross-adapter comparison
  const byAdapter = new Map<string, typeof entries>();
  for (const entry of entries) {
    const list = byAdapter.get(entry.adapterId) || [];
    list.push(entry);
    byAdapter.set(entry.adapterId, list);
  }

  const adapterIds = Array.from(byAdapter.keys());

  // Compare entries across different adapters
  for (let i = 0; i < adapterIds.length; i++) {
    for (let j = i + 1; j < adapterIds.length; j++) {
      const entriesA = byAdapter.get(adapterIds[i])!;
      const entriesB = byAdapter.get(adapterIds[j])!;

      for (const a of entriesA) {
        const aTime = new Date(a.documentDate).getTime();
        const aTags = new Set(a.tags);
        const aTopics = new Set(a.topics);

        for (const b of entriesB) {
          const bTime = new Date(b.documentDate).getTime();

          // Check temporal proximity (within 1 hour)
          if (Math.abs(aTime - bTime) > ONE_HOUR_MS) continue;

          // Check tag/topic overlap
          const tagOverlap = b.tags.some((t) => aTags.has(t));
          const topicOverlap = b.topics.some((t) => aTopics.has(t));

          if (tagOverlap || topicOverlap) {
            // Check if this relationship already exists via the entry's relationships
            const existingRels = await memoryStore.getRelationships(a.id);
            const alreadyLinked = existingRels.some(
              (r) => r.targetId === b.id && r.type === 'cross-tool',
            );

            if (!alreadyLinked) {
              const overlappingItems = [
                ...b.tags.filter((t) => aTags.has(t)),
                ...b.topics.filter((t) => aTopics.has(t)),
              ];

              await memoryStore.addRelationship(a.id, {
                targetId: b.id,
                type: 'cross-tool',
                weight: Math.min(1, overlappingItems.length * 0.3),
                reason: `Cross-tool correlation: ${a.adapterId} <-> ${b.adapterId}, shared: ${overlappingItems.join(', ')}`,
              });
              newRelationships++;
            }
          }
        }
      }
    }
  }

  return newRelationships;
}
