import { useState } from 'react';
import { Plus, BookOpen, Calendar, FileText, ChevronRight } from 'lucide-react';
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
import { format } from 'date-fns';
import { 
  useCurriculumSystems, 
  useStudentCurriculumPlans, 
  useStudentAssessments 
} from '@/hooks/useCurriculum';
import { VBMAPPGrid } from './VBMAPPGrid';
import type { StudentCurriculumPlan, StudentAssessment } from '@/types/curriculum';

interface CurriculumSubTabProps {
  studentId: string;
  studentName: string;
}

export function CurriculumSubTab({ studentId, studentName }: CurriculumSubTabProps) {
  const { systems, loading: systemsLoading } = useCurriculumSystems();
  const { plans, loading: plansLoading, addPlan } = useStudentCurriculumPlans(studentId);
  const { assessments, createAssessment, updateAssessment, refetch: refetchAssessments } = useStudentAssessments(studentId);

  const [showAddSystemDialog, setShowAddSystemDialog] = useState(false);
  const [selectedSystemId, setSelectedSystemId] = useState<string>('');
  const [activePlan, setActivePlan] = useState<StudentCurriculumPlan | null>(null);
  const [activeAssessment, setActiveAssessment] = useState<StudentAssessment | null>(null);

  const activePlans = plans.filter(p => p.active);
  const availableSystems = systems.filter(s => !plans.some(p => p.curriculum_system_id === s.id));

  const handleAddSystem = async () => {
    if (selectedSystemId) {
      await addPlan(selectedSystemId);
      setShowAddSystemDialog(false);
      setSelectedSystemId('');
    }
  };

  const handleOpenAssessment = async (plan: StudentCurriculumPlan) => {
    setActivePlan(plan);
    
    // Find or create an assessment for this curriculum
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
  };

  const isVBMAPP = (systemName?: string) => systemName?.toLowerCase().includes('vb-mapp');

  if (activePlan && activeAssessment && isVBMAPP(activePlan.curriculum_system?.name)) {
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
            const planAssessments = assessments.filter(a => a.curriculum_system_id === plan.curriculum_system_id);
            const latestAssessment = planAssessments[0];

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

                    {/* Assessment history */}
                    {planAssessments.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-xs font-medium text-muted-foreground">
                          Assessments ({planAssessments.length})
                        </span>
                        <div className="flex items-center gap-2 text-xs">
                          <FileText className="w-3 h-3" />
                          <span>
                            Latest: {format(new Date(latestAssessment.date_administered), 'MMM d, yyyy')}
                          </span>
                          <Badge variant={latestAssessment.status === 'final' ? 'default' : 'secondary'}>
                            {latestAssessment.status}
                          </Badge>
                        </div>
                      </div>
                    )}

                    <Button 
                      className="w-full" 
                      variant="outline"
                      onClick={() => handleOpenAssessment(plan)}
                    >
                      {isVBMAPP(system?.name) ? 'Open Milestones Grid' : 'Enter Assessment Data'}
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
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
            {assessments.slice(0, 5).map(assessment => (
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
                  <Badge variant={assessment.status === 'final' ? 'default' : 'secondary'}>
                    {assessment.status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

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
