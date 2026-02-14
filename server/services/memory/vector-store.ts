/**
 * VectorStore — Semantic vector search for JubitMind unified memory.
 *
 * Uses @xenova/transformers for local embedding generation (all-MiniLM-L6-v2, 384-dim)
 * and SQLite for persistent storage. Cosine similarity computed in JS.
 * No external server required — everything runs in-process.
 */

import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type Database from 'better-sqlite3';
import type { MemoryEntry } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../../data');
const VECTOR_DB_PATH = path.join(DATA_DIR, 'vector-store.db');

const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';
const EMBEDDING_DIM = 384;
const BATCH_SIZE = 50;

type Pipeline = (text: string, options?: Record<string, unknown>) => Promise<{ data: Float32Array; dims: number[] }>;

class VectorStore {
  private db: Database.Database | null = null;
  private extractor: Pipeline | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize SQLite vector database and load embedding model.
   * Safe to call multiple times — only initializes once.
   */
  async initialize(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = this._doInit();
    return this.initPromise;
  }

  private async _doInit(): Promise<void> {
    // Ensure data directory exists
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // Open SQLite database for vectors
    const BetterSqlite3 = (await import('better-sqlite3')).default;
    this.db = new BetterSqlite3(VECTOR_DB_PATH);
    this.db.pragma('journal_mode = WAL');
    this.initSchema();

    // Load embedding model
    const { pipeline } = await import('@xenova/transformers');
    this.extractor = (await pipeline('feature-extraction', EMBEDDING_MODEL, {
      quantized: true,
    })) as unknown as Pipeline;

    console.log('[VectorStore] Initialized — model:', EMBEDDING_MODEL, 'dim:', EMBEDDING_DIM);
  }

  private initSchema(): void {
    const db = this.db!;
    db.exec(`
      CREATE TABLE IF NOT EXISTS embeddings (
        id TEXT PRIMARY KEY,
        memory_id TEXT NOT NULL UNIQUE,
        embedding BLOB NOT NULL,
        adapter_id TEXT,
        layer TEXT,
        project TEXT,
        role TEXT,
        document_date TEXT,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_emb_memory_id ON embeddings (memory_id);
      CREATE INDEX IF NOT EXISTS idx_emb_adapter_id ON embeddings (adapter_id);
      CREATE INDEX IF NOT EXISTS idx_emb_layer ON embeddings (layer);
      CREATE INDEX IF NOT EXISTS idx_emb_project ON embeddings (project);
    `);
  }

  private ensureReady(): Database.Database {
    if (!this.db || !this.extractor) {
      throw new Error('VectorStore not initialized. Call initialize() first.');
    }
    return this.db;
  }

  /**
   * Generate embedding for a text string.
   */
  async embed(text: string): Promise<Float32Array> {
    if (!this.extractor) throw new Error('Embedding model not loaded');
    const result = await this.extractor(text, { pooling: 'mean', normalize: true });
    return new Float32Array(result.data);
  }

