import { useState, useEffect, useMemo } from 'react';
import { 
  FileText, Edit2, Eye, Calendar, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { BriefRecordReviewForm, BriefRecordReviewData } from './BriefRecordReviewForm';
import { AssessmentErrorBoundary } from './AssessmentErrorBoundary';
import { useDataStore } from '@/store/dataStore';
import { Student, BriefRecordReviewSavedData } from '@/types/behavior';

interface BriefRecordReviewManagerProps {
  student: Student;
}

export function BriefRecordReviewManager({ student }: BriefRecordReviewManagerProps) {
  const { updateStudentProfile } = useDataStore();
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Get the SINGLE record review from student profile with defensive parsing
  const existingReview = useMemo((): BriefRecordReviewSavedData | null => {
    try {
      // Safety check for student object
      if (!student) return null;
      
      // Check new single-instance field first
      if (student.briefRecordReview && typeof student.briefRecordReview === 'object') {
        return student.briefRecordReview;
      }
      
      // Fall back to legacy array format
      const reviews = student.briefRecordReviews;
      if (Array.isArray(reviews) && reviews.length > 0) {
        const review = reviews[0];
        if (review && review.data && typeof review.data === 'object') {
          return review.data;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error parsing brief record review:', error);
      setFormError('Failed to load existing review data');
      return null;
    }
  }, [student?.briefRecordReview, student?.briefRecordReviews]);

  useEffect(() => {
    // Safely delay loading state
    const timeout = setTimeout(() => setIsLoading(false), 100);
    return () => clearTimeout(timeout);
  }, []);
  
  // Reset form error when opening fresh
  useEffect(() => {
    if (!showForm) {
      setFormError(null);
    }
  }, [showForm]);

  const handleOpenReview = () => {
    setIsEditing(!!existingReview);
    setShowForm(true);
  };

  const handleSave = (data: BriefRecordReviewData, action: 'draft' | 'submit') => {
    try {
      // Convert form data to saved data format
      const savedData: BriefRecordReviewSavedData = {
        id: existingReview?.id || data.id,
        studentId: data.studentId,
        grade: data.grade,
        reviewer: data.reviewer,
        date: data.date,
        respondentType: data.respondentType,
        respondentName: data.respondentName,
        respondentEmail: data.respondentEmail,
        healthReviewed: data.healthReviewed,
        healthHistory: data.healthHistory,
        medicalDiagnoses: data.medicalDiagnoses,
        mentalHealthDiagnoses: data.mentalHealthDiagnoses,
        medications: data.medications,
        academicReviewed: data.academicReviewed,
        academicAssessments: data.academicAssessments,
        interventionsReviewed: data.interventionsReviewed,
        behaviorInterventions: data.behaviorInterventions,
        academicInterventions: data.academicInterventions,
        previousFBABIP: data.previousFBABIP,
        attendanceReviewed: data.attendanceReviewed,
        previousAttendanceConcerns: data.previousAttendanceConcerns,
        tardy: data.tardy,
        earlyDismissal: data.earlyDismissal,
        absent: data.absent,
        disciplineReviewed: data.disciplineReviewed,
        disciplineRecords: data.disciplineRecords,
        disciplineNotes: data.disciplineNotes,
        iepReviewed: data.iepReviewed,
        eligibilityDisability: data.eligibilityDisability,
        services: data.services,
        programModifications: data.programModifications,
        otherInformation: data.otherInformation,
        status: action === 'submit' ? 'submitted' : 'draft',
        createdAt: existingReview?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save as single instance (not array)
      updateStudentProfile(student.id, {
        briefRecordReview: savedData,
        // Clear legacy array
        briefRecordReviews: undefined,
      });

      setShowForm(false);
      setIsEditing(false);
      toast.success(
        action === 'submit' 
          ? 'Brief Record Review saved successfully.' 
          : 'Draft saved'
      );
    } catch (error) {
      console.error('Error saving Brief Record Review:', error);
      toast.error('Failed to save. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24" />
        </CardContent>
      </Card>
    );
  }

  if (formError) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-4 h-4" />
            Error Loading Record Review
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{formError}</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={() => {
              setFormError(null);
              setIsLoading(true);
              setTimeout(() => setIsLoading(false), 100);
            }}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Safety check for student
  if (!student || !student.id) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p className="text-sm">No student selected</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <AssessmentErrorBoundary>
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Brief Record Review
                </CardTitle>
                <CardDescription className="text-xs">
                  FBA records review for {student.displayName || student.name}
                </CardDescription>
              </div>
              <Button size="sm" onClick={handleOpenReview}>
                {existingReview ? (
                  <>
                    <Edit2 className="w-3 h-3 mr-1" />
                    Edit Review
                  </>
                ) : (
                  <>
                    <FileText className="w-3 h-3 mr-1" />
                    Start Review
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {existingReview ? (
              <div 
                className="p-4 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                onClick={handleOpenReview}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Brief Record Review</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        {existingReview.createdAt 
                          ? format(new Date(existingReview.createdAt), 'MMM dd, yyyy')
                          : 'Date unknown'
                        }
                        <span className="mx-1">•</span>
                        Reviewer: {existingReview.reviewer || 'Unknown'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={existingReview.status === 'submitted' ? 'default' : 'outline'}>
                      {existingReview.status === 'submitted' ? 'Submitted' : 'Draft'}
                    </Badge>
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
                
                {/* Quick summary of reviewed sections */}
                <div className="mt-3 flex flex-wrap gap-1">
                  {existingReview.healthReviewed && (
                    <Badge variant="secondary" className="text-xs">Health ✓</Badge>
                  )}
                  {existingReview.academicReviewed && (
                    <Badge variant="secondary" className="text-xs">Academic ✓</Badge>
                  )}
                  {existingReview.interventionsReviewed && (
                    <Badge variant="secondary" className="text-xs">Interventions ✓</Badge>
                  )}
                  {existingReview.attendanceReviewed && (
                    <Badge variant="secondary" className="text-xs">Attendance ✓</Badge>
                  )}
                  {existingReview.disciplineReviewed && (
                    <Badge variant="secondary" className="text-xs">Discipline ✓</Badge>
                  )}
                  {existingReview.iepReviewed && (
                    <Badge variant="secondary" className="text-xs">IEP ✓</Badge>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No Record Review yet</p>
                <p className="text-xs">Click "Start Review" to begin</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Form Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>
                {isEditing ? 'Edit' : 'New'} Brief Record Review
              </DialogTitle>
              <DialogDescription>
                {isEditing 
                  ? `Editing record review for ${student.displayName || student.name}`
                  : `Complete the records review form for ${student.displayName || student.name}`
                }
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[calc(90vh-120px)]">
              <BriefRecordReviewForm
                studentId={student.id}
                studentName={student.displayName || student.name}
                existingData={existingReview ? {
                  ...existingReview,
                  studentName: student.displayName || student.name,
                  // Cast arrays to proper types
                  academicAssessments: existingReview.academicAssessments as BriefRecordReviewData['academicAssessments'],
                  disciplineRecords: existingReview.disciplineRecords as BriefRecordReviewData['disciplineRecords'],
                } as Partial<BriefRecordReviewData> : undefined}
                onSave={handleSave}
                onCancel={() => setShowForm(false)}
              />
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </AssessmentErrorBoundary>
  );
}
