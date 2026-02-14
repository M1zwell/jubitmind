import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useMemorySearch(params?: Parameters<typeof api.unifiedMemory.search>[0]) {
  return useQuery({
    queryKey: ['unified-memory-search', params],
    queryFn: () => api.unifiedMemory.search(params),
    staleTime: 30_000,
    enabled: !!(params?.text || params?.adapters?.length || params?.tags?.length),
  });
}

export function useMemoryStats() {
  return useQuery({
    queryKey: ['unified-memory-stats'],
    queryFn: () => api.unifiedMemory.stats(),
    staleTime: 60_000,
  });
}

export function useEmbeddingsStats() {
  return useQuery({
    queryKey: ['unified-memory-embeddings-stats'],
    queryFn: () => api.unifiedMemory.embeddingsStats(),
    staleTime: 60_000,
  });
}

export function useMemoryIngest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.unifiedMemory.ingest(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['unified-memory-search'] });
      qc.invalidateQueries({ queryKey: ['unified-memory-stats'] });
      qc.invalidateQueries({ queryKey: ['unified-memory-embeddings-stats'] });
    },
  });
}

export function useMemoryCorrelate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.unifiedMemory.correlate(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['unified-memory-search'] });
    },
  });
}

export function useMemoryAutoTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.unifiedMemory.autoTier(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['unified-memory-search'] });
      qc.invalidateQueries({ queryKey: ['unified-memory-stats'] });
    },
  });
}

export function useEmbeddingsBackfill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.unifiedMemory.embeddingsBackfill(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['unified-memory-embeddings-stats'] });
    },
  });
}
