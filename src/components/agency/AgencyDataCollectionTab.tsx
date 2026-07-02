import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ClipboardCheck, Loader2, Save, Target } from 'lucide-react';
import { toast } from 'sonner';
import { useAgencyDataCollectionSettings, AgencyDataCollectionSettings } from '@/hooks/useAgencyDataCollectionSettings';
import type { MasteryCriteriaType } from '@/types/behavior';

export function AgencyDataCollectionTab() {
  const { settings, loading, saveSettings, canEdit } = useAgencyDataCollectionSettings();
  const [form, setForm] = useState<AgencyDataCollectionSettings>(settings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    const ok = await saveSettings(form);
    setSaving(false);
    if (ok) {
      toast.success('Data collection settings saved');
    } else {
      toast.error('Failed to save data collection settings');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        These defaults apply agency-wide and can differ from any other agency you belong to.
        Individual skill targets can still override the mastery criteria below.
      </p>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Data Quality Thresholds
          </CardTitle>
          <CardDescription>
            Controls when IOA and treatment fidelity checks are flagged as unreliable, and the
            session length assumed for rate/hour calculations when observation duration wasn't recorded.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>IOA Threshold (%)</Label>
              <Input
                type="number"
                min={1}
                max={100}
                disabled={!canEdit}
                value={form.ioaThresholdPercent}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, ioaThresholdPercent: clamp(Number(e.target.value)) }))
                }
              />
            </div>
            <div>
              <Label>Fidelity Threshold (%)</Label>
              <Input
                type="number"
                min={1}
                max={100}
                disabled={!canEdit}
                value={form.fidelityThresholdPercent}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, fidelityThresholdPercent: clamp(Number(e.target.value)) }))
                }
              />
            </div>
            <div>
              <Label>Default Session Length (min)</Label>
              <Input
                type="number"
                min={1}
                disabled={!canEdit}
                value={form.defaultSessionLengthMinutes}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    defaultSessionLengthMinutes: Math.max(1, Number(e.target.value) || 1),
                  }))
                }
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="text-sm">Require session context before data entry</Label>
              <p className="text-xs text-muted-foreground">
                Staff must set session type/setting in the workspace before recording data.
              </p>
            </div>
            <Switch
              checked={form.requireSessionType}
              disabled={!canEdit}
              onCheckedChange={(checked) => setForm((prev) => ({ ...prev, requireSessionType: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4" />
            Default Mastery Criteria
          </CardTitle>
          <CardDescription>
            Pre-fills new skill targets. Each target can still be customized individually.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Criteria Type</Label>
              <Select
                value={form.defaultMasteryType}
                disabled={!canEdit}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, defaultMasteryType: value as MasteryCriteriaType }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent_correct">Percent Correct</SelectItem>
                  <SelectItem value="consecutive_sessions">Consecutive Sessions</SelectItem>
                  <SelectItem value="trend_stability">Trend Stability</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Mastery Percent (%)</Label>
              <Input
                type="number"
                min={1}
                max={100}
                disabled={!canEdit}
                value={form.defaultMasteryPercent}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, defaultMasteryPercent: clamp(Number(e.target.value)) }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Consecutive Sessions</Label>
              <Input
                type="number"
                min={1}
                disabled={!canEdit}
                value={form.defaultMasteryConsecutiveSessions}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    defaultMasteryConsecutiveSessions: Math.max(1, Number(e.target.value) || 1),
                  }))
                }
              />
            </div>
            <div>
              <Label>Minimum Trials per Session</Label>
              <Input
                type="number"
                min={1}
                disabled={!canEdit}
                value={form.defaultMasteryMinTrials}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    defaultMasteryMinTrials: Math.max(1, Number(e.target.value) || 1),
                  }))
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {canEdit ? (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Data Collection Settings
              </>
            )}
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Only agency owners/admins can change these settings.
        </p>
      )}
    </div>
  );
}

function clamp(value: number): number {
  if (Number.isNaN(value)) return 1;
  return Math.min(100, Math.max(1, value));
}
