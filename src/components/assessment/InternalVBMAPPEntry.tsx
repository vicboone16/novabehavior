import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  Grid3X3, Plus, Edit2, Calendar, ChevronRight,
  Loader2, BookOpen, TrendingUp, Trash2, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { VBMAPPGrid } from '@/components/skills/VBMAPPGrid';
import type { StudentAssessment, MilestoneScore } from '@/types/curriculum';

interface InternalVBMAPPEntryProps {
  studentId: string;
  studentName: string;
}

interface AssessmentRow {
  id: string;
  student_id: string;
  curriculum_system_id: string;
  date_administered: string;
  administered_by: string | null;
  status: 'draft' | 'final';
  results_json: Record<string, MilestoneScore> | null;
  domain_scores: Record<string, number> | null;
  notes: string | null;
  raw_attachment_path: string | null;
  created_at: string;
  updated_at: string;
  curriculum_system?: { id: string; name: string } | null;
}

export function InternalVBMAPPEntry({ studentId, studentName }: InternalVBMAPPEntryProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState<AssessmentRow[]>([]);
  const [curriculumSystems, setCurriculumSystems] = useState<{ id: string; name: string }[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<AssessmentRow | null>(null);
  const [creating, setCreating] = useState(false);
  
  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [assessmentToDelete, setAssessmentToDelete] = useState<AssessmentRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Duplicate warning state
  const [duplicateWarningOpen, setDuplicateWarningOpen] = useState(false);
  const [pendingCurriculumSystemId, setPendingCurriculumSystemId] = useState<string | null>(null);
  const [existingAssessmentForSystem, setExistingAssessmentForSystem] = useState<AssessmentRow | null>(null);

  useEffect(() => {
    loadData();
  }, [studentId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load VB-MAPP curriculum systems
      const { data: systems } = await supabase
        .from('curriculum_systems')
        .select('id, name')
        .ilike('name', '%VB-MAPP%')
        .eq('active', true);

      if (systems) {
        setCurriculumSystems(systems);
      }

      // Load existing assessments
      const { data: existingAssessments } = await supabase
        .from('student_assessments')
        .select(`
          *,
          curriculum_system:curriculum_systems(id, name)
        `)
        .eq('student_id', studentId)
        .order('date_administered', { ascending: false });

      if (existingAssessments) {
        setAssessments(existingAssessments as unknown as AssessmentRow[]);
      }
    } catch (error) {
      console.error('Error loading VB-MAPP data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssessmentRequest = (curriculumSystemId: string) => {
    // Check if there's already an assessment for this curriculum system
    const existing = assessments.find(a => a.curriculum_system_id === curriculumSystemId);
    
    if (existing) {
      // Show duplicate warning
      setPendingCurriculumSystemId(curriculumSystemId);
      setExistingAssessmentForSystem(existing);
      setDuplicateWarningOpen(true);
    } else {
      // Create directly
      createAssessment(curriculumSystemId);
    }
  };

  const createAssessment = async (curriculumSystemId: string) => {
    setCreating(true);
    setDuplicateWarningOpen(false);
    try {
      const { data, error } = await supabase
        .from('student_assessments')
        .insert({
          student_id: studentId,
          curriculum_system_id: curriculumSystemId,
          date_administered: format(new Date(), 'yyyy-MM-dd'),
          administered_by: user?.id,
          status: 'draft',
          results_json: {},
          domain_scores: {},
        })
        .select(`
          *,
          curriculum_system:curriculum_systems(id, name)
        `)
        .single();

      if (error) throw error;

      const newAssessment = data as unknown as AssessmentRow;
      setAssessments(prev => [newAssessment, ...prev]);
      setSelectedAssessment(newAssessment);
      toast.success('New VB-MAPP assessment created');
    } catch (error) {
      console.error('Error creating assessment:', error);
      toast.error('Failed to create assessment');
    } finally {
      setCreating(false);
      setPendingCurriculumSystemId(null);
      setExistingAssessmentForSystem(null);
    }
  };

  const handleResumeExisting = () => {
    if (existingAssessmentForSystem) {
      setSelectedAssessment(existingAssessmentForSystem);
    }
    setDuplicateWarningOpen(false);
    setPendingCurriculumSystemId(null);
    setExistingAssessmentForSystem(null);
  };

  const handleDeleteAssessment = async () => {
    if (!assessmentToDelete) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('student_assessments')
        .delete()
        .eq('id', assessmentToDelete.id);

      if (error) throw error;

      setAssessments(prev => prev.filter(a => a.id !== assessmentToDelete.id));
      toast.success('Assessment deleted');
    } catch (error) {
      console.error('Error deleting assessment:', error);
      toast.error('Failed to delete assessment');
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
      setAssessmentToDelete(null);
    }
  };

  const confirmDelete = (e: React.MouseEvent, assessment: AssessmentRow) => {
    e.stopPropagation();
    setAssessmentToDelete(assessment);
    setDeleteConfirmOpen(true);
  };

  const handleSaveAssessment = async (
    results: Record<string, MilestoneScore>,
    domainScores: Record<string, number>,
    status: 'draft' | 'final'
  ) => {
    if (!selectedAssessment) return;

    try {
      const { error } = await supabase
        .from('student_assessments')
        .update({
          results_json: JSON.parse(JSON.stringify(results)),
          domain_scores: domainScores,
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedAssessment.id);

      if (error) throw error;

      // Update local state
      setAssessments(prev =>
        prev.map(a =>
          a.id === selectedAssessment.id
            ? { ...a, results_json: results, domain_scores: domainScores, status }
            : a
        )
      );

      if (status === 'final') {
        setSelectedAssessment(null);
      }
    } catch (error) {
      console.error('Error saving assessment:', error);
      throw error;
    }
  };

  // Convert row to StudentAssessment type for VBMAPPGrid
  const toStudentAssessment = (row: AssessmentRow): StudentAssessment => ({
    id: row.id,
    student_id: row.student_id,
    curriculum_system_id: row.curriculum_system_id,
    date_administered: row.date_administered,
    administered_by: row.administered_by,
    status: row.status,
    results_json: (row.results_json || {}) as Record<string, MilestoneScore>,
    domain_scores: (row.domain_scores || {}) as Record<string, number>,
    notes: row.notes,
    raw_attachment_path: row.raw_attachment_path,
    created_at: row.created_at,
    updated_at: row.updated_at,
    curriculum_system: row.curriculum_system ? {
      id: row.curriculum_system.id,
      name: row.curriculum_system.name,
      type: 'assessment',
      description: null,
      publisher: null,
      version: null,
      age_range_min_months: null,
      age_range_max_months: null,
      tags: [],
      active: true,
      created_at: '',
      updated_at: '',
    } : undefined,
  });

  // Get all assessments for the same curriculum system to enable multi-date overlay
  const getRelatedAssessments = (assessment: AssessmentRow): StudentAssessment[] => {
    return assessments
      .filter(a => a.curriculum_system_id === assessment.curriculum_system_id)
      .map(toStudentAssessment);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // If viewing a specific assessment
  if (selectedAssessment) {
    return (
      <VBMAPPGrid
        studentId={studentId}
        studentName={studentName}
        assessment={toStudentAssessment(selectedAssessment)}
        allAssessments={getRelatedAssessments(selectedAssessment)}
        onBack={() => {
          setSelectedAssessment(null);
          loadData();
        }}
        onSave={handleSaveAssessment}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              Delete Assessment
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this VB-MAPP assessment from{' '}
              <strong>{assessmentToDelete?.date_administered ? format(new Date(assessmentToDelete.date_administered), 'MMM d, yyyy') : ''}</strong>?
              This will permanently remove all scored milestones. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteAssessment} 
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete Assessment'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Duplicate Warning Dialog */}
      <AlertDialog open={duplicateWarningOpen} onOpenChange={setDuplicateWarningOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Existing Assessment Found
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                {studentName} already has a VB-MAPP assessment for this curriculum system 
                (started on {existingAssessmentForSystem?.date_administered 
                  ? format(new Date(existingAssessmentForSystem.date_administered), 'MMM d, yyyy') 
                  : 'a previous date'}).
              </p>
              <p className="font-medium">
                You can continue scoring on the existing assessment to add data from a new date, 
                or create a completely new assessment if needed.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="outline" onClick={handleResumeExisting}>
              <Edit2 className="w-4 h-4 mr-2" />
              Resume Existing
            </Button>
            <AlertDialogAction onClick={() => pendingCurriculumSystemId && createAssessment(pendingCurriculumSystemId)}>
              <Plus className="w-4 h-4 mr-2" />
              Create New Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Grid3X3 className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">VB-MAPP Assessments</h3>
          <Badge variant="outline" className="text-xs">Internal Entry</Badge>
        </div>
        
        {curriculumSystems.length > 0 && (
          <Select onValueChange={handleCreateAssessmentRequest} disabled={creating}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={creating ? "Creating..." : "Start New Assessment"} />
            </SelectTrigger>
            <SelectContent>
              {curriculumSystems.map(sys => (
                <SelectItem key={sys.id} value={sys.id}>
                  {sys.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Info Card */}
      <Card className="bg-accent/50 border-accent">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <BookOpen className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium">
                VB-MAPP is entered directly by clinicians
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                These assessments are NOT sent out as questionnaires. Score milestones directly, 
                save as drafts, and finalize when complete. Scores sync with skill acquisition targets.
                <strong className="block mt-1">Tip: Continue an existing assessment to add scores from a new date—they'll appear color-coded by date!</strong>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assessment List */}
      {assessments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Grid3X3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
            <h4 className="font-medium mb-2">No VB-MAPP Assessments Yet</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Start a new assessment to begin scoring milestones for {studentName}
            </p>
            {curriculumSystems.length > 0 && (
              <Button onClick={() => handleCreateAssessmentRequest(curriculumSystems[0].id)} disabled={creating}>
                <Plus className="w-4 h-4 mr-2" />
                Start First Assessment
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-2">
            {assessments.map((assessment) => {
              const domainScores = (assessment.domain_scores || {}) as Record<string, number>;
              const totalScore = Object.values(domainScores).reduce((a, b) => a + b, 0);
              const avgScore = Object.keys(domainScores).length > 0
                ? Math.round(totalScore / Object.keys(domainScores).length)
                : 0;

              return (
                <Card 
                  key={assessment.id}
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => setSelectedAssessment(assessment)}
                >
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Grid3X3 className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {assessment.curriculum_system?.name || 'VB-MAPP'}
                            </span>
                            <Badge 
                              variant={assessment.status === 'final' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {assessment.status === 'final' ? 'Complete' : 'Draft'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            <span>{format(new Date(assessment.date_administered), 'MMM d, yyyy')}</span>
                            {avgScore > 0 && (
                              <>
                                <span>•</span>
                                <TrendingUp className="w-3 h-3" />
                                <span>{avgScore}% avg score</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => confirmDelete(e, assessment)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit2 className="w-4 h-4 mr-1" />
                          {assessment.status === 'draft' ? 'Continue' : 'View'}
                        </Button>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}