import { useState, useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Plus, Tag } from 'lucide-react';
import type { BxTag } from '@/hooks/useBxTags';

interface TagManagerProps {
  itemId: string;
  itemType: string;
  currentTags: BxTag[];
  allTags: BxTag[];
  onAddNew: (label: string, itemId: string, itemType: string) => Promise<void>;
  onAddExisting: (tagId: string, itemId: string, itemType: string) => Promise<void>;
  onRemove: (tagId: string, itemId: string, itemType: string) => Promise<void>;
  compact?: boolean;
}

export function TagManager({
  itemId,
  itemType,
  currentTags,
  allTags,
  onAddNew,
  onAddExisting,
  onRemove,
  compact = false,
}: TagManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<BxTag[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]);

  useEffect(() => {
    if (!inputValue.trim()) {
      setSuggestions([]);
      return;
    }
    const currentIds = new Set(currentTags.map(t => t.id));
    const filtered = allTags.filter(
      t => !currentIds.has(t.id) && t.tag_label.toLowerCase().includes(inputValue.toLowerCase())
    );
    setSuggestions(filtered.slice(0, 8));
  }, [inputValue, allTags, currentTags]);

  const handleAdd = async (tagLabel: string) => {
    const existing = allTags.find(t => t.tag_label.toLowerCase() === tagLabel.toLowerCase());
    if (existing) {
      await onAddExisting(existing.id, itemId, itemType);
    } else {
      await onAddNew(tagLabel.trim(), itemId, itemType);
    }
    setInputValue('');
    setIsAdding(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      handleAdd(inputValue);
    } else if (e.key === 'Escape') {
      setIsAdding(false);
      setInputValue('');
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {currentTags.map(tag => (
        <Badge
          key={tag.id}
          variant="secondary"
          className="text-xs gap-1 pr-1"
        >
          <Tag className="w-2.5 h-2.5" />
          {tag.tag_label}
          <button
            onClick={() => onRemove(tag.id, itemId, itemType)}
            className="ml-0.5 hover:text-destructive rounded-full"
          >
            <X className="w-3 h-3" />
          </button>
        </Badge>
      ))}

      {isAdding ? (
        <div className="relative">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              setTimeout(() => {
                if (!inputValue.trim()) setIsAdding(false);
              }, 200);
            }}
            placeholder="Type tag..."
            className="h-6 w-32 text-xs px-2"
          />
          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 mt-1 bg-popover border rounded-md shadow-md z-50 w-48 max-h-40 overflow-y-auto">
              {suggestions.map(s => (
                <button
                  key={s.id}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors"
                  onMouseDown={e => {
                    e.preventDefault();
                    onAddExisting(s.id, itemId, itemType);
                    setInputValue('');
                    setIsAdding(false);
                  }}
                >
                  {s.tag_label}
                  <span className="text-muted-foreground ml-1">({s.tag_type})</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="h-5 px-1.5 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setIsAdding(true)}
        >
          <Plus className="w-3 h-3" />
          {compact ? '' : 'Tag'}
        </Button>
      )}
    </div>
  );
}
