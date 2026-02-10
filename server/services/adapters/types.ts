/**
 * AIToolAdapter — Unified interface for monitoring any AI coding tool.
 *
 * Each adapter discovers sessions, reads messages, and computes stats
 * from the tool's local data store (JSONL, SQLite, JSON, markdown, etc.)
 */

export interface AdapterSessionMeta {
  sessionId: string;
  adapterId: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  preview: string;
  projectSlug?: string;
  projectDisplayName?: string;
  sizeBytes?: number;
  riskLevel?: 'critical' | 'high' | 'medium' | 'low';
  riskScore?: number;
  tags?: string[];
}

export interface AdapterMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp?: string;
  uuid?: string;
  metadata?: Record<string, unknown>;
}

export interface AdapterStats {
  totalSessions: number;
  totalMessages: number;
  totalTokens?: number;
  totalCostUsd?: number;
  oldestSession?: string;
  newestSession?: string;
  modelUsage?: Record<string, number>;
}

export interface AIToolAdapter {
  /** Unique identifier, e.g. 'claude-code', 'cursor', 'aider' */
  id: string;
  /** Display name for the UI */
  name: string;
  /** Lucide icon name for the sidebar/cards */
  icon: string;
  /** Category for grouping */
  category: 'cli' | 'ide' | 'extension' | 'api-router';
  /** Short description */
  description: string;

  /** Check if this tool's data is available locally */
  isAvailable(): Promise<boolean>;

  /** Discover all sessions from this tool's local storage */
  discoverSessions(options?: {
    limit?: number;
    offset?: number;
    project?: string;
  }): Promise<AdapterSessionMeta[]>;

  /** Get paginated messages for a specific session */
  getMessages(
    sessionId: string,
    options?: { offset?: number; limit?: number; project?: string },
  ): Promise<AdapterMessage[]>;

  /** Get aggregated usage stats */
  getStats(): Promise<AdapterStats>;
}

export interface AdapterInfo {
  id: string;
  name: string;
  icon: string;
  category: AIToolAdapter['category'];
  description: string;
  available: boolean;
  sessionCount?: number;
}
