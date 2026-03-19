import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Brain, RefreshCw, Save, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useSdcIntake, type ReportDraft } from '@/hooks/useSdcIntake';
import { novaAIFetch } from '@/lib/novaAIFetch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

interface Props {
  reportDraftId: string;
  packageInstanceId: string;
  studentName: string;
  onBack: () => void;
}

const SNAPSHOT_SECTIONS = [
  { key: 'strengths_interests', label: 'Strengths & Interests', placeholder: 'Describe the student\'s strengths, interests, and positive contributions...' },
  { key: 'areas_of_need', label: 'Areas of Need', placeholder: 'Describe the primary areas of concern and support needs...' },
  { key: 'strategies', label: 'Strategies & Recommendations', placeholder: 'Describe recommended strategies, interventions, and supports...' },
];

// Helper to extract key data categories from source payload
function extractSourceSummaries(payload: any) {
  const forms = payload?.forms || [];
  const triggers: string[] = [];
  const consequences: string[] = [];
  const strengths: string[] = [];
  const behaviors: string[] = [];
  const priorities: { name: string; total: number }[] = [];

  for (const form of forms) {
    const r = form.responses || {};
    // Triggers
    if (Array.isArray(r.antecedent_triggers)) triggers.push(...r.antecedent_triggers.map((v: string) => v.replace(/_/g, ' ')));
    if (Array.isArray(r.immediate_triggers)) triggers.push(...r.immediate_triggers.map((v: string) => v.replace(/_/g, ' ')));
    if (Array.isArray(r.slow_triggers)) triggers.push(...r.slow_triggers.map((v: string) => v.replace(/_/g, ' ')));
    // Consequences
    for (const k of ['obtained_items_or_events', 'escaped_or_avoided_items_or_events', 'consequence_adult_attention', 'consequence_peer_attention', 'consequence_tangible_access', 'consequence_escape_avoid']) {
      if (Array.isArray(r[k])) consequences.push(...r[k].map((v: string) => v.replace(/_/g, ' ')));
    }
    // Strengths
    for (const k of ['strengths_1', 'strengths_2', 'additional_strengths']) {
      if (r[k]) strengths.push(r[k]);
    }
    // Behaviors
    if (r.primary_problem_behavior) behaviors.push(r.primary_problem_behavior.replace(/_/g, ' '));
    // Priorities
    for (let i = 1; i <= 4; i++) {
      const name = r[`behavior_${i}_name`];
      const total = Number(r[`behavior_${i}_total`]) || 0;
      if (name) priorities.push({ name, total });
    }
  }

  return { triggers: [...new Set(triggers)], consequences: [...new Set(consequences)], strengths, behaviors: [...new Set(behaviors)], priorities, forms };
}

