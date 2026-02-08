import fs from 'fs/promises';
import path from 'path';

const PROVIDERS_PATH = path.resolve(import.meta.dirname, '../../providers.json');

export interface ProviderModel {
  id: string;
  name: string;
  contextWindow?: number;
  maxTokens?: number;
}

export interface Provider {
  id: string;
  name: string;
  apiBase: string;
  apiKey: string;
  models: ProviderModel[];
  enabled: boolean;
  autoDiscover?: boolean;
}

interface ProvidersConfig {
  providers: Provider[];
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
}

// --- Config read/write ---

export async function loadProviders(): Promise<Provider[]> {
  try {
    const raw = await fs.readFile(PROVIDERS_PATH, 'utf-8');
    const config: ProvidersConfig = JSON.parse(raw);
    return config.providers;
  } catch {
    return [];
  }
}

export async function saveProviders(providers: Provider[]): Promise<void> {
  const content = JSON.stringify({ providers }, null, 2);
  await fs.writeFile(PROVIDERS_PATH, content, 'utf-8');
}

export async function getProvider(id: string): Promise<Provider | undefined> {
  const providers = await loadProviders();
  return providers.find((p) => p.id === id);
}

// --- Chat Completion (non-streaming) ---

export async function chatCompletion(
  provider: Provider,
  modelId: string,
  messages: ChatMessage[],
  options: ChatOptions = {},
): Promise<Record<string, unknown>> {
  const res = await fetch(`${provider.apiBase}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      model: modelId,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
      stream: false,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Provider ${provider.name} error (${res.status}): ${err}`);
  }

  return res.json() as Promise<Record<string, unknown>>;
}

// --- Streaming Chat Completion ---

export async function streamChatCompletion(
  provider: Provider,
  modelId: string,
  messages: ChatMessage[],
  options: ChatOptions,
  onChunk: (data: string) => void,
  onDone: (usage?: Record<string, unknown>) => void,
  onError: (err: Error) => void,
): Promise<AbortController> {
  const controller = new AbortController();

  try {
    const res = await fetch(`${provider.apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4096,
        stream: true,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = await res.text();
      onError(new Error(`Provider ${provider.name} error (${res.status}): ${err}`));
      return controller;
    }

    const reader = res.body?.getReader();
    if (!reader) {
      onError(new Error('No response body'));
      return controller;
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let lastUsage: Record<string, unknown> | undefined;

    const processLines = (text: string) => {
      buffer += text;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue;

        if (trimmed.startsWith('data: ')) {
          const data = trimmed.slice(6);
          if (data === '[DONE]') {
            onDone(lastUsage);
            return true;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              onChunk(JSON.stringify({ type: 'content', content }));
            }
            if (parsed.usage) {
              lastUsage = parsed.usage;
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
      return false;
    };

    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            if (buffer.trim()) processLines('\n');
            onDone(lastUsage);
            break;
          }
          const text = decoder.decode(value, { stream: true });
          if (processLines(text)) break;
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          onError(err as Error);
        }
      }
    })();
  } catch (err) {
    if ((err as Error).name !== 'AbortError') {
      onError(err as Error);
    }
  }

  return controller;
}

// --- Test Provider ---

export async function testProvider(provider: Provider): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    const res = await fetch(`${provider.apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model: provider.models[0]?.id || 'test',
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5,
        stream: false,
      }),
      signal: AbortSignal.timeout(15000),
    });

    const latencyMs = Date.now() - start;

    if (!res.ok) {
      const err = await res.text();
      return { ok: false, latencyMs, error: `HTTP ${res.status}: ${err.slice(0, 200)}` };
    }

    return { ok: true, latencyMs };
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - start, error: (err as Error).message };
  }
}

// --- Discover Models (for LiteLLM / OpenAI-compatible endpoints) ---

export async function discoverModels(provider: Provider): Promise<ProviderModel[]> {
  try {
    const res = await fetch(`${provider.apiBase}/models`, {
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return [];

    const data = (await res.json()) as { data?: Array<{ id: string; owned_by?: string }> };
    return (data.data || []).map((m) => ({
      id: m.id,
      name: m.id,
    }));
  } catch {
    return [];
  }
}

// --- Mask API key for frontend display ---

export function maskApiKey(key: string): string {
  if (!key || key.length < 8) return '••••••••';
  return `${key.slice(0, 4)}${'•'.repeat(Math.min(key.length - 8, 20))}${key.slice(-4)}`;
}
