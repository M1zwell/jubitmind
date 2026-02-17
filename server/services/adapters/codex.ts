import { existsSync } from 'fs';
import fsp from 'fs/promises';
import { homedir } from 'os';
import { join, basename } from 'path';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import type { AIToolAdapter, AdapterSessionMeta, AdapterMessage, AdapterStats } from './types.js';

const DATA_DIR = join(homedir(), '.codex');
const SESSIONS_DIR = join(DATA_DIR, 'sessions');

// UUID regex to extract session ID from filename
const UUID_RE = /([0-9a-f]{4,8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jsonl$/;

// ---- Internal JSONL types ----

interface CodexLine {
  timestamp: string;
  type: 'session_meta' | 'response_item' | 'event_msg' | 'turn_context';
  payload: Record<string, unknown>;
}

interface CodexSessionMetaPayload {
  id: string;
  timestamp: string;
  cwd: string;
  cli_version: string;
  model_provider: string;
  git?: { commit_hash: string; branch: string; repository_url: string };
}

interface CodexContentBlock {
  type: string;
  text?: string;
}

interface CodexResponsePayload {
  type: 'message' | 'function_call' | 'function_call_output' | 'reasoning' | 'web_search_call';
  role?: 'user' | 'assistant' | 'developer';
  content?: CodexContentBlock[];
  phase?: 'commentary' | 'final_answer';
  name?: string;
  arguments?: string;
  call_id?: string;
  output?: string;
  summary?: Array<{ type: string; text: string }>;
  encrypted_content?: string;
}

interface TokenUsageInfo {
  total_token_usage?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
}

// ---- Helpers ----

/** Recursively find all .jsonl files under a directory */
async function walkJsonl(dir: string): Promise<string[]> {
  const results: string[] = [];
  try {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...(await walkJsonl(full)));
      } else if (entry.name.endsWith('.jsonl')) {
        results.push(full);
      }
    }
  } catch {
    // Directory doesn't exist or can't be read
  }
  return results;
}

/** Extract session UUID from a filename like rollout-...-UUID.jsonl */
function extractSessionId(filePath: string): string | null {
  const name = basename(filePath);
  const match = UUID_RE.exec(name);
  return match ? match[1] : null;
}

/** Derive a human-readable project slug from cwd */
function projectSlugFromCwd(cwd: string): string {
  const segments = cwd.split('/').filter(Boolean);
  return segments[segments.length - 1] || 'unknown';
}

