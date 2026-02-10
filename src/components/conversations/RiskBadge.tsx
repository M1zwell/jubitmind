import { ShieldAlert, ShieldCheck, Shield } from 'lucide-react';
import type { RiskLevel } from '@/lib/types';
import { RISK_COLORS } from './risk-utils';

interface Props {
  level: RiskLevel;
  score?: number;
  size?: 'sm' | 'md';
}

const icons: Record<RiskLevel, typeof Shield> = {
  critical: ShieldAlert,
  high: ShieldAlert,
  medium: Shield,
  low: ShieldCheck,
};

export function RiskBadge({ level, score, size = 'sm' }: Props) {
  const colors = RISK_COLORS[level];
  const Icon = icons[level];
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';
  const textSize = size === 'sm' ? 'text-[9px]' : 'text-[10px]';

  return (
    <span
      className={`inline-flex items-center gap-0.5 px-1 rounded ${colors.bg} ${colors.text} ${textSize}`}
      title={`Risk: ${level}${score ? ` (${score})` : ''}`}
    >
      <Icon className={iconSize} />
      {size === 'md' && <span className="capitalize">{level}</span>}
    </span>
  );
}
