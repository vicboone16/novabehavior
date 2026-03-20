import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Library, Search, Plus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  onInsert: (text: string) => void;
}

interface LibraryItem {
  id: string;
  title: string;
  description?: string;
  source: string;
}

type LibrarySource = 'goals' | 'strategies' | 'interventions' | 'supports' | 'programs';

const SOURCE_LABELS: Record<LibrarySource, string> = {
  goals: 'Goals',
  strategies: 'Strategies',
  interventions: 'Interventions',
  supports: 'Accommodations',
  programs: 'Programs',
};

export function SnapshotLibraryPicker({ onInsert }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeSource, setActiveSource] = useState<LibrarySource>('goals');
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) fetchItems();
  }, [open, activeSource]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      let results: LibraryItem[] = [];

      switch (activeSource) {
        case 'goals': {
          const [legacyRes, newRes, bxRes] = await Promise.all([
            supabase.from('clinical_goals').select('id, title, description, domain').eq('library_section', 'clinical_collections').limit(200),
            supabase.from('cl_goal_library').select('id, title, description, domain').eq('is_active', true).limit(200),
            supabase.from('behavior_goals_library').select('id, goal_text, behavior_key').limit(200),
          ]);
          results = [
            ...(legacyRes.data || []).map(r => ({ id: r.id, title: r.title, description: r.description || r.domain, source: 'Goal Bank' })),
            ...(newRes.data || []).map(r => ({ id: r.id, title: r.title, description: r.description || r.domain, source: 'Goal Library' })),
            ...(bxRes.data || []).map(r => ({ id: r.id, title: r.goal_text, description: r.behavior_key, source: 'Behavior Goals' })),
          ];
          break;
        }
        case 'strategies': {
          const [bxRes, bipRes] = await Promise.all([
            supabase.from('bx_strategies').select('id, strategy_name, strategy_code, description').limit(200),
            supabase.from('behavior_intervention_library').select('id, intervention_name, intervention_type, behavior_key').limit(200),
          ]);
          results = [
            ...(bxRes.data || []).map(r => ({ id: r.id, title: r.strategy_name, description: r.description || r.strategy_code, source: 'Bx Strategies' })),
            ...(bipRes.data || []).map(r => ({ id: r.id, title: r.intervention_name, description: `${r.intervention_type} • ${r.behavior_key}`, source: 'Behavior Interventions' })),
          ];
          break;
        }
        case 'interventions': {
          const { data } = await supabase.from('aba_library_interventions').select('intervention_id, title, summary, intervention_type').eq('is_active', true).limit(200);
          results = (data || []).map(r => ({ id: r.intervention_id, title: r.title, description: r.summary || r.intervention_type, source: 'ABA Library' }));
          break;
        }
        case 'supports': {
          const { data } = await supabase.from('bip_support_library').select('id, title, description, category').limit(200);
          results = (data || []).map(r => ({ id: r.id, title: r.title, description: r.description || r.category, source: 'BIP Supports' }));
          break;
        }
        case 'programs': {
          const { data } = await supabase.from('abas_programs').select('id, program_name, program_description, program_code').limit(200);
          results = (data || []).map(r => ({ id: r.id, title: r.program_name, description: r.program_description || r.program_code, source: 'ABAS Programs' }));
          break;
        }
      }

      setItems(results);
    } catch (err) {
      console.error('Library fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = search.trim()
    ? items.filter(i =>
        i.title.toLowerCase().includes(search.toLowerCase()) ||
        (i.description || '').toLowerCase().includes(search.toLowerCase())
      )
    : items;

  const handleInsert = (item: LibraryItem) => {
    const text = item.description && item.description !== item.title
      ? `${item.title}: ${item.description}`
      : item.title;
    onInsert(text);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground">
          <Library className="w-3 h-3" />
          Insert from Library
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0" align="start">
        <div className="p-3 pb-2 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search libraries..."
              className="pl-8 h-8 text-xs"
            />
          </div>
        </div>

        <Tabs value={activeSource} onValueChange={v => { setActiveSource(v as LibrarySource); setSearch(''); }}>
          <TabsList className="w-full justify-start rounded-none border-b h-auto p-0 bg-transparent">
            {(Object.entries(SOURCE_LABELS) as [LibrarySource, string][]).map(([key, label]) => (
              <TabsTrigger
                key={key}
                value={key}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none text-xs px-2.5 py-1.5"
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          <ScrollArea className="h-[250px]">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No items found</p>
            ) : (
              <div className="p-1">
                {filtered.slice(0, 50).map(item => (
                  <button
                    key={`${item.source}-${item.id}`}
                    className="w-full text-left px-2.5 py-2 rounded-md hover:bg-muted/60 transition-colors group flex items-start gap-2"
                    onClick={() => handleInsert(item)}
                  >
                    <Plus className="w-3 h-3 mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 text-primary transition-opacity" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{item.title}</p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0 self-center">{item.source}</Badge>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
