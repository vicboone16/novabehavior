import { useState, useMemo, useCallback } from 'react';
import {
  Brain, FileText, Settings2, Loader2, ChevronDown, ChevronRight, Edit3
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  useNovaMasterReport,
  useNovaStudentRecommendations,
  useInstanceGoals,
  useCreateMasterReport,
  useMasterReportInstances,
  useMasterReportSections,
  useUpdateMasterReportSection,
  NovaMasterReportData,
  MasterReportSection,
} from '@/hooks/useNovaAssessments';

interface Props {
  studentId: string;
  studentName: string;
  agencyId?: string;
  onBack?: () => void;
}

const SECTION_ORDER = [
  { key: 'reason_for_assessment', title: 'Reason for Assessment' },
  { key: 'tools_administered', title: 'Tools Administered' },
  { key: 'summary_of_major_findings', title: 'Summary of Major Findings' },
  { key: 'child_profile_summary', title: 'Child Profile Summary' },
  { key: 'caregiver_summary', title: 'Caregiver Summary' },
  { key: 'educational_impact', title: 'Educational Impact' },
  { key: 'clinical_interpretation', title: 'Clinical Interpretation' },
  { key: 'recommendations', title: 'Recommendations' },
  { key: 'proposed_goals', title: 'Proposed Goals' },
  { key: 'next_steps', title: 'Next Steps' },
];

