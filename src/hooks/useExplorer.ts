import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useExplorerInteractions(params?: Parameters<typeof api.explorer.interactions>[0]) {
  return useQuery({
    queryKey: ['explorer-interactions', params],
    queryFn: () => api.explorer.interactions(params),
    staleTime: 30_000,
  });
}

export function useExplorerFacets() {
  return useQuery({
    queryKey: ['explorer-facets'],
    queryFn: api.explorer.facets,
    staleTime: 30_000,
  });
}

export function useInteractionContent(id: string | null) {
  return useQuery({
    queryKey: ['interaction-content', id],
    queryFn: () => api.explorer.interactionContent(id!),
    enabled: !!id,
    staleTime: 120_000,
  });
}
