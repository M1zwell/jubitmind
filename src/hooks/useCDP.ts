import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useCDPStatus() {
  return useQuery({
    queryKey: ['cdp-status'],
    queryFn: () => api.cdp.status(),
    refetchInterval: 10_000,
  });
}

export function useCDPConnect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body?: { host?: string; port?: number }) => api.cdp.connect(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cdp-status'] });
      qc.invalidateQueries({ queryKey: ['cdp-tabs'] });
      qc.invalidateQueries({ queryKey: ['adapters'] });
    },
  });
}

export function useCDPDisconnect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.cdp.disconnect(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cdp-status'] });
      qc.invalidateQueries({ queryKey: ['cdp-tabs'] });
      qc.invalidateQueries({ queryKey: ['adapters'] });
    },
  });
}

export function useCDPTabs() {
  return useQuery({
    queryKey: ['cdp-tabs'],
    queryFn: () => api.cdp.tabs(),
    staleTime: 15_000,
  });
}

export function useCDPAITabs() {
  return useQuery({
    queryKey: ['cdp-ai-tabs'],
    queryFn: () => api.cdp.aiTabs(),
    staleTime: 15_000,
  });
}
