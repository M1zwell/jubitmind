import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { FeedbackStats, SessionFeedback } from '@/lib/types';

export function useFeedbackStats() {
  return useQuery<FeedbackStats>({
    queryKey: ['feedback-stats'],
    queryFn: () => api.feedback.stats(),
    staleTime: 30_000,
  });
}

export function useFeedbackList(params?: { adapterId?: string; rating?: string; limit?: number }) {
  return useQuery<{ entries: SessionFeedback[]; total: number }>({
    queryKey: ['feedback-list', params],
    queryFn: () => api.feedback.list(params),
    staleTime: 30_000,
  });
}

export function useSessionFeedback(sessionId: string, adapterId?: string) {
  return useQuery<{ feedback: SessionFeedback | null }>({
    queryKey: ['feedback', sessionId, adapterId],
    queryFn: () => api.feedback.get(sessionId, adapterId),
    enabled: !!sessionId,
    staleTime: 30_000,
  });
}

export function useSubmitFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      sessionId: string;
      adapterId: string;
      rating: 'positive' | 'negative';
      comment?: string;
      tags?: string[];
    }) => api.feedback.submit(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feedback-stats'] });
      qc.invalidateQueries({ queryKey: ['feedback-list'] });
      qc.invalidateQueries({ queryKey: ['feedback'] });
    },
  });
}
