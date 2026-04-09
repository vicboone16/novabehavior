import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProgramTagCategories, useProgramTags } from '@/hooks/useProgramDomains';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';
import { toast } from 'sonner';

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function useTagUsageCounts() {
  return useQuery({
    queryKey: ['program-tag-usage-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_tag_links')
        .select('tag_id');
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of data || []) {
        counts[row.tag_id] = (counts[row.tag_id] || 0) + 1;
      }
      return counts;
    },
  });
}

export default function TagManagementPage() {
  const queryClient = useQueryClient();
  const { data: categories = [] } = useProgramTagCategories();
  const { data: allTags = [] } = useProgramTags();
  const { data: usageCounts = {} } = useTagUsageCounts();

  const [editingTag, setEditingTag] = useState<{ id: string; name: string } | null>(null);
  const [editName, setEditName] = useState('');
  const [addingCategoryId, setAddingCategoryId] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState('');

  const tagsByCategory = useMemo(() => {
    const map: Record<string, typeof allTags> = {};
    for (const tag of allTags) {
      (map[tag.tag_category_id] ??= []).push(tag);
    }
    return map;
  }, [allTags]);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['program-tags'] });
    queryClient.invalidateQueries({ queryKey: ['program-tag-usage-counts'] });
  };

  const handleRename = async () => {
    if (!editingTag || !editName.trim()) return;
    const { error } = await supabase
      .from('program_tags')
      .update({ name: editName.trim(), slug: slugify(editName.trim()) })
      .eq('id', editingTag.id);
    if (error) { toast.error('Failed to rename tag'); return; }
    toast.success('Tag renamed');
    setEditingTag(null);
    invalidateAll();
  };

  const handleDelete = async (tagId: string) => {
    await supabase.from('program_tag_links').delete().eq('tag_id', tagId);
    const { error } = await supabase.from('program_tags').delete().eq('id', tagId);
    if (error) { toast.error('Failed to delete tag'); return; }
    toast.success('Tag deleted');
    invalidateAll();
  };

  const handleAddTag = async (categoryId: string) => {
    if (!newTagName.trim()) return;
    const { error } = await supabase.from('program_tags').insert({
      tag_category_id: categoryId,
      name: newTagName.trim(),
      slug: slugify(newTagName.trim()),
      is_active: true,
    });
    if (error) { toast.error('Failed to create tag'); return; }
    toast.success('Tag created');
    setNewTagName('');
    setAddingCategoryId(null);
    invalidateAll();
  };

  const defaultTab = categories[0]?.id || '';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Tag Management</h2>
        <p className="text-sm text-muted-foreground">
          Manage framework tags, source categories, and labels across your clinical library
        </p>
      </div>

      {categories.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tag categories found.</p>
      ) : (
        <Tabs defaultValue={defaultTab}>
          <TabsList>
            {categories.map(c => (
              <TabsTrigger key={c.id} value={c.id}>{c.name}</TabsTrigger>
            ))}
          </TabsList>

          {categories.map(cat => {
            const tags = tagsByCategory[cat.id] || [];
            return (
              <TabsContent key={cat.id} value={cat.id} className="space-y-3 mt-4">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {tags.map(tag => (
                    <Card key={tag.id}>
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full border border-border"
                            style={tag.color ? { backgroundColor: tag.color } : undefined}
                          />
                          <span className="text-sm font-medium">{tag.name}</span>
                          <Badge variant="secondary" className="text-[10px]">
                            {usageCounts[tag.id] || 0} programs
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => { setEditingTag({ id: tag.id, name: tag.name }); setEditName(tag.name); }}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete "{tag.name}"?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will remove the tag from all {usageCounts[tag.id] || 0} linked programs. This cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(tag.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {addingCategoryId === cat.id ? (
                  <div className="flex items-center gap-2 max-w-sm">
                    <Input
                      placeholder="New tag name…"
                      value={newTagName}
                      onChange={e => setNewTagName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddTag(cat.id)}
                      className="h-8 text-sm"
                      autoFocus
                    />
                    <Button size="sm" className="h-8" onClick={() => handleAddTag(cat.id)}>Add</Button>
                    <Button size="sm" variant="ghost" className="h-8" onClick={() => { setAddingCategoryId(null); setNewTagName(''); }}>Cancel</Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAddingCategoryId(cat.id)}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Tag
                  </Button>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      )}

      {/* Rename dialog */}
      <Dialog open={!!editingTag} onOpenChange={open => { if (!open) setEditingTag(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Tag</DialogTitle>
          </DialogHeader>
          <Input
            value={editName}
            onChange={e => setEditName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleRename()}
            className="mt-2"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingTag(null)}>Cancel</Button>
            <Button onClick={handleRename}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
