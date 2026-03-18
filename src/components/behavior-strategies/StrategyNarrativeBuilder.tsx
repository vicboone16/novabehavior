import { useState, useCallback, useEffect, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileText, ChevronDown, ChevronUp, Copy, Plus, RefreshCw,
  Loader2, Stethoscope, GraduationCap, Home, Printer, AlertCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/* ── types ── */

interface StrategySelection {
  id: string | null;
  strategy_id: string | null;
  strategy_name: string | null;
  strategy_key: string | null;
  strategy_group: string | null;
  description: string | null;
  teacher_quick_version: string | null;
  family_version: string | null;
  data_to_collect: any;
  fidelity_tips: any;
  staff_scripts: any;
  notes: string | null;
  sort_order: number | null;
}

interface StrategyNarrativeBuilderProps {
  /** report_id used to look up report_strategy_selections */
  reportId: string;
  /** 'fba' | 'bip' */
  reportType: string;
  /** student id for saving */
  studentId?: string;
  /** Called when user clicks "Insert into Draft" – passes the narrative text */
  onInsertClinical?: (text: string) => void;
  onInsertTeacher?: (text: string) => void;
  onInsertCaregiver?: (text: string) => void;
}

/* ── narrative generators (template-based, no AI) ── */

function generateClinicalNarrative(strategies: StrategySelection[]): string {
  if (!strategies.length) return '';

  const groups = [...new Set(strategies.map(s => s.strategy_group).filter(Boolean))];
  const names = strategies.map(s => s.strategy_name).filter(Boolean);

  const opening = `The intervention plan incorporates ${strategies.length} evidence-based ${
    strategies.length === 1 ? 'strategy' : 'strategies'
  }${groups.length ? ` spanning ${groups.map(g => formatLabel(g!)).join(', ')}` : ''}.`;

  const body = strategies.map(s => {
    const parts: string[] = [];
    if (s.description) parts.push(s.description);
    if (s.teacher_quick_version && !s.description?.includes(s.teacher_quick_version))
      parts.push(s.teacher_quick_version);
    return `${s.strategy_name}: ${parts.join(' ') || 'See implementation steps for details.'}`;
  }).join('\n\n');

  const dataItems = strategies
    .flatMap(s => jsonToStringArray(s.data_to_collect))
    .filter(Boolean);

  const dataParagraph = dataItems.length
    ? `\n\nData collection will include: ${dataItems.join('; ')}.`
    : '';

  const fidelityItems = strategies
    .flatMap(s => jsonToStringArray(s.fidelity_tips))
    .filter(Boolean);

  const fidelityParagraph = fidelityItems.length
    ? `\n\nFidelity monitoring: ${fidelityItems.join('; ')}.`
    : '';

  return `${opening}\n\n${body}${dataParagraph}${fidelityParagraph}`;
}

function generateTeacherSummary(strategies: StrategySelection[]): string {
  if (!strategies.length) return '';

  const header = `TEACHER IMPLEMENTATION GUIDE\n${'─'.repeat(40)}\n`;

  const items = strategies.map((s, i) => {
    const lines: string[] = [`${i + 1}. ${s.strategy_name}`];
    if (s.teacher_quick_version) lines.push(`   What to do: ${s.teacher_quick_version}`);
    if (s.description && !s.teacher_quick_version) lines.push(`   Summary: ${s.description}`);

    const data = jsonToStringArray(s.data_to_collect);
    if (data.length) lines.push(`   Data to collect: ${data.join(', ')}`);

    const tips = jsonToStringArray(s.fidelity_tips);
    if (tips.length) lines.push(`   Tips: ${tips.join('; ')}`);

    return lines.join('\n');
  });

  return `${header}${items.join('\n\n')}`;
}

function generateCaregiverSummary(strategies: StrategySelection[]): string {
  if (!strategies.length) return '';

  const header = `HOME SUPPORT GUIDE\n${'─'.repeat(40)}\n\nThese strategies are being used at school and can be reinforced at home for consistency.\n\n`;

  const items = strategies.map((s, i) => {
    const lines: string[] = [`${i + 1}. ${s.strategy_name}`];
    if (s.family_version) {
      lines.push(`   At home: ${s.family_version}`);
    } else if (s.teacher_quick_version) {
      lines.push(`   How it works: ${s.teacher_quick_version}`);
    } else if (s.description) {
      lines.push(`   About: ${s.description}`);
    }
    return lines.join('\n');
  });

  return `${header}${items.join('\n\n')}\n\nConsistency between home and school helps your child generalise new skills. Ask your child's team for specific tips.`;
}

/* ── helpers ── */

function formatLabel(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function jsonToStringArray(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(v => (typeof v === 'string' ? v : JSON.stringify(v)));
  if (typeof val === 'object') return Object.values(val).map(v => String(v));
  if (typeof val === 'string') return [val];
  return [];
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  } catch {
    toast.error('Failed to copy');
  }
}

/* ── component ── */

export function StrategyNarrativeBuilder({
  reportId,
  reportType,
  studentId,
  onInsertClinical,
  onInsertTeacher,
  onInsertCaregiver,
}: StrategyNarrativeBuilderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selections, setSelections] = useState<StrategySelection[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('clinical');
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const fetchSelections = useCallback(async () => {
    if (!reportId) return;
    setLoading(true);
    try {
      // Try view first
      const { data, error } = await (supabase.from as any)('v_report_strategy_selections')
        .select('*')
        .eq('report_id', reportId)
        .order('sort_order');

      if (error) {
        // Fallback: join manually
        const { data: base } = await supabase
          .from('report_strategy_selections')
          .select('*')
          .eq('report_id', reportId)
          .order('sort_order');

        if (base?.length) {
          const stratIds = base.map((r: any) => r.strategy_id);
          const { data: strats } = await supabase
            .from('behavior_strategies')
            .select('*')
            .in('id', stratIds);

          const stratMap = new Map((strats || []).map((s: any) => [s.id, s]));
          setSelections(base.map((r: any) => {
            const s = stratMap.get(r.strategy_id) || {};
            return { ...r, ...(s as any) };
          }));
        } else {
          setSelections([]);
        }
      } else {
        setSelections((data || []) as StrategySelection[]);
      }
    } catch (err: any) {
      console.error('Failed to load strategy selections:', err.message);
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    if (isOpen && reportId) fetchSelections();
  }, [isOpen, reportId, fetchSelections]);

  const included = useMemo(
    () => selections.filter(s => s.strategy_id && !excludedIds.has(s.strategy_id)),
    [selections, excludedIds]
  );

  const clinicalText = useMemo(() => generateClinicalNarrative(included), [included]);
  const teacherText = useMemo(() => generateTeacherSummary(included), [included]);
  const caregiverText = useMemo(() => generateCaregiverSummary(included), [included]);

  const toggleExclude = (id: string) => {
    setExcludedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSaveNarrative = useCallback(async (narrativeType: string, text: string) => {
    if (!text || !reportId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('report_strategy_narratives').insert({
        report_id: reportId,
        report_type: reportType,
        narrative_type: narrativeType,
        generated_text: text,
        strategy_ids: included.map(s => s.strategy_id).filter(Boolean) as string[],
        student_id: studentId || null,
      });
      if (error) throw error;
      toast.success('Narrative saved');
    } catch (err: any) {
      toast.error('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  }, [reportId, reportType, studentId, included]);

  if (!reportId) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-primary/20">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Strategy Narrative Builder
                {selections.length > 0 && (
                  <Badge variant="secondary" className="text-xs">{selections.length} strategies</Badge>
                )}
              </CardTitle>
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
            <CardDescription className="text-xs">
              Generate clinical, teacher, and caregiver narrative drafts from selected strategies
            </CardDescription>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : selections.length === 0 ? (
              <div className="text-center py-6 space-y-2">
                <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">No strategies selected for this report yet.</p>
                <p className="text-xs text-muted-foreground">
                  Use the Suggested Strategies panel to add strategies, then return here to generate narratives.
                </p>
              </div>
            ) : (
              <>
                {/* Strategy selector */}
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">
                    Include in narrative ({included.length} of {selections.length}):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selections.map(s => {
                      const isIncluded = s.strategy_id && !excludedIds.has(s.strategy_id);
                      return (
                        <label
                          key={s.id || s.strategy_id}
                          className="flex items-center gap-1.5 cursor-pointer text-xs border rounded-md px-2 py-1 hover:bg-muted/50 transition-colors"
                        >
                          <Checkbox
                            checked={!!isIncluded}
                            onCheckedChange={() => s.strategy_id && toggleExclude(s.strategy_id)}
                          />
                          <span className={isIncluded ? 'text-foreground' : 'text-muted-foreground line-through'}>
                            {s.strategy_name || 'Unknown'}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {included.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Select at least one strategy above to generate narratives.
                  </p>
                ) : (
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="w-full grid grid-cols-3">
                      <TabsTrigger value="clinical" className="text-xs gap-1">
                        <Stethoscope className="h-3 w-3" /> Clinical
                      </TabsTrigger>
                      <TabsTrigger value="teacher" className="text-xs gap-1">
                        <GraduationCap className="h-3 w-3" /> Teacher
                      </TabsTrigger>
                      <TabsTrigger value="caregiver" className="text-xs gap-1">
                        <Home className="h-3 w-3" /> Caregiver
                      </TabsTrigger>
                    </TabsList>

                    {/* Clinical */}
                    <TabsContent value="clinical" className="space-y-2 mt-3">
                      <ScrollArea className="h-[200px] border rounded-md p-3 bg-muted/30">
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{clinicalText}</p>
                      </ScrollArea>
                      <NarrativeActions
                        text={clinicalText}
                        label="clinical"
                        onInsert={onInsertClinical}
                        onSave={() => handleSaveNarrative('clinical', clinicalText)}
                        saving={saving}
                      />
                    </TabsContent>

                    {/* Teacher */}
                    <TabsContent value="teacher" className="space-y-2 mt-3">
                      <ScrollArea className="h-[200px] border rounded-md p-3 bg-muted/30">
                        <p className="text-sm whitespace-pre-wrap leading-relaxed font-mono">{teacherText}</p>
                      </ScrollArea>
                      <NarrativeActions
                        text={teacherText}
                        label="teacher"
                        onInsert={onInsertTeacher}
                        onSave={() => handleSaveNarrative('teacher', teacherText)}
                        saving={saving}
                        showPrint
                      />
                    </TabsContent>

                    {/* Caregiver */}
                    <TabsContent value="caregiver" className="space-y-2 mt-3">
                      <ScrollArea className="h-[200px] border rounded-md p-3 bg-muted/30">
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{caregiverText}</p>
                      </ScrollArea>
                      <NarrativeActions
                        text={caregiverText}
                        label="caregiver"
                        onInsert={onInsertCaregiver}
                        onSave={() => handleSaveNarrative('caregiver', caregiverText)}
                        saving={saving}
                      />
                    </TabsContent>
                  </Tabs>
                )}
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

/* ── action bar sub-component ── */

function NarrativeActions({
  text,
  label,
  onInsert,
  onSave,
  saving,
  showPrint,
}: {
  text: string;
  label: string;
  onInsert?: (text: string) => void;
  onSave: () => void;
  saving: boolean;
  showPrint?: boolean;
}) {
  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><head><title>${DOMPurify.sanitize(label)} Summary</title>
      <style>body{font-family:sans-serif;padding:24px;white-space:pre-wrap;line-height:1.6;font-size:14px;}</style>
      </head><body></body></html>`);
    win.document.close();
    const container = win.document.body;
    text.split('\n').forEach(line => {
      const p = win.document.createElement('p');
      p.textContent = line;
      container.appendChild(p);
    });
    win.print();
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => copyToClipboard(text)}>
        <Copy className="h-3 w-3 mr-1" /> Copy
      </Button>
      {onInsert && (
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { onInsert(text); toast.success('Inserted into draft'); }}>
          <Plus className="h-3 w-3 mr-1" /> Insert into Draft
        </Button>
      )}
      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onSave} disabled={saving}>
        {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <FileText className="h-3 w-3 mr-1" />}
        Save
      </Button>
      {showPrint && (
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handlePrint}>
          <Printer className="h-3 w-3 mr-1" /> Print
        </Button>
      )}
    </div>
  );
}
