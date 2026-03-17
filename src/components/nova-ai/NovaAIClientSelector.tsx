import { useState, useMemo } from 'react';
import { useDataStore } from '@/store/dataStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { User, X, Search, BrainCircuit } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface NovaAIClientSelectorProps {
  selectedClientId: string | null;
  onClientChange: (clientId: string | null) => void;
}

export function NovaAIClientSelector({ selectedClientId, onClientChange }: NovaAIClientSelectorProps) {
  const students = useDataStore((s) => s.students);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const activeStudents = useMemo(
    () => students.filter((s) => !s.isArchived),
    [students]
  );

  const filtered = useMemo(
    () =>
      activeStudents.filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase())
      ),
    [activeStudents, search]
  );

  const selectedStudent = useMemo(
    () => activeStudents.find((s) => s.id === selectedClientId),
    [activeStudents, selectedClientId]
  );

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={selectedClientId ? 'default' : 'outline'}
            size="sm"
            className="h-8 gap-1.5 text-xs"
          >
            <User className="w-3.5 h-3.5" />
            {selectedStudent ? selectedStudent.name : 'Select Client'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <div className="flex items-center gap-2 px-1 pb-2">
            <Search className="w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7 text-xs"
            />
          </div>
          <ScrollArea className="max-h-48">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground px-2 py-3 text-center">
                No clients found
              </p>
            ) : (
              filtered.map((s) => (
                <button
                  key={s.id}
                  className={`w-full text-left px-2 py-1.5 text-xs rounded-md hover:bg-accent transition-colors ${
                    s.id === selectedClientId ? 'bg-accent font-medium' : ''
                  }`}
                  onClick={() => {
                    onClientChange(s.id);
                    setOpen(false);
                    setSearch('');
                  }}
                >
                  {s.name}
                </button>
              ))
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {selectedClientId && (
        <>
          <Badge variant="secondary" className="text-[10px] gap-1 h-5">
            <BrainCircuit className="w-3 h-3" />
            Case-Aware
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onClientChange(null)}
          >
            <X className="w-3 h-3" />
          </Button>
        </>
      )}
    </div>
  );
}
