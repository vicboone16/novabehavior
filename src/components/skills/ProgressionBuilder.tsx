import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, GripVertical, Trash2, ArrowRight, Settings2, Bell, Layers, Route } from 'lucide-react';
import { useProgressionSettings, useBenchmarkStages, useProgramPathways } from '@/hooks/useProgressionEngine';
import type { CriteriaScope, CriteriaType } from '@/types/criteriaEngine';
import {
  TRIGGER_LABELS, NEXT_ACTION_LABELS, END_OF_LADDER_LABELS,
  type TriggerNextOn, type NextActionMode, type EndOfLadderAction,
  type AdvanceMode, type NotificationMode,
} from '@/types/progression';
import { PHASE_LABELS, PHASE_ORDER, CRITERIA_TYPE_LABELS, type TargetPhase } from '@/types/criteriaEngine';

interface ProgressionBuilderProps {
  scope: CriteriaScope;
  scopeId?: string | null;
  title?: string;
}

export function ProgressionBuilder({ scope, scopeId, title }: ProgressionBuilderProps) {
  const { settings, loading, upsertSettings } = useProgressionSettings(scope, scopeId);
  const { stages, upsertStage, deleteStage } = useBenchmarkStages(scope, scopeId);
  const { pathways, createPathway } = useProgramPathways(
    scope === 'global' || scope === 'student' ? scope : undefined,
    scope === 'student' ? scopeId : undefined
  );

  const [newStageName, setNewStageName] = useState('');
  const [newStageCriteriaType, setNewStageCriteriaType] = useState<CriteriaType>('mastery');

  if (loading || !settings) {
    return <div className="text-sm text-muted-foreground p-4">Loading progression settings...</div>;
  }

  const handleUpdate = (key: string, value: any) => {
    upsertSettings({ ...settings, scope, scope_id: scopeId || null, [key]: value });
  };

  const handleAddStage = () => {
    if (!newStageName.trim()) return;
    upsertStage({
      scope,
      scope_id: scopeId || null,
      name: newStageName,
      criteria_type: newStageCriteriaType,
      stage_order: stages.length,
      phase_sync_enabled: true,
    });
    setNewStageName('');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-sm">{title || 'Progression Settings'}</CardTitle>
            <Badge variant="outline" className="text-[10px]">{scope}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Section A: Automation Mode */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              When Criteria is Met
            </Label>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Auto-advance phase</Label>
                <p className="text-xs text-muted-foreground">Automatically transition to next phase</p>
              </div>
              <Switch
                checked={settings.auto_advance_enabled}
                onCheckedChange={v => handleUpdate('auto_advance_enabled', v)}
              />
            </div>

            {settings.auto_advance_enabled && (
              <div className="ml-4 border-l-2 border-muted pl-4 space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Advance Mode</Label>
                  <Select value={settings.advance_mode} onValueChange={v => handleUpdate('advance_mode', v)}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alert_only">Alert Only</SelectItem>
                      <SelectItem value="queue_for_review">Queue for Review</SelectItem>
                      <SelectItem value="auto_advance">Auto-Advance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-xs">Require confirmation</Label>
                  <Switch
                    checked={settings.require_confirmation}
                    onCheckedChange={v => handleUpdate('require_confirmation', v)}
                    className="scale-75"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section B: Trigger Control */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Trigger Actions When
            </Label>
            <Select value={settings.trigger_next_on} onValueChange={v => handleUpdate('trigger_next_on', v)}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(TRIGGER_LABELS).map(([k, label]) => (
                  <SelectItem key={k} value={k}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Section C: Next Action Mode */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              After Trigger Fires
            </Label>
            <Select value={settings.next_action_mode} onValueChange={v => handleUpdate('next_action_mode', v)}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(NEXT_ACTION_LABELS).map(([k, label]) => (
                  <SelectItem key={k} value={k}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notification Mode */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Bell className="w-3 h-3" /> Notifications
            </Label>
            <Select value={settings.notification_mode || 'immediate'} onValueChange={v => handleUpdate('notification_mode', v)}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">Notify Immediately</SelectItem>
                <SelectItem value="daily_digest">Daily Digest</SelectItem>
                <SelectItem value="none">Review Queue Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Next Target Options */}
          {settings.next_action_mode === 'next_target_in_program' && (
            <Card className="border-dashed">
              <CardContent className="py-3 space-y-3">
                <div className="flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-primary" />
                  <Label className="text-sm font-medium">Next Target Settings</Label>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Sequencing</Label>
                  <Select value={settings.sequence_mode || 'sort_order'} onValueChange={v => handleUpdate('sequence_mode', v)}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sort_order">Use Target Sort Order</SelectItem>
                      <SelectItem value="custom_list">Custom Sequence</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Auto-start in phase</Label>
                  <Select value={settings.auto_start_phase || 'baseline'} onValueChange={v => handleUpdate('auto_start_phase', v)}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PHASE_ORDER.filter(p => p !== 'closed').map(p => (
                        <SelectItem key={p} value={p}>{PHASE_LABELS[p]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-xs">Auto-open next target</Label>
                  <Switch
                    checked={settings.auto_open_next_target}
                    onCheckedChange={v => handleUpdate('auto_open_next_target', v)}
                    className="scale-75"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Benchmark Stage Ladder */}
      {settings.next_action_mode === 'next_benchmark_stage' && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm">Benchmark Stage Ladder</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {stages.map((stage, i) => (
              <div key={stage.id} className="flex items-center gap-2 p-2 rounded-md border bg-muted/30">
                <GripVertical className="w-3 h-3 text-muted-foreground cursor-grab" />
                <Badge variant="secondary" className="text-[10px]">{i + 1}</Badge>
                <span className="text-sm font-medium flex-1">{stage.name}</span>
                <Badge variant="outline" className="text-[10px]">
                  {CRITERIA_TYPE_LABELS[stage.criteria_type as CriteriaType] || stage.criteria_type}
                </Badge>
                {stage.phase_sync_enabled && (
                  <Badge variant="outline" className="text-[10px] text-primary">Phase Sync</Badge>
                )}
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => deleteStage(stage.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}

            <div className="flex items-center gap-2 pt-2">
              <Input
                value={newStageName}
                onChange={e => setNewStageName(e.target.value)}
                placeholder="Stage name..."
                className="h-8 text-sm flex-1"
              />
              <Select value={newStageCriteriaType} onValueChange={v => setNewStageCriteriaType(v as CriteriaType)}>
                <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CRITERIA_TYPE_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-8" onClick={handleAddStage}>
                <Plus className="w-3 h-3 mr-1" /> Add
              </Button>
            </div>

            <div className="space-y-1 pt-2">
              <Label className="text-xs">End-of-Ladder Action</Label>
              <Select
                value={settings.end_of_ladder_action || 'none'}
                onValueChange={v => handleUpdate('end_of_ladder_action', v)}
              >
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(END_OF_LADDER_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Program Pathway Builder */}
      {settings.next_action_mode === 'next_program_in_pathway' && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Route className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm">Program Pathway</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {pathways.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-xs text-muted-foreground mb-2">No pathways defined yet.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => createPathway({
                    scope: scope === 'student' ? 'student' : 'global',
                    scope_id: scope === 'student' ? scopeId : null,
                    name: 'New Pathway',
                  })}
                >
                  <Plus className="w-3 h-3 mr-1" /> Create Pathway
                </Button>
              </div>
            ) : (
              pathways.map(pw => (
                <div key={pw.id} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{pw.name}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {(pw.steps?.length || 0)} steps
                    </Badge>
                  </div>
                  {pw.steps?.map((step, i) => (
                    <div key={step.id} className="flex items-center gap-2 ml-4">
                      <Badge variant="outline" className="text-[10px]">{i + 1}</Badge>
                      <span className="text-xs">Program: {step.program_id.slice(0, 8)}...</span>
                      {step.auto_create_targets && (
                        <Badge variant="outline" className="text-[10px] text-primary">Auto-create targets</Badge>
                      )}
                    </div>
                  ))}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
