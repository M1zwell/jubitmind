import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useExtractionStatus() {
  return useQuery({
    queryKey: ['extraction-status'],
    queryFn: api.extractions.status,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useExtractionSchemas() {
  return useQuery({
    queryKey: ['extraction-schemas'],
    queryFn: api.extractions.schemas,
    staleTime: 300_000,
  });
}

export function useExtractionProviders() {
  return useQuery({
    queryKey: ['extraction-providers'],
    queryFn: api.extractions.providers,
    staleTime: 60_000,
  });
}

export function useExtractionConfig() {
  return useQuery({
    queryKey: ['extraction-config'],
    queryFn: api.extractions.config,
    staleTime: 30_000,
  });
}

export function useUpdateExtractionConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.extractions.updateConfig,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['extraction-config'] });
      qc.invalidateQueries({ queryKey: ['extraction-status'] });
      qc.invalidateQueries({ queryKey: ['extraction-providers'] });
    },
  });
}

export function useExtractionResults(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['extraction-results', sessionId],
    queryFn: () => api.extractions.results(sessionId!),
    enabled: !!sessionId,
    staleTime: 30_000,
  });
}

export function useAllExtractionResults(limit?: number) {
  return useQuery({
    queryKey: ['extraction-results-all', limit],
    queryFn: () => api.extractions.allResults({ limit }),
    staleTime: 30_000,
  });
}

export function useRunExtraction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.extractions.run,
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['extraction-results', variables.sessionId] });
      qc.invalidateQueries({ queryKey: ['extraction-results-all'] });
    },
  });
}
