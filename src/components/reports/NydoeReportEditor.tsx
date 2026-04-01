import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Save, FileDown, ChevronRight, ChevronDown, ArrowLeft,
  Import, CheckCircle2, Clock, FileText, Plus, Trash2,
} from 'lucide-react';
import { useNydoeReport } from '@/hooks/useNydoeReport';
import { NYDOE_SECTIONS, groupSectionsByParent, type NydoeHeaderData } from '@/lib/nydoeTemplate';
import { exportNydoeDocx } from '@/lib/nydoeDocxExport';
import { toast } from 'sonner';

export default function NydoeReportEditor() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const { report, loading, saving, saveReport, updateStatus } = useNydoeReport(reportId);

  const [headerData, setHeaderData] = useState<NydoeHeaderData | null>(null);
  const [sectionsData, setSectionsData] = useState<Record<string, string>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [activeSection, setActiveSection] = useState<string>('');

  // Initialize from loaded report
  useEffect(() => {
    if (report) {
      setHeaderData(report.header_data);
      const map: Record<string, string> = {};
      for (const s of report.sections_data) {
        map[s.key] = s.content;
      }
      setSectionsData(map);
      // Expand all groups by default
      const groups = groupSectionsByParent(NYDOE_SECTIONS);
      const expanded: Record<string, boolean> = {};
      Object.keys(groups).forEach(g => expanded[g] = true);
      setExpandedGroups(expanded);
    }
  }, [report]);

  const groupedSections = useMemo(() => groupSectionsByParent(NYDOE_SECTIONS), []);

  const handleSave = async () => {
    if (!headerData) return;
    const data = Object.entries(sectionsData).map(([key, content]) => ({ key, content }));
    await saveReport(headerData, data);
  };

  const handleExport = async () => {
    if (!headerData) return;
    try {
      await exportNydoeDocx(headerData, sectionsData, NYDOE_SECTIONS);
      toast.success('DOCX exported successfully');
    } catch (e) {
      console.error(e);
      toast.error('Export failed');
    }
  };

  const updateHeader = (field: keyof NydoeHeaderData, value: string) => {
    if (!headerData) return;
    setHeaderData({ ...headerData, [field]: value });
  };

  const updateSection = (key: string, content: string) => {
    setSectionsData(prev => ({ ...prev, [key]: content }));
  };

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!report || !headerData) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Report not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar Navigation */}
      <div className="w-72 border-r bg-muted/30 flex flex-col">
        <div className="p-4 border-b">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <h2 className="font-semibold text-sm truncate">{report.title}</h2>
          <Badge variant={report.status === 'draft' ? 'secondary' : 'default'} className="mt-1 text-[10px]">
            {report.status === 'draft' ? <Clock className="w-3 h-3 mr-1" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
            {report.status}
          </Badge>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            <button
              type="button"
              className={`w-full text-left text-xs px-3 py-2 rounded-md transition-colors ${
                activeSection === 'header' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
              onClick={() => setActiveSection('header')}
            >
              <FileText className="w-3 h-3 inline mr-2" />
              Report Header
            </button>

            {Object.entries(groupedSections).map(([group, sections]) => (
              <div key={group}>
                <button
                  type="button"
                  className="w-full text-left text-xs font-semibold px-3 py-2 hover:bg-muted rounded-md flex items-center"
                  onClick={() => toggleGroup(group)}
                >
                  {expandedGroups[group] ? <ChevronDown className="w-3 h-3 mr-1" /> : <ChevronRight className="w-3 h-3 mr-1" />}
                  {group}
                </button>
                {expandedGroups[group] && sections.map(s => (
                  <button
                    key={s.key}
                    type="button"
                    className={`w-full text-left text-[11px] px-6 py-1.5 rounded-md transition-colors ${
                      activeSection === s.key ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'
                    }`}
                    onClick={() => setActiveSection(s.key)}
                  >
                    {s.title}
                    {s.importable && <Import className="w-2.5 h-2.5 inline ml-1 opacity-50" />}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="p-3 border-t space-y-2">
          <Button onClick={handleSave} disabled={saving} size="sm" className="w-full">
            <Save className="w-4 h-4 mr-2" /> {saving ? 'Saving...' : 'Save Report'}
          </Button>
          <Button onClick={handleExport} variant="outline" size="sm" className="w-full">
            <FileDown className="w-4 h-4 mr-2" /> Export DOCX
          </Button>
          {report.status === 'draft' && (
            <Button onClick={() => updateStatus('finalized')} variant="secondary" size="sm" className="w-full">
              <CheckCircle2 className="w-4 h-4 mr-2" /> Finalize
            </Button>
          )}
        </div>
      </div>

      {/* Main Editor Area */}
      <ScrollArea className="flex-1">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {/* Header Section */}
          {(activeSection === 'header' || activeSection === '') && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Report Header Information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">Agency Name</label>
                  <Input value={headerData.agencyName} onChange={e => updateHeader('agencyName', e.target.value)} placeholder="e.g., Empower Behavior Therapy" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">Report Title</label>
                  <Input value={headerData.reportTitle} onChange={e => updateHeader('reportTitle', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Patient Name</label>
                  <Input value={headerData.patientName} onChange={e => updateHeader('patientName', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Diagnosis</label>
                  <Input value={headerData.diagnosis} onChange={e => updateHeader('diagnosis', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Parent Name</label>
                  <Input value={headerData.parentName} onChange={e => updateHeader('parentName', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Diagnostician</label>
                  <Input value={headerData.diagnostician} onChange={e => updateHeader('diagnostician', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Comorbid Diagnoses</label>
                  <Input value={headerData.comorbidDiagnoses} onChange={e => updateHeader('comorbidDiagnoses', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Date of Birth</label>
                  <Input value={headerData.dateOfBirth} onChange={e => updateHeader('dateOfBirth', e.target.value)} type="date" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Age</label>
                  <Input value={headerData.age} onChange={e => updateHeader('age', e.target.value)} placeholder="e.g., 14 years 6 months" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Report Date</label>
                  <Input value={headerData.reportDate} onChange={e => updateHeader('reportDate', e.target.value)} type="date" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Assessor Name</label>
                  <Input value={headerData.assessorName} onChange={e => updateHeader('assessorName', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Assessor Credentials</label>
                  <Input value={headerData.assessorCredentials} onChange={e => updateHeader('assessorCredentials', e.target.value)} placeholder="e.g., M.A., BCBA" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section Editor - show active section or all if none selected */}
          {NYDOE_SECTIONS.filter(s => activeSection === '' || activeSection === s.key).map(section => {
            if (activeSection === 'header') return null;
            const content = sectionsData[section.key] ?? section.content;

            if (section.type === 'behavior_block') {
              return <BehaviorBlockEditor key={section.key} section={section} content={content} onChange={v => updateSection(section.key, v)} />;
            }

            if (section.type === 'goal_table') {
              return <GoalTableEditor key={section.key} section={section} content={content} onChange={v => updateSection(section.key, v)} />;
            }

            return (
              <Card key={section.key} id={`section-${section.key}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{section.title}</CardTitle>
                    {section.importable && (
                      <Badge variant="outline" className="text-[10px]">
                        <Import className="w-3 h-3 mr-1" /> Can import data
                      </Badge>
                    )}
                  </div>
                  {section.parentSection && (
                    <p className="text-[10px] text-muted-foreground">{section.parentSection}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={content}
                    onChange={e => updateSection(section.key, e.target.value)}
                    rows={Math.max(4, Math.ceil(content.length / 120))}
                    className="text-sm font-serif leading-relaxed"
                    placeholder="Enter content..."
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

// ─── Behavior Block Editor ─────────────────────────────────────────

interface BehaviorEntry {
  name: string;
  assessmentType: string;
  operationalDefinition: string;
  severity: string;
  examples: string;
  nonexamples: string;
  educationalImpact: string;
  function: string;
  antecedents: string;
  onset: string;
  offset: string;
  measurement: string;
  baseline: string;
  prevention: string;
  replacement: string;
  response: string;
}

function BehaviorBlockEditor({ section, content, onChange }: { section: any; content: string; onChange: (v: string) => void }) {
  const [behaviors, setBehaviors] = useState<BehaviorEntry[]>([]);

  useEffect(() => {
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) setBehaviors(parsed);
    } catch { setBehaviors([]); }
  }, []);

  const update = (idx: number, field: keyof BehaviorEntry, value: string) => {
    const updated = [...behaviors];
    updated[idx] = { ...updated[idx], [field]: value };
    setBehaviors(updated);
    onChange(JSON.stringify(updated));
  };

  const addBehavior = () => {
    const newB: BehaviorEntry = {
      name: `Behavior ${behaviors.length + 1}`,
      assessmentType: '', operationalDefinition: '', severity: 'Moderate',
      examples: '', nonexamples: '', educationalImpact: '', function: '',
      antecedents: '', onset: '', offset: '', measurement: 'frequency',
      baseline: '', prevention: '', replacement: '', response: '',
    };
    const updated = [...behaviors, newB];
    setBehaviors(updated);
    onChange(JSON.stringify(updated));
  };

  const removeBehavior = (idx: number) => {
    const updated = behaviors.filter((_, i) => i !== idx);
    setBehaviors(updated);
    onChange(JSON.stringify(updated));
  };

  return (
    <Card id={`section-${section.key}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{section.title}</CardTitle>
          <Button size="sm" variant="outline" onClick={addBehavior}>
            <Plus className="w-3 h-3 mr-1" /> Add Behavior
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {behaviors.map((b, idx) => (
          <div key={idx} className="border rounded-lg p-4 space-y-3 bg-muted/20">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">Behavior {idx + 1}</h4>
              <Button size="sm" variant="ghost" onClick={() => removeBehavior(idx)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-[10px] font-medium text-muted-foreground">Behavior Name</label>
                <Input value={b.name} onChange={e => update(idx, 'name', e.target.value)} className="text-sm" />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-medium text-muted-foreground">Assessment Type & Results</label>
                <Textarea value={b.assessmentType} onChange={e => update(idx, 'assessmentType', e.target.value)} rows={2} className="text-sm" />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-medium text-muted-foreground">Operational Definition</label>
                <Textarea value={b.operationalDefinition} onChange={e => update(idx, 'operationalDefinition', e.target.value)} rows={3} className="text-sm" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground">Severity</label>
                <Input value={b.severity} onChange={e => update(idx, 'severity', e.target.value)} className="text-sm" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground">Hypothesized Function</label>
                <Input value={b.function} onChange={e => update(idx, 'function', e.target.value)} className="text-sm" placeholder="Sensory/Escape/Attention/Tangible" />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-medium text-muted-foreground">Examples</label>
                <Textarea value={b.examples} onChange={e => update(idx, 'examples', e.target.value)} rows={2} className="text-sm" />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-medium text-muted-foreground">Nonexamples</label>
                <Textarea value={b.nonexamples} onChange={e => update(idx, 'nonexamples', e.target.value)} rows={2} className="text-sm" />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-medium text-muted-foreground">Educational Impact</label>
                <Textarea value={b.educationalImpact} onChange={e => update(idx, 'educationalImpact', e.target.value)} rows={2} className="text-sm" />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-medium text-muted-foreground">Antecedent Events</label>
                <Textarea value={b.antecedents} onChange={e => update(idx, 'antecedents', e.target.value)} rows={2} className="text-sm" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground">Onset</label>
                <Textarea value={b.onset} onChange={e => update(idx, 'onset', e.target.value)} rows={2} className="text-sm" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground">Offset</label>
                <Textarea value={b.offset} onChange={e => update(idx, 'offset', e.target.value)} rows={2} className="text-sm" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground">Measurement</label>
                <Input value={b.measurement} onChange={e => update(idx, 'measurement', e.target.value)} className="text-sm" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground">Baseline</label>
                <Input value={b.baseline} onChange={e => update(idx, 'baseline', e.target.value)} className="text-sm" />
              </div>
              <Separator className="col-span-2" />
              <div className="col-span-2">
                <label className="text-[10px] font-semibold text-muted-foreground">INTERVENTION PLANS</label>
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-medium text-muted-foreground">Prevention Strategies</label>
                <Textarea value={b.prevention} onChange={e => update(idx, 'prevention', e.target.value)} rows={3} className="text-sm" />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-medium text-muted-foreground">Replacement Strategies</label>
                <Textarea value={b.replacement} onChange={e => update(idx, 'replacement', e.target.value)} rows={3} className="text-sm" />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-medium text-muted-foreground">Response Strategies</label>
                <Textarea value={b.response} onChange={e => update(idx, 'response', e.target.value)} rows={3} className="text-sm" />
              </div>
            </div>
          </div>
        ))}
        {behaviors.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No behaviors added. Click "Add Behavior" to start.</p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Goal Table Editor ─────────────────────────────────────────────

interface GoalEntry {
  goalName: string;
  target: string;
  baseline: string;
  currentPerformance: string;
  masteryCriteria: string;
  targetMasteryDate: string;
}

function GoalTableEditor({ section, content, onChange }: { section: any; content: string; onChange: (v: string) => void }) {
  const [goals, setGoals] = useState<GoalEntry[]>([]);

  useEffect(() => {
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) setGoals(parsed);
    } catch { setGoals([]); }
  }, []);

  const update = (idx: number, field: keyof GoalEntry, value: string) => {
    const updated = [...goals];
    updated[idx] = { ...updated[idx], [field]: value };
    setGoals(updated);
    onChange(JSON.stringify(updated));
  };

  const addGoal = () => {
    const newG: GoalEntry = {
      goalName: '', target: '', baseline: '0', currentPerformance: 'NEW GOAL',
      masteryCriteria: 'Average 90% accuracy across 5 consecutive sessions',
      targetMasteryDate: '6 months from the start of services',
    };
    const updated = [...goals, newG];
    setGoals(updated);
    onChange(JSON.stringify(updated));
  };

  const removeGoal = (idx: number) => {
    const updated = goals.filter((_, i) => i !== idx);
    setGoals(updated);
    onChange(JSON.stringify(updated));
  };

  return (
    <Card id={`section-${section.key}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{section.title}</CardTitle>
          <Button size="sm" variant="outline" onClick={addGoal}>
            <Plus className="w-3 h-3 mr-1" /> Add Goal
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {goals.length > 0 && (
          <div className="space-y-3">
            {goals.map((g, idx) => (
              <div key={idx} className="border rounded-lg p-3 bg-muted/20 space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-semibold">Goal {idx + 1}</h5>
                  <Button size="sm" variant="ghost" onClick={() => removeGoal(idx)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2">
                    <label className="text-[10px] text-muted-foreground">Goal Name</label>
                    <Input value={g.goalName} onChange={e => update(idx, 'goalName', e.target.value)} className="text-sm" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] text-muted-foreground">Target</label>
                    <Textarea value={g.target} onChange={e => update(idx, 'target', e.target.value)} rows={2} className="text-sm" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Baseline</label>
                    <Input value={g.baseline} onChange={e => update(idx, 'baseline', e.target.value)} className="text-sm" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Current Performance</label>
                    <Input value={g.currentPerformance} onChange={e => update(idx, 'currentPerformance', e.target.value)} className="text-sm" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Mastery Criteria</label>
                    <Input value={g.masteryCriteria} onChange={e => update(idx, 'masteryCriteria', e.target.value)} className="text-sm" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Target Mastery Date</label>
                    <Input value={g.targetMasteryDate} onChange={e => update(idx, 'targetMasteryDate', e.target.value)} className="text-sm" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {goals.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No goals added yet. Click "Add Goal" to start.</p>
        )}
      </CardContent>
    </Card>
  );
}
