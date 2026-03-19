import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Brain, RefreshCw, Save, CheckCircle2 } from 'lucide-react';
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
      } else if (d?.generated_json) {
        // Don't populate edited from generated — show generated as baseline
      }

      // If no generated content yet, trigger generation
      if (d && !d.generated_json && d.generation_status !== 'generating') {
        generateSnapshot(d);
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

  const generateSnapshot = async (currentDraft?: ReportDraft) => {
    setIsGenerating(true);
    try {
      const payload = await intake.getSnapshotSourcePayload(packageInstanceId);

      const resp = await novaAIFetch({
        body: {
          mode: 'sdc_snapshot',
          source_payload: payload,
          student_name: studentName,
          instructions: 'Generate an SDC Behavior Snapshot report with three sections: strengths_interests, areas_of_need, and strategies. Return JSON with these three keys containing narrative text. Base content on the completed intake form responses provided in the source_payload.',
        },
      });

      if (!resp) {
        setIsGenerating(false);
        return;
      }

      const text = await resp.text();
      let generated: any = {};
      try {
        // Try parsing as JSON
        const parsed = JSON.parse(text);
        if (parsed.choices?.[0]?.message?.content) {
          const content = parsed.choices[0].message.content;
          // Try parsing the content as JSON
          try {
            generated = JSON.parse(content);
          } catch {
            // If not JSON, split into sections heuristically
            generated = {
              strengths_interests: content.split('Areas of Need')[0] || content,
              areas_of_need: '',
              strategies: '',
            };
          }
        } else if (parsed.strengths_interests || parsed.areas_of_need || parsed.strategies) {
          generated = parsed;
        }
      } catch {
        generated = {
          strengths_interests: text,
          areas_of_need: '',
          strategies: '',
        };
      }

      // Normalize
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
    } finally {
      setIsGenerating(false);
    }
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
      // Autosave debounce
      if (autosaveRef.current) clearTimeout(autosaveRef.current);
      autosaveRef.current = setTimeout(async () => {
        try {
          await intake.saveSnapshotEdits(reportDraftId, next);
        } catch {}
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
    } finally {
      setIsSaving(false);
    }
  };

  const getSectionContent = (key: string): string => {
    // Prefer edited, fallback to generated
    if (editedSections[key] !== undefined) return editedSections[key];
    if (draft?.edited_json && (draft.edited_json as any)[key] !== undefined) return (draft.edited_json as any)[key];
    if (draft?.generated_json) return (draft.generated_json as any)[key] || '';
    return '';
  };

  // Extract source summaries for left panel
  const sourceFormSummaries = sourcePayload?.forms || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Package
        </Button>
        <div className="flex items-center gap-2">
          {hasManualEdits && (
            <Badge variant="outline" className="text-xs">Has Edits</Badge>
          )}
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
        {/* Left panel: Source data */}
        <div className="lg:col-span-1 space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Source Form Data</CardTitle>
              <CardDescription className="text-xs">
                Completed intake form responses used to generate this snapshot
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[70vh] overflow-y-auto">
              {sourceFormSummaries.length > 0 ? (
                sourceFormSummaries.map((form: any, idx: number) => (
                  <div key={idx} className="space-y-1">
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
                ))
              ) : (
                <p className="text-xs text-muted-foreground">
                  {sourcePayload ? 'No completed form responses yet.' : 'Loading source data...'}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right panel: Editable snapshot */}
        <div className="lg:col-span-2 space-y-3">
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
            <DialogTitle>Regenerate Snapshot?</DialogTitle>
            <DialogDescription>
              You have manual edits. Regenerating will replace all generated content. Your edits will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRegenerateConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmRegenerate}>Replace & Regenerate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
