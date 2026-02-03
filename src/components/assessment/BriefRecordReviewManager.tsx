import { useState, useEffect, useMemo } from 'react';
import { 
  FileText, Plus, Eye, Trash2, Users, Calendar, Send,
  ChevronDown, ChevronUp, AlertCircle, CheckCircle
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
  DialogFooter,
} from '@/components/ui/dialog';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { format, subDays } from 'date-fns';
import { BriefRecordReviewForm, BriefRecordReviewData } from './BriefRecordReviewForm';
import { AssessmentErrorBoundary } from './AssessmentErrorBoundary';
import { useDataStore } from '@/store/dataStore';
import { Student } from '@/types/behavior';

interface BriefRecordReviewManagerProps {
  student: Student;
  onSendQuestionnaire?: (assessmentType: string) => void;
}

// Use the type from the behavior types - we'll cast at runtime
type SavedRecordReview = {
  id: string;
  data: BriefRecordReviewData;
  responses: BriefRecordReviewData[];
};

export function BriefRecordReviewManager({ student, onSendQuestionnaire }: BriefRecordReviewManagerProps) {
  const { updateStudentProfile } = useDataStore();
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedReview, setSelectedReview] = useState<SavedRecordReview | null>(null);
  const [showResponsesDialog, setShowResponsesDialog] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [pendingSaveData, setPendingSaveData] = useState<{ data: BriefRecordReviewData; action: 'draft' | 'submit' } | null>(null);
  const [duplicateAction, setDuplicateAction] = useState<'additional' | 'replace' | 'cancel'>('additional');

  // Get saved reviews from student profile - safely cast the unknown arrays
  const savedReviews = useMemo((): SavedRecordReview[] => {
    try {
      const reviews = (student as { briefRecordReviews?: unknown[] }).briefRecordReviews || [];
      if (!Array.isArray(reviews)) return [];
      return reviews.map((r: unknown) => {
        const review = r as Record<string, unknown>;
        return {
          id: String(review.id || crypto.randomUUID()),
          data: review.data as BriefRecordReviewData,
          responses: Array.isArray(review.responses) 
            ? review.responses as BriefRecordReviewData[] 
            : [],
        };
      });
    } catch {
      console.error('Error parsing brief record reviews');
      return [];
    }
  }, [(student as { briefRecordReviews?: unknown[] }).briefRecordReviews]);

  // Check for existing review within 90 days
  const recentExistingReview = useMemo(() => {
    const ninetyDaysAgo = subDays(new Date(), 90);
    return savedReviews.find(review => {
      const reviewDate = new Date(review.data.createdAt);
      return reviewDate >= ninetyDaysAgo;
    });
  }, [savedReviews]);

  useEffect(() => {
    // Simulate loading for defensive rendering
    const timeout = setTimeout(() => setIsLoading(false), 100);
    return () => clearTimeout(timeout);
  }, []);

  // Handle save with duplicate check
  const handleSave = (data: BriefRecordReviewData, action: 'draft' | 'submit') => {
    // Check for duplicates
    if (action === 'submit' && (recentExistingReview || savedReviews.length > 0)) {
      setPendingSaveData({ data, action });
      setShowDuplicateDialog(true);
      return;
    }

    // No duplicate - save directly
    saveReview(data, action, 'new');
  };

  const saveReview = (
    data: BriefRecordReviewData, 
    action: 'draft' | 'submit',
    mode: 'new' | 'additional' | 'replace'
  ) => {
    try {
      let updatedReviews: SavedRecordReview[] = [...savedReviews];

      if (mode === 'new' || mode === 'additional') {
        // Check if there's an existing review for this student
        const existingIndex = updatedReviews.findIndex(r => r.id === data.id);
        
        if (existingIndex >= 0) {
          // Add as additional response
          updatedReviews[existingIndex].responses.push(data);
        } else if (mode === 'additional' && recentExistingReview) {
          // Add to the most recent existing review
          const recentIndex = updatedReviews.findIndex(r => r.id === recentExistingReview.id);
          if (recentIndex >= 0) {
            updatedReviews[recentIndex].responses.push(data);
          }
        } else {
          // Create new review
          updatedReviews.push({
            id: data.id,
            data,
            responses: [data],
          });
        }
      } else if (mode === 'replace' && recentExistingReview) {
        // Replace the most recent review
        const recentIndex = updatedReviews.findIndex(r => r.id === recentExistingReview.id);
        if (recentIndex >= 0) {
          updatedReviews[recentIndex] = {
            id: data.id,
            data,
            responses: [data],
          };
        }
      }

      // Update student profile
      updateStudentProfile(student.id, {
        briefRecordReviews: updatedReviews,
      });

      setShowForm(false);
      toast.success(action === 'submit' ? 'Brief Record Review submitted successfully.' : 'Draft saved');
    } catch (error) {
      console.error('Error saving Brief Record Review:', error);
      toast.error('Failed to save. Please try again.');
    }
  };

  const handleDuplicateConfirm = () => {
    if (!pendingSaveData) return;

    if (duplicateAction === 'cancel') {
      setShowDuplicateDialog(false);
      setPendingSaveData(null);
      return;
    }

    saveReview(pendingSaveData.data, pendingSaveData.action, duplicateAction);
    setShowDuplicateDialog(false);
    setPendingSaveData(null);
    setDuplicateAction('additional');
  };

  const handleDelete = (reviewId: string) => {
    const updatedReviews = savedReviews.filter(r => r.id !== reviewId);
    updateStudentProfile(student.id, {
      briefRecordReviews: updatedReviews,
    });
    toast.success('Brief Record Review deleted');
    setShowResponsesDialog(false);
    setSelectedReview(null);
  };

  // Loading state
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

  return (
    <AssessmentErrorBoundary>
      <div className="space-y-4">
        {/* Header Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Brief Record Review
                </CardTitle>
                <CardDescription className="text-xs">
                  FBA records review assessment for {student.displayName || student.name}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSendQuestionnaire?.('brief_record_review')}
                >
                  <Send className="w-3 h-3 mr-1" />
                  Send to Respondent
                </Button>
                <Button size="sm" onClick={() => setShowForm(true)}>
                  <Plus className="w-3 h-3 mr-1" />
                  New Review
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {savedReviews.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No Brief Record Reviews yet</p>
                <p className="text-xs">Click "New Review" to create one</p>
              </div>
            ) : (
              <div className="space-y-2">
                {savedReviews.map(review => (
                  <div
                    key={review.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedReview(review);
                      setShowResponsesDialog(true);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <FileText className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Brief Record Review</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(review.data.createdAt), 'MMM dd, yyyy')} • 
                          Reviewer: {review.data.reviewer || 'Unknown'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        <Users className="w-3 h-3 mr-1" />
                        {review.responses.length} response{review.responses.length !== 1 ? 's' : ''}
                      </Badge>
                      <Badge variant={review.data.status === 'submitted' ? 'default' : 'outline'}>
                        {review.data.status === 'submitted' ? (
                          <><CheckCircle className="w-3 h-3 mr-1" />Submitted</>
                        ) : (
                          <>Draft</>
                        )}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Form Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Brief Record Review</DialogTitle>
              <DialogDescription>
                Complete the records review form for {student.displayName || student.name}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[calc(90vh-120px)]">
              <BriefRecordReviewForm
                studentId={student.id}
                studentName={student.displayName || student.name}
                onSave={handleSave}
                onCancel={() => setShowForm(false)}
              />
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Responses Dialog */}
        <Dialog open={showResponsesDialog} onOpenChange={setShowResponsesDialog}>
          <DialogContent className="max-w-3xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Brief Record Review Responses</DialogTitle>
              <DialogDescription>
                View all responses for this assessment
              </DialogDescription>
            </DialogHeader>
            {selectedReview && (
              <ScrollArea className="max-h-[60vh]">
                <div className="space-y-4">
                  {selectedReview.responses.map((response, index) => (
                    <Card key={response.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">
                            Response {index + 1}: {response.respondentName || response.reviewer}
                          </CardTitle>
                          <Badge variant="secondary">{response.respondentType}</Badge>
                        </div>
                        <CardDescription className="text-xs">
                          {format(new Date(response.createdAt), 'MMMM dd, yyyy')}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="text-xs space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="font-medium">Grade:</span> {response.grade || 'N/A'}
                          </div>
                          <div>
                            <span className="font-medium">Date:</span> {response.date}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {response.healthReviewed && <Badge variant="outline" className="text-xs">Health ✓</Badge>}
                          {response.academicReviewed && <Badge variant="outline" className="text-xs">Academic ✓</Badge>}
                          {response.interventionsReviewed && <Badge variant="outline" className="text-xs">Interventions ✓</Badge>}
                          {response.attendanceReviewed && <Badge variant="outline" className="text-xs">Attendance ✓</Badge>}
                          {response.disciplineReviewed && <Badge variant="outline" className="text-xs">Discipline ✓</Badge>}
                          {response.iepReviewed && <Badge variant="outline" className="text-xs">IEP ✓</Badge>}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
            <DialogFooter>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => selectedReview && handleDelete(selectedReview.id)}
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Delete Review
              </Button>
              <Button variant="outline" onClick={() => setShowResponsesDialog(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Duplicate Prompt Dialog */}
        <AlertDialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                Existing Brief Record Review Found
              </AlertDialogTitle>
              <AlertDialogDescription>
                An existing Brief Record Review already exists for this student.
                How would you like to proceed?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <RadioGroup value={duplicateAction} onValueChange={(v) => setDuplicateAction(v as typeof duplicateAction)}>
                <div className="flex items-start space-x-3 p-3 rounded-lg border bg-primary/5 border-primary/20">
                  <RadioGroupItem value="additional" id="additional" className="mt-1" />
                  <div>
                    <Label htmlFor="additional" className="font-medium cursor-pointer">
                      Save as an additional respondent response (recommended)
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Adds this as another response to the existing review
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 rounded-lg border mt-2">
                  <RadioGroupItem value="replace" id="replace" className="mt-1" />
                  <div>
                    <Label htmlFor="replace" className="font-medium cursor-pointer">
                      Replace the existing response
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Overwrites the previous review with this new data
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 rounded-lg border mt-2">
                  <RadioGroupItem value="cancel" id="cancel" className="mt-1" />
                  <div>
                    <Label htmlFor="cancel" className="font-medium cursor-pointer">
                      Cancel
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Don't save this review
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDuplicateConfirm}>
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AssessmentErrorBoundary>
  );
}
