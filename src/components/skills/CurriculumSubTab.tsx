import { useState } from 'react';
import { Plus, BookOpen, Calendar, FileText, ChevronRight, Trash2, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/ui/alert-dialog-confirm';
import { format } from 'date-fns';
import { 
  useCurriculumSystems, 
  useStudentCurriculumPlans, 
  useStudentAssessments,
  useCurriculumItems,
} from '@/hooks/useCurriculum';
import { VBMAPPGrid } from './VBMAPPGrid';
import { GenericAssessmentGrid } from './GenericAssessmentGrid';
import { AssessmentComparisonView } from './AssessmentComparisonView';
import type { StudentCurriculumPlan, StudentAssessment } from '@/types/curriculum';

interface CurriculumSubTabProps {
  studentId: string;
  studentName: string;
}

export function CurriculumSubTab({ studentId, studentName }: CurriculumSubTabProps) {
  const { systems, loading: systemsLoading } = useCurriculumSystems();
  const { plans, loading: plansLoading, addPlan } = useStudentCurriculumPlans(studentId);
  const { 
    assessments, 
    createAssessment, 
    updateAssessment, 
    deleteAssessment,
    refetch: refetchAssessments 
  } = useStudentAssessments(studentId);

  const [showAddSystemDialog, setShowAddSystemDialog] = useState(false);
  const [selectedSystemId, setSelectedSystemId] = useState<string>('');
  const [activePlan, setActivePlan] = useState<StudentCurriculumPlan | null>(null);
  const [activeAssessment, setActiveAssessment] = useState<StudentAssessment | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonSystemId, setComparisonSystemId] = useState<string | null>(null);

  // Get curriculum items for comparison view
  const { items: comparisonItems } = useCurriculumItems(comparisonSystemId || undefined);

  const activePlans = plans.filter(p => p.active);
  const availableSystems = systems.filter(s => !plans.some(p => p.curriculum_system_id === s.id));

  const handleAddSystem = async () => {
    if (selectedSystemId) {
      await addPlan(selectedSystemId);
      setShowAddSystemDialog(false);
      setSelectedSystemId('');
    }
  };

  const handleOpenAssessment = async (plan: StudentCurriculumPlan, existingAssessment?: StudentAssessment) => {
    setActivePlan(plan);
    
    if (existingAssessment) {
      setActiveAssessment(existingAssessment);
    } else {
      // Find existing draft or create new
      const existingDraft = assessments.find(
        a => a.curriculum_system_id === plan.curriculum_system_id && a.status === 'draft'
      );

      if (existingDraft) {
        setActiveAssessment(existingDraft);
      } else {
        const newAssessment = await createAssessment(plan.curriculum_system_id);
        if (newAssessment) {
          setActiveAssessment(newAssessment);
        }
      }
    }
  };

  const handleCreateNewAssessment = async (plan: StudentCurriculumPlan) => {
    setActivePlan(plan);
    const newAssessment = await createAssessment(plan.curriculum_system_id);
    if (newAssessment) {
      setActiveAssessment(newAssessment);
    }
  };

  const handleDeleteAssessment = async () => {
    if (deleteConfirmId) {
      await deleteAssessment(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const handleOpenComparison = (systemId: string) => {
    setComparisonSystemId(systemId);
    setShowComparison(true);
  };

  const isVBMAPP = (systemName?: string) => systemName?.toLowerCase().includes('vb-mapp');
  const isAFLS = (systemName?: string) => {
    const n = systemName?.toLowerCase() || '';
    return n.includes('afls') && !n.includes('social skills');
  };
  const isABLLS = (systemName?: string) => systemName?.toLowerCase().includes('ablls');
  const isAFLSSocialElem = (systemName?: string) => systemName?.toLowerCase().includes('afls') && systemName?.toLowerCase().includes('elementary');
  const isAFLSSocialHS = (systemName?: string) => systemName?.toLowerCase().includes('afls') && systemName?.toLowerCase().includes('high school');
  const hasGrid = (systemName?: string) => isVBMAPP(systemName) || isAFLS(systemName) || isABLLS(systemName) || isAFLSSocialElem(systemName) || isAFLSSocialHS(systemName);

  const getAssessmentType = (systemName?: string) => {
    if (isAFLSSocialElem(systemName)) return 'afls-ss-elem' as const;
    if (isAFLSSocialHS(systemName)) return 'afls-ss-hs' as const;
    if (isAFLS(systemName)) return 'afls' as const;
    if (isABLLS(systemName)) return 'ablls-r' as const;
    return 'afls' as const;
  };

  // Show comparison view
  if (showComparison && comparisonSystemId) {
    const systemAssessments = assessments.filter(a => a.curriculum_system_id === comparisonSystemId);
    return (
      <AssessmentComparisonView
        assessments={systemAssessments}
        items={comparisonItems}
        onClose={() => {
          setShowComparison(false);
          setComparisonSystemId(null);
        }}
      />
    );
  }

  const activeSystemName = activePlan?.curriculum_system?.name;

  // Show VB-MAPP grid if active
  if (activePlan && activeAssessment && isVBMAPP(activeSystemName)) {
    return (
      <VBMAPPGrid
        studentId={studentId}
        studentName={studentName}
        assessment={activeAssessment}
        onBack={() => {
          setActivePlan(null);
          setActiveAssessment(null);
          refetchAssessments();
        }}
        onSave={async (results, domainScores, status) => {
          await updateAssessment(activeAssessment.id, {
            results_json: results,
            domain_scores: domainScores,
            status,
          });
        }}
      />
    );
  }

  // Show AFLS / ABLLS-R / AFLS Social Skills grid
  if (activePlan && activeAssessment && hasGrid(activeSystemName) && !isVBMAPP(activeSystemName)) {
    return (
      <GenericAssessmentGrid
        studentId={studentId}
        studentName={studentName}
        assessment={activeAssessment}
        assessmentType={getAssessmentType(activeSystemName)}
        systemName={activeSystemName || 'Assessment'}
        onBack={() => {
          setActivePlan(null);
          setActiveAssessment(null);
          refetchAssessments();
        }}
        onSave={async (results, domainScores, status) => {
          await updateAssessment(activeAssessment.id, {
            results_json: results,
            domain_scores: domainScores,
            status,
          });
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Curriculum Systems */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">Active Curriculum Systems</h3>
          <p className="text-sm text-muted-foreground">
            Link curriculum systems to track assessments and milestones
          </p>
        </div>
        <Button onClick={() => setShowAddSystemDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Curriculum System
        </Button>
      </div>

      {plansLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading curriculum plans...</div>
      ) : activePlans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-medium text-lg mb-2">No curriculum systems linked</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add a curriculum system like VB-MAPP to track assessments and generate target recommendations.
            </p>
            <Button onClick={() => setShowAddSystemDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Curriculum System
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {activePlans.map(plan => {
            const system = plan.curriculum_system;
            const planAssessments = assessments
              .filter(a => a.curriculum_system_id === plan.curriculum_system_id)
              .sort((a, b) => new Date(b.date_administered).getTime() - new Date(a.date_administered).getTime());
            const latestAssessment = planAssessments[0];
            const hasDraft = planAssessments.some(a => a.status === 'draft');

            return (
              <Card key={plan.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-primary" />
                        {system?.name || 'Unknown System'}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {system?.description?.slice(0, 100)}...
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">
                      {system?.type}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Started {format(new Date(plan.date_started), 'MMM d, yyyy')}
                      </span>
                      {plan.current_level && (
                        <Badge variant="outline" className="text-xs">
                          {plan.current_level}
                        </Badge>
                      )}
                    </div>

                    {/* Assessment count and latest */}
                    {planAssessments.length > 0 && (
                      <div className="space-y-1 p-2 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium">
                            {planAssessments.length} Assessment{planAssessments.length > 1 ? 's' : ''}
                          </span>
                          {planAssessments.length >= 2 && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 text-xs"
                              onClick={() => handleOpenComparison(plan.curriculum_system_id)}
                            >
                              <BarChart3 className="w-3 h-3 mr-1" />
                              Compare
                            </Button>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <FileText className="w-3 h-3" />
                          <span>
                            Latest: {format(new Date(latestAssessment.date_administered), 'MMM d, yyyy')}
                          </span>
                          <Badge 
                            variant={latestAssessment.status === 'final' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {latestAssessment.status}
                          </Badge>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button className="flex-1" variant="outline">
                            {hasDraft ? 'Continue Draft' : 'New Assessment'}
                            <ChevronRight className="w-4 h-4 ml-2" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-56">
                          {hasDraft && (
                            <DropdownMenuItem onClick={() => handleOpenAssessment(plan)}>
                              <FileText className="w-4 h-4 mr-2" />
                              Continue Draft Assessment
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleCreateNewAssessment(plan)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Start New Assessment
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      
                      {hasGrid(system?.name) && (
                        <Button 
                          variant="outline"
                          onClick={() => handleOpenAssessment(plan)}
                        >
                          Open Grid
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Assessment History */}
      {assessments.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold">Assessment History</h3>
          <div className="space-y-2">
            {assessments.slice(0, 10).map(assessment => {
              const plan = activePlans.find(p => p.curriculum_system_id === assessment.curriculum_system_id);
              
              return (
                <Card key={assessment.id}>
                  <CardContent className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <span className="font-medium text-sm">
                          {assessment.curriculum_system?.name}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {format(new Date(assessment.date_administered), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={assessment.status === 'final' ? 'default' : 'secondary'}>
                        {assessment.status}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (plan) {
                            handleOpenAssessment(plan, assessment);
                          }
                        }}
                      >
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteConfirmId(assessment.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        title="Delete Assessment?"
        description="This will permanently delete this assessment and all its scores. This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDeleteAssessment}
      />

      {/* Add System Dialog */}
      <Dialog open={showAddSystemDialog} onOpenChange={setShowAddSystemDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Curriculum System</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {availableSystems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                All available curriculum systems have already been added.
              </p>
            ) : (
              <>
                <Select value={selectedSystemId} onValueChange={setSelectedSystemId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a curriculum system" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSystems.map(system => (
                      <SelectItem key={system.id} value={system.id}>
                        <div className="flex items-center gap-2">
                          <span>{system.name}</span>
                          <Badge variant="outline" className="text-xs">{system.type}</Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedSystemId && (
                  <div className="p-3 bg-muted rounded-lg text-sm">
                    {systems.find(s => s.id === selectedSystemId)?.description}
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowAddSystemDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddSystem} disabled={!selectedSystemId}>
                    Add System
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
