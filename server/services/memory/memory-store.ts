import { createHash, randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type Database from 'better-sqlite3';
import type {
  MemoryEntry,
  MemoryRelationship,
  MemorySearchQuery,
  MemorySearchResult,
  MemoryStats,
} from './types.js';
import type { AdapterMessage } from '../adapters/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../../data');
const DB_PATH = path.join(DATA_DIR, 'memory-store.db');

/** Milliseconds in 24 hours */
const HOT_THRESHOLD_MS = 24 * 60 * 60 * 1000;
/** Milliseconds in 7 days */
const WARM_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

class MemoryStore {
  private db: Database.Database | null = null;

  private async ensureDb(): Promise<Database.Database> {
    if (this.db) return this.db;

    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    const BetterSqlite3 = (await import('better-sqlite3')).default;
    this.db = new BetterSqlite3(DB_PATH);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.initSchema();
    return this.db;
  }

  private initSchema(): void {
    const db = this.db!;

    db.exec(`
      CREATE TABLE IF NOT EXISTS memory_entries (
        id TEXT PRIMARY KEY,
        adapter_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        content TEXT NOT NULL,
        role TEXT NOT NULL,
        document_date TEXT NOT NULL,
        ingested_at TEXT NOT NULL,
        layer TEXT NOT NULL DEFAULT 'warm',
        tags_json TEXT DEFAULT '[]',
        topics_json TEXT DEFAULT '[]',
        project TEXT,
        model TEXT,
        tool_name TEXT,
        risk_level TEXT,
        content_hash TEXT NOT NULL,
        content_length INTEGER NOT NULL
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_memory_content_hash
        ON memory_entries (content_hash);
      CREATE INDEX IF NOT EXISTS idx_memory_adapter
        ON memory_entries (adapter_id);
      CREATE INDEX IF NOT EXISTS idx_memory_layer
        ON memory_entries (layer);
      CREATE INDEX IF NOT EXISTS idx_memory_document_date
        ON memory_entries (document_date);
      CREATE INDEX IF NOT EXISTS idx_memory_session
        ON memory_entries (adapter_id, session_id);

      CREATE TABLE IF NOT EXISTS memory_relationships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id TEXT NOT NULL,
        target_id TEXT NOT NULL,
        type TEXT NOT NULL,
        weight REAL NOT NULL DEFAULT 0.5,
        reason TEXT,
        FOREIGN KEY (source_id) REFERENCES memory_entries(id) ON DELETE CASCADE,
        FOREIGN KEY (target_id) REFERENCES memory_entries(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_memory_rel_source
        ON memory_relationships (source_id);
      CREATE INDEX IF NOT EXISTS idx_memory_rel_target
        ON memory_relationships (target_id);

      CREATE VIRTUAL TABLE IF NOT EXISTS memory_entries_fts USING fts5(
        content,
        tags,
        topics,
        content=memory_entries,
        content_rowid=rowid
      );

      CREATE TRIGGER IF NOT EXISTS memory_entries_ai AFTER INSERT ON memory_entries BEGIN
        INSERT INTO memory_entries_fts(rowid, content, tags, topics)
        VALUES (new.rowid, new.content, new.tags_json, new.topics_json);
      END;

      CREATE TRIGGER IF NOT EXISTS memory_entries_ad AFTER DELETE ON memory_entries BEGIN
        INSERT INTO memory_entries_fts(memory_entries_fts, rowid, content, tags, topics)
        VALUES ('delete', old.rowid, old.content, old.tags_json, old.topics_json);
      END;
    `);
  }

  /**
   * Compute the content hash for deduplication.
   */
  private computeHash(adapterId: string, sessionId: string, content: string): string {
    return createHash('sha256')
      .update(`${adapterId}|${sessionId}|${content}`)
      .digest('hex');
  }

  /**
   * Determine the layer based on document date age.
   */
  private computeLayer(documentDate: string): 'hot' | 'warm' | 'cold' {
    const ageMs = Date.now() - new Date(documentDate).getTime();
    if (ageMs < HOT_THRESHOLD_MS) return 'hot';
    if (ageMs < WARM_THRESHOLD_MS) return 'warm';
    return 'cold';
  }

