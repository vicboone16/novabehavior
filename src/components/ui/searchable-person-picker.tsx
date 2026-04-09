import { useState, useEffect, useMemo } from 'react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, ChevronsUpDown, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Person { id: string; label: string; }

interface Props {
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  type: 'profile' | 'student';
}

export function SearchablePersonPicker({ value, onChange, placeholder = 'Select…', type }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    if (type === 'profile') {
      supabase.from('profiles').select('user_id, display_name, first_name, last_name').limit(500)
        .then(({ data }) => {
          setItems((data || []).map((p: any) => ({
            id: p.user_id,
            label: p.display_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Unknown',
          })));
          setLoading(false);
        });
    } else {
      supabase.from('students' as any).select('id, first_name, last_name').limit(500)
        .then(({ data }) => {
          setItems((data || []).map((s: any) => ({
            id: s.id,
            label: [s.first_name, s.last_name].filter(Boolean).join(' ') || 'Unknown',
          })));
          setLoading(false);
        });
    }
  }, [type]);

  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(i => i.label.toLowerCase().includes(q));
  }, [items, search]);

  const selectedLabel = items.find(i => i.id === value)?.label;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between h-9 text-sm font-normal">
          <span className={selectedLabel ? 'text-foreground' : 'text-muted-foreground'}>
            {selectedLabel || placeholder}
          </span>
          <div className="flex items-center gap-1">
            {value && (
              <X className="w-3 h-3 text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); onChange(''); }} />
            )}
            <ChevronsUpDown className="w-3 h-3 text-muted-foreground" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-2" align="start">
        <div className="flex items-center gap-2 mb-2">
          <Search className="w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-8 text-sm border-0 shadow-none focus-visible:ring-0 p-0"
          />
        </div>
        <div className="max-h-[200px] overflow-y-auto space-y-0.5">
          {loading && <p className="text-xs text-muted-foreground text-center py-2">Loading…</p>}
          {!loading && filtered.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No results</p>}
          {filtered.map(item => (
            <button
              key={item.id}
              className={`w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent transition-colors ${item.id === value ? 'bg-accent font-medium' : ''}`}
              onClick={() => { onChange(item.id); setOpen(false); setSearch(''); }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