/** Read just the first N lines of a JSONL file using streaming */
async function readFirstLines(filePath: string, maxLines: number): Promise<string[]> {
  const lines: string[] = [];
  const rl = createInterface({
    input: createReadStream(filePath, { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (line.trim()) {
      lines.push(line);
    }
    if (lines.length >= maxLines) {
      rl.close();
      break;
    }
  }
  return lines;
}

/** Parse a single JSONL line safely */
function parseLine(raw: string): CodexLine | null {
  try {
    return JSON.parse(raw) as CodexLine;
  } catch {
    return null;
  }
}

/** Extract text content from a Codex content block array */
function extractText(content?: CodexContentBlock[]): string {
  if (!content || content.length === 0) return '';
  return content.map((b) => b.text || '').join('\n').trim();
}

/** Read all lines of a JSONL file streaming */
async function readAllLines(filePath: string): Promise<CodexLine[]> {
  const lines: CodexLine[] = [];
  const rl = createInterface({
    input: createReadStream(filePath, { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  });

  for await (const raw of rl) {
    if (!raw.trim()) continue;
    const parsed = parseLine(raw);
    if (parsed) lines.push(parsed);
  }
  return lines;
}

// ---- Session file index (cached in memory) ----

let sessionFileMap: Map<string, string> | null = null; // sessionId -> filePath
let fileMapBuiltAt = 0;
const FILE_MAP_TTL = 60_000; // 1 minute

async function getSessionFileMap(): Promise<Map<string, string>> {
  const now = Date.now();
  if (sessionFileMap && now - fileMapBuiltAt < FILE_MAP_TTL) {
    return sessionFileMap;
  }

  const files = await walkJsonl(SESSIONS_DIR);
  const map = new Map<string, string>();
  for (const f of files) {
    const sid = extractSessionId(f);
    if (sid) map.set(sid, f);
  }
  sessionFileMap = map;
  fileMapBuiltAt = now;
  return map;
}

// ---- Adapter ----

export const codexAdapter: AIToolAdapter = {
  id: 'codex',
  name: 'OpenAI Codex CLI',
  icon: 'Code2',
  category: 'cli',
  description: 'OpenAI Codex CLI sessions from ~/.codex/',

  async isAvailable(): Promise<boolean> {
    return existsSync(DATA_DIR);
  },

  async discoverSessions(options?: {
    limit?: number;
    offset?: number;
    project?: string;
  }): Promise<AdapterSessionMeta[]> {
    if (!existsSync(SESSIONS_DIR)) return [];

    const fileMap = await getSessionFileMap();
    const sessions: AdapterSessionMeta[] = [];

    for (const [sessionId, filePath] of fileMap) {
      try {
        // Read first ~20 lines to get session_meta + first real user message
        const rawLines = await readFirstLines(filePath, 20);
        const parsed = rawLines.map(parseLine).filter(Boolean) as CodexLine[];

        // Find session_meta
        const metaLine = parsed.find((l) => l.type === 'session_meta');
        if (!metaLine) continue;

        const meta = metaLine.payload as unknown as CodexSessionMetaPayload;
        const slug = projectSlugFromCwd(meta.cwd || '');

        // Filter by project if requested
        if (options?.project && slug !== options.project) continue;

        // Find the real user prompt for preview (skip system injections like AGENTS.md)
        // The real user message typically comes after a task_started event
        let preview = '';
        let taskStarted = false;
        for (const line of parsed) {
          if (line.type === 'event_msg') {
            const evType = (line.payload as Record<string, unknown>).type;
            if (evType === 'task_started' || evType === 'user_message') {
              taskStarted = true;
            }
          }
          if (taskStarted && line.type === 'response_item') {
            const rp = line.payload as unknown as CodexResponsePayload;
            if (rp.type === 'message' && rp.role === 'user') {
              const text = extractText(rp.content);
              // Skip XML-looking system messages (AGENTS.md, environment_context)
              if (!text.startsWith('#') && !text.startsWith('<')) {
                preview = text.slice(0, 200);
                break;
              }
            }
          }
          // Also check event_msg user_message for the actual prompt text
          if (line.type === 'event_msg') {
            const evPayload = line.payload as Record<string, unknown>;
            if (evPayload.type === 'user_message' && typeof evPayload.message === 'string') {
              preview = (evPayload.message as string).slice(0, 200);
              break;
            }
          }
        }

        // Count messages: count all lines in file for messageCount estimate
        // (full count is expensive; we do it in a lightweight way by counting response_item messages)
        const stat = await fsp.stat(filePath);

        // For a quick count, stream and count message-type response_items
        let msgCount = 0;
        const allLines = await readAllLines(filePath);
        for (const line of allLines) {
          if (line.type === 'response_item') {
            const rp = line.payload as unknown as CodexResponsePayload;
            if (rp.type === 'message' && (rp.role === 'user' || rp.role === 'assistant')) {
              msgCount++;
            }
          }
        }

        sessions.push({
          sessionId,
          adapterId: 'codex',
          createdAt: meta.timestamp || metaLine.timestamp,
          updatedAt: stat.mtime.toISOString(),
          messageCount: msgCount,
          preview: preview || '(no user message)',
          projectSlug: slug,
          projectDisplayName: slug,
          sizeBytes: stat.size,
        });
      } catch (err) {
        console.warn(`[codex-adapter] Failed to parse session ${sessionId}:`, err);
      }
    }

    // Sort by createdAt descending
    sessions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Apply pagination
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 50;
    return sessions.slice(offset, offset + limit);
  },

  async getMessages(
    sessionId: string,
    options?: { offset?: number; limit?: number; project?: string },
  ): Promise<AdapterMessage[]> {
    const fileMap = await getSessionFileMap();
    const filePath = fileMap.get(sessionId);
    if (!filePath) return [];

    const allLines = await readAllLines(filePath);
    const messages: AdapterMessage[] = [];

    for (const line of allLines) {
      if (line.type !== 'response_item') continue;

      const rp = line.payload as unknown as CodexResponsePayload;

      if (rp.type === 'message') {
        // Map roles: user/assistant stay, developer -> system
        let role: AdapterMessage['role'];
        if (rp.role === 'user') role = 'user';
        else if (rp.role === 'assistant') role = 'assistant';
        else if (rp.role === 'developer') role = 'system';
        else continue;

        const text = extractText(rp.content);
        if (!text) continue;

        messages.push({
          role,
          content: text,
          timestamp: line.timestamp,
          sourceAdapter: 'codex',
          metadata: rp.phase ? { phase: rp.phase } : undefined,
        });
      } else if (rp.type === 'function_call') {
        messages.push({
          role: 'tool',
          content: `${rp.name || 'unknown'}(${(rp.arguments || '').slice(0, 500)})`,
          timestamp: line.timestamp,
          sourceAdapter: 'codex',
          metadata: { callId: rp.call_id, type: 'function_call' },
        });
      } else if (rp.type === 'function_call_output') {
        const output = rp.output || '';
        messages.push({
          role: 'tool',
          content: output.slice(0, 2000),
          timestamp: line.timestamp,
          sourceAdapter: 'codex',
          metadata: { callId: rp.call_id, type: 'function_call_output' },
        });
      }
      // Skip reasoning (encrypted) and web_search_call
    }

    // Apply pagination
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 50;
    return messages.slice(offset, offset + limit);
  },

  async getStats(): Promise<AdapterStats> {
    if (!existsSync(SESSIONS_DIR)) {
      return { totalSessions: 0, totalMessages: 0 };
    }

    const fileMap = await getSessionFileMap();
    let totalMessages = 0;
    let totalTokens = 0;
    let oldestSession: string | undefined;
    let newestSession: string | undefined;
    const modelUsage: Record<string, number> = {};

    for (const [, filePath] of fileMap) {
      try {
        const allLines = await readAllLines(filePath);

        // Get session meta for timestamps and model
        const metaLine = allLines.find((l) => l.type === 'session_meta');
        const meta = metaLine
          ? (metaLine.payload as unknown as CodexSessionMetaPayload)
          : null;

        const sessionTime = meta?.timestamp || metaLine?.timestamp;
        if (sessionTime) {
          if (!oldestSession || sessionTime < oldestSession) oldestSession = sessionTime;
          if (!newestSession || sessionTime > newestSession) newestSession = sessionTime;
        }

        // Count messages
        for (const line of allLines) {
          if (line.type === 'response_item') {
            const rp = line.payload as unknown as CodexResponsePayload;
            if (rp.type === 'message' && (rp.role === 'user' || rp.role === 'assistant')) {
              totalMessages++;
            }
          }
        }

        // Extract token count from the last token_count event
        for (let i = allLines.length - 1; i >= 0; i--) {
          const line = allLines[i];
          if (
            line.type === 'event_msg' &&
            (line.payload as Record<string, unknown>).type === 'token_count'
          ) {
            const info = (line.payload as Record<string, unknown>).info as TokenUsageInfo | null;
            if (info?.total_token_usage?.total_tokens) {
              totalTokens += info.total_token_usage.total_tokens;
            }
            break;
          }
        }

        // Track model usage from turn_context
        for (const line of allLines) {
          if (line.type === 'turn_context') {
            const model = (line.payload as Record<string, unknown>).model as string | undefined;
            if (model) {
              modelUsage[model] = (modelUsage[model] || 0) + 1;
              break; // one per session is enough
            }
          }
        }
      } catch (err) {
        console.warn(`[codex-adapter] Stats parse error for ${filePath}:`, err);
      }
    }

    return {
      totalSessions: fileMap.size,
      totalMessages,
      totalTokens: totalTokens || undefined,
      oldestSession,
      newestSession,
      modelUsage: Object.keys(modelUsage).length > 0 ? modelUsage : undefined,
    };
  },
};
