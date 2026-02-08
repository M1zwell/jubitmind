import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: api.projects,
    staleTime: 60_000,
  });
}

export function useConversationSessions(
  source?: string,
  project?: string,
  minRisk?: string,
  tags?: string[],
) {
  return useQuery({
    queryKey: ['conversation-sessions', source, project, minRisk, tags],
    queryFn: () =>
      api.conversationSessions({
        source: source || 'all',
        project,
        limit: 200,
        minRisk,
        tags,
      }),
    staleTime: 10_000,
    refetchInterval: 10_000,
  });
}

export function useConversationMessages(
  sessionId: string | null,
  offset = 0,
  limit = 50,
  project?: string,
) {
  return useQuery({
    queryKey: ['conversation-messages', sessionId, offset, limit, project],
    queryFn: () => api.conversationMessages(sessionId!, offset, limit, project),
    enabled: !!sessionId,
    staleTime: 60_000,
  });
}

export function useDeleteConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => api.deleteConversation(sessionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversation-sessions'] }),
  });
}

export function useGlobalHistory() {
  return useQuery({
    queryKey: ['global-history'],
    queryFn: api.globalHistory,
    staleTime: 30_000,
  });
}

export function useConversationStats() {
  return useQuery({
    queryKey: ['conversation-stats'],
    queryFn: api.conversationStats,
    staleTime: 30_000,
  });
}

export function useSessionRisk(sessionId: string | null, project?: string) {
  return useQuery({
    queryKey: ['session-risk', sessionId, project],
    queryFn: () => api.sessionRisk(sessionId!, project),
    enabled: !!sessionId,
    staleTime: 120_000,
  });
}

export function useAddTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, tag, project }: { sessionId: string; tag: string; project?: string }) =>
      api.addSessionTag(sessionId, tag, project),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['session-risk'] });
      qc.invalidateQueries({ queryKey: ['all-tags'] });
    },
  });
}

export function useRemoveTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, tag, project }: { sessionId: string; tag: string; project?: string }) =>
      api.removeSessionTag(sessionId, tag, project),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['session-risk'] });
      qc.invalidateQueries({ queryKey: ['all-tags'] });
    },
  });
}

export function useAllTags() {
  return useQuery({
    queryKey: ['all-tags'],
    queryFn: api.allTags,
    staleTime: 60_000,
  });
}
