import { useState } from 'react';
import { format } from 'date-fns';
import {
  ClipboardList, Plus, Calendar, Loader2, Trash2,
  AlertTriangle, ChevronRight, Lock, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useVineland3, type Vineland3Assessment } from '@/hooks/useVineland3';
import { Vineland3ScoringGrid } from './Vineland3ScoringGrid';
import { useAuth } from '@/contexts/AuthContext';

interface Vineland3EntryProps {
  studentId: string;
  studentName: string;
  studentDob?: string;
}

const STATUS_BADGES: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft: { label: 'Draft', variant: 'secondary' },
  in_progress: { label: 'In Progress', variant: 'outline' },
  completed: { label: 'Complete', variant: 'default' },
  locked: { label: 'Locked', variant: 'destructive' },
};

export function Vineland3Entry({ studentId, studentName, studentDob }: Vineland3EntryProps) {
  const { userRole } = useAuth();
  const {
    loading, domains, items, formTypes, assessments,
    createAssessment, deleteAssessment, refresh,
  } = useVineland3(studentId, studentDob);

  const [selectedAssessment, setSelectedAssessment] = useState<Vineland3Assessment | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [assessmentToDelete, setAssessmentToDelete] = useState<Vineland3Assessment | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Create form state
  const [newFormKey, setNewFormKey] = useState('comprehensive_interview');
  const [newRespondent, setNewRespondent] = useState('');
  const [newRelationship, setNewRelationship] = useState('');

  const canDelete = userRole === 'admin' || userRole === 'super_admin';

  const handleCreate = async () => {
    setCreating(true);
    try {
      const assessment = await createAssessment(newFormKey, newRespondent, newRelationship);
      setCreateDialogOpen(false);
      setSelectedAssessment(assessment);
      setNewRespondent('');
      setNewRelationship('');
    } catch {
      // error handled in hook
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!assessmentToDelete) return;
    setDeleting(true);
    try {
      await deleteAssessment(assessmentToDelete.id);
      if (selectedAssessment?.id === assessmentToDelete.id) setSelectedAssessment(null);
    } catch {
      // handled
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
      setAssessmentToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show scoring grid when assessment selected
  if (selectedAssessment) {
    return (
      <Vineland3ScoringGrid
        assessment={selectedAssessment}
        studentName={studentName}
        studentDob={studentDob}
        domains={domains}
        items={items}
        studentId={studentId}
        onBack={() => { setSelectedAssessment(null); refresh(); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Delete Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              Delete Vineland-3 Assessment
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this assessment from{' '}
              <strong>
                {assessmentToDelete?.administration_date
                  ? format(new Date(assessmentToDelete.administration_date), 'MMM d, yyyy')
                  : ''}
              </strong>. All scores will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Vineland-3 Assessment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Form Type</Label>
              <Select value={newFormKey} onValueChange={setNewFormKey}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {formTypes.map(f => (
                    <SelectItem key={f.form_key} value={f.form_key}>{f.form_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Respondent Name</Label>
              <Input value={newRespondent} onChange={e => setNewRespondent(e.target.value)} placeholder="e.g. Jane Smith" />
            </div>
            <div>
              <Label>Relationship to Student</Label>
              <Select value={newRelationship} onValueChange={setNewRelationship}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="caregiver">Caregiver</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="clinician">Clinician</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? 'Creating...' : 'Create Assessment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Vineland-3 Assessments</h3>
          <Badge variant="outline" className="text-xs">Adaptive Behavior</Badge>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          New Vineland-3
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-accent/50 border-accent">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium">Vineland Adaptive Behavior Scales, Third Edition</p>
              <p className="text-xs text-muted-foreground mt-1">
                Measure adaptive behavior across Communication, Daily Living Skills, Socialization, and Motor Skills.
                Score items 0–2, calculate raw and derived scores, and generate clinical reports.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assessment List */}
      {assessments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
            <h4 className="font-medium mb-2">No Vineland-3 Assessments Yet</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Create a new assessment to begin scoring for {studentName}
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Start First Vineland-3
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-2">
            {assessments.map(assessment => {
              const statusInfo = STATUS_BADGES[assessment.status] || STATUS_BADGES.draft;
              const formType = formTypes.find(f => f.form_key === assessment.form_key);
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
                          {assessment.locked_at ? (
                            <Lock className="w-4 h-4 text-primary" />
                          ) : (
                            <ClipboardList className="w-4 h-4 text-primary" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">Vineland-3</span>
                            <Badge variant={statusInfo.variant} className="text-xs">{statusInfo.label}</Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            <span>{format(new Date(assessment.administration_date), 'MMM d, yyyy')}</span>
                            {formType && <><span>•</span><span>{formType.form_name}</span></>}
                            {assessment.chronological_age_display && (
                              <><span>•</span><span>Age: {assessment.chronological_age_display}</span></>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {canDelete && !assessment.locked_at && (
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
