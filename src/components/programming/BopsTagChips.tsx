import React from 'react';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import type { EntityBopsTag } from '@/hooks/useBopsTags';

interface BopsTagChipsProps {
  tags: EntityBopsTag[];
  onRemove?: (tagId: string) => void;
  size?: 'sm' | 'default';
  showSource?: boolean;
}

const SOURCE_COLORS: Record<string, string> = {
  manual: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  ai: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  inferred: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  imported: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

const CATEGORY_COLORS: Record<string, string> = {
  function: 'border-orange-300 dark:border-orange-700',
  'behavior-profile': 'border-red-300 dark:border-red-700',
  context: 'border-blue-300 dark:border-blue-700',
  'skill-profile': 'border-green-300 dark:border-green-700',
  regulation: 'border-purple-300 dark:border-purple-700',
};

export function BopsTagChips({ tags, onRemove, size = 'default', showSource = false }: BopsTagChipsProps) {
  if (!tags.length) return null;

  const textSize = size === 'sm' ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5';

  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((et) => {
        const tagName = et.tag?.name || 'Unknown';
        const category = et.tag?.category || '';
        const borderColor = CATEGORY_COLORS[category] || 'border-muted';
        const sourceColor = SOURCE_COLORS[et.source] || '';

        return (
          <Badge
            key={et.id}
            variant="outline"
            className={`${textSize} ${borderColor} ${sourceColor} gap-1 font-normal`}
          >
            {et.is_primary && <span className="font-bold">★</span>}
            {tagName}
            {showSource && (
              <span className="opacity-60 text-[9px]">({et.source})</span>
            )}
            {onRemove && (
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(et.id); }}
                className="ml-0.5 hover:text-destructive"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </Badge>
        );
      })}
    </div>
  );
}
