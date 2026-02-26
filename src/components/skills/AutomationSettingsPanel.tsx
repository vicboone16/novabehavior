import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAutomationSettings } from '@/hooks/useCriteriaEngine';
import type { CriteriaScope, AdvanceMode } from '@/types/criteriaEngine';

interface AutomationSettingsPanelProps {
  scope: CriteriaScope;
  scopeId?: string | null;
  title?: string;
}

const ADVANCE_MODE_LABELS: Record<AdvanceMode, string> = {
  alert_only: 'Alert Only',
  queue_for_review: 'Queue for Review',
  auto_advance: 'Auto-Advance',
};

export function AutomationSettingsPanel({ scope, scopeId, title }: AutomationSettingsPanelProps) {
  const { settings, loading, upsertSettings } = useAutomationSettings(scope, scopeId);

  if (loading || !settings) {
    return <div className="text-sm text-muted-foreground p-4">Loading settings...</div>;
  }

  const handleUpdate = (key: string, value: any) => {
    upsertSettings({
      ...settings,
      scope,
      scope_id: scopeId || null,
      [key]: value,
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm">{title || 'Workflow Automation'}</CardTitle>
          <Badge variant="outline" className="text-[10px]">{scope}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Auto-advance phase on criteria met</Label>
            <p className="text-xs text-muted-foreground">When criteria is met, automatically transition to the next phase</p>
          </div>
          <Switch
            checked={settings.auto_advance_enabled}
            onCheckedChange={v => handleUpdate('auto_advance_enabled', v)}
          />
        </div>

        {settings.auto_advance_enabled && (
          <div className="space-y-2 ml-4 border-l-2 border-muted pl-4">
            <div className="space-y-1">
              <Label className="text-xs">Advance Mode</Label>
              <Select
                value={settings.advance_mode}
                onValueChange={v => handleUpdate('advance_mode', v)}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ADVANCE_MODE_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-xs">Require confirmation before changes</Label>
              <Switch
                checked={settings.require_confirmation}
                onCheckedChange={v => handleUpdate('require_confirmation', v)}
                className="scale-75"
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Auto-open next target</Label>
            <p className="text-xs text-muted-foreground">When a target is closed, automatically open the next target in the program</p>
          </div>
          <Switch
            checked={settings.auto_open_next_target}
            onCheckedChange={v => handleUpdate('auto_open_next_target', v)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
