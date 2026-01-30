import { useState } from 'react';
import { format } from 'date-fns';
import { 
  Plus, FileText, Trash2, Edit, Eye, AlertTriangle, 
  CheckCircle2, Clock, ChevronDown 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/ui/alert-dialog-confirm';
import type { StudentAssessment } from '@/types/curriculum';

interface AssessmentHistoryPanelProps {
  assessments: StudentAssessment[];
  curriculumSystemId: string;
  systemName: string;
  onOpenAssessment: (assessment: StudentAssessment) => void;
  onCreateNew: () => void;
  onDelete: (assessmentId: string) => void;
  loading?: boolean;
}

export function AssessmentHistoryPanel({
  assessments,
  curriculumSystemId,
  systemName,
  onOpenAssessment,
  onCreateNew,
  onDelete,
  loading,
}: AssessmentHistoryPanelProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const systemAssessments = assessments.filter(
    a => a.curriculum_system_id === curriculumSystemId
  );

  const getCompletionPercentage = (assessment: StudentAssessment) => {
    const results = assessment.results_json || {};
    const scoredCount = Object.values(results).filter(r => r.score !== undefined).length;
    // Estimate based on typical item count (this is approximate)
    const estimatedTotal = 170; // VB-MAPP has ~170 milestones
    return Math.min(100, Math.round((scoredCount / estimatedTotal) * 100));
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirmId) {
      onDelete(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  if (loading) {
    return <div className="text-center py-4 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">Assessment History - {systemName}</h4>
        <Button size="sm" onClick={onCreateNew}>
          <Plus className="w-3 h-3 mr-1" />
          New Assessment
        </Button>
      </div>

      {systemAssessments.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <FileText className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">
              No assessments yet. Click "New Assessment" to begin.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {systemAssessments.map((assessment, index) => {
            const completion = getCompletionPercentage(assessment);
            const isComplete = completion >= 90; // Consider 90%+ as complete
            const isDraft = assessment.status === 'draft';
            
            return (
              <Card 
                key={assessment.id} 
                className={`hover:shadow-sm transition-shadow ${
                  index === 0 ? 'border-primary/50' : ''
                }`}
              >
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {format(new Date(assessment.date_administered), 'MMMM d, yyyy')}
                          </span>
                          {index === 0 && (
                            <Badge variant="outline" className="text-xs">
                              Latest
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          {isDraft ? (
                            <>
                              <Clock className="w-3 h-3" />
                              <span>Draft</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-green-600" />
                              <span>Finalized</span>
                            </>
                          )}
                          <span>•</span>
                          <span>{completion}% complete</span>
                          {!isComplete && isDraft && (
                            <>
                              <span>•</span>
                              <AlertTriangle className="w-3 h-3 text-amber-500" />
                              <span className="text-amber-600">Incomplete</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={assessment.status === 'final' ? 'default' : 'secondary'}
                      >
                        {assessment.status}
                      </Badge>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            Actions
                            <ChevronDown className="w-3 h-3 ml-1" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onOpenAssessment(assessment)}>
                            {isDraft ? (
                              <>
                                <Edit className="w-4 h-4 mr-2" />
                                Continue Editing
                              </>
                            ) : (
                              <>
                                <Eye className="w-4 h-4 mr-2" />
                                View / Edit
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => setDeleteConfirmId(assessment.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Assessment
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2">
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${
                          assessment.status === 'final' 
                            ? 'bg-green-500' 
                            : isComplete 
                              ? 'bg-primary' 
                              : 'bg-amber-400'
                        }`}
                        style={{ width: `${completion}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        title="Delete Assessment?"
        description="This will permanently delete this assessment and all its scores. This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
