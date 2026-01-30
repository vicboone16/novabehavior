import { useState, useMemo } from 'react';
import { Search, BookOpen, Plus, AlertTriangle, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  useCurriculumSystems, 
  useCurriculumItems, 
  useDomains, 
  useTargetActions 
} from '@/hooks/useCurriculum';
import { AddTargetDialog } from './AddTargetDialog';
import type { CurriculumItem, StudentTarget } from '@/types/curriculum';

interface ImportFromCurriculumDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  existingTargetSourceIds: string[];
  onSuccess: () => void;
}

export function ImportFromCurriculumDialog({
  open,
  onOpenChange,
  studentId,
  existingTargetSourceIds,
  onSuccess,
}: ImportFromCurriculumDialogProps) {
  const { systems } = useCurriculumSystems();
  const { domains } = useDomains();
  const { addTarget } = useTargetActions(studentId, onSuccess);

  const [selectedSystemId, setSelectedSystemId] = useState<string>('');
  const [selectedDomainId, setSelectedDomainId] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [customizeItem, setCustomizeItem] = useState<CurriculumItem | null>(null);
  const [importing, setImporting] = useState(false);

  const { items, loading } = useCurriculumItems(
    selectedSystemId || undefined,
    selectedDomainId !== 'all' ? selectedDomainId : undefined,
    selectedLevel !== 'all' ? selectedLevel : undefined
  );

  // Filter and organize items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (existingTargetSourceIds.includes(item.id)) return false;
      if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !item.code?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [items, existingTargetSourceIds, searchQuery]);

  // Get unique levels
  const levels = useMemo(() => {
    const levelSet = new Set<string>();
    items.forEach(item => {
      if (item.level) levelSet.add(item.level);
    });
    return Array.from(levelSet).sort();
  }, [items]);

  const handleToggleItem = (itemId: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const handleImport = async () => {
    if (selectedItems.size === 0) return;

    setImporting(true);
    try {
      for (const itemId of selectedItems) {
        const item = items.find(i => i.id === itemId);
        if (!item) continue;

        await addTarget({
          title: item.title,
          description: item.description,
          mastery_criteria: item.mastery_criteria,
          domain_id: item.domain_id,
          source_type: 'curriculum',
          source_id: item.id,
          linked_prerequisite_ids: item.prerequisites,
        });
      }
      onOpenChange(false);
      setSelectedItems(new Set());
    } finally {
      setImporting(false);
    }
  };

  const handleCustomize = (item: CurriculumItem) => {
    setCustomizeItem(item);
  };

  // Check for prerequisite warnings
  const getPrerequisiteWarning = (item: CurriculumItem) => {
    if (!item.prerequisites || item.prerequisites.length === 0) return null;
    
    const unmet = item.prerequisites.filter(
      prereqId => !existingTargetSourceIds.includes(prereqId) && !selectedItems.has(prereqId)
    );
    
    if (unmet.length === 0) return null;
    
    const prereqItems = items.filter(i => unmet.includes(i.id));
    return prereqItems.map(p => p.code || p.title).join(', ');
  };

  return (
    <>
      <Dialog open={open && !customizeItem} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Import from Curriculum Library
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <Select value={selectedSystemId} onValueChange={setSelectedSystemId}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select curriculum" />
                </SelectTrigger>
                <SelectContent>
                  {systems.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedDomainId} onValueChange={setSelectedDomainId}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Domains" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Domains</SelectItem>
                  {domains.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="All Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  {levels.map(l => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex-1">
                <Input
                  placeholder="Search by title or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>

            {/* Items List */}
            <ScrollArea className="h-[400px] border rounded-lg">
              {!selectedSystemId ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Select a curriculum system to browse items
                </div>
              ) : loading ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Loading items...
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No items found matching filters
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredItems.map(item => {
                    const isSelected = selectedItems.has(item.id);
                    const prereqWarning = getPrerequisiteWarning(item);

                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-lg border transition-colors ${
                          isSelected ? 'bg-primary/5 border-primary/30' : 'hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggleItem(item.id)}
                            className="mt-1"
                          />
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                {item.code}
                              </Badge>
                              <span className="font-medium text-sm">{item.title}</span>
                              <Badge variant="secondary" className="text-xs">
                                {item.level}
                              </Badge>
                              {item.domain && (
                                <span className="text-xs text-muted-foreground">
                                  {item.domain.name}
                                </span>
                              )}
                            </div>
                            
                            {item.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {item.description}
                              </p>
                            )}

                            {prereqWarning && (
                              <div className="flex items-center gap-1 mt-2 text-xs text-yellow-600">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Prerequisites: {prereqWarning}</span>
                              </div>
                            )}
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCustomize(item)}
                          >
                            <Pencil className="w-3 h-3 mr-1" />
                            Customize
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          <DialogFooter className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {selectedItems.size} items selected
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={selectedItems.size === 0 || importing}
              >
                <Plus className="w-4 h-4 mr-2" />
                Import {selectedItems.size > 0 ? `(${selectedItems.size})` : ''}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customize Dialog */}
      {customizeItem && (
        <AddTargetDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setCustomizeItem(null);
          }}
          studentId={studentId}
          editingTarget={{
            id: '',
            student_id: studentId,
            title: customizeItem.title,
            description: customizeItem.description,
            mastery_criteria: customizeItem.mastery_criteria,
            domain_id: customizeItem.domain_id,
            data_collection_type: 'discrete_trial',
            priority: 'medium',
            status: 'active',
            source_type: 'curriculum',
            source_id: customizeItem.id,
            customized: true,
            linked_prerequisite_ids: customizeItem.prerequisites,
            baseline_data: {},
            current_performance: {},
            date_added: new Date().toISOString(),
            date_mastered: null,
            added_by: null,
            notes_for_staff: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }}
          onSuccess={() => {
            setCustomizeItem(null);
            onSuccess();
          }}
        />
      )}
    </>
  );
}
