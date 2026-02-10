import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useInsightsStatus() {
  return useQuery({
    queryKey: ['insights-status'],
    queryFn: api.insights.status,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

export function useLatestInsight() {
  return useQuery({
    queryKey: ['insights-latest'],
    queryFn: api.insights.latest,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}

export function useInsightHistory(limit?: number) {
  return useQuery({
    queryKey: ['insights-history', limit],
    queryFn: () => api.insights.history(limit),
    staleTime: 60_000,
  });
}

export function useRunInsights() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.insights.run,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['insights-latest'] });
      qc.invalidateQueries({ queryKey: ['insights-history'] });
      qc.invalidateQueries({ queryKey: ['insights-status'] });
    },
  });
}
