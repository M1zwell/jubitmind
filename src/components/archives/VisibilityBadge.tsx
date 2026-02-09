import { Lock, Globe, Share2 } from 'lucide-react';
import type { VisibilityType } from '@/lib/types';

const VIS_CONFIG: Record<VisibilityType, {
  icon: typeof Lock;
  color: string;
  title: string;
}> = {
  private: { icon: Lock,   color: 'text-gray-500',  title: 'Private' },
  public:  { icon: Globe,  color: 'text-green-400', title: 'Public' },
  shared:  { icon: Share2, color: 'text-blue-400',  title: 'Shared' },
};

interface Props {
  visibility: VisibilityType;
}

export function VisibilityBadge({ visibility }: Props) {
  const cfg = VIS_CONFIG[visibility] || VIS_CONFIG.private;
  const Icon = cfg.icon;

  return (
    <span className={cfg.color} title={cfg.title}>
      <Icon className="w-3 h-3" />
    </span>
  );
}