  /**
   * Embed and store a single memory entry.
   * Returns true if stored, false if already exists.
   */
  async embedAndStore(entry: MemoryEntry): Promise<boolean> {
    const db = this.ensureReady();

    // Check if already embedded
    const existing = db.prepare('SELECT 1 FROM embeddings WHERE memory_id = ?').get(entry.id);
    if (existing) return false;

    const embedding = await this.embed(entry.content);
    const buffer = Buffer.from(embedding.buffer);

    db.prepare(`
      INSERT OR IGNORE INTO embeddings (id, memory_id, embedding, adapter_id, layer, project, role, document_date, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      entry.id,
      buffer,
      entry.adapterId,
      entry.layer,
      entry.project ?? null,
      entry.role,
      entry.documentDate,
      new Date().toISOString(),
    );

    return true;
  }

  /**
   * Embed and store multiple memory entries in batch.
   * Returns count of newly embedded entries.
   */
  async embedBatch(entries: MemoryEntry[]): Promise<number> {
    const db = this.ensureReady();
    let embedded = 0;

    // Filter out already-embedded entries
    const checkStmt = db.prepare('SELECT 1 FROM embeddings WHERE memory_id = ?');
    const toEmbed = entries.filter((e) => !checkStmt.get(e.id));

    if (toEmbed.length === 0) return 0;

    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO embeddings (id, memory_id, embedding, adapter_id, layer, project, role, document_date, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Process in batches
    for (let i = 0; i < toEmbed.length; i += BATCH_SIZE) {
      const batch = toEmbed.slice(i, i + BATCH_SIZE);
      const now = new Date().toISOString();

      const tx = db.transaction(() => {
        for (const entry of batch) {
          // embeddings are generated outside the transaction (async)
          // so we batch the inserts
        }
      });

      // Generate embeddings for batch (sequential to avoid memory pressure)
      const embeddings: Array<{ entry: MemoryEntry; buffer: Buffer }> = [];
      for (const entry of batch) {
        try {
          const emb = await this.embed(entry.content);
          embeddings.push({ entry, buffer: Buffer.from(emb.buffer) });
        } catch (err) {
          console.warn(`[VectorStore] Failed to embed entry ${entry.id}:`, err);
        }
      }

      // Batch insert in transaction
      const insertTx = db.transaction(() => {
        for (const { entry, buffer } of embeddings) {
          insertStmt.run(
            randomUUID(),
            entry.id,
            buffer,
            entry.adapterId,
            entry.layer,
            entry.project ?? null,
            entry.role,
            entry.documentDate,
            now,
          );
          embedded++;
        }
      });
      insertTx();
    }

    return embedded;
  }

  /**
   * Semantic search: find entries most similar to the query text.
   * Returns entry IDs with similarity scores, sorted by relevance.
   */
  async semanticSearch(
    query: string,
    options?: {
      adapters?: string[];
      layers?: string[];
      project?: string;
      role?: string;
      limit?: number;
    },
  ): Promise<Array<{ memoryId: string; score: number }>> {
    const db = this.ensureReady();
    const limit = options?.limit ?? 20;

    // Generate query embedding
    const queryEmb = await this.embed(query);

    // Build filter conditions
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (options?.adapters?.length) {
      const placeholders = options.adapters.map(() => '?').join(', ');
      conditions.push(`adapter_id IN (${placeholders})`);
      params.push(...options.adapters);
    }
    if (options?.layers?.length) {
      const placeholders = options.layers.map(() => '?').join(', ');
      conditions.push(`layer IN (${placeholders})`);
      params.push(...options.layers);
    }
    if (options?.project) {
      conditions.push('project = ?');
      params.push(options.project);
    }
    if (options?.role) {
      conditions.push('role = ?');
      params.push(options.role);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = db.prepare(`SELECT memory_id, embedding FROM embeddings ${whereClause}`).all(...params) as Array<{
      memory_id: string;
      embedding: Buffer;
    }>;

    // Compute cosine similarity in JS
    const results: Array<{ memoryId: string; score: number }> = [];
    for (const row of rows) {
      const emb = new Float32Array(row.embedding.buffer, row.embedding.byteOffset, row.embedding.byteLength / 4);
      const score = cosineSimilarity(queryEmb, emb);
      results.push({ memoryId: row.memory_id, score });
    }

    // Sort by score descending, take top N
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  /**
   * Delete embedding for a memory entry.
   */
  async deleteEntry(memoryId: string): Promise<boolean> {
    const db = this.ensureReady();
    const result = db.prepare('DELETE FROM embeddings WHERE memory_id = ?').run(memoryId);
    return result.changes > 0;
  }

  /**
   * Get statistics about the vector store.
   */
  async getStats(): Promise<{
    totalEmbeddings: number;
    byAdapter: Record<string, number>;
    dbSizeBytes: number;
  }> {
    const db = this.ensureReady();

    const totalRow = db.prepare('SELECT COUNT(*) as total FROM embeddings').get() as { total: number };
    const adapterRows = db.prepare(
      'SELECT adapter_id as key, COUNT(*) as count FROM embeddings GROUP BY adapter_id',
    ).all() as Array<{ key: string; count: number }>;

    let dbSizeBytes = 0;
    try {
      dbSizeBytes = fs.statSync(VECTOR_DB_PATH).size;
    } catch {
      // File may not exist yet
    }

    return {
      totalEmbeddings: totalRow.total,
      byAdapter: Object.fromEntries(adapterRows.map((r) => [r.key, r.count])),
      dbSizeBytes,
    };
  }

  /**
   * Get all memory IDs that have embeddings.
   */
  getEmbeddedIds(): Set<string> {
    const db = this.ensureReady();
    const rows = db.prepare('SELECT memory_id FROM embeddings').all() as Array<{ memory_id: string }>;
    return new Set(rows.map((r) => r.memory_id));
  }

  /**
   * Check if vector store is ready (initialized and model loaded).
   */
  isReady(): boolean {
    return this.db !== null && this.extractor !== null;
  }

  /**
   * Close the database connection.
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.extractor = null;
    this.initPromise = null;
  }
}

/**
 * Cosine similarity between two vectors.
 * Both vectors should be normalized (unit length) for this to equal dot product.
 */
function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
  }
  return dot;
}

export const vectorStore = new VectorStore();
