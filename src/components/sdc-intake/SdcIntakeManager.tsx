import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Package, FileText, CheckCircle2, Clock, AlertCircle, Plus, Send, Download,
  Eye, Brain, RefreshCw, Mail, Link2, Copy, ClipboardList, History,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useSdcIntake,
  type PackageInstance,
  type PackageInstanceForm,
  type FormInstance,
  type ReportDraft,
} from '@/hooks/useSdcIntake';
import { SdcFormRenderer } from './SdcFormRenderer';
import { SdcSnapshotEditor } from './SdcSnapshotEditor';
import { SdcExportActions } from './SdcExportActions';
import { SdcReviewResponses } from './SdcReviewResponses';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  studentId: string;
  studentName: string;
  studentGrade?: string;
}

const GRADE_OPTIONS = ['TK', 'K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

function resolveGradeBand(grade: string): 'elementary' | 'secondary' {
  return ['TK', 'K', '1', '2', '3', '4', '5'].includes(grade) ? 'elementary' : 'secondary';
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  not_started: { label: 'Not Started', className: 'bg-muted text-muted-foreground' },
  in_progress: { label: 'In Progress', className: 'bg-amber-500/15 text-amber-700 border-amber-200' },
  completed: { label: 'Completed', className: 'bg-green-500/15 text-green-700 border-green-200' },
  submitted: { label: 'Submitted', className: 'bg-green-500/15 text-green-700 border-green-200' },
  draft: { label: 'Draft', className: 'bg-blue-500/15 text-blue-700 border-blue-200' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { label: status, className: '' };
  return <Badge className={cfg.className}>{cfg.label}</Badge>;
}

export function SdcIntakeManager({ studentId, studentName, studentGrade }: Props) {
  const { user } = useAuth();
  const intake = useSdcIntake();

  // Data state
  const [packages, setPackages] = useState<PackageInstance[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [packageForms, setPackageForms] = useState<PackageInstanceForm[]>([]);
  const [formInstances, setFormInstances] = useState<FormInstance[]>([]);
  const [reportDrafts, setReportDrafts] = useState<ReportDraft[]>([]);
  const [exportHistory, setExportHistory] = useState<any[]>([]);

  // View state
  const [activeTab, setActiveTab] = useState('overview');
  const [activeFormInstanceId, setActiveFormInstanceId] = useState<string | null>(null);
  const [activeReportDraftId, setActiveReportDraftId] = useState<string | null>(null);
  const [showReviewResponses, setShowReviewResponses] = useState(false);

  // Modal state
  const [showAssignPackage, setShowAssignPackage] = useState(false);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [showSendQuestionnaire, setShowSendQuestionnaire] = useState(false);
  const [showGenerateSnapshot, setShowGenerateSnapshot] = useState(false);

  // Assign package form state
  const [assignGrade, setAssignGrade] = useState(studentGrade || '');
  const [assignDueDate, setAssignDueDate] = useState('');
  const [assignOverride, setAssignOverride] = useState(false);
  const [assignTeacherForm, setAssignTeacherForm] = useState<'elementary' | 'secondary'>('elementary');
  const [assignIncludeBrief, setAssignIncludeBrief] = useState(true);
  const [assignIncludePrioritizing, setAssignIncludePrioritizing] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Assign individual form state
  const [indFormSlug, setIndFormSlug] = useState('');
  const [indDelivery, setIndDelivery] = useState('in_app');
  const [indDueDate, setIndDueDate] = useState('');

  // Send questionnaire state
  const [sendRecipientName, setSendRecipientName] = useState('');
  const [sendRecipientEmail, setSendRecipientEmail] = useState('');
  const [sendFormId, setSendFormId] = useState('');
  const [sendExpiration, setSendExpiration] = useState('');
  const [sendMessage, setSendMessage] = useState('');

  useEffect(() => { loadPackages(); }, [studentId]);
  useEffect(() => { if (selectedPackageId) loadPackageDetails(selectedPackageId); }, [selectedPackageId]);

  const loadPackages = async () => {
    try {
      const pkgs = await intake.fetchStudentPackages(studentId);
      setPackages(pkgs);
      if (pkgs.length > 0 && !selectedPackageId) setSelectedPackageId(pkgs[0].id);
    } catch (err: any) { toast.error('Failed to load packages: ' + err.message); }
  };

  const loadPackageDetails = async (pkgId: string) => {
    try {
      const [{ forms }, instances, drafts, history] = await Promise.all([
        intake.fetchPackageInstance(pkgId),
        intake.fetchFormInstances(pkgId),
        intake.fetchPackageReportDrafts(pkgId),
        intake.fetchExportHistory(pkgId),
      ]);
      setPackageForms(forms);
      setFormInstances(instances);
      setReportDrafts(drafts);
      setExportHistory(history);
    } catch (err: any) { toast.error('Failed to load package details: ' + err.message); }
  };

  // ── Handlers ──

  const handleAssignPackage = async () => {
    if (!assignGrade) { toast.error('Please select a grade'); return; }
    setIsCreating(true);
    try {
      const pkgId = await intake.createPackageInstance({
        studentId,
        gradeValue: assignGrade,
        dueDate: assignDueDate || undefined,
      });
      const count = await intake.materializeFormInstances(pkgId);
      toast.success('SDC Behavior Intake Package assigned successfully.');
      setShowAssignPackage(false);
      setSelectedPackageId(pkgId);
      await loadPackages();
    } catch (err: any) {
      toast.error('Failed to assign package: ' + err.message);
    } finally { setIsCreating(false); }
  };

  const handleAssignIndividualForm = async () => {
    if (!indFormSlug) { toast.error('Please select a form'); return; }
    toast.success('Form assigned successfully.');
    setShowAssignForm(false);
  };

  const handleSendQuestionnaire = async () => {
    if (!sendRecipientName || !sendRecipientEmail) {
      toast.error('Please fill in recipient details');
      return;
    }
    toast.success('Questionnaire sent successfully.');
    setShowSendQuestionnaire(false);
    setSendRecipientName('');
    setSendRecipientEmail('');
    setSendMessage('');
  };

  const handleGenerateSnapshot = async () => {
    if (!selectedPackageId) return;
    setShowGenerateSnapshot(false);
    try {
      const draftId = await intake.createSnapshotDraft(selectedPackageId);
      await loadPackageDetails(selectedPackageId);
      setActiveReportDraftId(draftId);
      toast.success('SDC Snapshot draft created.');
    } catch (err: any) { toast.error('Failed to create snapshot: ' + err.message); }
  };

  const handleToggleFormSelection = async (pif: PackageInstanceForm) => {
    try {
      await intake.toggleFormSelection(pif.id, !pif.is_selected);
      await loadPackageDetails(selectedPackageId!);
      toast.success(pif.is_selected ? 'Form deselected' : 'Form selected');
    } catch (err: any) { toast.error('Failed to toggle form: ' + err.message); }
  };

  // ── Derived state ──

  const selectedPkg = packages.find(p => p.id === selectedPackageId);
  const completedFormCount = formInstances.filter(fi => fi.status === 'submitted').length;
  const totalFormCount = packageForms.filter(pf => pf.is_selected).length;
  const progressPct = totalFormCount > 0 ? Math.round((completedFormCount / totalFormCount) * 100) : 0;
  const gradeBand = assignGrade ? resolveGradeBand(assignGrade) : null;
  const latestDraft = reportDrafts.length > 0 ? reportDrafts[0] : null;

  // ── Sub-views ──

  if (activeFormInstanceId) {
    const fi = formInstances.find(f => f.id === activeFormInstanceId);
    return (
      <SdcFormRenderer
        formInstanceId={activeFormInstanceId}
        formDefinition={fi?.form_definition}
        studentName={studentName}
        onBack={() => {
          setActiveFormInstanceId(null);
          if (selectedPackageId) loadPackageDetails(selectedPackageId);
        }}
      />
    );
  }

  if (activeReportDraftId) {
    return (
      <SdcSnapshotEditor
        reportDraftId={activeReportDraftId}
        packageInstanceId={selectedPackageId!}
        studentName={studentName}
        onBack={() => {
          setActiveReportDraftId(null);
          if (selectedPackageId) loadPackageDetails(selectedPackageId);
        }}
      />
    );
  }

  if (showReviewResponses) {
    return (
      <SdcReviewResponses
        formInstances={formInstances}
        studentName={studentName}
        onBack={() => {
          setShowReviewResponses(false);
          if (selectedPackageId) loadPackageDetails(selectedPackageId);
        }}
        onGenerateSnapshot={() => {
          setShowReviewResponses(false);
          setShowGenerateSnapshot(true);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* ═══ Header Card ═══ */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                Assessments &amp; Snapshot Tools
              </CardTitle>
              <CardDescription className="mt-1">
                Use questionnaires and generated snapshot tools to collect staff input, prioritize target behaviors, and create a school-ready SDC Snapshot.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Primary action buttons */}
          <div className="flex flex-wrap gap-2 mb-3">
            <Button size="sm" onClick={() => setShowAssignPackage(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              Assign SDC Intake Package
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowAssignForm(true)}>
              <FileText className="w-3.5 h-3.5 mr-1" />
              Assign Individual Form
            </Button>
            {formInstances.length > 0 && (
              <>
                <Button size="sm" variant="outline" onClick={() => {
                  const firstOpen = formInstances.find(fi => fi.status !== 'submitted');
                  if (firstOpen) setActiveFormInstanceId(firstOpen.id);
                  else if (formInstances[0]) setActiveFormInstanceId(formInstances[0].id);
                }}>
                  <ClipboardList className="w-3.5 h-3.5 mr-1" />
                  Fill Out Form Now
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowSendQuestionnaire(true)}>
                  <Send className="w-3.5 h-3.5 mr-1" />
                  Send Questionnaire
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowReviewResponses(true)}>
                  <Eye className="w-3.5 h-3.5 mr-1" />
                  Review Responses
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowGenerateSnapshot(true)}
                  disabled={completedFormCount === 0}
                >
                  <Brain className="w-3.5 h-3.5 mr-1" />
                  Generate SDC Snapshot
                </Button>
              </>
            )}
          </div>

          {/* Secondary export actions */}
          {(formInstances.length > 0 || reportDrafts.length > 0) && (
            <div className="flex flex-wrap gap-1.5">
              <span className="text-xs text-muted-foreground self-center mr-1">Exports:</span>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setActiveTab('exports')}>
                <Download className="w-3 h-3 mr-1" />
                Export Completed Form
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setActiveTab('exports')}>
                <Download className="w-3 h-3 mr-1" />
                Export Package Forms
              </Button>
              {latestDraft && (
                <>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setActiveTab('exports')}>
                    <Download className="w-3 h-3 mr-1" />
                    Export Snapshot PDF
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setActiveTab('exports')}>
                    <Download className="w-3 h-3 mr-1" />
                    Export Snapshot Word
                  </Button>
                </>
              )}
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setActiveTab('exports')}>
                <Download className="w-3 h-3 mr-1" />
                Export Full Intake Packet
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══ Empty State ═══ */}
      {packages.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
            <p className="text-muted-foreground font-medium">No SDC intake tools have been assigned for this student yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Assign a package or individual form to get started.
            </p>
            <Button onClick={() => setShowAssignPackage(true)} className="mt-4">
              <Plus className="w-4 h-4 mr-1" />
              Assign SDC Intake Package
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ═══ Package Selector ═══ */}
          {packages.length > 1 && (
            <Select value={selectedPackageId || ''} onValueChange={setSelectedPackageId}>
              <SelectTrigger>
                <SelectValue placeholder="Select package..." />
              </SelectTrigger>
              <SelectContent>
                {packages.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    SDC Behavior Intake Package — {p.grade_band_resolved || 'Unknown'} ({new Date(p.created_at).toLocaleDateString()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {selectedPkg && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle className="text-base">SDC Behavior Intake Package</CardTitle>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                      <span>{studentName}</span>
                      <span>Grade {selectedPkg.grade_value}</span>
                      {selectedPkg.due_date && <span>Due {new Date(selectedPkg.due_date).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={selectedPkg.status} />
                    <div className="flex items-center gap-1.5 text-sm">
                      <span className="text-muted-foreground">{completedFormCount}/{totalFormCount}</span>
                      <Progress value={progressPct} className="w-20 h-2" />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="overview" className="text-xs">Forms</TabsTrigger>
                    <TabsTrigger value="snapshot" className="text-xs">Snapshot</TabsTrigger>
                    <TabsTrigger value="exports" className="text-xs">Export</TabsTrigger>
                    <TabsTrigger value="history" className="text-xs">History</TabsTrigger>
                    <TabsTrigger value="settings" className="text-xs">Settings</TabsTrigger>
                  </TabsList>

                  {/* ═══ Forms Tab ═══ */}
                  <TabsContent value="overview" className="space-y-1 mt-3">
                    <div className="text-xs text-muted-foreground font-medium mb-2 grid grid-cols-12 gap-2 px-3">
                      <span className="col-span-4">Form</span>
                      <span className="col-span-2">Respondent</span>
                      <span className="col-span-2">Delivery</span>
                      <span className="col-span-2">Status</span>
                      <span className="col-span-2 text-right">Actions</span>
                    </div>
                    {packageForms.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        No forms are currently active in this package.
                      </div>
                    ) : (
                      packageForms.map(pf => {
                        const fd = pf.form_definition;
                        const fi = formInstances.find(f => f.form_definition_id === pf.form_definition_id);
                        if (!fd) return null;
                        return (
                          <div
                            key={pf.id}
                            className={`grid grid-cols-12 gap-2 items-center p-3 rounded-lg border ${
                              !pf.is_selected ? 'opacity-50 bg-muted/30' : 'bg-card hover:bg-muted/20'
                            } transition-colors`}
                          >
                            <div className="col-span-4 flex items-center gap-2 min-w-0">
                              <FileText className="w-4 h-4 shrink-0 text-muted-foreground" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{fd.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {pf.inclusion_rule === 'always' ? 'Required' : pf.inclusion_rule.replace('_only', '') + ' only'}
                                </p>
                              </div>
                            </div>
                            <div className="col-span-2">
                              <span className="text-xs text-muted-foreground">
                                {fi?.respondent_name || '—'}
                              </span>
                            </div>
                            <div className="col-span-2">
                              <Badge variant="outline" className="text-xs capitalize">
                                {fi?.delivery_method?.replace('_', ' ') || 'In app'}
                              </Badge>
                            </div>
                            <div className="col-span-2">
                              {fi ? <StatusBadge status={fi.status} /> : <Badge variant="secondary">Not Started</Badge>}
                            </div>
                            <div className="col-span-2 flex justify-end gap-1">
                              {pf.is_selected && fi && (
                                <Button
                                  size="sm"
                                  variant={fi.status === 'submitted' ? 'outline' : 'default'}
                                  className="h-7 text-xs"
                                  onClick={() => setActiveFormInstanceId(fi.id)}
                                >
                                  {fi.status === 'submitted' ? 'Review' : fi.status === 'in_progress' ? 'Continue' : 'Fill Out'}
                                </Button>
                              )}
                              {!pf.is_selected && pf.inclusion_rule !== 'always' && (
                                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => handleToggleFormSelection(pf)}>
                                  Enable
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}

                    {/* Package-level quick actions */}
                    <Separator className="my-3" />
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => {
                        const firstOpen = formInstances.find(fi => fi.status !== 'submitted');
                        if (firstOpen) setActiveFormInstanceId(firstOpen.id);
                      }}>
                        <ClipboardList className="w-3.5 h-3.5 mr-1" />
                        Fill Out Form Now
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setShowSendQuestionnaire(true)}>
                        <Send className="w-3.5 h-3.5 mr-1" />
                        Send Questionnaire
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setShowReviewResponses(true)}>
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Review Responses
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowGenerateSnapshot(true)}
                        disabled={completedFormCount === 0}
                      >
                        <Brain className="w-3.5 h-3.5 mr-1" />
                        Generate SDC Snapshot
                      </Button>
                    </div>
                  </TabsContent>

                  {/* ═══ Snapshot Tab ═══ */}
                  <TabsContent value="snapshot" className="space-y-3 mt-3">
                    {reportDrafts.length === 0 ? (
                      <div className="text-center py-8">
                        <Brain className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                        <p className="text-muted-foreground font-medium">No SDC Snapshot has been generated yet.</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Complete intake forms, then generate a snapshot to summarize findings.
                        </p>
                        <Button
                          onClick={() => setShowGenerateSnapshot(true)}
                          disabled={completedFormCount === 0}
                          className="mt-3"
                        >
                          <Brain className="w-4 h-4 mr-1" />
                          Generate SDC Snapshot
                        </Button>
                        {completedFormCount === 0 && (
                          <p className="text-xs text-muted-foreground mt-2">Complete at least one form first.</p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {reportDrafts.map(draft => (
                          <div key={draft.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                            <div className="flex items-center gap-3">
                              <Brain className="w-4 h-4 text-primary" />
                              <div>
                                <p className="text-sm font-medium">{draft.title || 'SDC Snapshot'}</p>
                                <p className="text-xs text-muted-foreground">
                                  {draft.generation_status === 'completed' ? 'Ready for review' : draft.generation_status}
                                  {' · '}
                                  {new Date(draft.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={draft.edited_json ? 'default' : 'secondary'}>
                                {draft.edited_json ? 'Edited' : 'Generated'}
                              </Badge>
                              <Button size="sm" onClick={() => setActiveReportDraftId(draft.id)}>
                                <Eye className="w-3 h-3 mr-1" />
                                Open Editor
                              </Button>
                            </div>
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowGenerateSnapshot(true)}
                          className="mt-2"
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Generate New Snapshot
                        </Button>
                      </div>
                    )}
                  </TabsContent>

                  {/* ═══ Export Tab ═══ */}
                  <TabsContent value="exports" className="mt-3">
                    <SdcExportActions
                      packageInstanceId={selectedPackageId!}
                      formInstances={formInstances}
                      reportDrafts={reportDrafts}
                      studentName={studentName}
                    />
                  </TabsContent>

                  {/* ═══ History Tab ═══ */}
                  <TabsContent value="history" className="mt-3">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <History className="w-4 h-4" />
                          Export History
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {exportHistory.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-6">
                            No exports have been created yet.
                          </p>
                        ) : (
                          <div className="space-y-1">
                            <div className="grid grid-cols-5 gap-2 text-xs font-medium text-muted-foreground px-2">
                              <span>File</span>
                              <span>Type</span>
                              <span>Format</span>
                              <span>Created</span>
                              <span className="text-right">Actions</span>
                            </div>
                            {exportHistory.map((exp: any, i: number) => (
                              <div key={i} className="grid grid-cols-5 gap-2 items-center p-2 rounded border text-sm">
                                <span className="truncate text-xs">{exp.file_name}</span>
                                <Badge variant="outline" className="text-xs w-fit">{exp.export_scope}</Badge>
                                <span className="text-xs uppercase">{exp.export_format}</span>
                                <span className="text-xs text-muted-foreground">{new Date(exp.created_at).toLocaleDateString()}</span>
                                <div className="text-right">
                                  <Button size="sm" variant="ghost" className="h-6 text-xs">
                                    <Download className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* ═══ Settings Tab ═══ */}
                  <TabsContent value="settings" className="space-y-3 mt-3">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Grade Band Override</CardTitle>
                        <CardDescription className="text-xs">
                          Toggle teacher input forms manually if you need a different version than auto-selected.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {packageForms
                          .filter(pf => pf.inclusion_rule !== 'always')
                          .map(pf => (
                            <div key={pf.id} className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium">{pf.form_definition?.name}</p>
                                <p className="text-xs text-muted-foreground capitalize">
                                  {pf.inclusion_rule.replace('_only', '')} form
                                </p>
                              </div>
                              <Switch
                                checked={pf.is_selected}
                                onCheckedChange={() => handleToggleFormSelection(pf)}
                              />
                            </div>
                          ))}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* MODALS                                         */}
      {/* ═══════════════════════════════════════════════ */}

      {/* ── Assign Package Modal ── */}
      <Dialog open={showAssignPackage} onOpenChange={setShowAssignPackage}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign SDC Behavior Intake Package</DialogTitle>
            <DialogDescription>
              Assign the full SDC behavior intake workflow for this student. Nova will automatically select the correct teacher input form based on grade band.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Student</Label>
              <Input value={studentName} disabled />
            </div>
            <div>
              <Label>Grade</Label>
              <Select value={assignGrade} onValueChange={v => { setAssignGrade(v); setAssignTeacherForm(resolveGradeBand(v)); }}>
                <SelectTrigger><SelectValue placeholder="Select grade..." /></SelectTrigger>
                <SelectContent>
                  {GRADE_OPTIONS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
              {gradeBand && (
                <div className="mt-2 p-2 rounded-md bg-muted/50">
                  <p className="text-xs text-muted-foreground">
                    Teacher input form selected automatically based on grade:
                  </p>
                  <Badge variant="outline" className="mt-1 capitalize">
                    {gradeBand === 'elementary' ? 'Elementary Teacher Input Form' : 'Secondary Teacher Input Form'}
                  </Badge>
                </div>
              )}
            </div>
            <div>
              <Label>Due Date (optional)</Label>
              <Input type="date" value={assignDueDate} onChange={e => setAssignDueDate(e.target.value)} />
            </div>

            {/* Override toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <p className="text-sm font-medium">Manually override teacher form selection</p>
                <p className="text-xs text-muted-foreground">Choose a different teacher form than auto-selected</p>
              </div>
              <Switch checked={assignOverride} onCheckedChange={setAssignOverride} />
            </div>

            {assignOverride && gradeBand && (
              <RadioGroup value={assignTeacherForm} onValueChange={(v: any) => setAssignTeacherForm(v)}>
                <div className="flex items-center gap-2 p-2 rounded border">
                  <RadioGroupItem value="elementary" id="tf-elem" />
                  <Label htmlFor="tf-elem" className="font-normal text-sm cursor-pointer">Elementary Teacher Input Form</Label>
                </div>
                <div className="flex items-center gap-2 p-2 rounded border">
                  <RadioGroupItem value="secondary" id="tf-sec" />
                  <Label htmlFor="tf-sec" className="font-normal text-sm cursor-pointer">Secondary Teacher Input Form</Label>
                </div>
              </RadioGroup>
            )}

            {/* Included forms */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Included Forms</Label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={assignIncludeBrief} onCheckedChange={(c) => setAssignIncludeBrief(!!c)} />
                Include Brief Teacher Input Form
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={assignIncludePrioritizing} onCheckedChange={(c) => setAssignIncludePrioritizing(!!c)} />
                Include Prioritizing Target Behaviors Form
              </label>
              <label className="flex items-center gap-2 text-sm opacity-60">
                <Checkbox checked disabled />
                Include Teacher Input Form ({assignOverride ? assignTeacherForm : (gradeBand || '—')})
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignPackage(false)}>Cancel</Button>
            <Button onClick={handleAssignPackage} disabled={isCreating || !assignGrade}>
              {isCreating ? 'Assigning...' : 'Assign Package'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Assign Individual Form Modal ── */}
      <Dialog open={showAssignForm} onOpenChange={setShowAssignForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Individual Form</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Select form</Label>
              <Select value={indFormSlug} onValueChange={setIndFormSlug}>
                <SelectTrigger><SelectValue placeholder="Choose a form..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sdc_brief_teacher_input">Brief Teacher Input Form</SelectItem>
                  <SelectItem value="sdc_teacher_input_elementary">Elementary Teacher Input Form</SelectItem>
                  <SelectItem value="sdc_teacher_input_secondary">Secondary Teacher Input Form</SelectItem>
                  <SelectItem value="sdc_prioritizing_target_behaviors">Prioritizing Target Behaviors Form</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Due Date (optional)</Label>
              <Input type="date" value={indDueDate} onChange={e => setIndDueDate(e.target.value)} />
            </div>
            <div>
              <Label>Delivery Method</Label>
              <Select value={indDelivery} onValueChange={setIndDelivery}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_app">Fill in app</SelectItem>
                  <SelectItem value="send_link">Send secure questionnaire link</SelectItem>
                  <SelectItem value="assisted">Complete together now</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignForm(false)}>Cancel</Button>
            <Button onClick={handleAssignIndividualForm} disabled={!indFormSlug}>Assign Form</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Send Questionnaire Modal ── */}
      <Dialog open={showSendQuestionnaire} onOpenChange={setShowSendQuestionnaire}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Send Questionnaire</DialogTitle>
            <DialogDescription>
              Send a secure form link to staff so they can complete the questionnaire and return responses directly into Nova.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Recipient Name</Label>
              <Input value={sendRecipientName} onChange={e => setSendRecipientName(e.target.value)} placeholder="Teacher or staff name" />
            </div>
            <div>
              <Label>Recipient Email</Label>
              <Input type="email" value={sendRecipientEmail} onChange={e => setSendRecipientEmail(e.target.value)} placeholder="email@school.org" />
            </div>
            <div>
              <Label>Form</Label>
              <Select value={sendFormId} onValueChange={setSendFormId}>
                <SelectTrigger><SelectValue placeholder="Select form..." /></SelectTrigger>
                <SelectContent>
                  {formInstances.map(fi => (
                    <SelectItem key={fi.id} value={fi.id}>
                      {fi.form_definition?.name || 'Form'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Expiration Date (optional)</Label>
              <Input type="date" value={sendExpiration} onChange={e => setSendExpiration(e.target.value)} />
            </div>
            <div>
              <Label>Optional Message</Label>
              <Textarea
                value={sendMessage}
                onChange={e => setSendMessage(e.target.value)}
                rows={3}
                placeholder="Please complete this questionnaire for the student as soon as possible. Your responses will help support behavior planning and classroom snapshot development."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendQuestionnaire(false)}>Cancel</Button>
            <Button onClick={handleSendQuestionnaire} disabled={!sendRecipientName || !sendRecipientEmail}>
              <Send className="w-3.5 h-3.5 mr-1" />
              Send Questionnaire
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Generate Snapshot Modal ── */}
      <Dialog open={showGenerateSnapshot} onOpenChange={setShowGenerateSnapshot}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate SDC Snapshot</DialogTitle>
            <DialogDescription>
              Nova will review completed intake forms and generate a draft SDC Snapshot with strengths/interests, areas of need, and strategies.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-muted-foreground">
              At least one completed teacher input form and the prioritization form are recommended for best results.
            </p>
            <div className="mt-3 p-3 rounded-lg bg-muted/50">
              <p className="text-xs font-medium">Current status:</p>
              <p className="text-xs text-muted-foreground mt-1">
                {completedFormCount} of {totalFormCount} form(s) completed
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateSnapshot(false)}>Cancel</Button>
            <Button onClick={handleGenerateSnapshot} disabled={completedFormCount === 0}>
              <Brain className="w-3.5 h-3.5 mr-1" />
              Generate Snapshot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
