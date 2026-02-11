import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useLatestReport() {
  return useQuery({
    queryKey: ['reports-latest'],
    queryFn: api.reports.latest,
    staleTime: 60_000,
  });
}

export function useReportHistory(limit?: number) {
  return useQuery({
    queryKey: ['reports-history', limit],
    queryFn: () => api.reports.history(limit),
    staleTime: 60_000,
  });
}

export function useGenerateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.reports.generate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reports-latest'] });
      qc.invalidateQueries({ queryKey: ['reports-history'] });
    },
  });
}
