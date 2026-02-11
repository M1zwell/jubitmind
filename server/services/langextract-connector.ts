/**
 * LangExtract Connector — Proxy to the Python FastAPI sidecar for structured extraction.
 *
 * Communicates with the sidecar at LANGEXTRACT_URL (default http://127.0.0.1:3100).
 * Results are cached to disk in data/extractions/.
 */

import fsp from 'fs/promises';
import path from 'path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExtractionEntity {
  type: string;
  value: string;
  confidence: number;
  sourceStart: number;
  sourceEnd: number;
  sourceText: string;
  alignment?: string;
  metadata?: Record<string, unknown>;
}

export interface ExtractionResult {
  id: string;
  sessionId: string;
  schemaName: string;
  timestamp: string;
  duration_ms: number;
  entities: ExtractionEntity[];
  modelUsed: string;
  provider: string;
  totalEntities: number;
  textLength?: number;
}

export interface ExtractionSchema {
  name: string;
  description: string;
  entityTypes: string[];
  examples: number;
}

export interface SidecarStatus {
  available: boolean;
  version?: string;
  activeProvider?: string;
  activeModel?: string;
  hasApiKey?: boolean;
  apiBase?: string;
  providers: {
    ollama: { available: boolean; url: string };
    gemini: { available: boolean; hasKey: boolean };
    openai: { available: boolean; hasKey: boolean };
    'openai-compatible'?: { available: boolean; url: string };
  };
}

export interface ProviderPreset {
  id: string;
  name: string;
  defaultModel: string;
  needsKey: boolean;
  keyEnvVars: string[];
  hasKey: boolean;
  isActive: boolean;
  defaultApiBase?: string;
}

