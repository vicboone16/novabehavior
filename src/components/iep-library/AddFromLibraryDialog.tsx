import { useState } from 'react';
import { Search, Filter, X, Plus, CheckCircle2, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useIEPLibrary } from '@/hooks/useIEPLibrary';
import type { IEPLibraryItem, IEPStudentStatus } from '@/types/iepLibrary';
import {
  DOMAIN_DISPLAY_NAMES,
  DISABILITY_DISPLAY_NAMES,
  GRADE_BAND_DISPLAY_NAMES,
  SETTING_DISPLAY_NAMES,
  IEP_DOMAINS,
  IEP_DISABILITY_TAGS,
  IEP_GRADE_BANDS,
  IEP_SETTING_TAGS
} from '@/types/iepLibrary';

interface AddFromLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddItem: (itemId: string, status: IEPStudentStatus) => void;
  existingItemIds: string[];
}

export function AddFromLibraryDialog({
  open,
  onOpenChange,
  onAddItem,
  existingItemIds
}: AddFromLibraryDialogProps) {
  const { libraryItems, isLoading, filters, setFilters } = useIEPLibrary();
  const [showFilters, setShowFilters] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const availableItems = libraryItems.filter(item => !existingItemIds.includes(item.id));

  const handleToggleItem = (itemId: string) => {
    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleAddSelected = (status: IEPStudentStatus) => {
    selectedItems.forEach(itemId => {
      onAddItem(itemId, status);
    });
    setSelectedItems([]);
    onOpenChange(false);
  };

  const handleQuickAdd = (itemId: string, status: IEPStudentStatus) => {
    onAddItem(itemId, status);
  };

  const toggleFilter = (category: keyof typeof filters, value: string) => {
    const currentValues = filters[category] as string[];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    setFilters({ ...filters, [category]: newValues });
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      item_type: 'all',
      domains: [],
      disability_tags: [],
      grade_band: [],
      setting_tags: [],
      topics: [],
      sort_by: 'title'
    });
  };

  const hasActiveFilters = 
    filters.domains.length > 0 ||
    filters.disability_tags.length > 0 ||
    filters.grade_band.length > 0 ||
    filters.setting_tags.length > 0 ||
    filters.item_type !== 'all';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add from IEP Library</DialogTitle>
        </DialogHeader>

        {/* Search and Filters */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search supports by title, description, or topic..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-9"
              />
            </div>
            <Button
              variant={showFilters ? 'secondary' : 'outline'}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {hasActiveFilters && (
                <Badge variant="default" className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
                  !
                </Badge>
              )}
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
          </div>

          <Collapsible open={showFilters}>
            <CollapsibleContent>
              <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Item Type */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Type</Label>
                    <div className="flex gap-2">
                      <Button
                        variant={filters.item_type === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilters({ ...filters, item_type: 'all' })}
                      >
                        All
                      </Button>
                      <Button
                        variant={filters.item_type === 'accommodation' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilters({ ...filters, item_type: 'accommodation' })}
                      >
                        Accommodations
                      </Button>
                      <Button
                        variant={filters.item_type === 'modification' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilters({ ...filters, item_type: 'modification' })}
                      >
                        Modifications
                      </Button>
                    </div>
                  </div>

                  {/* Grade Band */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Grade Band</Label>
                    <div className="flex flex-wrap gap-1">
                      {IEP_GRADE_BANDS.map(grade => (
                        <Badge
                          key={grade}
                          variant={filters.grade_band.includes(grade) ? 'default' : 'outline'}
                          className="cursor-pointer text-xs"
                          onClick={() => toggleFilter('grade_band', grade)}
                        >
                          {GRADE_BAND_DISPLAY_NAMES[grade]}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Disability Tags */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Classification</Label>
                    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                      {IEP_DISABILITY_TAGS.map(tag => (
                        <Badge
                          key={tag}
                          variant={filters.disability_tags.includes(tag) ? 'default' : 'outline'}
                          className="cursor-pointer text-xs"
                          onClick={() => toggleFilter('disability_tags', tag)}
                        >
                          {DISABILITY_DISPLAY_NAMES[tag]}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Domains */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Domain</Label>
                    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                      {IEP_DOMAINS.slice(0, 8).map(domain => (
                        <Badge
                          key={domain}
                          variant={filters.domains.includes(domain) ? 'default' : 'outline'}
                          className="cursor-pointer text-xs"
                          onClick={() => toggleFilter('domains', domain)}
                        >
                          {DOMAIN_DISPLAY_NAMES[domain]}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Results - fixed height ScrollArea for proper scrolling */}
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-[400px] -mx-6 px-6">
            <div className="space-y-2 pr-4">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading library items...
                </div>
              ) : availableItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No items found matching your criteria.
                </div>
              ) : (
                <>
                  <div className="text-xs text-muted-foreground mb-2">
                    Showing {availableItems.length} item(s)
                  </div>
                  {availableItems.map(item => (
                    <LibraryItemRow
                      key={item.id}
                      item={item}
                      isSelected={selectedItems.includes(item.id)}
                      onToggle={() => handleToggleItem(item.id)}
                      onQuickAdd={handleQuickAdd}
                    />
                  ))}
                </>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Footer Actions */}
        {selectedItems.length > 0 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <span className="text-sm text-muted-foreground">
              {selectedItems.length} item(s) selected
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handleAddSelected('existing')}
              >
                Add as Existing
              </Button>
              <Button onClick={() => handleAddSelected('considering')}>
                Add as Considering
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface LibraryItemRowProps {
  item: IEPLibraryItem;
  isSelected: boolean;
  onToggle: () => void;
  onQuickAdd: (itemId: string, status: IEPStudentStatus) => void;
}

function LibraryItemRow({ item, isSelected, onToggle, onQuickAdd }: LibraryItemRowProps) {
  return (
    <div 
      className={`p-3 border rounded-lg transition-colors ${
        isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
      }`}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggle}
          className="mt-1"
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium">{item.title}</span>
            <Badge variant={item.item_type === 'accommodation' ? 'default' : 'destructive'} className="text-xs">
              {item.item_type === 'accommodation' ? 'Accommodation' : 'Modification'}
            </Badge>
            {item.idea_compliance_level === 'safe' && (
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            )}
            {item.idea_compliance_level === 'caution' && (
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            )}
            {item.idea_compliance_level === 'modification' && (
              <AlertTriangle className="w-4 h-4 text-red-600" />
            )}
          </div>
          
          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
            {item.description}
          </p>

          <div className="flex flex-wrap gap-1">
            {item.domains.slice(0, 3).map(domain => (
              <Badge key={domain} variant="outline" className="text-xs">
                {DOMAIN_DISPLAY_NAMES[domain] || domain}
              </Badge>
            ))}
            {item.grade_band.slice(0, 2).map(grade => (
              <Badge key={grade} variant="secondary" className="text-xs">
                {GRADE_BAND_DISPLAY_NAMES[grade] || grade}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onQuickAdd(item.id, 'existing')}
          >
            <Plus className="w-4 h-4 mr-1" />
            Existing
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onQuickAdd(item.id, 'considering')}
          >
            <Plus className="w-4 h-4 mr-1" />
            Considering
          </Button>
        </div>
      </div>
    </div>
  );
}
