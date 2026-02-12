export interface MemoryEntry {
  id: string;
  adapterId: string;
  sessionId: string;
  content: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  documentDate: string;
  ingestedAt: string;
  layer: 'hot' | 'warm' | 'cold';
  tags: string[];
  topics: string[];
  relationships: MemoryRelationship[];
  project?: string;
  model?: string;
  toolName?: string;
  riskLevel?: 'critical' | 'high' | 'medium' | 'low';
  contentHash: string;
  contentLength: number;
}

export interface MemoryRelationship {
  type: 'link' | 'update' | 'reference' | 'cross-tool';
  targetId: string;
  weight: number;
  reason?: string;
}

export interface MemorySearchQuery {
  text?: string;
  adapters?: string[];
  layers?: Array<'hot' | 'warm' | 'cold'>;
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
  role?: 'user' | 'assistant';
  project?: string;
  limit?: number;
  offset?: number;
}

export interface MemorySearchResult {
  entries: MemoryEntry[];
  total: number;
  facets: {
    byAdapter: Record<string, number>;
    byLayer: Record<string, number>;
    byTag: Record<string, number>;
    byProject: Record<string, number>;
  };
}

export interface MemoryStats {
  totalEntries: number;
  byAdapter: Record<string, number>;
  byLayer: { hot: number; warm: number; cold: number };
  oldestEntry?: string;
  newestEntry?: string;
  totalSizeBytes: number;
}
