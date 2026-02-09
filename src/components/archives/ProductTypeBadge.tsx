import { MessageSquare, Swords, Users, Presentation, Bot, Archive } from 'lucide-react';
import type { ProductType } from '@/lib/types';

const PRODUCT_CONFIG: Record<ProductType, {
  label: string;
  icon: typeof MessageSquare;
  bg: string;
  text: string;
}> = {
  chat:             { label: 'Chat',     icon: MessageSquare, bg: 'bg-blue-500/15',    text: 'text-blue-400' },
  chatab:           { label: 'Arena',    icon: Swords,        bg: 'bg-orange-500/15',  text: 'text-orange-400' },
  chatlab:          { label: 'ChatLab',  icon: Users,         bg: 'bg-purple-500/15',  text: 'text-purple-400' },
  'chatlab-agent':  { label: 'Agent',    icon: Bot,           bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  theater:          { label: 'Theater',  icon: Presentation,  bg: 'bg-pink-500/15',    text: 'text-pink-400' },
  unknown:          { label: 'Archive',  icon: Archive,       bg: 'bg-gray-500/15',    text: 'text-gray-400' },
};

interface Props {
  type: ProductType;
  size?: 'sm' | 'md';
}

export function ProductTypeBadge({ type, size = 'sm' }: Props) {
  const cfg = PRODUCT_CONFIG[type] || PRODUCT_CONFIG.unknown;
  const Icon = cfg.icon;
  const iconSize = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3';
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs';

  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.text} ${textSize} font-medium`}>
      <Icon className={iconSize} />
      {cfg.label}
    </span>
  );
}
