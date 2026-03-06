import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Check, X, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InlineNameEditorProps {
  value: string;
  onSave: (newName: string) => Promise<void>;
  className?: string;
}

export function InlineNameEditor({ value, onSave, className = '' }: InlineNameEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = async () => {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === value) {
      setIsEditing(false);
      setEditValue(value);
      return;
    }
    setIsSaving(true);
    try {
      await onSave(trimmed);
      setIsEditing(false);
    } catch {
      setEditValue(value);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue(value);
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSaving}
          className="h-7 text-sm font-semibold px-2"
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleSave}
          disabled={isSaving}
        >
          <Check className="w-3.5 h-3.5 text-primary" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => { setIsEditing(false); setEditValue(value); }}
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <span
      className={`group inline-flex items-center gap-1.5 cursor-pointer ${className}`}
      onClick={() => setIsEditing(true)}
      title="Click to edit"
    >
      <span className="font-semibold">{value}</span>
      <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </span>
  );
}
