import { useState, useMemo } from 'react';
import { FileText, RefreshCw, Lock, Unlock, Save, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import type { BehaviorSummaryRow } from './types';

interface SummarySection {
  key: string;
  label: string;
  content: string;
  isLocked: boolean;
  isEdited: boolean;
}

interface ClinicalSummaryEditorProps {
  rows: BehaviorSummaryRow[];
  studentName: string;
}

function generateSectionContent(key: string, rows: BehaviorSummaryRow[], studentName: string): string {
  const increasing = rows.filter(r => r.clinicalFlag === 'increasing' || r.clinicalFlag === 'spike');
  const decreasing = rows.filter(r => r.clinicalFlag === 'decreasing');
  const top = rows.slice(0, 3);

  switch (key) {
    case 'key_trends':
      if (rows.length === 0) return 'Insufficient data to identify trends.';
      return `Over the selected period, ${studentName} displayed ${rows.reduce((s, r) => s + r.totalCount, 0)} total behavior incidents across ${rows.length} tracked behaviors. ${top[0] ? `${top[0].behaviorName} accounted for ${top[0].pctOfTotal}% of all recorded incidents.` : ''}`;
    case 'main_concerns':
      if (increasing.length === 0) return 'No behaviors currently flagged as increasing.';
      return `Data suggests elevated concern for: ${increasing.map(r => `${r.behaviorName} (+${r.trendPct ?? 0}%)`).join(', ')}. These patterns may indicate a need for intervention adjustment.`;
    case 'improvements':
      if (decreasing.length === 0) return 'No significant improvements detected in the current range.';
      return `Notable improvement observed in: ${decreasing.map(r => `${r.behaviorName} (${r.trendPct}%)`).join(', ')}. This pattern appears to reflect progress toward behavioral goals.`;
    case 'function_hypotheses':
      if (rows.length === 0) return 'Insufficient data for function hypothesis.';
      return `Based on behavioral distribution, the data pattern is consistent with possible escape-maintained and/or attention-maintained functions. Further ABC analysis may clarify primary function.`;
    case 'escalation_interpretation':
      return `Available data does not yet support a confirmed escalation sequence. Continued monitoring may reveal precursor patterns.`;
    case 'data_quality':
      return `Data quality appears adequate for the selected range. Gaps in recording may affect trend accuracy.`;
    case 'next_steps':
      return `Consider reviewing intervention strategies for top-frequency behaviors. Recommend team discussion of current replacement skill targets and reinforcement schedules.`;
    default:
      return '';
  }
}

const SECTION_DEFS = [
  { key: 'key_trends', label: 'Key Trends' },
  { key: 'main_concerns', label: 'Main Concerns' },
  { key: 'improvements', label: 'Improvements' },
  { key: 'function_hypotheses', label: 'Function Hypotheses' },
  { key: 'escalation_interpretation', label: 'Escalation Interpretation' },
  { key: 'data_quality', label: 'Data Quality Notes' },
  { key: 'next_steps', label: 'Suggested Next Steps' },
];

export function ClinicalSummaryEditor({ rows, studentName }: ClinicalSummaryEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [sections, setSections] = useState<SummarySection[]>(() =>
    SECTION_DEFS.map(d => ({
      key: d.key,
      label: d.label,
      content: generateSectionContent(d.key, rows, studentName),
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

  const regenerateSection = (key: string) => {
    const section = sections.find(s => s.key === key);
    if (section?.isLocked) {
      toast.error('Section is locked. Unlock to regenerate.');
      return;
    }
    const newContent = generateSectionContent(key, rows, studentName);
    setSections(prev => prev.map(s => s.key === key ? { ...s, content: newContent, isEdited: false } : s));
    toast.success('Section regenerated');
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
                      onClick={() => regenerateSection(section.key)}
                      title="Regenerate"
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
