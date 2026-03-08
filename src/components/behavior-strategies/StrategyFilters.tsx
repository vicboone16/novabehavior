import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Filter, X } from 'lucide-react';

export interface StrategyFilterState {
  functionTargets: string[];
  strategyGroups: string[];
  categories: string[];
  evidenceLevels: string[];
  escalationLevels: string[];
  environments: string[];
  hasTraining: boolean | null;
  showArchived: boolean;
}

export const emptyFilters: StrategyFilterState = {
  functionTargets: [],
  strategyGroups: [],
  categories: [],
  evidenceLevels: [],
  escalationLevels: [],
  environments: [],
  hasTraining: null,
  showArchived: false,
};

const FUNCTION_OPTIONS = ['attention', 'escape', 'access', 'sensory', 'multiple', 'unknown'];
const EVIDENCE_OPTIONS = ['strong', 'moderate', 'emerging', 'expert_consensus'];
const ESCALATION_OPTIONS = ['low', 'moderate', 'high', 'crisis'];
const ENVIRONMENT_OPTIONS = ['classroom', 'home', 'community', 'clinic', 'playground', 'virtual'];

interface Props {
  filters: StrategyFilterState;
  onChange: (f: StrategyFilterState) => void;
  availableGroups: string[];
  availableCategories: string[];
  canViewArchived: boolean;
}

function MultiCheck({ label, options, selected, onToggle }: {
  label: string; options: string[]; selected: string[];
  onToggle: (val: string) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
      <div className="grid grid-cols-2 gap-1">
        {options.map(opt => (
          <label key={opt} className="flex items-center gap-1.5 text-xs cursor-pointer">
            <Checkbox checked={selected.includes(opt)} onCheckedChange={() => onToggle(opt)} className="h-3.5 w-3.5" />
            <span className="capitalize">{opt.replace(/_/g, ' ')}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export function StrategyFilters({ filters, onChange, availableGroups, availableCategories, canViewArchived }: Props) {
  const [open, setOpen] = useState(false);

  const toggle = (key: keyof StrategyFilterState, val: string) => {
    const arr = filters[key] as string[];
    const next = arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];
    onChange({ ...filters, [key]: next });
  };

  const activeCount = [
    filters.functionTargets, filters.strategyGroups, filters.categories,
    filters.evidenceLevels, filters.escalationLevels, filters.environments,
  ].reduce((sum, arr) => sum + arr.length, 0) + (filters.hasTraining !== null ? 1 : 0) + (filters.showArchived ? 1 : 0);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Filter className="h-4 w-4" />
          Filters
          {activeCount > 0 && <Badge variant="secondary" className="ml-1 text-[10px]">{activeCount}</Badge>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 max-h-[70vh] overflow-y-auto space-y-3 p-4" align="start">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Filters</p>
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => onChange(emptyFilters)}>
            <X className="h-3 w-3 mr-1" /> Clear
          </Button>
        </div>

        <MultiCheck label="Function" options={FUNCTION_OPTIONS} selected={filters.functionTargets}
          onToggle={v => toggle('functionTargets', v)} />
        {availableGroups.length > 0 && (
          <MultiCheck label="Strategy Group" options={availableGroups} selected={filters.strategyGroups}
            onToggle={v => toggle('strategyGroups', v)} />
        )}
        {availableCategories.length > 0 && (
          <MultiCheck label="Category" options={availableCategories} selected={filters.categories}
            onToggle={v => toggle('categories', v)} />
        )}
        <MultiCheck label="Evidence Level" options={EVIDENCE_OPTIONS} selected={filters.evidenceLevels}
          onToggle={v => toggle('evidenceLevels', v)} />
        <MultiCheck label="Escalation Level" options={ESCALATION_OPTIONS} selected={filters.escalationLevels}
          onToggle={v => toggle('escalationLevels', v)} />
        <MultiCheck label="Environment" options={ENVIRONMENT_OPTIONS} selected={filters.environments}
          onToggle={v => toggle('environments', v)} />

        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Other</p>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <Checkbox checked={filters.hasTraining === true}
              onCheckedChange={() => onChange({ ...filters, hasTraining: filters.hasTraining === true ? null : true })}
              className="h-3.5 w-3.5" />
            <span>Has training links</span>
          </label>
          {canViewArchived && (
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <Checkbox checked={filters.showArchived}
                onCheckedChange={() => onChange({ ...filters, showArchived: !filters.showArchived })}
                className="h-3.5 w-3.5" />
              <span>Show archived</span>
            </label>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