export function NovaMasterReportGenerator({ studentId, studentName, agencyId, onBack }: Props) {
  const { data: masterReport } = useNovaMasterReport(studentId);
  const { data: acceptedRecs } = useNovaStudentRecommendations(studentId);
  const { data: reportInstances } = useMasterReportInstances(studentId);
  const createReport = useCreateMasterReport();

  const [tone, setTone] = useState('clinical');
  const [reportLength, setReportLength] = useState('full');
  const [includeIep, setIncludeIep] = useState(false);
  const [includeParent, setIncludeParent] = useState(false);
  const [includeCaregiver, setIncludeCaregiver] = useState(true);
  const [includeEducational, setIncludeEducational] = useState(true);

  // Active report
  const latestReport = reportInstances?.[0];
  const { data: sections } = useMasterReportSections(latestReport?.id);
  const updateSection = useUpdateMasterReportSection();

  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const handleGenerate = useCallback(async () => {
    if (!agencyId) {
      toast.error('Agency context required');
      return;
    }

    const report = await createReport.mutateAsync({
      studentId,
      agencyId,
      tone,
      reportLength,
      includeIepLanguage: includeIep,
      includeParentFriendly: includeParent,
    });

    // Generate sections from master report data
    if (masterReport && report) {
      const sectionData: { key: string; title: string; text: string }[] = [];

      sectionData.push({
        key: 'reason_for_assessment',
        title: 'Reason for Assessment',
        text: `${studentName} was referred for comprehensive clinical assessment to evaluate behavioral, social, executive functioning, and adaptive behavior patterns.`,
      });

      const tools: string[] = [];
      if (masterReport.sbrds_session_id) tools.push('Social Behavior & Relational Dynamics Scale (SBRDS)');
      if (masterReport.efdp_session_id) tools.push('Executive Functioning & Demand Profile (EFDP)');
      if (masterReport.abrse_session_id) tools.push('Adaptive Behavior & Replacement Skills Engine (ABRSE)');
      if (masterReport.nap_session_id) tools.push('Neurodivergent Archetype Profiler (NAP)');
      sectionData.push({
        key: 'tools_administered',
        title: 'Tools Administered',
        text: tools.length > 0 ? tools.join('; ') : 'No finalized assessments available.',
      });

      if (masterReport.master_summary) {
        sectionData.push({ key: 'summary_of_major_findings', title: 'Summary of Major Findings', text: masterReport.master_summary });
      }

      const profiles: string[] = [];
      [masterReport.sbrds_results, masterReport.efdp_results, masterReport.abrse_results, masterReport.nap_results].forEach(results => {
        if (results) {
          results.filter((r: any) => r.result_scope === 'profile' || r.result_scope === 'archetype')
            .forEach((r: any) => profiles.push(r.result_label));
        }
      });
      if (profiles.length > 0) {
        sectionData.push({ key: 'child_profile_summary', title: 'Child Profile Summary', text: `Identified profiles: ${profiles.join(', ')}.` });
      }

      if (masterReport.sbrds_summary) {
        sectionData.push({ key: 'clinical_interpretation', title: 'Clinical Interpretation', text: [masterReport.sbrds_summary, masterReport.efdp_summary, masterReport.abrse_summary, masterReport.nap_summary].filter(Boolean).join('\n\n') });
      }

      if (includeEducational) {
        sectionData.push({
          key: 'educational_impact',
          title: 'Educational Impact',
          text: includeIep
            ? `Assessment findings suggest the student may benefit from supports to access instruction, participate in classroom activities, and regulate across the school day.`
            : `Clinical findings have implications for educational planning and classroom support strategies.`,
        });
      }

      if (acceptedRecs && acceptedRecs.length > 0) {
        const recText = acceptedRecs.map(r => `• ${r.title}: ${r.generated_text}`).join('\n');
        sectionData.push({ key: 'recommendations', title: 'Recommendations', text: recText });
      }

      sectionData.push({ key: 'next_steps', title: 'Next Steps', text: 'Continue monitoring progress. Reassess in 6–12 months or as clinically indicated.' });

      for (let i = 0; i < sectionData.length; i++) {
        await updateSection.mutateAsync({
          reportId: report.id,
          sectionKey: sectionData[i].key,
          sectionTitle: sectionData[i].title,
          generatedText: sectionData[i].text,
          sortOrder: i,
        });
      }

      toast.success('Master report generated');
    }
  }, [studentId, studentName, agencyId, tone, reportLength, includeIep, includeParent, includeCaregiver, includeEducational, masterReport, acceptedRecs, createReport, updateSection]);

  const handleEditSection = useCallback((section: MasterReportSection) => {
    setEditingSection(section.id);
    setEditText(section.generated_text || '');
  }, []);

  const handleSaveSection = useCallback(() => {
    if (!editingSection || !latestReport) return;
    const section = sections?.find(s => s.id === editingSection);
    if (!section) return;
    updateSection.mutate({
      reportId: latestReport.id,
      sectionKey: section.section_key,
      sectionTitle: section.section_title || '',
      generatedText: editText,
      sortOrder: section.sort_order,
    });
    setEditingSection(null);
  }, [editingSection, editText, latestReport, sections, updateSection]);

  return (
    <div className="space-y-4 max-w-4xl">
      {onBack && <Button variant="outline" size="sm" onClick={onBack}>← Back</Button>}

      {/* Controls */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            <CardTitle className="text-sm">Master Report Settings</CardTitle>
          </div>
          <CardDescription className="text-xs">Configure tone, length, and content toggles</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="clinical">Clinical</SelectItem>
                  <SelectItem value="parent_friendly">Parent-Friendly</SelectItem>
                  <SelectItem value="iep_ready">IEP-Ready</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Length</Label>
              <Select value={reportLength} onValueChange={setReportLength}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="brief">Brief</SelectItem>
                  <SelectItem value="full">Full</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Include IEP Language</Label>
              <Switch checked={includeIep} onCheckedChange={setIncludeIep} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Parent-Friendly Version</Label>
              <Switch checked={includeParent} onCheckedChange={setIncludeParent} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Include Caregiver Section</Label>
              <Switch checked={includeCaregiver} onCheckedChange={setIncludeCaregiver} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Include Educational Impact</Label>
              <Switch checked={includeEducational} onCheckedChange={setIncludeEducational} />
            </div>
          </div>
          <Button size="sm" onClick={handleGenerate} disabled={createReport.isPending}>
            {createReport.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <FileText className="w-3 h-3 mr-1" />}
            Generate Master Report
          </Button>
        </CardContent>
      </Card>

      {/* Report Sections */}
      {sections && sections.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm">
                {latestReport?.title || 'Master Clinical Report'}
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              {latestReport?.tone} • {latestReport?.report_length} • Generated {new Date(latestReport?.created_at || '').toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[700px]">
              <div className="space-y-4 pr-2">
                {sections.map(section => (
                  <div key={section.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">{section.section_title || section.section_key}</h3>
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => handleEditSection(section)}>
                        <Edit3 className="w-3 h-3 mr-1" /> Edit
                      </Button>
                    </div>
                    {editingSection === section.id ? (
                      <div className="space-y-2">
                        <Textarea value={editText} onChange={e => setEditText(e.target.value)} rows={6} className="text-xs" />
                        <div className="flex gap-2">
                          <Button size="sm" className="h-6 text-[10px]" onClick={handleSaveSection}>Save</Button>
                          <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => setEditingSection(null)}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs leading-relaxed whitespace-pre-line">{section.generated_text}</p>
                    )}
                    <Separator />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Previous Reports */}
      {reportInstances && reportInstances.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Report History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {reportInstances.slice(1).map(r => (
                <div key={r.id} className="flex items-center justify-between text-xs p-2 bg-muted/30 rounded">
                  <span>{r.title} • {r.tone} • {r.report_length}</span>
                  <Badge variant="outline" className="text-[10px]">{new Date(r.created_at).toLocaleDateString()}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
