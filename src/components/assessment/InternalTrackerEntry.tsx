import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Grid3X3, Plus, Edit2, Calendar, Loader2, BookOpen,
  TrendingUp, Trash2, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { InternalTrackerGrid } from './InternalTrackerGrid';
import type { MilestoneScore } from '@/types/curriculum';

export type TrackerType = 'afls' | 'ablls-r';

interface InternalTrackerEntryProps {
  studentId: string;
  studentName: string;
  trackerType: TrackerType;
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
}

const TRACKER_META: Record<TrackerType, { label: string; systemNamePattern: string; description: string }> = {
  'afls': {
    label: 'AFLS',
    systemNamePattern: '%AFLS%',
    description: 'Assessment of Functional Living Skills — Score items 0–4 across 6 functional modules.',
  },
  'ablls-r': {
    label: 'ABLLS-R',
    systemNamePattern: '%ABLLS%',
    description: 'Assessment of Basic Language and Learning Skills — Variable max scores per item across 25 domains (A–Z).',
  },
};

export function InternalTrackerEntry({ studentId, studentName, trackerType }: InternalTrackerEntryProps) {
  const { user, userRole } = useAuth();
  const meta = TRACKER_META[trackerType];
  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState<AssessmentRow[]>([]);
  const [curriculumSystemId, setCurriculumSystemId] = useState<string | null>(null);
  const [selectedAssessment, setSelectedAssessment] = useState<AssessmentRow | null>(null);
  const [creating, setCreating] = useState(false);

  // Delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [assessmentToDelete, setAssessmentToDelete] = useState<AssessmentRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Duplicate warning
  const [duplicateWarningOpen, setDuplicateWarningOpen] = useState(false);
  const [existingAssessment, setExistingAssessment] = useState<AssessmentRow | null>(null);

  const canDelete = userRole === 'admin' || userRole === 'super_admin';

  useEffect(() => { loadData(); }, [studentId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Find the curriculum_system row for this tracker
      const { data: systems } = await supabase
        .from('curriculum_systems')
        .select('id, name')
        .ilike('name', meta.systemNamePattern)
        .eq('active', true)
        .limit(1);

      if (systems && systems.length > 0) {
        setCurriculumSystemId(systems[0].id);

        // Load assessments for this student + system
        const { data: rows } = await supabase
          .from('student_assessments')
          .select('*')
          .eq('student_id', studentId)
          .eq('curriculum_system_id', systems[0].id)
          .order('date_administered', { ascending: false });

        if (rows) setAssessments(rows as unknown as AssessmentRow[]);
      }
    } catch (error) {
      console.error(`Error loading ${meta.label} data:`, error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    const existing = assessments[0]; // most recent
    if (existing) {
      setExistingAssessment(existing);
      setDuplicateWarningOpen(true);
    } else {
      createAssessment();
    }
  };

  const createAssessment = async () => {
    if (!curriculumSystemId) return;
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
        .select('*')
        .single();

      if (error) throw error;
      const row = data as unknown as AssessmentRow;
      setAssessments(prev => [row, ...prev]);
      setSelectedAssessment(row);
      toast.success(`New ${meta.label} assessment created`);
    } catch (error) {
      console.error('Error creating assessment:', error);
      toast.error('Failed to create assessment');
    } finally {
      setCreating(false);
      setExistingAssessment(null);
    }
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
      if (selectedAssessment?.id === assessmentToDelete.id) setSelectedAssessment(null);
      toast.success('Assessment deleted');
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Failed to delete assessment');
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
      setAssessmentToDelete(null);
    }
  };

  const handleSave = async (
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

      setAssessments(prev =>
        prev.map(a =>
          a.id === selectedAssessment.id
            ? { ...a, results_json: results, domain_scores: domainScores, status }
            : a
        )
      );
      if (status === 'final') setSelectedAssessment(null);
    } catch (error) {
      console.error('Error saving:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Grid view
  if (selectedAssessment) {
    return (
      <InternalTrackerGrid
        trackerType={trackerType}
        studentId={studentId}
        studentName={studentName}
        assessmentId={selectedAssessment.id}
        dateAdministered={selectedAssessment.date_administered}
        status={selectedAssessment.status as 'draft' | 'final'}
        initialScores={(selectedAssessment.results_json || {}) as Record<string, MilestoneScore>}
        allAssessments={assessments.map(a => ({
          id: a.id,
          date_administered: a.date_administered,
          results_json: (a.results_json || {}) as Record<string, MilestoneScore>,
        }))}
        onBack={() => { setSelectedAssessment(null); loadData(); }}
        onSave={handleSave}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              Delete {meta.label} Assessment
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will <strong>permanently</strong> delete this {meta.label} assessment from{' '}
              <strong>
                {assessmentToDelete?.date_administered
                  ? format(new Date(assessmentToDelete.date_administered), 'MMM d, yyyy')
                  : ''}
              </strong>
              . All scored items will be lost. This cannot be undone.
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

      {/* Duplicate Warning */}
      <AlertDialog open={duplicateWarningOpen} onOpenChange={setDuplicateWarningOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Existing {meta.label} Assessment Found
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                {studentName} already has a {meta.label} assessment (started{' '}
                {existingAssessment?.date_administered
                  ? format(new Date(existingAssessment.date_administered), 'MMM d, yyyy')
                  : ''}
                ).
              </p>
              <p className="font-medium">
                You can continue scoring on the existing assessment or create a new one.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="outline" onClick={() => {
              if (existingAssessment) setSelectedAssessment(existingAssessment);
              setDuplicateWarningOpen(false);
              setExistingAssessment(null);
            }}>
              <Edit2 className="w-4 h-4 mr-2" />
              Open Existing
            </Button>
            <AlertDialogAction onClick={createAssessment}>
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
          <h3 className="font-semibold">{meta.label} Assessments</h3>
          <Badge variant="outline" className="text-xs">Internal Tracker</Badge>
        </div>
        {curriculumSystemId && (
          <Button onClick={handleCreate} disabled={creating} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            {creating ? 'Creating...' : `New ${meta.label}`}
          </Button>
        )}
      </div>

      {/* Info */}
      <Card className="bg-accent/50 border-accent">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <BookOpen className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium">{meta.label} is entered directly by clinicians</p>
              <p className="text-xs text-muted-foreground mt-1">
                {meta.description} These assessments are <strong>NOT</strong> sent out as questionnaires.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {assessments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Grid3X3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
            <h4 className="font-medium mb-2">No {meta.label} Assessments Yet</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Start a new assessment to begin scoring for {studentName}
            </p>
            {curriculumSystemId && (
              <Button onClick={handleCreate} disabled={creating}>
                <Plus className="w-4 h-4 mr-2" />
                Start First {meta.label}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-2">
            {assessments.map(assessment => {
              const ds = (assessment.domain_scores || {}) as Record<string, number>;
              const vals = Object.values(ds);
              const avgScore = vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;

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
                            <span className="font-medium text-sm">{meta.label}</span>
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
                                <span>{avgScore}% avg mastery</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAssessmentToDelete(assessment);
                              setDeleteConfirmOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
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
