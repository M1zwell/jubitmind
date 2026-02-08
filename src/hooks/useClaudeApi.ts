import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useHealth() {
  return useQuery({ queryKey: ['health'], queryFn: api.health, staleTime: 30_000 });
}

export function useCliVersion() {
  return useQuery({ queryKey: ['cli-version'], queryFn: api.cliVersion, staleTime: 60_000 });
}

export function useCliDoctor() {
  return useQuery({ queryKey: ['cli-doctor'], queryFn: api.cliDoctor, staleTime: 60_000, enabled: false });
}

export function usePlugins() {
  return useQuery({ queryKey: ['plugins'], queryFn: api.plugins, staleTime: 30_000 });
}

export function useMcpServers() {
  return useQuery({ queryKey: ['mcp-servers'], queryFn: api.mcpServers, staleTime: 10_000 });
}

export function useSettings() {
  return useQuery({ queryKey: ['settings'], queryFn: api.settings });
}

export function useSaveSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => api.saveSettings(content),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  });
}

export function useClaudeMd() {
  return useQuery({ queryKey: ['claude-md'], queryFn: api.claudeMd });
}

export function useSaveClaudeMd() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => api.saveClaudeMd(content),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['claude-md'] }),
  });
}

export function usePermissions() {
  return useQuery({ queryKey: ['permissions'], queryFn: api.permissions });
}

export function useSkills() {
  return useQuery({ queryKey: ['skills'], queryFn: api.skills });
}

export function useSkill(name: string) {
  return useQuery({ queryKey: ['skill', name], queryFn: () => api.skill(name), enabled: !!name });
}

export function useCommandTree() {
  return useQuery({ queryKey: ['command-tree'], queryFn: api.commandTree });
}

export function useCommandContent(path: string) {
  return useQuery({ queryKey: ['command', path], queryFn: () => api.commandContent(path), enabled: !!path });
}

export function useMemoryProjects() {
  return useQuery({ queryKey: ['memory-projects'], queryFn: api.memoryProjects });
}

export function useMemoryContent(project: string) {
  return useQuery({ queryKey: ['memory', project], queryFn: () => api.memoryContent(project), enabled: !!project });
}

export function useSaveMemory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ project, content }: { project: string; content: string }) => api.saveMemory(project, content),
    onSuccess: (_, { project }) => qc.invalidateQueries({ queryKey: ['memory', project] }),
  });
}

// --- Providers ---

export function useProviders() {
  return useQuery({ queryKey: ['providers'], queryFn: api.providers, staleTime: 10_000 });
}

export function useUpdateProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; [key: string]: unknown }) => api.updateProvider(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['providers'] }),
  });
}

export function useAddProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.addProvider(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['providers'] }),
  });
}

export function useDeleteProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteProvider(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['providers'] }),
  });
}

export function useTestProvider() {
  return useMutation({
    mutationFn: (id: string) => api.testProvider(id),
  });
}

export function useDiscoverModels() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.discoverModels(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['providers'] }),
  });
}
