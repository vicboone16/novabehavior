import { useState, useMemo } from 'react';
import { Download, AlertTriangle, CheckCircle2, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
  useCurriculumSystems, 
  useCurriculumItems, 
  useDomains, 
  useTargetActions 
} from '@/hooks/useCurriculum';
import type { CurriculumItem } from '@/types/curriculum';

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  existingTargetSourceIds: string[];
  onSuccess: () => void;
}

export function BulkImportDialog({
  open,
  onOpenChange,
  studentId,
  existingTargetSourceIds,
  onSuccess,
}: BulkImportDialogProps) {
  const { systems } = useCurriculumSystems();
  const { domains } = useDomains();
  const { bulkAddTargets } = useTargetActions(studentId, onSuccess);

  const [selectedSystemId, setSelectedSystemId] = useState<string>('');
  const [selectedDomainIds, setSelectedDomainIds] = useState<Set<string>>(new Set());
  const [selectedLevels, setSelectedLevels] = useState<Set<string>>(new Set());
  const [excludeExisting, setExcludeExisting] = useState(true);
  const [includePrerequisites, setIncludePrerequisites] = useState(false);
  const [importing, setImporting] = useState(false);

  const { items, loading } = useCurriculumItems(selectedSystemId || undefined);

  // Get unique levels
  const levels = useMemo(() => {
    const levelSet = new Set<string>();
    items.forEach(item => {
      if (item.level) levelSet.add(item.level);
    });
    return Array.from(levelSet).sort();
  }, [items]);

  // Filter items based on selection
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Exclude already-added targets
      if (excludeExisting && existingTargetSourceIds.includes(item.id)) return false;
      
      // Filter by selected domains
      if (selectedDomainIds.size > 0 && item.domain_id && !selectedDomainIds.has(item.domain_id)) return false;
      
      // Filter by selected levels
      if (selectedLevels.size > 0 && item.level && !selectedLevels.has(item.level)) return false;
      
      return true;
    });
  }, [items, excludeExisting, existingTargetSourceIds, selectedDomainIds, selectedLevels]);

  // Calculate prerequisites that would be added
  const prerequisitesToAdd = useMemo(() => {
    if (!includePrerequisites) return [];
    
    const prereqIds = new Set<string>();
    filteredItems.forEach(item => {
      item.prerequisites.forEach(prereqId => {
        if (!existingTargetSourceIds.includes(prereqId) && 
            !filteredItems.some(fi => fi.id === prereqId)) {
          prereqIds.add(prereqId);
        }
      });
    });
    
    return items.filter(i => prereqIds.has(i.id));
  }, [filteredItems, includePrerequisites, items, existingTargetSourceIds]);

  const toggleDomain = (domainId: string) => {
    setSelectedDomainIds(prev => {
      const next = new Set(prev);
      if (next.has(domainId)) {
        next.delete(domainId);
      } else {
        next.add(domainId);
      }
      return next;
    });
  };

  const toggleLevel = (level: string) => {
    setSelectedLevels(prev => {
      const next = new Set(prev);
      if (next.has(level)) {
        next.delete(level);
      } else {
        next.add(level);
      }
      return next;
    });
  };

  const handleImport = async () => {
    const allItemsToAdd = [...filteredItems, ...prerequisitesToAdd];
    if (allItemsToAdd.length === 0) return;

    setImporting(true);
    try {
      const targets = allItemsToAdd.map(item => ({
        title: item.title,
        description: item.description,
        mastery_criteria: item.mastery_criteria,
        domain_id: item.domain_id,
        source_type: 'curriculum' as const,
        source_id: item.id,
        linked_prerequisite_ids: item.prerequisites,
      }));

      await bulkAddTargets(targets);
      onOpenChange(false);
      setSelectedDomainIds(new Set());
      setSelectedLevels(new Set());
    } finally {
      setImporting(false);
    }
  };

  // Get relevant domains (those that have items in selected system)
  const relevantDomains = useMemo(() => {
    const domainIds = new Set(items.map(i => i.domain_id).filter(Boolean));
    return domains.filter(d => domainIds.has(d.id));
  }, [items, domains]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Bulk Import Targets
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Curriculum Selection */}
          <div className="space-y-2">
            <Label>Curriculum System</Label>
            <Select value={selectedSystemId} onValueChange={setSelectedSystemId}>
              <SelectTrigger>
                <SelectValue placeholder="Select curriculum system" />
              </SelectTrigger>
              <SelectContent>
                {systems.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedSystemId && (
            <>
              {/* Domain Selection */}
              <div className="space-y-2">
                <Label>Domains (select multiple)</Label>
                <div className="flex flex-wrap gap-2">
                  {relevantDomains.map(domain => (
                    <Badge
                      key={domain.id}
                      variant={selectedDomainIds.has(domain.id) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleDomain(domain.id)}
                    >
                      {domain.name}
                    </Badge>
                  ))}
                </div>
                {selectedDomainIds.size === 0 && (
                  <p className="text-xs text-muted-foreground">No domains selected = all domains</p>
                )}
              </div>

              {/* Level Selection */}
              <div className="space-y-2">
                <Label>Levels (select multiple)</Label>
                <div className="flex flex-wrap gap-2">
                  {levels.map(level => (
                    <Badge
                      key={level}
                      variant={selectedLevels.has(level) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleLevel(level)}
                    >
                      {level}
                    </Badge>
                  ))}
                </div>
                {selectedLevels.size === 0 && (
                  <p className="text-xs text-muted-foreground">No levels selected = all levels</p>
                )}
              </div>

              {/* Options */}
              <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <Label htmlFor="exclude-existing" className="cursor-pointer">
                    Exclude already-added targets
                  </Label>
                  <Switch
                    id="exclude-existing"
                    checked={excludeExisting}
                    onCheckedChange={setExcludeExisting}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="include-prereqs" className="cursor-pointer">
                    Auto-include prerequisites
                  </Label>
                  <Switch
                    id="include-prereqs"
                    checked={includePrerequisites}
                    onCheckedChange={setIncludePrerequisites}
                  />
                </div>
              </div>

              {/* Preview */}
              <div className="space-y-2">
                <Label>Import Preview</Label>
                <div className="p-4 border rounded-lg bg-muted/20">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium">
                      {filteredItems.length} targets to import
                    </span>
                    {prerequisitesToAdd.length > 0 && (
                      <Badge variant="secondary">
                        +{prerequisitesToAdd.length} prerequisites
                      </Badge>
                    )}
                  </div>

                  {filteredItems.length > 0 && (
                    <ScrollArea className="h-[150px]">
                      <div className="space-y-1 pr-3">
                        {filteredItems.slice(0, 20).map(item => (
                          <div 
                            key={item.id}
                            className="flex items-center gap-2 text-xs py-1"
                          >
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                            <Badge variant="outline" className="text-xs">
                              {item.code}
                            </Badge>
                            <span className="truncate">{item.title}</span>
                          </div>
                        ))}
                        {filteredItems.length > 20 && (
                          <p className="text-xs text-muted-foreground pt-2">
                            ... and {filteredItems.length - 20} more
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  )}

                  {filteredItems.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No targets match the current filters
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={filteredItems.length === 0 || importing || !selectedSystemId}
          >
            <Download className="w-4 h-4 mr-2" />
            Import {filteredItems.length + prerequisitesToAdd.length} Targets
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
