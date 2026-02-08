import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import os from 'os';
import readline from 'readline';
import { PATHS } from './config-resolver.js';
import {
  getAllSessions,
  getSessionsForProject,
  refreshAll,
  resolveSessionPath,
  type CachedSessionMeta,
} from './session-cache.js';

interface SessionMeta {
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  mode: 'claude-cli';
  preview: string;
  source: 'claude-code';
  sizeBytes?: number;
  projectSlug?: string;
  projectDisplayName?: string;
  riskLevel?: string;
  riskScore?: number;
  autoTags?: string[];
  manualTags?: string[];
}

export interface ClaudeMessage {
  type: string;
  message?: { role: string; content: string | object[] };
  sessionId?: string;
  timestamp?: string;
  uuid?: string;
  parentUuid?: string;
  cwd?: string;
  gitBranch?: string;
  // Tool use fields
  tool_name?: string;
  tool_input?: unknown;
  tool_result?: unknown;
  [key: string]: unknown;
}

const HOME = os.homedir();

function extractContent(msg: ClaudeMessage): string {
  if (!msg.message?.content) return '';
  if (typeof msg.message.content === 'string') return msg.message.content;
  if (Array.isArray(msg.message.content)) {
    const textBlock = msg.message.content.find(
      (b: { type?: string }) => b.type === 'text',
    ) as { text?: string } | undefined;
    return textBlock?.text || '';
  }
  return '';
}

function toSessionMeta(cached: CachedSessionMeta): SessionMeta {
  return {
    sessionId: cached.sessionId,
    createdAt: cached.createdAt,
    updatedAt: cached.updatedAt,
    messageCount: cached.messageCount,
    mode: cached.mode,
    preview: cached.preview,
    source: cached.source,
    sizeBytes: cached.sizeBytes,
    projectSlug: cached.projectSlug,
    projectDisplayName: cached.projectDisplayName,
    riskLevel: cached.riskLevel,
    riskScore: cached.riskScore,
    autoTags: cached.autoTags,
    manualTags: cached.manualTags,
  };
}

export async function listClaudeSessions(options: {
  project?: string;
  limit?: number;
} = {}): Promise<SessionMeta[]> {
  const { project, limit = 50 } = options;

  // Trigger a refresh on each listing call (incremental, fast after first load)
  await refreshAll();

  const cached = project
    ? await getSessionsForProject(project, limit)
    : await getAllSessions(limit);

  return cached.map(toSessionMeta);
}

export async function getClaudeMessages(
  sessionId: string,
  projectSlug: string | undefined,
  offset: number,
  limit: number,
): Promise<ClaudeMessage[]> {
  let sessionPath: string;

  if (projectSlug) {
    sessionPath = resolveSessionPath(projectSlug, sessionId);
  } else {
    // Fallback: try the default project (backward compatibility)
    sessionPath = path.join(
      PATHS.projectsDir,
      '-Users-jubit-nb0-JubitLLMNPMPlayground',
      `${sessionId}.jsonl`,
    );
  }

  // Verify file exists
  try {
    await fsp.access(sessionPath);
  } catch {
    throw new Error(`Session file not found: ${sessionId}`);
  }

  const messages: ClaudeMessage[] = [];

  const rl = readline.createInterface({
    input: fs.createReadStream(sessionPath),
    crlfDelay: Infinity,
  });

  let collected = 0;
  for await (const line of rl) {
    if (!line.trim()) continue;

    try {
      const parsed: ClaudeMessage = JSON.parse(line);

      // Include user, assistant, and tool_use/tool_result messages
      // Skip progress, system, file-history-snapshot for cleaner display
      const validTypes = ['user', 'assistant'];
      if (!validTypes.includes(parsed.type)) continue;

      // Keep array content blocks intact for tool_use rendering in the UI

      if (collected >= offset && collected < offset + limit) {
        messages.push(parsed);
      }
      collected++;

      if (collected >= offset + limit) {
        rl.close();
        break;
      }
    } catch {
      // skip malformed lines
    }
  }

  return messages;
}

/**
 * Read ALL user+assistant messages without content normalization.
 * Used by risk scoring and auto-tagging pipelines.
 */
export async function getClaudeMessagesRaw(
  sessionId: string,
  projectSlug: string | undefined,
): Promise<ClaudeMessage[]> {
  let sessionPath: string;
  if (projectSlug) {
    sessionPath = resolveSessionPath(projectSlug, sessionId);
  } else {
    sessionPath = path.join(
      PATHS.projectsDir,
      '-Users-jubit-nb0-JubitLLMNPMPlayground',
      `${sessionId}.jsonl`,
    );
  }

  try {
    await fsp.access(sessionPath);
  } catch {
    throw new Error(`Session file not found: ${sessionId}`);
  }

  const messages: ClaudeMessage[] = [];
  const rl = readline.createInterface({
    input: fs.createReadStream(sessionPath),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const parsed: ClaudeMessage = JSON.parse(line);
      if (parsed.type === 'user' || parsed.type === 'assistant') {
        messages.push(parsed);
      }
    } catch {
      // skip malformed lines
    }
  }

  return messages;
}

export async function getGlobalHistory(
  limit = 100,
): Promise<Array<{ display: string; timestamp: number; project: string }>> {
  const historyPath = path.join(HOME, '.claude', 'history.jsonl');

  try {
    const rl = readline.createInterface({
      input: fs.createReadStream(historyPath),
      crlfDelay: Infinity,
    });

    const all: Array<{ display: string; timestamp: number; project: string }> = [];
    for await (const line of rl) {
      if (!line.trim()) continue;
      try {
        all.push(JSON.parse(line));
      } catch {
        // skip
      }
    }

    return all.slice(-limit).reverse();
  } catch {
    return [];
  }
}

export async function getStatsCache(): Promise<Record<string, unknown> | null> {
  const statsPath = path.join(HOME, '.claude', 'stats-cache.json');
  try {
    const raw = await fsp.readFile(statsPath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
