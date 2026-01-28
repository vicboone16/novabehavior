import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, X, Tag } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

interface TagType {
  id: string;
  name: string;
  tag_type: 'school' | 'site' | 'team' | 'custom';
  color: string;
}

interface UserTagManagerProps {
  userId: string;
  userName: string;
  availableTags: TagType[];
  onTagsChange?: () => void;
}

export function UserTagManager({ userId, userName, availableTags, onTagsChange }: UserTagManagerProps) {
  const { toast } = useToast();
  const [userTags, setUserTags] = useState<TagType[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserTags();
  }, [userId]);

  const loadUserTags = async () => {
    try {
      const { data } = await supabase
        .from('user_tags')
        .select('tag_id')
        .eq('user_id', userId);

      if (data) {
        const tagIds = data.map(ut => ut.tag_id);
        setUserTags(availableTags.filter(t => tagIds.includes(t.id)));
      }
    } catch (error) {
      console.error('Error loading user tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTag = async (tag: TagType) => {
    const hasTag = userTags.some(t => t.id === tag.id);
    
    try {
      if (hasTag) {
        const { error } = await supabase
          .from('user_tags')
          .delete()
          .eq('user_id', userId)
          .eq('tag_id', tag.id);
        
        if (error) throw error;
        setUserTags(prev => prev.filter(t => t.id !== tag.id));
      } else {
        const { error } = await supabase
          .from('user_tags')
          .insert({ user_id: userId, tag_id: tag.id });
        
        if (error) throw error;
        setUserTags(prev => [...prev, tag]);
      }
      onTagsChange?.();
    } catch (error: any) {
      toast({ 
        title: 'Failed to update tags', 
        description: error.message, 
        variant: 'destructive' 
      });
    }
  };

  const removeTag = async (tagId: string) => {
    try {
      const { error } = await supabase
        .from('user_tags')
        .delete()
        .eq('user_id', userId)
        .eq('tag_id', tagId);
      
      if (error) throw error;
      setUserTags(prev => prev.filter(t => t.id !== tagId));
      onTagsChange?.();
    } catch (error: any) {
      toast({ 
        title: 'Failed to remove tag', 
        description: error.message, 
        variant: 'destructive' 
      });
    }
  };

  // Group tags by type
  const tagsByType = availableTags.reduce((acc, tag) => {
    if (!acc[tag.tag_type]) acc[tag.tag_type] = [];
    acc[tag.tag_type].push(tag);
    return acc;
  }, {} as Record<string, TagType[]>);

  return (
    <div className="flex flex-wrap items-center gap-1">
      {userTags.length === 0 && !loading && (
        <span className="text-xs text-muted-foreground">No tags</span>
      )}
      {userTags.map((tag) => (
        <Badge 
          key={tag.id} 
          variant="outline" 
          className="text-xs gap-1 pr-1"
          style={{ borderColor: tag.color, backgroundColor: `${tag.color}10` }}
        >
          <span style={{ color: tag.color }}>●</span>
          {tag.name}
          <button 
            className="ml-1 hover:text-destructive" 
            onClick={() => removeTag(tag.id)}
          >
            <X className="w-3 h-3" />
          </button>
        </Badge>
      ))}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <Plus className="w-3 h-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <div className="p-3 border-b">
            <p className="text-sm font-medium">Assign Tags to {userName}</p>
            <p className="text-xs text-muted-foreground">
              Tags control which students this user can access
            </p>
          </div>
          <ScrollArea className="h-[200px]">
            <div className="p-3 space-y-4">
              {Object.entries(tagsByType).map(([type, typeTags]) => (
                <div key={type} className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase">{type}s</p>
                  <div className="space-y-1">
                    {typeTags.map((tag) => (
                      <div key={tag.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`user-tag-${tag.id}`}
                          checked={userTags.some(t => t.id === tag.id)}
                          onCheckedChange={() => toggleTag(tag)}
                        />
                        <Label 
                          htmlFor={`user-tag-${tag.id}`} 
                          className="text-sm flex items-center gap-2 cursor-pointer"
                        >
                          <div 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: tag.color }} 
                          />
                          {tag.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {availableTags.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No tags created yet. Create tags in the Tags tab.
                </p>
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
}