  /**
   * Convert a raw database row into a MemoryEntry.
   */
  private rowToEntry(row: Record<string, unknown>, relationships: MemoryRelationship[] = []): MemoryEntry {
    return {
      id: row.id as string,
      adapterId: row.adapter_id as string,
      sessionId: row.session_id as string,
      content: row.content as string,
      role: row.role as MemoryEntry['role'],
      documentDate: row.document_date as string,
      ingestedAt: row.ingested_at as string,
      layer: row.layer as MemoryEntry['layer'],
      tags: JSON.parse((row.tags_json as string) || '[]') as string[],
      topics: JSON.parse((row.topics_json as string) || '[]') as string[],
      relationships,
      project: (row.project as string) || undefined,
      model: (row.model as string) || undefined,
      toolName: (row.tool_name as string) || undefined,
      riskLevel: (row.risk_level as MemoryEntry['riskLevel']) || undefined,
      contentHash: row.content_hash as string,
      contentLength: row.content_length as number,
    };
  }

  /**
   * Ingest a single memory entry. Returns the entry if inserted, or null if it was a duplicate.
   */
  async ingest(entry: Omit<MemoryEntry, 'id' | 'contentHash' | 'contentLength' | 'ingestedAt' | 'layer' | 'relationships'>): Promise<MemoryEntry | null> {
    const db = await this.ensureDb();
    const id = randomUUID();
    const contentHash = this.computeHash(entry.adapterId, entry.sessionId, entry.content);
    const layer = this.computeLayer(entry.documentDate);
    const ingestedAt = new Date().toISOString();
    const contentLength = Buffer.byteLength(entry.content, 'utf-8');

    const stmt = db.prepare(`
      INSERT OR IGNORE INTO memory_entries
        (id, adapter_id, session_id, content, role, document_date, ingested_at,
         layer, tags_json, topics_json, project, model, tool_name, risk_level,
         content_hash, content_length)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      id,
      entry.adapterId,
      entry.sessionId,
      entry.content,
      entry.role,
      entry.documentDate,
      ingestedAt,
      layer,
      JSON.stringify(entry.tags),
      JSON.stringify(entry.topics),
      entry.project ?? null,
      entry.model ?? null,
      entry.toolName ?? null,
      entry.riskLevel ?? null,
      contentHash,
      contentLength,
    );

    if (result.changes === 0) return null; // duplicate

    return {
      ...entry,
      id,
      contentHash,
      contentLength,
      ingestedAt,
      layer,
      relationships: [],
    };
  }

  /**
   * Ingest multiple entries within a single transaction for performance.
   */
  async ingestBatch(
    entries: Array<Omit<MemoryEntry, 'id' | 'contentHash' | 'contentLength' | 'ingestedAt' | 'layer' | 'relationships'>>,
  ): Promise<{ inserted: number; duplicates: number }> {
    const db = await this.ensureDb();
    const ingestedAt = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT OR IGNORE INTO memory_entries
        (id, adapter_id, session_id, content, role, document_date, ingested_at,
         layer, tags_json, topics_json, project, model, tool_name, risk_level,
         content_hash, content_length)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let inserted = 0;
    const tx = db.transaction(() => {
      for (const entry of entries) {
        const id = randomUUID();
        const contentHash = this.computeHash(entry.adapterId, entry.sessionId, entry.content);
        const layer = this.computeLayer(entry.documentDate);
        const contentLength = Buffer.byteLength(entry.content, 'utf-8');

        const result = stmt.run(
          id,
          entry.adapterId,
          entry.sessionId,
          entry.content,
          entry.role,
          entry.documentDate,
          ingestedAt,
          layer,
          JSON.stringify(entry.tags),
          JSON.stringify(entry.topics),
          entry.project ?? null,
          entry.model ?? null,
          entry.toolName ?? null,
          entry.riskLevel ?? null,
          contentHash,
          contentLength,
        );

        if (result.changes > 0) inserted++;
      }
    });

    tx();

    return { inserted, duplicates: entries.length - inserted };
  }

  /**
   * Search memory entries with full-text search and filtering.
   */
  async search(query: MemorySearchQuery): Promise<MemorySearchResult> {
    const db = await this.ensureDb();
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;

    const conditions: string[] = [];
    const params: unknown[] = [];

    // If text search is provided, join with FTS5 table
    let fromClause: string;
    let selectFields: string;

    if (query.text) {
      fromClause = `
        memory_entries e
        INNER JOIN memory_entries_fts fts ON fts.rowid = e.rowid
      `;
      selectFields = 'e.*, rank';
      conditions.push('fts MATCH ?');
      params.push(query.text);
    } else {
      fromClause = 'memory_entries e';
      selectFields = 'e.*';
    }

    if (query.adapters && query.adapters.length > 0) {
      const placeholders = query.adapters.map(() => '?').join(', ');
      conditions.push(`e.adapter_id IN (${placeholders})`);
      params.push(...query.adapters);
    }

    if (query.layers && query.layers.length > 0) {
      const placeholders = query.layers.map(() => '?').join(', ');
      conditions.push(`e.layer IN (${placeholders})`);
      params.push(...query.layers);
    }

    if (query.tags && query.tags.length > 0) {
      // Match entries where any of the query tags appear in the tags JSON array
      const tagConditions = query.tags.map(() => "e.tags_json LIKE ?");
      conditions.push(`(${tagConditions.join(' OR ')})`);
      for (const tag of query.tags) {
        params.push(`%${tag}%`);
      }
    }

    if (query.dateFrom) {
      conditions.push('e.document_date >= ?');
      params.push(query.dateFrom);
    }

    if (query.dateTo) {
      conditions.push('e.document_date <= ?');
      params.push(query.dateTo);
    }

    if (query.role) {
      conditions.push('e.role = ?');
      params.push(query.role);
    }

    if (query.project) {
      conditions.push('e.project = ?');
      params.push(query.project);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderClause = query.text ? 'ORDER BY rank' : 'ORDER BY e.document_date DESC';

    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM ${fromClause} ${whereClause}`;
    const totalRow = db.prepare(countSql).get(...params) as { total: number };

    // Get paginated results
    const dataSql = `SELECT ${selectFields} FROM ${fromClause} ${whereClause} ${orderClause} LIMIT ? OFFSET ?`;
    const rows = db.prepare(dataSql).all(...params, limit, offset) as Array<Record<string, unknown>>;

    const entries = rows.map((row) => this.rowToEntry(row));

    // Build facets from the filtered result set (without pagination)
    const facetWhere = whereClause;
    const facetParams = [...params];

    const adapterFacetSql = `SELECT e.adapter_id as key, COUNT(*) as count FROM ${fromClause} ${facetWhere} GROUP BY e.adapter_id`;
    const adapterFacets = db.prepare(adapterFacetSql).all(...facetParams) as Array<{ key: string; count: number }>;

    const layerFacetSql = `SELECT e.layer as key, COUNT(*) as count FROM ${fromClause} ${facetWhere} GROUP BY e.layer`;
    const layerFacets = db.prepare(layerFacetSql).all(...facetParams) as Array<{ key: string; count: number }>;

    const projectFacetWhere = facetWhere
      ? `${facetWhere} AND e.project IS NOT NULL`
      : 'WHERE e.project IS NOT NULL';
    const projectFacetSql = `SELECT e.project as key, COUNT(*) as count FROM ${fromClause} ${projectFacetWhere} GROUP BY e.project`;
    const projectFacets = db.prepare(projectFacetSql).all(...facetParams) as Array<{ key: string; count: number }>;

    // Tag facets: extract individual tags from JSON arrays
    const tagFacetSql = `SELECT e.tags_json FROM ${fromClause} ${facetWhere}`;
    const tagRows = db.prepare(tagFacetSql).all(...facetParams) as Array<{ tags_json: string }>;
    const tagCounts: Record<string, number> = {};
    for (const row of tagRows) {
      const tags = JSON.parse(row.tags_json || '[]') as string[];
      for (const tag of tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }

    return {
      entries,
      total: totalRow.total,
      facets: {
        byAdapter: Object.fromEntries(adapterFacets.map((f) => [f.key, f.count])),
        byLayer: Object.fromEntries(layerFacets.map((f) => [f.key, f.count])),
        byTag: tagCounts,
        byProject: Object.fromEntries(projectFacets.map((f) => [f.key, f.count])),
      },
    };
  }

  /**
   * Get a single entry by ID, including its relationships.
   */
  async getEntry(id: string): Promise<MemoryEntry | null> {
    const db = await this.ensureDb();

    const row = db.prepare('SELECT * FROM memory_entries WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) return null;

    const relationships = this.getRelationshipsSync(db, id);
    return this.rowToEntry(row, relationships);
  }

  /**
   * Delete an entry and its associated relationships.
   */
  async deleteEntry(id: string): Promise<boolean> {
    const db = await this.ensureDb();

    const result = db.prepare('DELETE FROM memory_entries WHERE id = ?').run(id);
    return result.changes > 0;
  }

  /**
   * Add a relationship between two memory entries.
   */
  async addRelationship(sourceId: string, rel: MemoryRelationship): Promise<void> {
    const db = await this.ensureDb();

    db.prepare(`
      INSERT INTO memory_relationships (source_id, target_id, type, weight, reason)
      VALUES (?, ?, ?, ?, ?)
    `).run(sourceId, rel.targetId, rel.type, rel.weight, rel.reason ?? null);
  }

  /**
   * Get all relationships for an entry (as source or target).
   */
  async getRelationships(entryId: string): Promise<MemoryRelationship[]> {
    const db = await this.ensureDb();
    return this.getRelationshipsSync(db, entryId);
  }

  /**
   * Synchronous helper to get relationships (used internally during row mapping).
   */
  private getRelationshipsSync(db: Database.Database, entryId: string): MemoryRelationship[] {
    const rows = db.prepare(`
      SELECT type, target_id, weight, reason FROM memory_relationships WHERE source_id = ?
      UNION ALL
      SELECT type, source_id as target_id, weight, reason FROM memory_relationships WHERE target_id = ?
    `).all(entryId, entryId) as Array<{ type: string; target_id: string; weight: number; reason: string | null }>;

    return rows.map((r) => ({
      type: r.type as MemoryRelationship['type'],
      targetId: r.target_id,
      weight: r.weight,
      reason: r.reason ?? undefined,
    }));
  }

  /**
   * Re-tier all entries based on current document_date age.
   * Hot: <24h, Warm: <7d, Cold: >7d.
   */
  async autoTierEntries(): Promise<{ hot: number; warm: number; cold: number }> {
    const db = await this.ensureDb();
    const now = new Date();

    const hotCutoff = new Date(now.getTime() - HOT_THRESHOLD_MS).toISOString();
    const warmCutoff = new Date(now.getTime() - WARM_THRESHOLD_MS).toISOString();

    const tx = db.transaction(() => {
      const hotResult = db.prepare(
        "UPDATE memory_entries SET layer = 'hot' WHERE document_date > ? AND layer != 'hot'",
      ).run(hotCutoff);

      const warmResult = db.prepare(
        "UPDATE memory_entries SET layer = 'warm' WHERE document_date > ? AND document_date <= ? AND layer != 'warm'",
      ).run(warmCutoff, hotCutoff);

      const coldResult = db.prepare(
        "UPDATE memory_entries SET layer = 'cold' WHERE document_date <= ? AND layer != 'cold'",
      ).run(warmCutoff);

      return {
        hot: hotResult.changes,
        warm: warmResult.changes,
        cold: coldResult.changes,
      };
    });

    return tx();
  }

  /**
   * Return aggregate statistics about the memory store.
   */
  async getStats(): Promise<MemoryStats> {
    const db = await this.ensureDb();

    const totalRow = db.prepare('SELECT COUNT(*) as total FROM memory_entries').get() as { total: number };

    const adapterRows = db.prepare(
      'SELECT adapter_id as key, COUNT(*) as count FROM memory_entries GROUP BY adapter_id',
    ).all() as Array<{ key: string; count: number }>;

    const layerRows = db.prepare(
      'SELECT layer as key, COUNT(*) as count FROM memory_entries GROUP BY layer',
    ).all() as Array<{ key: string; count: number }>;

    const dateRows = db.prepare(
      'SELECT MIN(document_date) as oldest, MAX(document_date) as newest FROM memory_entries',
    ).get() as { oldest: string | null; newest: string | null };

    const sizeRow = db.prepare(
      'SELECT COALESCE(SUM(content_length), 0) as total_size FROM memory_entries',
    ).get() as { total_size: number };

    const layerMap: Record<string, number> = {};
    for (const row of layerRows) {
      layerMap[row.key] = row.count;
    }

    return {
      totalEntries: totalRow.total,
      byAdapter: Object.fromEntries(adapterRows.map((r) => [r.key, r.count])),
      byLayer: {
        hot: layerMap['hot'] ?? 0,
        warm: layerMap['warm'] ?? 0,
        cold: layerMap['cold'] ?? 0,
      },
      oldestEntry: dateRows.oldest ?? undefined,
      newestEntry: dateRows.newest ?? undefined,
      totalSizeBytes: sizeRow.total_size,
    };
  }

  /**
   * Convert AdapterMessage[] to memory entries and ingest them.
   * Returns the count of NEW entries ingested (skipping duplicates).
   */
  async ingestFromAdapter(
    adapterId: string,
    messages: AdapterMessage[],
    sessionId: string,
    project?: string,
  ): Promise<number> {
    const entries = messages.map((msg) => ({
      adapterId,
      sessionId,
      content: msg.content,
      role: msg.role,
      documentDate: msg.documentDate || msg.timestamp || new Date().toISOString(),
      tags: msg.memoryTags || [],
      topics: [] as string[],
      project,
      model: msg.metadata?.model as string | undefined,
      toolName: msg.sourceAdapter || adapterId,
      riskLevel: undefined as MemoryEntry['riskLevel'],
    }));

    const result = await this.ingestBatch(entries);
    return result.inserted;
  }

  /**
   * Close the database connection. Call when shutting down.
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export const memoryStore = new MemoryStore();
