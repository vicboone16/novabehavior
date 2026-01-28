import { useState, useEffect } from 'react';
import { Tags, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Tag {
  id: string;
  name: string;
  color: string | null;
  tag_type: string;
}

interface StudentTagSelectorProps {
  studentId: string;
  showLabel?: boolean;
  compact?: boolean;
}

export function StudentTagSelector({ studentId, showLabel = true, compact = false }: StudentTagSelectorProps) {
  const { user } = useAuth();
  const [tags, setTags] = useState<Tag[]>([]);
  const [assignedTagIds, setAssignedTagIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (user) {
      checkAdminStatus();
    }
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.rpc('is_admin', { _user_id: user.id });
      if (!error) {
        setIsAdmin(data === true);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const loadTags = async () => {
    setLoading(true);
    try {
      // Load all available tags
      const { data: allTags, error: tagsError } = await supabase
        .from('tags')
        .select('*')
        .order('name');

      if (tagsError) throw tagsError;

      // Load student's assigned tags
      const { data: studentTags, error: studentTagsError } = await supabase
        .from('student_tags')
        .select('tag_id')
        .eq('student_id', studentId);

      if (studentTagsError) throw studentTagsError;

      setTags(allTags || []);
      setAssignedTagIds(studentTags?.map(st => st.tag_id) || []);
    } catch (error) {
      console.error('Error loading tags:', error);
      toast.error('Failed to load tags');
    } finally {
      setLoading(false);
    }
  };

  const toggleTag = async (tagId: string) => {
    if (!isAdmin) {
      toast.error('Only admins can manage student tags');
      return;
    }

    setSaving(true);
    try {
      if (assignedTagIds.includes(tagId)) {
        // Remove tag
        const { error } = await supabase
          .from('student_tags')
          .delete()
          .eq('student_id', studentId)
          .eq('tag_id', tagId);

        if (error) throw error;
        setAssignedTagIds(prev => prev.filter(id => id !== tagId));
        toast.success('Tag removed');
      } else {
        // Add tag
        const { error } = await supabase
          .from('student_tags')
          .insert({ student_id: studentId, tag_id: tagId });

        if (error) throw error;
        setAssignedTagIds(prev => [...prev, tagId]);
        toast.success('Tag added');
      }
    } catch (error) {
      console.error('Error toggling tag:', error);
      toast.error('Failed to update tag');
    } finally {
      setSaving(false);
    }
  };

  const assignedTags = tags.filter(t => assignedTagIds.includes(t.id));

  if (!isAdmin && assignedTags.length === 0) {
    return null;
  }

  return (
    <div className={compact ? 'inline-flex' : 'space-y-2'}>
      {showLabel && !compact && (
        <Label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Tags className="w-4 h-4" />
          Tags
        </Label>
      )}
      
      <div className="flex flex-wrap items-center gap-1">
        {/* Show assigned tags */}
        {assignedTags.map(tag => (
          <Badge
            key={tag.id}
            variant="secondary"
            className="text-xs"
            style={{ 
              backgroundColor: tag.color ? `${tag.color}20` : undefined,
              borderColor: tag.color || undefined,
              color: tag.color || undefined 
            }}
          >
            {tag.name}
          </Badge>
        ))}
        
        {/* Admin can add/remove tags */}
        {isAdmin && (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                <Tags className="w-3 h-3 mr-1" />
                {assignedTags.length === 0 ? 'Add Tags' : 'Edit'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="start">
              <div className="space-y-3">
                <div className="font-medium text-sm">Assign Tags</div>
                {loading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                ) : tags.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    No tags available. Create tags in Admin → Manage Tags.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {tags.map(tag => (
                      <div key={tag.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`tag-${tag.id}`}
                          checked={assignedTagIds.includes(tag.id)}
                          onCheckedChange={() => toggleTag(tag.id)}
                          disabled={saving}
                        />
                        <Label
                          htmlFor={`tag-${tag.id}`}
                          className="flex items-center gap-2 text-sm cursor-pointer flex-1"
                        >
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: tag.color || '#6b7280' }}
                          />
                          {tag.name}
                          <Badge variant="outline" className="text-[10px] ml-auto">
                            {tag.tag_type}
                          </Badge>
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}

// Lightweight component to just display tags (no edit capability)
export function StudentTagsDisplay({ studentId }: { studentId: string }) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAssignedTags();
  }, [studentId]);

  const loadAssignedTags = async () => {
    try {
      const { data, error } = await supabase
        .from('student_tags')
        .select(`
          tag_id,
          tags (id, name, color, tag_type)
        `)
        .eq('student_id', studentId);

      if (error) throw error;

      const assignedTags = data?.map(st => st.tags).filter(Boolean) as Tag[] || [];
      setTags(assignedTags);
    } catch (error) {
      console.error('Error loading student tags:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || tags.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {tags.map(tag => (
        <Badge
          key={tag.id}
          variant="outline"
          className="text-[10px] px-1.5 py-0"
          style={{ 
            backgroundColor: tag.color ? `${tag.color}15` : undefined,
            borderColor: tag.color || undefined,
            color: tag.color || undefined 
          }}
        >
          {tag.name}
        </Badge>
      ))}
    </div>
  );
}
