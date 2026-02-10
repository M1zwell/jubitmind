import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface AdapterInfo {
  id: string;
  name: string;
  icon: string;
  category: 'cli' | 'ide' | 'extension' | 'api-router';
  description: string;
  available: boolean;
  sessionCount?: number;
}

export interface UnifiedTotals {
  totalSessions: number;
  totalMessages: number;
  totalTokens: number;
  totalCostUsd: number;
}

export interface AdapterStatsEntry {
  adapterId: string;
  name: string;
  totalSessions: number;
  totalMessages: number;
  totalTokens?: number;
  totalCostUsd?: number;
  oldestSession?: string;
  newestSession?: string;
  modelUsage?: Record<string, number>;
}

export interface UnifiedStatsData {
  adapters: AdapterStatsEntry[];
  totals: UnifiedTotals;
}

export function useAdapterList() {
  return useQuery<AdapterInfo[]>({
    queryKey: ['adapters'],
    queryFn: () => api.adapters.list(),
    staleTime: 30_000,
  });
}

export function useUnifiedStats() {
  return useQuery<UnifiedStatsData>({
    queryKey: ['adapters-unified-stats'],
    queryFn: () => api.adapters.unifiedStats(),
    staleTime: 60_000,
  });
}

export function useAdapterSessions(adapterId: string, options?: { limit?: number; project?: string }) {
  return useQuery({
    queryKey: ['adapter-sessions', adapterId, options],
    queryFn: () => api.adapters.sessions(adapterId, options),
    staleTime: 30_000,
    enabled: !!adapterId,
  });
}
