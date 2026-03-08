import { useState, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  ChevronDown, ChevronUp, Copy, Plus, Trash2, FileText,
  Loader2, AlertCircle, Check, Pencil, MapPin,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/* ── types ── */

export type SectionTarget =
  | 'intervention_section'
  | 'teacher_implementation_section'
  | 'caregiver_support_section'
  | 'recommendations_section'
  | 'custom_notes_section';

export interface MappedSection {
  id: string;
  narrativeType: 'clinical' | 'teacher' | 'caregiver';
  sectionTarget: SectionTarget;
  text: string;
  status: 'not_inserted' | 'inserted' | 'saved_only';
}

const SECTION_TARGET_LABELS: Record<SectionTarget, string> = {
  intervention_section: 'Intervention Section',
  teacher_implementation_section: 'Teacher Implementation Section',
  caregiver_support_section: 'Caregiver Support Section',
  recommendations_section: 'Recommendations Section',
  custom_notes_section: 'Custom Notes Section',
};

const NARRATIVE_LABELS: Record<string, string> = {
  clinical: 'Clinical Narrative',
  teacher: 'Teacher Summary',
  caregiver: 'Caregiver Summary',
};

const DEFAULT_MAPPINGS: Record<string, SectionTarget> = {
  clinical: 'intervention_section',
  teacher: 'teacher_implementation_section',
  caregiver: 'caregiver_support_section',
};

interface MappedNarrativeSectionsProps {
  reportId: string;
  reportType: 'fba' | 'bip';
  studentId?: string;
  /** Called when user clicks "Insert into Report Section" */
  onInsertIntoSection?: (sectionTarget: SectionTarget, text: string, narrativeType: string) => void;
}

/* ── helpers ── */

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  } catch {
    toast.error('Failed to copy');
  }
}

/* ── component ── */

