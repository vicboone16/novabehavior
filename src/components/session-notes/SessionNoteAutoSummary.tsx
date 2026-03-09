import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Loader2, FileText, Activity, Brain, ClipboardList, Zap, Save } from 'lucide-react';
import { useSessionNoteDraft, type SessionAutoData } from '@/hooks/useSessionNoteDraft';

interface SessionNoteAutoSummaryProps {
  sessionId: string;
  studentId: string;
  onDraftCreated?: (draftId: string) => void;
}

export function SessionNoteAutoSummary({ sessionId, studentId, onDraftCreated }: SessionNoteAutoSummaryProps) {
  const { draft, autoData, loading, saving, loadAutoData, seedDraft, loadDraft, saveDraft } = useSessionNoteDraft();
  const [subjective, setSubjective] = useState('');
  const [objective, setObjective] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');
  const [includeAuto, setIncludeAuto] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (sessionId && !initialized) {
      Promise.all([loadAutoData(sessionId), loadDraft(sessionId)]).then(() => setInitialized(true));
    }
  }, [sessionId, initialized, loadAutoData, loadDraft]);

  useEffect(() => {
    if (draft) {
      setSubjective(draft.subjective_text || '');
      setObjective(draft.objective_text || '');
      setAssessment(draft.assessment_text || '');
      setPlan(draft.plan_text || '');
      setIncludeAuto(draft.include_auto_data ?? true);
    }
  }, [draft]);

  const handleSeedDraft = async () => {
    const id = await seedDraft(sessionId, 'soap');
    if (id) onDraftCreated?.(id);
  };

  const handleSave = () => {
    saveDraft({
      subjective_text: subjective,
      objective_text: objective,
      assessment_text: assessment,
      plan_text: plan,
      include_auto_data: includeAuto,
    } as any);
  };

  const buildAutoObjective = (data: SessionAutoData | null) => {
    if (!data) return '';
    const parts: string[] = [];
    if (data.skill_trial_count > 0) parts.push(`${data.skill_trial_count} skill trial(s) completed`);
    if (data.behavior_data_count > 0) parts.push(`${data.behavior_data_count} behavior data point(s) recorded`);
    if (data.abc_event_count > 0) parts.push(`${data.abc_event_count} ABC event(s) documented`);
    if (data.context_event_count > 0) parts.push(`${data.context_event_count} context/barrier event(s) logged`);
    return parts.length > 0
      ? `Session data collected: ${parts.join('; ')}.`
      : 'No session data collected during this session.';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          SOAP Note Draft
          {draft && <Badge variant="outline" className="text-[10px]">Draft</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Auto-data summary */}
        {autoData && (
          <div className="bg-muted/30 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                Auto-Pulled Session Data
              </p>
              <div className="flex items-center gap-2">
                <Label className="text-[10px] text-muted-foreground">Include in note</Label>
                <Switch checked={includeAuto} onCheckedChange={setIncludeAuto} className="scale-75" />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <DataChip icon={Brain} label="Skills" value={autoData.skill_trial_count} />
              <DataChip icon={Activity} label="Behavior" value={autoData.behavior_data_count} />
              <DataChip icon={ClipboardList} label="ABC" value={autoData.abc_event_count} />
              <DataChip icon={FileText} label="Context" value={autoData.context_event_count} />
            </div>
          </div>
        )}

        {!draft ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">No draft exists for this session yet.</p>
            <Button onClick={handleSeedDraft} disabled={loading} size="sm">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Zap className="w-4 h-4 mr-1" />}
              Generate SOAP Draft
            </Button>
          </div>
        ) : (
          <>
            {/* S - Subjective */}
            <div>
              <Label className="text-xs font-semibold text-foreground">S — Subjective</Label>
              <p className="text-[10px] text-muted-foreground mb-1">Client/caregiver report, mood, presenting concerns</p>
              <Textarea value={subjective} onChange={e => setSubjective(e.target.value)} rows={3} className="text-sm" placeholder="Client presented as..." />
            </div>

            {/* O - Objective */}
            <div>
              <Label className="text-xs font-semibold text-foreground">O — Objective</Label>
              <p className="text-[10px] text-muted-foreground mb-1">Measurable data, observations, session metrics</p>
              {includeAuto && autoData && (
                <div className="bg-primary/5 border border-primary/10 rounded p-2 mb-1.5 text-xs text-foreground">
                  {buildAutoObjective(autoData)}
                </div>
              )}
              <Textarea value={objective} onChange={e => setObjective(e.target.value)} rows={3} className="text-sm" placeholder="Additional objective observations..." />
            </div>

            {/* A - Assessment */}
            <div>
              <Label className="text-xs font-semibold text-foreground">A — Assessment</Label>
              <p className="text-[10px] text-muted-foreground mb-1">Clinical interpretation, progress evaluation</p>
              <Textarea value={assessment} onChange={e => setAssessment(e.target.value)} rows={3} className="text-sm" placeholder="Client demonstrated..." />
            </div>

            {/* P - Plan */}
            <div>
              <Label className="text-xs font-semibold text-foreground">P — Plan</Label>
              <p className="text-[10px] text-muted-foreground mb-1">Next steps, modifications, follow-up</p>
              <Textarea value={plan} onChange={e => setPlan(e.target.value)} rows={3} className="text-sm" placeholder="Continue current protocol..." />
            </div>

            <Separator />
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving} size="sm">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                Save Draft
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function DataChip({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5 bg-background rounded px-2 py-1 border border-border/50">
      <Icon className="w-3 h-3 text-muted-foreground" />
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className="text-xs font-semibold text-foreground ml-auto">{value}</span>
    </div>
  );
}
