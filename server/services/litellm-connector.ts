/**
 * LiteLLM Connector — Read LiteLLM proxy config and (optionally) PostgreSQL spend data.
 *
 * Primary: Parse config.yaml for model list (no extra deps needed).
 * Optional: Connect to LiteLLM PostgreSQL DB for spend_logs if LITELLM_DB_URL is set.
 */

import fsp from 'fs/promises';
import path from 'path';

const CONFIG_PATHS = [
  path.resolve(process.cwd(), '..', 'litellm-proxy', 'config.yaml'),
  path.resolve(process.cwd(), 'litellm-proxy', 'config.yaml'),
  '/etc/litellm/config.yaml',
];

export interface LiteLLMModel {
  modelName: string;
  provider: string;
  underlyingModel: string;
  apiBase?: string;
}

export interface LiteLLMConfig {
  models: LiteLLMModel[];
  generalSettings?: Record<string, unknown>;
}

/**
 * Lightweight YAML parser — extracts model_list entries from LiteLLM config.
 * This avoids needing js-yaml as a dependency. Handles the specific LiteLLM format.
 */
function parseLiteLLMConfig(yamlContent: string): LiteLLMConfig {
  const models: LiteLLMModel[] = [];
  const lines = yamlContent.split('\n');

  let currentModelName = '';
  let currentModel = '';
  let currentApiBase = '';
  let inModelList = false;
  let inLitellmParams = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === 'model_list:') {
      inModelList = true;
      continue;
    }

    if (inModelList && trimmed.startsWith('- model_name:')) {
      // Save previous model if exists
      if (currentModelName && currentModel) {
        const provider = currentModel.includes('/') ? currentModel.split('/')[0] : 'unknown';
        models.push({
          modelName: currentModelName,
          provider,
          underlyingModel: currentModel,
          apiBase: currentApiBase || undefined,
        });
      }
      currentModelName = trimmed.replace('- model_name:', '').trim();
      currentModel = '';
      currentApiBase = '';
      inLitellmParams = false;
      continue;
    }

    if (inModelList && trimmed === 'litellm_params:') {
      inLitellmParams = true;
      continue;
    }

    if (inLitellmParams && trimmed.startsWith('model:')) {
      currentModel = trimmed.replace('model:', '').trim();
      continue;
    }

    if (inLitellmParams && trimmed.startsWith('api_base:')) {
      currentApiBase = trimmed.replace('api_base:', '').trim().replace(/"/g, '');
      continue;
    }

    // Exit model_list when we hit a top-level key
    if (inModelList && !trimmed.startsWith('-') && !trimmed.startsWith('#') && trimmed.endsWith(':') && !line.startsWith(' ')) {
      inModelList = false;
    }
  }

  // Push last model
  if (currentModelName && currentModel) {
    const provider = currentModel.includes('/') ? currentModel.split('/')[0] : 'unknown';
    models.push({
      modelName: currentModelName,
      provider,
      underlyingModel: currentModel,
      apiBase: currentApiBase || undefined,
    });
  }

  return { models };
}

let cachedConfig: LiteLLMConfig | null = null;
let cacheTime = 0;
const CACHE_TTL = 300_000; // 5 minutes

export async function getLiteLLMConfig(): Promise<LiteLLMConfig | null> {
  if (cachedConfig && Date.now() - cacheTime < CACHE_TTL) {
    return cachedConfig;
  }

  for (const configPath of CONFIG_PATHS) {
    try {
      const content = await fsp.readFile(configPath, 'utf-8');
      cachedConfig = parseLiteLLMConfig(content);
      cacheTime = Date.now();
      return cachedConfig;
    } catch {
      // Try next path
    }
  }

  return null;
}

export async function getLiteLLMModels(): Promise<LiteLLMModel[]> {
  const config = await getLiteLLMConfig();
  return config?.models || [];
}

export async function getLiteLLMModelsByProvider(): Promise<Record<string, LiteLLMModel[]>> {
  const models = await getLiteLLMModels();
  const byProvider: Record<string, LiteLLMModel[]> = {};
  for (const m of models) {
    if (!byProvider[m.provider]) byProvider[m.provider] = [];
    byProvider[m.provider].push(m);
  }
  return byProvider;
}

/**
 * Get spend data from LiteLLM PostgreSQL.
 * Only works if LITELLM_DB_URL env is set.
 * Returns null if DB is not configured.
 */
export async function getLiteLLMSpend(): Promise<unknown | null> {
  const dbUrl = process.env.LITELLM_DB_URL;
  if (!dbUrl) return null;

  // Dynamic import pg to avoid requiring it when not used
  try {
    const { default: pg } = await import('pg');
    const client = new pg.Client({ connectionString: dbUrl });
    await client.connect();

    const spendResult = await client.query(`
      SELECT
        model,
        SUM(spend) as total_spend,
        COUNT(*) as request_count,
        SUM(total_tokens) as total_tokens,
        MIN(starttime) as first_request,
        MAX(starttime) as last_request
      FROM litellm.spend_log
      GROUP BY model
      ORDER BY total_spend DESC
      LIMIT 50
    `);

    const dailyResult = await client.query(`
      SELECT
        DATE(starttime) as date,
        SUM(spend) as daily_spend,
        COUNT(*) as daily_requests
      FROM litellm.spend_log
      WHERE starttime > NOW() - INTERVAL '30 days'
      GROUP BY DATE(starttime)
      ORDER BY date DESC
    `);

    await client.end();

    return {
      byModel: spendResult.rows,
      daily: dailyResult.rows,
    };
  } catch (err) {
    console.error('[LiteLLM] DB query failed:', (err as Error).message);
    return null;
  }
}
