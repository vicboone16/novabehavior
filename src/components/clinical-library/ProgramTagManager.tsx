import { useState, useMemo } from 'react';
import { Plus, X, Search, Tag, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { useProgramTags, useProgramTagLinks, useProgramTagCategories } from '@/hooks/useProgramDomains';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface ProgramTagManagerProps {
  programId: string;
  programName: string;
}

export function ProgramTagManager({ programId, programName }: ProgramTagManagerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: tagLinks = [] } = useProgramTagLinks(programId);
  const { data: allTags = [] } = useProgramTags();
  const { data: categories = [] } = useProgramTagCategories();

  const assignedTagIds = useMemo(() => new Set(tagLinks.map((l: any) => l.tag_id)), [tagLinks]);

  const assignedTags = useMemo(
    () => tagLinks.map((l: any) => l.program_tags).filter(Boolean),
    [tagLinks],
  );

  const categoryMap = useMemo(
    () => new Map(categories.map(c => [c.id, c.name])),
    [categories],
  );

  const filteredTags = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = q ? allTags.filter(t => t.name.toLowerCase().includes(q)) : allTags;
    const grouped: Record<string, typeof filtered> = {};
    for (const tag of filtered) {
      const catName = categoryMap.get(tag.tag_category_id) || 'Other';
      (grouped[catName] ??= []).push(tag);
    }
    return grouped;
  }, [allTags, search, categoryMap]);

  const addTag = async (tagId: string) => {
    const { error } = await supabase
      .from('program_tag_links')
      .insert({ program_id: programId, tag_id: tagId });
    if (error) {
      toast.error('Failed to add tag');
      return;
    }
    toast.success('Tag added');
    queryClient.invalidateQueries({ queryKey: ['program-tag-links', programId] });
  };

  const removeTag = async (tagId: string) => {
    const { error } = await supabase
      .from('program_tag_links')
      .delete()
      .eq('program_id', programId)
      .eq('tag_id', tagId);
    if (error) {
      toast.error('Failed to remove tag');
      return;
    }
    toast.success('Tag removed');
    queryClient.invalidateQueries({ queryKey: ['program-tag-links', programId] });
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {assignedTags.map((tag: any) => (
        <Badge
          key={tag.id}
          variant="secondary"
          className="text-[10px] gap-1 pr-1"
          style={tag.color ? { backgroundColor: tag.color + '22', color: tag.color } : undefined}
        >
          <Tag className="w-2.5 h-2.5" />
          {tag.name}
          <button
            onClick={e => { e.stopPropagation(); removeTag(tag.id); }}
            className="ml-0.5 hover:text-destructive rounded-full"
          >
            <X className="w-3 h-3" />
          </button>
        </Badge>
      ))}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
            onClick={e => e.stopPropagation()}
          >
            <Plus className="w-3 h-3 mr-0.5" /> Add Tag
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-64 p-2"
          align="start"
          onClick={e => e.stopPropagation()}
        >
          <div className="relative mb-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search tags…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-7 pl-7 text-xs"
            />
          </div>
          <div className="max-h-52 overflow-y-auto space-y-2">
            {Object.entries(filteredTags).map(([catName, tags]) => (
              <div key={catName}>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-1">
                  {catName}
                </p>
                {tags.map(tag => {
                  const assigned = assignedTagIds.has(tag.id);
                  return (
                    <button
                      key={tag.id}
                      disabled={assigned}
                      onClick={() => addTag(tag.id)}
                      className="w-full flex items-center gap-2 px-2 py-1 text-xs rounded hover:bg-accent transition-colors disabled:opacity-50"
                    >
                      {assigned ? (
                        <Check className="w-3 h-3 text-primary" />
                      ) : (
                        <div className="w-3 h-3 rounded-full border border-border" style={tag.color ? { backgroundColor: tag.color } : undefined} />
                      )}
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            ))}
            {Object.keys(filteredTags).length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-3">No tags found</p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