export function MappedNarrativeSections({
  reportId,
  reportType,
  studentId,
  onInsertIntoSection,
}: MappedNarrativeSectionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState<MappedSection[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [saving, setSaving] = useState(false);

  /* Load narratives from DB and build mapped sections */
  const fetchNarratives = useCallback(async () => {
    if (!reportId) return;
    setLoading(true);
    try {
      // 1. Try report_strategy_section_content first
      const { data: sectionContent } = await (supabase.from as any)('report_strategy_section_content')
        .select('*')
        .eq('report_id', reportId);

      if (sectionContent?.length) {
        setSections(sectionContent.map((sc: any) => ({
          id: sc.id || crypto.randomUUID(),
          narrativeType: sc.narrative_type || 'clinical',
          sectionTarget: sc.section_key || DEFAULT_MAPPINGS[sc.narrative_type] || 'intervention_section',
          text: sc.content || sc.generated_text || '',
          status: sc.inserted ? 'inserted' : 'saved_only',
        })));
        return;
      }

      // 2. Fallback: load from report_strategy_narratives
      const { data: narratives } = await supabase
        .from('report_strategy_narratives')
        .select('*')
        .eq('report_id', reportId);

      if (narratives?.length) {
        setSections(narratives.map((n: any) => ({
          id: n.id || crypto.randomUUID(),
          narrativeType: n.narrative_type || 'clinical',
          sectionTarget: DEFAULT_MAPPINGS[n.narrative_type] || 'intervention_section',
          text: n.generated_text || '',
          status: 'saved_only' as const,
        })));
      } else {
        setSections([]);
      }
    } catch (err: any) {
      console.error('Failed to load narrative sections:', err.message);
      setSections([]);
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    if (isOpen && reportId) fetchNarratives();
  }, [isOpen, reportId, fetchNarratives]);

  /* Actions */
  const handleInsert = useCallback((section: MappedSection) => {
    if (!onInsertIntoSection) {
      toast.error('Insert handler not available for this report type');
      return;
    }
    onInsertIntoSection(section.sectionTarget, section.text, section.narrativeType);
    setSections(prev => prev.map(s =>
      s.id === section.id ? { ...s, status: 'inserted' } : s
    ));
    toast.success(`Inserted into ${SECTION_TARGET_LABELS[section.sectionTarget]}`);
  }, [onInsertIntoSection]);

  const handleSaveSection = useCallback(async (section: MappedSection) => {
    setSaving(true);
    try {
      const payload = {
        report_id: reportId,
        report_type: reportType,
        narrative_type: section.narrativeType,
        section_key: section.sectionTarget,
        content: section.text,
        student_id: studentId || null,
        inserted: section.status === 'inserted',
      };
      // Upsert into section content table
      const { error } = await (supabase.from as any)('report_strategy_section_content')
        .upsert(payload, { onConflict: 'report_id,narrative_type' });
      if (error) throw error;
      toast.success('Section saved');
    } catch {
      // Fallback: save to narratives table
      try {
        await supabase.from('report_strategy_narratives').insert({
          report_id: reportId,
          report_type: reportType,
          narrative_type: section.narrativeType,
          generated_text: section.text,
          student_id: studentId || null,
          strategy_ids: [],
        });
        toast.success('Saved to narratives');
      } catch (e2: any) {
        toast.error('Save failed: ' + e2.message);
      }
    } finally {
      setSaving(false);
    }
  }, [reportId, reportType, studentId]);

  const handleRemove = (id: string) => {
    setSections(prev => prev.filter(s => s.id !== id));
    toast.success('Removed from mapped sections');
  };

  const handleChangeTarget = (id: string, target: SectionTarget) => {
    setSections(prev => prev.map(s =>
      s.id === id ? { ...s, sectionTarget: target, status: 'not_inserted' } : s
    ));
  };

  const startEdit = (section: MappedSection) => {
    setEditingId(section.id);
    setEditText(section.text);
  };

  const confirmEdit = (id: string) => {
    setSections(prev => prev.map(s =>
      s.id === id ? { ...s, text: editText } : s
    ));
    setEditingId(null);
    setEditText('');
  };

  if (!reportId) return null;

  const statusBadge = (status: MappedSection['status']) => {
    switch (status) {
      case 'inserted':
        return <Badge variant="default" className="text-[10px] h-5"><Check className="h-3 w-3 mr-0.5" />Inserted</Badge>;
      case 'saved_only':
        return <Badge variant="secondary" className="text-[10px] h-5">Saved</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] h-5">Not inserted</Badge>;
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-accent/30">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="h-4 w-4 text-accent-foreground" />
                Generated Narrative Sections
                {sections.length > 0 && (
                  <Badge variant="secondary" className="text-xs">{sections.length}</Badge>
                )}
              </CardTitle>
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
            <CardDescription className="text-xs">
              Map generated narratives to report sections for append-only insertion
            </CardDescription>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-3 pt-0">
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : sections.length === 0 ? (
              <div className="text-center py-6 space-y-2">
                <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">No generated narratives found.</p>
                <p className="text-xs text-muted-foreground">
                  Use the Strategy Narrative Builder to generate narratives, then they'll appear here for section mapping.
                </p>
              </div>
            ) : (
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-3">
                  {sections.map(section => (
                    <Card key={section.id} className="bg-muted/30">
                      <CardContent className="p-3 space-y-2">
                        {/* Header row */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px]">
                              {NARRATIVE_LABELS[section.narrativeType] || section.narrativeType}
                            </Badge>
                            <span className="text-muted-foreground text-xs">→</span>
                            <Select
                              value={section.sectionTarget}
                              onValueChange={(v: SectionTarget) => handleChangeTarget(section.id, v)}
                            >
                              <SelectTrigger className="h-6 text-xs w-auto min-w-[180px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(SECTION_TARGET_LABELS).map(([k, v]) => (
                                  <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {statusBadge(section.status)}
                        </div>

                        {/* Text preview or editor */}
                        {editingId === section.id ? (
                          <div className="space-y-1">
                            <Textarea
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              rows={4}
                              className="text-xs"
                            />
                            <div className="flex gap-1">
                              <Button size="sm" variant="default" className="h-6 text-xs" onClick={() => confirmEdit(section.id)}>
                                Save Edit
                              </Button>
                              <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setEditingId(null)}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                            {section.text.slice(0, 200)}{section.text.length > 200 ? '…' : ''}
                          </p>
                        )}

                        {/* Actions */}
                        <div className="flex flex-wrap gap-1">
                          <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => copyToClipboard(section.text)}>
                            <Copy className="h-3 w-3 mr-0.5" /> Copy
                          </Button>
                          <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => handleSaveSection(section)} disabled={saving}>
                            {saving ? <Loader2 className="h-3 w-3 animate-spin mr-0.5" /> : <FileText className="h-3 w-3 mr-0.5" />}
                            Save Draft
                          </Button>
                          {onInsertIntoSection && (
                            <Button variant="default" size="sm" className="h-6 text-[10px]" onClick={() => handleInsert(section)}>
                              <Plus className="h-3 w-3 mr-0.5" /> Insert into Report Section
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => startEdit(section)}>
                            <Pencil className="h-3 w-3 mr-0.5" /> Edit
                          </Button>
                          <Button variant="ghost" size="sm" className="h-6 text-[10px] text-destructive" onClick={() => handleRemove(section.id)}>
                            <Trash2 className="h-3 w-3 mr-0.5" /> Remove
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