export function SdcSnapshotEditor({ reportDraftId, packageInstanceId, studentName, onBack }: Props) {
  const intake = useSdcIntake();
  const [draft, setDraft] = useState<ReportDraft | null>(null);
  const [sourcePayload, setSourcePayload] = useState<any>(null);
  const [editedSections, setEditedSections] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const autosaveRef = useRef<NodeJS.Timeout | null>(null);
  const hasManualEdits = Object.keys(editedSections).length > 0 || !!draft?.edited_json;

  useEffect(() => {
    loadDraft();
    loadSourcePayload();
  }, [reportDraftId]);

  const loadDraft = async () => {
    try {
      const d = await intake.fetchReportDraft(reportDraftId);
      setDraft(d);
      if (d?.edited_json) {
        setEditedSections(d.edited_json as Record<string, string>);
      }
      if (d && !d.generated_json && d.generation_status !== 'generating') {
        generateSnapshot();
      }
    } catch (err: any) {
      toast.error('Failed to load snapshot: ' + err.message);
    }
  };

  const loadSourcePayload = async () => {
    try {
      const payload = await intake.getSnapshotSourcePayload(packageInstanceId);
      setSourcePayload(payload);
    } catch (err: any) {
      console.error('Failed to load source payload:', err);
    }
  };

  const generateSnapshot = async () => {
    setIsGenerating(true);
    try {
      const payload = await intake.getSnapshotSourcePayload(packageInstanceId);

      await intake.logGenerationEvent(reportDraftId, draft?.generated_json ? 'regenerated' : 'generated', { source: 'nova_ai' });

      const resp = await novaAIFetch({
        body: {
          mode: 'sdc_snapshot',
          source_payload: payload,
          student_name: studentName,
          instructions: 'Generate an SDC Behavior Snapshot report with three sections: strengths_interests, areas_of_need, and strategies. Return JSON with these three keys containing narrative text. Base content on the completed intake form responses provided in the source_payload.',
        },
      });

      if (!resp) { setIsGenerating(false); return; }

      const text = await resp.text();
      let generated: any = {};
      try {
        const parsed = JSON.parse(text);
        if (parsed.choices?.[0]?.message?.content) {
          try { generated = JSON.parse(parsed.choices[0].message.content); } catch {
            generated = { strengths_interests: parsed.choices[0].message.content, areas_of_need: '', strategies: '' };
          }
        } else if (parsed.strengths_interests || parsed.areas_of_need || parsed.strategies) {
          generated = parsed;
        }
      } catch {
        generated = { strengths_interests: text, areas_of_need: '', strategies: '' };
      }

      const normalized = {
        strengths_interests: generated.strengths_interests || '',
        areas_of_need: generated.areas_of_need || '',
        strategies: generated.strategies || '',
      };

      await intake.updateGeneratedJson(reportDraftId, normalized);
      setDraft(prev => prev ? { ...prev, generated_json: normalized, generation_status: 'completed' } : prev);
      toast.success('Snapshot generated');
    } catch (err: any) {
      toast.error('Generation failed: ' + err.message);
    } finally { setIsGenerating(false); }
  };

  const handleRegenerate = () => {
    if (hasManualEdits) {
      setShowRegenerateConfirm(true);
    } else {
      generateSnapshot();
    }
  };

  const confirmRegenerate = async () => {
    setShowRegenerateConfirm(false);
    setEditedSections({});
    await intake.saveSnapshotEdits(reportDraftId, null);
    generateSnapshot();
  };

  const handleSectionEdit = (key: string, value: string) => {
    setEditedSections(prev => {
      const next = { ...prev, [key]: value };
      if (autosaveRef.current) clearTimeout(autosaveRef.current);
      autosaveRef.current = setTimeout(async () => {
        try { await intake.saveSnapshotEdits(reportDraftId, next); } catch {}
      }, 2000);
      return next;
    });
  };

  const handleManualSave = async () => {
    setIsSaving(true);
    try {
      await intake.saveSnapshotEdits(reportDraftId, editedSections);
      toast.success('Edits saved');
    } catch (err: any) {
      toast.error('Failed to save: ' + err.message);
    } finally { setIsSaving(false); }
  };

  const getSectionContent = (key: string): string => {
    if (editedSections[key] !== undefined) return editedSections[key];
    if (draft?.edited_json && (draft.edited_json as any)[key] !== undefined) return (draft.edited_json as any)[key];
    if (draft?.generated_json) return (draft.generated_json as any)[key] || '';
    return '';
  };

  const summary = sourcePayload ? extractSourceSummaries(sourcePayload) : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Package
        </Button>
        <div className="flex items-center gap-2">
          {hasManualEdits && <Badge variant="outline" className="text-xs">Has Edits</Badge>}
          <Button variant="outline" size="sm" onClick={handleManualSave} disabled={isSaving}>
            <Save className="w-3 h-3 mr-1" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={isGenerating}>
            <RefreshCw className={`w-3 h-3 mr-1 ${isGenerating ? 'animate-spin' : ''}`} />
            Regenerate
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left panel: Source Responses */}
        <div className="lg:col-span-1 space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Source Responses</CardTitle>
              <CardDescription className="text-xs">Key data extracted from completed intake forms</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[70vh]">
                <div className="space-y-3">
                  {/* Strengths */}
                  {summary && summary.strengths.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-primary mb-1">Strengths</p>
                      {summary.strengths.map((s, i) => (
                        <p key={i} className="text-xs text-muted-foreground">{s}</p>
                      ))}
                    </div>
                  )}

                  {/* Behaviors */}
                  {summary && summary.behaviors.length > 0 && (
                    <div>
                      <Separator className="my-2" />
                      <p className="text-xs font-semibold text-destructive mb-1">Behaviors of Concern</p>
                      {summary.behaviors.map((b, i) => (
                        <Badge key={i} variant="outline" className="mr-1 mb-1 text-xs capitalize">{b}</Badge>
                      ))}
                    </div>
                  )}

                  {/* Triggers */}
                  {summary && summary.triggers.length > 0 && (
                    <div>
                      <Separator className="my-2" />
                      <p className="text-xs font-semibold text-amber-700 mb-1">Triggers</p>
                      <div className="flex flex-wrap gap-1">
                        {summary.triggers.slice(0, 12).map((t, i) => (
                          <Badge key={i} variant="secondary" className="text-xs capitalize">{t}</Badge>
                        ))}
                        {summary.triggers.length > 12 && (
                          <span className="text-xs text-muted-foreground">+{summary.triggers.length - 12} more</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Consequences */}
                  {summary && summary.consequences.length > 0 && (
                    <div>
                      <Separator className="my-2" />
                      <p className="text-xs font-semibold text-blue-700 mb-1">Consequences</p>
                      <div className="flex flex-wrap gap-1">
                        {summary.consequences.slice(0, 10).map((c, i) => (
                          <Badge key={i} variant="secondary" className="text-xs capitalize">{c}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Priorities */}
                  {summary && summary.priorities.length > 0 && (
                    <div>
                      <Separator className="my-2" />
                      <p className="text-xs font-semibold mb-1">Prioritization</p>
                      {summary.priorities.sort((a, b) => b.total - a.total).map((p, i) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span className="capitalize">{p.name}</span>
                          <Badge variant="outline" className="text-xs">{p.total}</Badge>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Raw form responses */}
                  {summary && summary.forms.length > 0 && (
                    <div>
                      <Separator className="my-2" />
                      <p className="text-xs font-semibold text-muted-foreground mb-1">All Form Responses</p>
                      {summary.forms.map((form: any, idx: number) => (
                        <div key={idx} className="space-y-1 mb-2">
                          <p className="text-xs font-semibold text-primary">{form.form_name || `Form ${idx + 1}`}</p>
                          {Object.entries(form.responses || {}).map(([key, val]) => {
                            if (!val || (Array.isArray(val) && val.length === 0)) return null;
                            const displayVal = Array.isArray(val) ? val.join(', ') : String(val);
                            if (!displayVal) return null;
                            return (
                              <div key={key} className="text-xs">
                                <span className="text-muted-foreground">{key.replace(/_/g, ' ')}: </span>
                                <span>{displayVal}</span>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  )}

                  {!summary && (
                    <p className="text-xs text-muted-foreground">Loading source data...</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Right panel: Snapshot Draft */}
        <div className="lg:col-span-2 space-y-3">
          <p className="text-xs text-muted-foreground px-1">Snapshot Draft — edit sections below before exporting.</p>
          {isGenerating && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="py-6 text-center">
                <Brain className="w-8 h-8 mx-auto mb-2 text-primary animate-pulse" />
                <p className="text-sm font-medium">Generating SDC Snapshot...</p>
                <p className="text-xs text-muted-foreground">AI is analyzing completed forms</p>
              </CardContent>
            </Card>
          )}

          {SNAPSHOT_SECTIONS.map(section => (
            <Card key={section.key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{section.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={getSectionContent(section.key)}
                  onChange={e => handleSectionEdit(section.key, e.target.value)}
                  placeholder={isGenerating ? 'Generating...' : section.placeholder}
                  rows={6}
                  className="text-sm"
                  disabled={isGenerating}
                />
                {editedSections[section.key] !== undefined && draft?.generated_json && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Manually edited
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Regenerate confirmation */}
      <Dialog open={showRegenerateConfirm} onOpenChange={setShowRegenerateConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Regenerate Snapshot?
            </DialogTitle>
            <DialogDescription>
              Regenerating may replace newly generated content. If manual edits exist, confirm whether you want to keep or replace them.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowRegenerateConfirm(false)}>Cancel</Button>
            <Button variant="outline" onClick={() => { setShowRegenerateConfirm(false); generateSnapshot(); }}>
              Regenerate and Keep My Edits
            </Button>
            <Button variant="destructive" onClick={confirmRegenerate}>
              Regenerate and Replace Edits
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
