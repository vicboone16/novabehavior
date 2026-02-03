import { useState } from 'react';
import { Search, Filter, X, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { IEPSearchQuery, IEPSearchFacets } from '@/types/iepSupports';
import {
  DOMAIN_DISPLAY,
  GRADE_BAND_DISPLAY,
  DISABILITY_DISPLAY,
  SETTING_DISPLAY,
  COMPLIANCE_DISPLAY,
  SOURCE_ORIGIN_DISPLAY,
  IEP_FILTER_PANEL_CONFIG
} from '@/types/iepSupports';

interface IEPFilterPanelProps {
  query: IEPSearchQuery;
  facets: IEPSearchFacets;
  onSearchChange: (text: string) => void;
  onToggleFilter: (key: keyof IEPSearchQuery['filters'], value: string) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export function IEPFilterPanel({
  query,
  facets,
  onSearchChange,
  onToggleFilter,
  onClearFilters,
  hasActiveFilters
}: IEPFilterPanelProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['core']));

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const getDisplayName = (field: string, value: string): string => {
    switch (field) {
      case 'domains': return DOMAIN_DISPLAY[value] || value;
      case 'grade_band': return GRADE_BAND_DISPLAY[value] || value;
      case 'disability_tags': return DISABILITY_DISPLAY[value] || value;
      case 'setting_tags': return SETTING_DISPLAY[value] || value;
      case 'idea_compliance_level': return COMPLIANCE_DISPLAY[value]?.label || value;
      case 'source_origin': return SOURCE_ORIGIN_DISPLAY[value] || value;
      case 'item_type': return value;
      default: return value;
    }
  };

  const isFilterActive = (field: string, value: string): boolean => {
    const filterValues = query.filters[field as keyof typeof query.filters] as string[] | undefined;
    return filterValues?.includes(value) || false;
  };

  // Get active filter chips
  const activeFilterChips: { field: string; value: string; label: string }[] = [];
  Object.entries(query.filters).forEach(([field, values]) => {
    if (Array.isArray(values)) {
      values.forEach(value => {
        activeFilterChips.push({
          field,
          value,
          label: getDisplayName(field, value)
        });
      });
    }
  });

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={IEP_FILTER_PANEL_CONFIG.search_placeholder}
            value={query.query_text}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant={showFilters ? 'secondary' : 'outline'}
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {hasActiveFilters && (
            <Badge variant="default" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
              {activeFilterChips.length}
            </Badge>
          )}
        </Button>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClearFilters} className="gap-1">
            <X className="w-4 h-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Active Filter Chips */}
      {activeFilterChips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {activeFilterChips.map(chip => (
            <Badge
              key={`${chip.field}-${chip.value}`}
              variant="secondary"
              className="gap-1 cursor-pointer hover:bg-destructive/10"
              onClick={() => onToggleFilter(chip.field as keyof IEPSearchQuery['filters'], chip.value)}
            >
              {chip.label}
              <X className="w-3 h-3" />
            </Badge>
          ))}
        </div>
      )}

      {/* Filter Panel */}
      <Collapsible open={showFilters}>
        <CollapsibleContent>
          <div className="p-4 bg-muted/50 rounded-lg border space-y-4">
            {IEP_FILTER_PANEL_CONFIG.filter_groups.map(group => (
              <Collapsible
                key={group.group_id}
                open={expandedGroups.has(group.group_id)}
                onOpenChange={() => toggleGroup(group.group_id)}
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full py-1 hover:bg-muted/50 rounded px-2 -mx-2">
                  <span className="font-medium text-sm">{group.title}</span>
                  {expandedGroups.has(group.group_id) ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.controls.map(control => {
                      const facetData = facets[control.field as keyof IEPSearchFacets] || [];
                      const options = control.options || facetData.map(f => f.value);
                      
                      return (
                        <div key={control.field} className="space-y-2">
                          <Label className="text-xs font-medium text-muted-foreground">
                            {control.label}
                          </Label>
                          <ScrollArea className="h-24">
                            <div className="space-y-1">
                              {options.slice(0, 10).map(option => {
                                const facet = facetData.find(f => f.value === option);
                                const count = facet?.count || 0;
                                const isActive = isFilterActive(control.field, option);
                                
                                return (
                                  <div
                                    key={option}
                                    className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded"
                                    onClick={() => onToggleFilter(control.field as keyof IEPSearchQuery['filters'], option)}
                                  >
                                    <Checkbox checked={isActive} />
                                    <span className="text-sm flex-1 truncate">
                                      {getDisplayName(control.field, option)}
                                    </span>
                                    {count > 0 && (
                                      <span className="text-xs text-muted-foreground">
                                        ({count})
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </ScrollArea>
                        </div>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
