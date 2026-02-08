import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import readline from 'readline';
import { fileURLToPath } from 'url';

interface ConversationMessage {
  type: 'user' | 'assistant' | 'system';
  message: { role: string; content: string };
  sessionId: string;
  timestamp: string;
  uuid: string;
  parentUuid?: string;
  cwd?: string;
  gitBranch?: string;
  metadata?: Record<string, unknown>;
}

interface SessionMeta {
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  mode: 'claude-cli' | 'ai-chat';
  model?: string;
  providerId?: string;
  preview: string;
  source: 'dashboard';
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONVERSATIONS_DIR = path.resolve(__dirname, '../../conversations');

async function ensureDir() {
  await fsp.mkdir(CONVERSATIONS_DIR, { recursive: true });
}

export function createSession(): string {
  return randomUUID();
}

export async function appendMessage(sessionId: string, msg: ConversationMessage): Promise<void> {
  await ensureDir();
  const sessionPath = path.join(CONVERSATIONS_DIR, `${sessionId}.jsonl`);
  const line = JSON.stringify(msg) + '\n';
  await fsp.appendFile(sessionPath, line, 'utf-8');
  await updateMeta(sessionId, msg);
}

async function updateMeta(sessionId: string, msg: ConversationMessage): Promise<void> {
  const metaPath = path.join(CONVERSATIONS_DIR, `${sessionId}.meta.json`);
  let meta: SessionMeta;

  try {
    const raw = await fsp.readFile(metaPath, 'utf-8');
    meta = JSON.parse(raw);
    meta.messageCount++;
    meta.updatedAt = msg.timestamp;
    if (msg.type === 'user' && !meta.preview) {
      meta.preview = (msg.message.content as string).slice(0, 120);
    }
  } catch {
    meta = {
      sessionId,
      createdAt: msg.timestamp,
      updatedAt: msg.timestamp,
      messageCount: 1,
      mode: (msg.metadata?.mode as 'claude-cli' | 'ai-chat') || 'claude-cli',
      model: msg.metadata?.model as string | undefined,
      providerId: msg.metadata?.providerId as string | undefined,
      preview: msg.type === 'user' ? (msg.message.content as string).slice(0, 120) : '',
      source: 'dashboard',
    };
  }

  await fsp.writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
}

export async function listSessions(): Promise<SessionMeta[]> {
  await ensureDir();
  const files = await fsp.readdir(CONVERSATIONS_DIR);
  const metaFiles = files.filter((f) => f.endsWith('.meta.json'));

  const sessions: SessionMeta[] = [];
  for (const f of metaFiles) {
    try {
      const raw = await fsp.readFile(path.join(CONVERSATIONS_DIR, f), 'utf-8');
      sessions.push(JSON.parse(raw));
    } catch {
      // skip corrupt meta files
    }
  }

  sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return sessions;
}

export async function getMessages(
  sessionId: string,
  offset: number,
  limit: number,
): Promise<ConversationMessage[]> {
  const sessionPath = path.join(CONVERSATIONS_DIR, `${sessionId}.jsonl`);
  const messages: ConversationMessage[] = [];

  const rl = readline.createInterface({
    input: fs.createReadStream(sessionPath),
    crlfDelay: Infinity,
  });

  let lineNum = 0;
  for await (const line of rl) {
    if (lineNum >= offset && lineNum < offset + limit) {
      try {
        messages.push(JSON.parse(line));
      } catch {
        // skip malformed lines
      }
    }
    if (lineNum >= offset + limit) {
      rl.close();
      break;
    }
    lineNum++;
  }

  return messages;
}

export async function deleteSession(sessionId: string): Promise<void> {
  const jsonlPath = path.join(CONVERSATIONS_DIR, `${sessionId}.jsonl`);
  const metaPath = path.join(CONVERSATIONS_DIR, `${sessionId}.meta.json`);
  await fsp.unlink(jsonlPath).catch(() => {});
  await fsp.unlink(metaPath).catch(() => {});
}
