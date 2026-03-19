import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, FileText, CheckCircle2, Clock, AlertCircle, Plus, Send, Download, Eye, Brain, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useSdcIntake, type PackageInstance, type PackageInstanceForm, type FormInstance, type ReportDraft } from '@/hooks/useSdcIntake';
import { SdcFormRenderer } from './SdcFormRenderer';
import { SdcSnapshotEditor } from './SdcSnapshotEditor';
import { SdcExportActions } from './SdcExportActions';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  studentId: string;
  studentName: string;
  studentGrade?: string;
}

const GRADE_OPTIONS = [
  'TK', 'K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'
];

export function SdcIntakeManager({ studentId, studentName, studentGrade }: Props) {
  const { user } = useAuth();
  const intake = useSdcIntake();
  const [packages, setPackages] = useState<PackageInstance[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [packageForms, setPackageForms] = useState<PackageInstanceForm[]>([]);
  const [formInstances, setFormInstances] = useState<FormInstance[]>([]);
  const [reportDrafts, setReportDrafts] = useState<ReportDraft[]>([]);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assignGrade, setAssignGrade] = useState(studentGrade || '');
  const [assignDueDate, setAssignDueDate] = useState('');
  const [activeFormInstanceId, setActiveFormInstanceId] = useState<string | null>(null);
  const [activeReportDraftId, setActiveReportDraftId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadPackages();
  }, [studentId]);

  useEffect(() => {
    if (selectedPackageId) {
      loadPackageDetails(selectedPackageId);
    }
  }, [selectedPackageId]);

  const loadPackages = async () => {
    try {
      const pkgs = await intake.fetchStudentPackages(studentId);
      setPackages(pkgs);
      if (pkgs.length > 0 && !selectedPackageId) {
        setSelectedPackageId(pkgs[0].id);
      }
    } catch (err: any) {
      toast.error('Failed to load packages: ' + err.message);
    }
  };

  const loadPackageDetails = async (pkgId: string) => {
    try {
      const { forms } = await intake.fetchPackageInstance(pkgId);
      setPackageForms(forms);
      const instances = await intake.fetchFormInstances(pkgId);
      setFormInstances(instances);
      const drafts = await intake.fetchPackageReportDrafts(pkgId);
      setReportDrafts(drafts);
    } catch (err: any) {
      toast.error('Failed to load package details: ' + err.message);
    }
  };

  const handleAssignPackage = async () => {
    if (!assignGrade) {
      toast.error('Please select a grade');
      return;
    }
    setIsCreating(true);
    try {
      const pkgId = await intake.createPackageInstance({
        studentId,
        gradeValue: assignGrade,
      });
      const count = await intake.materializeFormInstances(pkgId);
      toast.success(`Package created with ${count} form(s)`);
      setShowAssignDialog(false);
      setSelectedPackageId(pkgId);
      await loadPackages();
    } catch (err: any) {
      toast.error('Failed to assign package: ' + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleFormSelection = async (pif: PackageInstanceForm) => {
    try {
      await intake.toggleFormSelection(pif.id, !pif.is_selected);
      await loadPackageDetails(selectedPackageId!);
      toast.success(pif.is_selected ? 'Form deselected' : 'Form selected');
    } catch (err: any) {
      toast.error('Failed to toggle form: ' + err.message);
    }
  };

  const handleGenerateSnapshot = async () => {
    if (!selectedPackageId) return;
    try {
      const draftId = await intake.createSnapshotDraft(selectedPackageId);
      await loadPackageDetails(selectedPackageId);
      setActiveReportDraftId(draftId);
      setActiveTab('snapshot');
      toast.success('Snapshot draft created — generating AI content...');
    } catch (err: any) {
      toast.error('Failed to create snapshot: ' + err.message);
    }
  };

  const selectedPkg = packages.find(p => p.id === selectedPackageId);
  const completedFormCount = formInstances.filter(fi => fi.status === 'submitted').length;
  const totalFormCount = packageForms.filter(pf => pf.is_selected).length;
  const progressPct = totalFormCount > 0 ? Math.round((completedFormCount / totalFormCount) * 100) : 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted': return <Badge className="bg-green-500/15 text-green-700 border-green-200">Submitted</Badge>;
      case 'in_progress': return <Badge className="bg-amber-500/15 text-amber-700 border-amber-200">In Progress</Badge>;
      case 'not_started': return <Badge variant="secondary">Not Started</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                SDC Behavior Intake
              </CardTitle>
              <CardDescription>
                Assign, complete, and review SDC intake forms and generate snapshot reports
              </CardDescription>
            </div>
            <Button onClick={() => setShowAssignDialog(true)} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Assign Package
            </Button>
          </div>
        </CardHeader>

        {packages.length === 0 ? (
          <CardContent>
            <div className="text-center py-8">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-muted-foreground">No SDC Intake Package assigned yet</p>
              <Button onClick={() => setShowAssignDialog(true)} variant="outline" className="mt-3">
                <Plus className="w-4 h-4 mr-1" />
                Assign SDC Intake Package
              </Button>
            </div>
          </CardContent>
        ) : (
          <CardContent className="space-y-4">
            {/* Package selector if multiple */}
            {packages.length > 1 && (
              <Select value={selectedPackageId || ''} onValueChange={setSelectedPackageId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select package..." />
                </SelectTrigger>
                <SelectContent>
                  {packages.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      Package — {p.grade_band_resolved || 'Unknown'} ({new Date(p.created_at).toLocaleDateString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {selectedPkg && (
              <>
                {/* Status bar */}
                <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="capitalize">{selectedPkg.grade_band_resolved} Band</Badge>
                    <span className="text-sm text-muted-foreground">Grade: {selectedPkg.grade_value}</span>
                    {getStatusBadge(selectedPkg.status)}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">{completedFormCount}/{totalFormCount} forms</span>
                    <Progress value={progressPct} className="w-24 h-2" />
                  </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">Forms</TabsTrigger>
                    <TabsTrigger value="snapshot">Snapshot</TabsTrigger>
                    <TabsTrigger value="exports">Export</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                  </TabsList>

                  {/* Forms overview */}
                  <TabsContent value="overview" className="space-y-2 mt-3">
                    {packageForms.map(pf => {
                      const fd = pf.form_definition;
                      const fi = formInstances.find(f => f.form_definition_id === pf.form_definition_id);
                      if (!fd) return null;

                      return (
                        <div
                          key={pf.id}
                          className={`flex items-center justify-between p-3 rounded-lg border ${
                            !pf.is_selected ? 'opacity-50 bg-muted/30' : 'bg-card'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">{fd.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {fd.grade_band !== 'all' && (
                                  <Badge variant="outline" className="mr-1 text-xs capitalize">{fd.grade_band}</Badge>
                                )}
                                {pf.inclusion_rule === 'always' ? 'Required' : `${pf.inclusion_rule.replace('_only', '')} only`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {fi && getStatusBadge(fi.status)}
                            {pf.is_selected && fi && (
                              <Button
                                size="sm"
                                variant={fi.status === 'submitted' ? 'outline' : 'default'}
                                onClick={() => setActiveFormInstanceId(fi.id)}
                              >
                                {fi.status === 'submitted' ? (
                                  <>
                                    <Eye className="w-3 h-3 mr-1" />
                                    Review
                                  </>
                                ) : fi.status === 'in_progress' ? (
                                  <>
                                    <FileText className="w-3 h-3 mr-1" />
                                    Continue
                                  </>
                                ) : (
                                  <>
                                    <FileText className="w-3 h-3 mr-1" />
                                    Fill Out
                                  </>
                                )}
                              </Button>
                            )}
                            {!pf.is_selected && pf.inclusion_rule !== 'always' && (
                              <Button size="sm" variant="ghost" onClick={() => handleToggleFormSelection(pf)}>
                                Enable
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </TabsContent>

                  {/* Snapshot tab */}
                  <TabsContent value="snapshot" className="space-y-3 mt-3">
                    {reportDrafts.length === 0 ? (
                      <div className="text-center py-6">
                        <Brain className="w-10 h-10 mx-auto mb-3 opacity-40" />
                        <p className="text-muted-foreground mb-3">No SDC Snapshot generated yet</p>
                        <Button
                          onClick={handleGenerateSnapshot}
                          disabled={completedFormCount === 0}
                        >
                          <Brain className="w-4 h-4 mr-1" />
                          Generate SDC Snapshot
                        </Button>
                        {completedFormCount === 0 && (
                          <p className="text-xs text-muted-foreground mt-2">Complete at least one form first</p>
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
                              <Button size="sm" onClick={() => {
                                setActiveReportDraftId(draft.id);
                              }}>
                                <Eye className="w-3 h-3 mr-1" />
                                Open Editor
                              </Button>
                            </div>
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleGenerateSnapshot}
                          className="mt-2"
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Generate New Snapshot
                        </Button>
                      </div>
                    )}
                  </TabsContent>

                  {/* Exports tab */}
                  <TabsContent value="exports" className="mt-3">
                    <SdcExportActions
                      packageInstanceId={selectedPackageId!}
                      formInstances={formInstances}
                      reportDrafts={reportDrafts}
                      studentName={studentName}
                    />
                  </TabsContent>

                  {/* Settings tab — grade override */}
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
                                <p className="text-xs text-muted-foreground capitalize">{pf.inclusion_rule.replace('_only', '')} form</p>
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
              </>
            )}
          </CardContent>
        )}
      </Card>

      {/* Assign Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign SDC Behavior Intake Package</DialogTitle>
            <DialogDescription>
              Select the student's grade to auto-route elementary or secondary teacher forms.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Student</Label>
              <Input value={studentName} disabled />
            </div>
            <div>
              <Label>Grade</Label>
              <Select value={assignGrade} onValueChange={setAssignGrade}>
                <SelectTrigger>
                  <SelectValue placeholder="Select grade..." />
                </SelectTrigger>
                <SelectContent>
                  {GRADE_OPTIONS.map(g => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {assignGrade && (
                <p className="text-xs text-muted-foreground mt-1">
                  Grade band: <Badge variant="outline" className="capitalize">
                    {['TK', 'K', '1', '2', '3', '4', '5'].includes(assignGrade) ? 'elementary' : 'secondary'}
                  </Badge>
                </p>
              )}
            </div>
            <div>
              <Label>Due Date (optional)</Label>
              <Input type="date" value={assignDueDate} onChange={e => setAssignDueDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>Cancel</Button>
            <Button onClick={handleAssignPackage} disabled={isCreating || !assignGrade}>
              {isCreating ? 'Creating...' : 'Assign Package'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