export interface SidecarConfig {
  provider: string;
  model_id: string;
  api_key: string;
  api_base: string;
  ollama_url: string;
  hasApiKey?: boolean;
  max_char_buffer?: number;
  extraction_passes?: number;
  max_workers?: number;
  temperature?: number;
  batch_length?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SIDECAR_URL = process.env.LANGEXTRACT_URL || 'http://127.0.0.1:3100';
const RESULTS_DIR = path.join(process.cwd(), 'data', 'extractions');
const CACHE_TTL = 300_000; // 5 minutes

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

let cachedStatus: SidecarStatus | null = null;
let statusCacheTime = 0;

let cachedSchemas: ExtractionSchema[] | null = null;
let schemasCacheTime = 0;

// ---------------------------------------------------------------------------
// Sidecar communication
// ---------------------------------------------------------------------------

async function sidecarGet<T>(endpoint: string): Promise<T | null> {
  try {
    const res = await fetch(`${SIDECAR_URL}${endpoint}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function sidecarPost<T>(endpoint: string, body: unknown): Promise<T> {
  const res = await fetch(`${SIDECAR_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(300_000), // 5 min timeout for multi-pass extraction
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Sidecar error: ${res.status}`);
  }
  return res.json();
}

async function sidecarGetRaw(endpoint: string): Promise<Response | null> {
  try {
    const res = await fetch(`${SIDECAR_URL}${endpoint}`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    return res;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getSidecarStatus(): Promise<SidecarStatus> {
  if (cachedStatus && Date.now() - statusCacheTime < CACHE_TTL) {
    return cachedStatus;
  }

  const statusData = await sidecarGet<SidecarStatus>('/status');
  if (!statusData?.available) {
    return {
      available: false,
      providers: {
        ollama: { available: false, url: '' },
        gemini: { available: false, hasKey: false },
        openai: { available: false, hasKey: false },
      },
    };
  }

  cachedStatus = statusData;
  statusCacheTime = Date.now();
  return cachedStatus;
}

export async function getProviderPresets(): Promise<ProviderPreset[]> {
  const data = await sidecarGet<{ providers: ProviderPreset[] }>('/providers');
  return data?.providers || [];
}

export async function getSidecarConfig(): Promise<SidecarConfig | null> {
  return sidecarGet<SidecarConfig>('/config');
}

export async function updateSidecarConfig(config: Partial<SidecarConfig>): Promise<{ ok: boolean }> {
  cachedStatus = null;
  statusCacheTime = 0;
  return sidecarPost<{ ok: boolean }>('/config', config);
}

export async function getSchemas(): Promise<ExtractionSchema[]> {
  if (cachedSchemas && Date.now() - schemasCacheTime < CACHE_TTL) {
    return cachedSchemas;
  }

  const data = await sidecarGet<{ schemas: ExtractionSchema[] }>('/schemas');
  if (data?.schemas) {
    cachedSchemas = data.schemas;
    schemasCacheTime = Date.now();
    return cachedSchemas;
  }

  return [];
}

export async function extractFromText(
  text: string,
  schemaName: string,
  sessionId: string,
  options?: { modelId?: string; extractionPasses?: number },
): Promise<ExtractionResult> {
  const response = await sidecarPost<{
    id: string;
    schema_name: string;
    timestamp: string;
    duration_ms: number;
    entities: Array<{
      type: string;
      value: string;
      confidence: number;
      source_start: number;
      source_end: number;
      source_text: string;
      alignment?: string;
      metadata?: Record<string, unknown>;
    }>;
    model_used: string;
    provider: string;
    total_entities: number;
    text_length: number;
  }>('/extract', {
    text,
    schema_name: schemaName,
    model_id: options?.modelId,
    extraction_passes: options?.extractionPasses,
  });

  // Map snake_case from Python to camelCase
  const result: ExtractionResult = {
    id: response.id,
    sessionId,
    schemaName: response.schema_name,
    timestamp: response.timestamp,
    duration_ms: response.duration_ms,
    entities: response.entities.map((e) => ({
      type: e.type,
      value: e.value,
      confidence: e.confidence,
      sourceStart: e.source_start,
      sourceEnd: e.source_end,
      sourceText: e.source_text,
      alignment: e.alignment,
      metadata: e.metadata,
    })),
    modelUsed: response.model_used,
    provider: response.provider,
    totalEntities: response.total_entities,
    textLength: response.text_length,
  };

  // Persist result to disk
  await saveResult(result);

  return result;
}

/**
 * Get visualization HTML for a result from the sidecar.
 * Returns the raw HTML string or null if unavailable.
 */
export async function getVisualizationHtml(resultId: string): Promise<string | null> {
  const res = await sidecarGetRaw(`/visualize/${resultId}`);
  if (!res) return null;
  return res.text();
}

// ---------------------------------------------------------------------------
// Result persistence
// ---------------------------------------------------------------------------

async function saveResult(result: ExtractionResult): Promise<void> {
  try {
    const sessionDir = path.join(RESULTS_DIR, result.sessionId);
    await fsp.mkdir(sessionDir, { recursive: true });
    await fsp.writeFile(
      path.join(sessionDir, `${result.id}.json`),
      JSON.stringify(result, null, 2),
    );
  } catch {
    // non-critical
  }
}

export async function getResultsForSession(sessionId: string): Promise<ExtractionResult[]> {
  try {
    const sessionDir = path.join(RESULTS_DIR, sessionId);
    const files = await fsp.readdir(sessionDir);
    const results: ExtractionResult[] = [];

    for (const file of files.filter((f) => f.endsWith('.json')).sort().reverse()) {
      try {
        const content = await fsp.readFile(path.join(sessionDir, file), 'utf-8');
        results.push(JSON.parse(content));
      } catch {
        // skip
      }
    }

    return results;
  } catch {
    return [];
  }
}

export async function getAllResults(limit = 50, offset = 0): Promise<{ results: ExtractionResult[]; total: number }> {
  try {
    await fsp.mkdir(RESULTS_DIR, { recursive: true });
    const sessionDirs = await fsp.readdir(RESULTS_DIR);
    const allResults: ExtractionResult[] = [];

    for (const dir of sessionDirs) {
      const dirPath = path.join(RESULTS_DIR, dir);
      const stat = await fsp.stat(dirPath);
      if (!stat.isDirectory()) continue;

      const files = await fsp.readdir(dirPath);
      for (const file of files.filter((f) => f.endsWith('.json'))) {
        try {
          const content = await fsp.readFile(path.join(dirPath, file), 'utf-8');
          allResults.push(JSON.parse(content));
        } catch {
          // skip
        }
      }
    }

    // Sort by timestamp descending
    allResults.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    return {
      results: allResults.slice(offset, offset + limit),
      total: allResults.length,
    };
  } catch {
    return { results: [], total: 0 };
  }
}
