import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, GripVertical, CheckSquare, Square, StickyNote, ListTodo } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PersonalNote {
  id: string;
  title: string;
  content: string;
  note_type: 'note' | 'todo';
  is_completed: boolean;
  sort_order: number;
}

export function PersonalNotesWidget() {
  const { user } = useAuth();
  const [items, setItems] = useState<PersonalNote[]>([]);
  const [tab, setTab] = useState<'todo' | 'note'>('todo');
  const [newText, setNewText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_personal_notes')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });
    setItems((data as PersonalNote[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const addItem = async () => {
    if (!newText.trim() || !user) return;
    const { data, error } = await supabase.from('user_personal_notes').insert({
      user_id: user.id,
      title: newText.trim(),
      content: '',
      note_type: tab,
      sort_order: items.length,
    }).select().single();

    if (!error && data) {
      setItems(prev => [...prev, data as PersonalNote]);
      setNewText('');
    }
  };

  const toggleComplete = async (item: PersonalNote) => {
    const updated = !item.is_completed;
    await supabase.from('user_personal_notes').update({ is_completed: updated, updated_at: new Date().toISOString() }).eq('id', item.id);
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_completed: updated } : i));
  };

  const deleteItem = async (id: string) => {
    await supabase.from('user_personal_notes').delete().eq('id', id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const saveEdit = async (id: string) => {
    await supabase.from('user_personal_notes').update({ title: editText, updated_at: new Date().toISOString() }).eq('id', id);
    setItems(prev => prev.map(i => i.id === id ? { ...i, title: editText } : i));
    setEditingId(null);
  };

  const filteredItems = items.filter(i => i.note_type === tab);
  const completedCount = filteredItems.filter(i => i.is_completed).length;

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-3 h-full flex flex-col">
      <Tabs value={tab} onValueChange={(v) => setTab(v as 'todo' | 'note')}>
        <TabsList className="h-8 w-full">
          <TabsTrigger value="todo" className="text-xs gap-1 flex-1">
            <ListTodo className="w-3.5 h-3.5" />
            To-Do {tab === 'todo' && filteredItems.length > 0 && `(${completedCount}/${filteredItems.length})`}
          </TabsTrigger>
          <TabsTrigger value="note" className="text-xs gap-1 flex-1">
            <StickyNote className="w-3.5 h-3.5" />
            Notes
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Add new item */}
      <div className="flex gap-1.5">
        <Input
          placeholder={tab === 'todo' ? 'Add a to-do item...' : 'Add a quick note...'}
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addItem()}
          className="h-8 text-sm"
        />
        <Button size="sm" className="h-8 px-2" onClick={addItem} disabled={!newText.trim()}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Items list */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-1">
          {filteredItems.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              {tab === 'todo' ? 'No to-do items yet' : 'No notes yet'}
            </p>
          )}
          {filteredItems.map(item => (
            <div
              key={item.id}
              className={cn(
                'flex items-start gap-2 rounded-md border p-2 group transition-colors',
                item.is_completed
                  ? 'bg-muted/40 border-border/30'
                  : 'bg-background border-border/60 hover:border-border'
              )}
            >
              {tab === 'todo' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 mt-0.5 shrink-0"
                  onClick={() => toggleComplete(item)}
                >
                  {item.is_completed ? (
                    <CheckSquare className="w-4 h-4 text-primary" />
                  ) : (
                    <Square className="w-4 h-4 text-muted-foreground" />
                  )}
                </Button>
              )}
              <div className="flex-1 min-w-0">
                {editingId === item.id ? (
                  <Input
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onBlur={() => saveEdit(item.id)}
                    onKeyDown={(e) => e.key === 'Enter' && saveEdit(item.id)}
                    className="h-7 text-sm"
                    autoFocus
                  />
                ) : (
                  <p
                    className={cn(
                      'text-sm cursor-pointer',
                      item.is_completed && 'line-through text-muted-foreground'
                    )}
                    onClick={() => { setEditingId(item.id); setEditText(item.title); }}
                  >
                    {item.title}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0"
                onClick={() => deleteItem(item.id)}
              >
                <Trash2 className="w-3 h-3 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
