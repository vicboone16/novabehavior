import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  type CriteriaRuleJson,
  type CriteriaType,
  type MeasureType,
  type WindowType,
  MEASURE_LABELS,
  WINDOW_LABELS,
  CRITERIA_TYPE_LABELS,
  generateCriteriaPreview,
  getDefaultCriteriaRule,
} from '@/types/criteriaEngine';

interface CriteriaBuilderProps {
  criteriaType: CriteriaType;
  value: CriteriaRuleJson;
  onChange: (rule: CriteriaRuleJson) => void;
  name: string;
  onNameChange: (name: string) => void;
  active: boolean;
  onActiveChange: (active: boolean) => void;
}

export function CriteriaBuilder({
  criteriaType,
  value,
  onChange,
  name,
  onNameChange,
  active,
  onActiveChange,
}: CriteriaBuilderProps) {
  const update = (partial: Partial<CriteriaRuleJson>) => {
    onChange({ ...value, ...partial });
  };

  const updateWindow = (partial: Partial<CriteriaRuleJson['window']>) => {
    onChange({ ...value, window: { ...value.window, ...partial } });
  };

  const updateFilters = (partial: Partial<CriteriaRuleJson['filters']>) => {
    onChange({ ...value, filters: { ...value.filters, ...partial } });
  };

  const updateSuccessDef = (partial: Partial<CriteriaRuleJson['success_definition']>) => {
    onChange({ ...value, success_definition: { ...value.success_definition, ...partial } });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{CRITERIA_TYPE_LABELS[criteriaType]}</Badge>
            <CardTitle className="text-base">Criteria Settings</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Active</Label>
            <Switch checked={active} onCheckedChange={onActiveChange} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Name */}
        <div className="space-y-1">
          <Label className="text-xs">Criteria Name</Label>
          <Input value={name} onChange={e => onNameChange(e.target.value)} placeholder="e.g., Mastery ≥80% (3 sessions)" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Measure */}
          <div className="space-y-1">
            <Label className="text-xs">Measurement Type</Label>
            <Select value={value.measure} onValueChange={v => update({ measure: v as MeasureType })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(MEASURE_LABELS).map(([k, label]) => (
                  <SelectItem key={k} value={k}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Threshold */}
          <div className="space-y-1">
            <Label className="text-xs">Threshold (%)</Label>
            <Input type="number" min={0} max={100} value={value.threshold} onChange={e => update({ threshold: Number(e.target.value) })} />
          </div>
        </div>

        {/* Success Definition */}
        <div className="space-y-2 border rounded p-3 bg-muted/20">
          <Label className="text-xs font-semibold">Success Definition</Label>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Count prompted as correct?</Label>
            <Switch checked={value.success_definition.count_prompted_as_correct} onCheckedChange={v => updateSuccessDef({ count_prompted_as_correct: v })} />
          </div>
          {value.success_definition.count_prompted_as_correct && (
            <div className="space-y-1">
              <Label className="text-xs">Max prompt rank allowed (null = any)</Label>
              <Input
                type="number"
                min={1}
                max={6}
                value={value.success_definition.max_prompt_rank_allowed ?? ''}
                onChange={e => updateSuccessDef({ max_prompt_rank_allowed: e.target.value ? Number(e.target.value) : null })}
                placeholder="Leave empty for any"
              />
            </div>
          )}
        </div>

        {/* Window */}
        <div className="space-y-2 border rounded p-3 bg-muted/20">
          <Label className="text-xs font-semibold">Evaluation Window</Label>
          <Select value={value.window.type} onValueChange={v => updateWindow({ type: v as WindowType })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(WINDOW_LABELS).map(([k, label]) => (
                <SelectItem key={k} value={k}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {value.window.type === 'consecutive_sessions' && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs"># Sessions</Label>
                <Input type="number" min={1} value={value.window.n ?? 3} onChange={e => updateWindow({ n: Number(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Min opportunities/session</Label>
                <Input type="number" min={1} value={value.window.min_opportunities_per_session ?? 5} onChange={e => updateWindow({ min_opportunities_per_session: Number(e.target.value) })} />
              </div>
            </div>
          )}

          {value.window.type === 'within_time_period' && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Required successes</Label>
                <Input type="number" min={1} value={value.window.required_successes ?? 2} onChange={e => updateWindow({ required_successes: Number(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Within days</Label>
                <Input type="number" min={1} value={value.window.days ?? 14} onChange={e => updateWindow({ days: Number(e.target.value) })} />
              </div>
            </div>
          )}

          {value.window.type === 'scheduled_frequency' && (
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Frequency</Label>
                <Select value={value.window.frequency ?? 'weekly'} onValueChange={v => updateWindow({ frequency: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Biweekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Duration (weeks)</Label>
                <Input type="number" min={1} value={value.window.duration_weeks ?? 4} onChange={e => updateWindow({ duration_weeks: Number(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Min successes</Label>
                <Input type="number" min={1} value={value.window.min_successes ?? 4} onChange={e => updateWindow({ min_successes: Number(e.target.value) })} />
              </div>
            </div>
          )}

          {value.window.type === 'rolling_window' && (
            <div className="space-y-1">
              <Label className="text-xs">Window size (sessions/trials)</Label>
              <Input type="number" min={1} value={value.window.n ?? 10} onChange={e => updateWindow({ n: Number(e.target.value) })} />
            </div>
          )}

          {value.window.type === 'consecutive_opportunities' && (
            <div className="space-y-1">
              <Label className="text-xs"># Consecutive opportunities</Label>
              <Input type="number" min={1} value={value.window.n ?? 10} onChange={e => updateWindow({ n: Number(e.target.value) })} />
            </div>
          )}

          {value.window.type === 'per_condition' && (
            <div className="space-y-1">
              <Label className="text-xs">Min sessions per condition</Label>
              <Input type="number" min={1} value={value.window.min_sessions_per_condition ?? 1} onChange={e => updateWindow({ min_sessions_per_condition: Number(e.target.value) })} />
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="space-y-2 border rounded p-3 bg-muted/20">
          <Label className="text-xs font-semibold">Filters</Label>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Session Type</Label>
              <Select value={value.filters.session_type ?? 'any'} onValueChange={v => updateFilters({ session_type: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="teaching">Teaching</SelectItem>
                  <SelectItem value="probe">Probe</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {criteriaType === 'generalization' && (
            <div className="grid grid-cols-3 gap-2 mt-2">
              <div className="space-y-1">
                <Label className="text-xs"># People required</Label>
                <Input type="number" min={0} value={value.filters.people_required ?? 2} onChange={e => updateFilters({ people_required: Number(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs"># Settings required</Label>
                <Input type="number" min={0} value={value.filters.settings_required ?? 2} onChange={e => updateFilters({ settings_required: Number(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs"># Materials required</Label>
                <Input type="number" min={0} value={value.filters.materials_required ?? 0} onChange={e => updateFilters({ materials_required: Number(e.target.value) })} />
              </div>
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="border rounded p-3 bg-primary/5">
          <Label className="text-xs font-semibold text-primary">Preview</Label>
          <p className="text-sm mt-1">✅ {generateCriteriaPreview(value)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
