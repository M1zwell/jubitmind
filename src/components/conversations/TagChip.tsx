import { X } from 'lucide-react';

type TagCategory = 'technical' | 'sensitivity' | 'operational' | 'manual';

interface Props {
  name: string;
  category?: TagCategory;
  onRemove?: () => void;
}

const categoryColors: Record<TagCategory, string> = {
  technical: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  sensitivity: 'bg-red-500/15 text-red-400 border-red-500/30',
  operational: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  manual: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
};

const TECHNICAL_TAGS = ['code-generation', 'debugging', 'architecture', 'devops', 'testing', 'refactoring'];
const SENSITIVITY_TAGS = ['security', 'privacy', 'ip-creation', 'legal', 'safety'];

export function inferCategory(name: string): TagCategory {
  if (TECHNICAL_TAGS.includes(name)) return 'technical';
  if (SENSITIVITY_TAGS.includes(name)) return 'sensitivity';
  return 'operational';
}

export function TagChip({ name, category, onRemove }: Props) {
  const cat = category || inferCategory(name);
  const colors = categoryColors[cat];

  return (
    <span
      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[9px] ${colors}`}
    >
      {name}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="hover:text-white transition-colors ml-0.5"
        >
          <X className="w-2.5 h-2.5" />
        </button>
      )}
    </span>
  );
}
