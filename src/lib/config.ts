import type { UnifiedArchiveItem } from './types';

const JUBIT_BASE = import.meta.env.VITE_JUBIT_BASE_URL || 'https://jubit.ai';

interface SourceLink {
  url: string;
  label: string;
  comingSoon?: boolean;
  internal?: boolean;
}

const SOURCE_URL_MAP: Record<string, (id: string) => SourceLink> = {
  chat: (id) => ({ url: `${JUBIT_BASE}/theater/archived/${id}`, label: 'Open Chat' }),
  chatab: () => ({ url: '/chatab', label: 'Open in ChatAB', internal: true }),
  chatlab: () => ({ url: '/chatlab', label: 'Open in ChatLab', internal: true }),
  'chatlab-agent': () => ({ url: `${JUBIT_BASE}/chatlab/agent`, label: 'Agent', comingSoon: true }),
  theater: (id) => ({ url: `${JUBIT_BASE}/theater/room/${id}`, label: 'Open Theater' }),
};

export function getSourceLink(item: UnifiedArchiveItem): SourceLink | null {
  if (item.source === 'local-claude') return null;
  const builder = SOURCE_URL_MAP[item.productType || ''];
  return builder ? builder(item.id) : null;
}

export function getSourceUrl(item: UnifiedArchiveItem): string | null {
  const link = getSourceLink(item);
  return link ? link.url : null;
}

export { JUBIT_BASE };
