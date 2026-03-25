import { useState, useMemo } from 'react';
import { FileText, RefreshCw, Lock, Unlock, Save, ChevronDown, ChevronUp, ArrowUp, ArrowDown, EyeOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import type { BehaviorSummaryRow } from './types';
import { regenerateSection, type ToneProfile, type SummaryInput } from './summaryEngine';

interface SummarySection {
  key: string;
  label: string;
  content: string;
  isLocked: boolean;
  isEdited: boolean;
  isHidden?: boolean;
}

interface ClinicalSummaryEditorProps {
  rows: BehaviorSummaryRow[];
  studentName: string;
  dateRangeLabel?: string;
  totalDays?: number;
  daysWithData?: number;
  tone?: ToneProfile;
}

const SECTION_DEFS = [
  { key: 'key_trends', label: 'Key Trends' },
  { key: 'fba_summary', label: 'Data-Informed Summary' },
  { key: 'escalation_chain', label: 'Escalation Interpretation' },
  { key: 'antecedents', label: 'Antecedents' },
  { key: 'consequences', label: 'Consequences' },
  { key: 'replacement_skills', label: 'Replacement Skills' },
  { key: 'intervention_focus', label: 'Intervention Focus' },
  { key: 'staff_response', label: 'Staff Response' },
  { key: 'reinforcement_focus', label: 'Reinforcement Focus' },
  { key: 'data_quality_note', label: 'Data Quality Notes' },
  { key: 'recommendations', label: 'Suggested Next Steps' },
];

function buildInput(props: ClinicalSummaryEditorProps): SummaryInput {
  return {
    rows: props.rows,
    studentName: props.studentName,
    tone: props.tone || 'clinical',
    dateRangeLabel: props.dateRangeLabel || 'the selected range',
    totalDays: props.totalDays || 30,
    daysWithData: props.daysWithData || 20,
  };
}

export function ClinicalSummaryEditor(props: ClinicalSummaryEditorProps) {
  const { rows } = props;
  const input = useMemo(() => buildInput(props), [rows, props.studentName, props.tone, props.dateRangeLabel, props.totalDays, props.daysWithData]);

  const [isOpen, setIsOpen] = useState(false);
  const [sections, setSections] = useState<SummarySection[]>(() =>
    SECTION_DEFS.map(d => ({
      key: d.key,
      label: d.label,
      content: regenerateSection(d.key, input),
      isLocked: false,
      isEdited: false,
    }))
  );

  const updateSection = (key: string, content: string) => {
    setSections(prev => prev.map(s => s.key === key ? { ...s, content, isEdited: true } : s));
  };

  const toggleLock = (key: string) => {
    setSections(prev => prev.map(s => s.key === key ? { ...s, isLocked: !s.isLocked } : s));
  };

  const toggleHide = (key: string) => {
    setSections(prev => prev.map(s => s.key === key ? { ...s, isHidden: !s.isHidden } : s));
  };

  const moveSection = (key: string, direction: -1 | 1) => {
    setSections(prev => {
      const idx = prev.findIndex(s => s.key === key);
      if (idx < 0) return prev;
      const newIdx = idx + direction;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
  };

  const handleRegenerate = (key: string) => {
    const section = sections.find(s => s.key === key);
    if (section?.isLocked) {
      toast.error('Section is locked. Unlock to regenerate.');
      return;
    }
    const newContent = regenerateSection(key, input);
    setSections(prev => prev.map(s => s.key === key ? { ...s, content: newContent, isEdited: false } : s));
    toast.success('Section regenerated from data');
  };

  const saveSnapshot = () => {
    toast.success('Clinical summary snapshot saved');
  };

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="py-2.5 px-4 cursor-pointer hover:bg-muted/30">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Clinical Summary Editor
                <Badge variant="secondary" className="text-[10px]">Editable</Badge>
              </span>
              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-3 px-4 pb-4">
            {sections.map(section => (
              <div key={section.key} className="border border-border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-semibold">{section.label}</h4>
                    {section.isEdited && <Badge variant="outline" className="text-[9px]">Edited</Badge>}
                    {section.isLocked && <Lock className="w-3 h-3 text-muted-foreground" />}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleRegenerate(section.key)}
                      title="Regenerate from data"
                    >
                      <RefreshCw className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => toggleLock(section.key)}
                      title={section.isLocked ? 'Unlock' : 'Lock'}
                    >
                      {section.isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    </Button>
                  </div>
                </div>
                <Textarea
                  value={section.content}
                  onChange={e => updateSection(section.key, e.target.value)}
                  disabled={section.isLocked}
                  className="text-xs min-h-[60px] resize-none"
                  rows={3}
                />
              </div>
            ))}

            <div className="flex justify-end">
              <Button size="sm" className="gap-1 text-xs" onClick={saveSnapshot}>
                <Save className="w-3.5 h-3.5" /> Save Snapshot
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
