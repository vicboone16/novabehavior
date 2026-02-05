import { useState, useMemo, useEffect } from 'react';
import { 
  Users, Plus, Eye, Trash2, Calendar, CheckCircle, AlertCircle, RefreshCw,
  Download, Printer, MoreHorizontal
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { BriefTeacherInput, BriefTeacherInputData } from './BriefTeacherInput';
import { AssessmentErrorBoundary } from './AssessmentErrorBoundary';
import { useDataStore } from '@/store/dataStore';
import { Student, BriefTeacherInputSaved } from '@/types/behavior';
import { 
  exportBriefTeacherInputToDocx, 
  generateBriefTeacherInputPrintHtml, 
  printAssessmentContent 
} from '@/lib/assessmentExport';

// Form error display component
function FormErrorDisplay({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="p-6 text-center space-y-4">
      <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
      <div>
        <h3 className="font-medium text-destructive">Failed to load form</h3>
        <p className="text-sm text-muted-foreground mt-1">
          There was an error loading the Brief Teacher Input form.
        </p>
      </div>
      <Button variant="outline" onClick={onRetry}>
        <RefreshCw className="w-4 h-4 mr-2" />
        Try Again
      </Button>
    </div>
  );
}

interface BriefTeacherInputManagerProps {
  student: Student;
  onSendQuestionnaire?: (assessmentType: string) => void;
}

export function BriefTeacherInputManager({ student, onSendQuestionnaire }: BriefTeacherInputManagerProps) {
  const { updateStudentProfile } = useDataStore();
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<BriefTeacherInputSaved | null>(null);
  const [showResponsesDialog, setShowResponsesDialog] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [pendingSaveData, setPendingSaveData] = useState<BriefTeacherInputData | null>(null);
  const [duplicateAction, setDuplicateAction] = useState<'additional' | 'replace' | 'cancel'>('additional');
  const [responseToReplace, setResponseToReplace] = useState<string | null>(null);
  const [componentError, setComponentError] = useState<string | null>(null);
  const [formRenderError, setFormRenderError] = useState(false);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => setIsLoading(false), 100);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!showForm) {
      setFormRenderError(false);
    }
  }, [showForm]);

  const handleFormRetry = () => {
    setFormRenderError(false);
    setFormKey(prev => prev + 1);
  };

  // Get saved responses from student profile with defensive parsing
  const savedResponses = useMemo((): BriefTeacherInputSaved[] => {
    try {
      if (!student) return [];
      const inputs = student.briefTeacherInputs;
      if (!Array.isArray(inputs)) return [];
      return inputs.filter(item => item && typeof item === 'object' && item.id);
    } catch (error) {
      console.error('Error parsing brief teacher inputs:', error);
      return [];
    }
  }, [student?.briefTeacherInputs]);

  // Safety check - if no student, show placeholder (after all hooks)
  if (!student || !student.id) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No student selected</p>
        </CardContent>
      </Card>
    );
  }

  const handleNewResponse = () => {
    // Check if responses already exist - if so, show duplicate prompt
    if (savedResponses.length > 0) {
      setShowDuplicateDialog(true);
      setDuplicateAction('additional');
    } else {
      setShowForm(true);
    }
  };

  const handleSave = (data: BriefTeacherInputData) => {
    try {
      // If there are existing responses and this is a new entry, we already showed the dialog
      // If user chose additional or this is the first response, save normally
      if (savedResponses.length > 0 && !showForm) {
        // This shouldn't happen, but handle it
        setPendingSaveData(data);
        setShowDuplicateDialog(true);
        return;
      }

      saveResponse(data, duplicateAction === 'replace' ? responseToReplace : null);
      setShowForm(false);
    } catch (error) {
      console.error('Error in handleSave:', error);
      toast.error('Failed to save. Please try again.');
    }
  };

  const saveResponse = (data: BriefTeacherInputData, replaceId: string | null) => {
    try {
      const savedData: BriefTeacherInputSaved = {
        id: data.id,
        studentId: data.studentId,
        respondentName: data.respondentName,
        date: data.date,
        strengths: data.strengths,
        problemBehaviors: data.problemBehaviors,
        otherBehavior: data.otherBehavior,
        behaviorDescription: data.behaviorDescription,
        frequency: data.frequency,
        duration: data.duration,
        intensity: data.intensity,
        triggers: data.triggers,
        otherTrigger: data.otherTrigger,
        thingsObtained: data.thingsObtained,
        otherObtained: data.otherObtained,
        thingsAvoided: data.thingsAvoided,
        otherAvoided: data.otherAvoided,
        additionalNotes: data.additionalNotes,
        inferredFunctions: data.inferredFunctions,
      };

      let updatedResponses: BriefTeacherInputSaved[];
      
      if (replaceId) {
        // Replace existing response
        updatedResponses = savedResponses.map(r => 
          r.id === replaceId ? savedData : r
        );
      } else {
        // Add as new response
        updatedResponses = [...savedResponses, savedData];
      }

      updateStudentProfile(student.id, {
        briefTeacherInputs: updatedResponses,
      });

      toast.success('Brief Teacher Input saved to student profile');
    } catch (error) {
      console.error('Error saving Brief Teacher Input:', error);
      toast.error('Failed to save. Please try again.');
    }
  };

  const handleDuplicateConfirm = () => {
    if (duplicateAction === 'cancel') {
      setShowDuplicateDialog(false);
      setPendingSaveData(null);
      return;
    }

    if (duplicateAction === 'replace' && savedResponses.length > 0) {
      // For replace, we need to pick which one to replace
      // Default to the most recent
      setResponseToReplace(savedResponses[savedResponses.length - 1].id);
    }

    setShowDuplicateDialog(false);
    setShowForm(true);
  };

  const handleDelete = (responseId: string) => {
    const updatedResponses = savedResponses.filter(r => r.id !== responseId);
    updateStudentProfile(student.id, {
      briefTeacherInputs: updatedResponses,
    });
    toast.success('Response deleted');
    setShowResponsesDialog(false);
    setSelectedResponse(null);
  };

  const getFunctionColor = (fn: string) => {
    const colors: Record<string, string> = {
      attention: 'bg-blue-500',
      escape: 'bg-orange-500',
      tangible: 'bg-green-500',
      sensory: 'bg-purple-500',
    };
    return colors[fn] || 'bg-muted';
  };

  const handleExportResponse = async (response: BriefTeacherInputSaved) => {
    try {
      await exportBriefTeacherInputToDocx(response, student);
      toast.success('Response exported to Word');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export response');
    }
  };

  const handlePrintResponse = (response: BriefTeacherInputSaved) => {
    const html = generateBriefTeacherInputPrintHtml(response, student);
    printAssessmentContent(`Brief Teacher Input - ${student.displayName || student.name}`, html);
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

  if (componentError) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2 text-destructive">
            <AlertCircle className="w-4 h-4" />
            Error Loading Brief Teacher Input
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{componentError}</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={() => {
              setComponentError(null);
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

  return (
    <AssessmentErrorBoundary>
      <div className="space-y-4">
        {/* Header Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Brief Teacher Input Form
                </CardTitle>
                <CardDescription className="text-xs">
                  Structured interview for {student.displayName || student.name}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {onSendQuestionnaire && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSendQuestionnaire('brief_teacher_input')}
                  >
                    Send to Respondent
                  </Button>
                )}
                <Button size="sm" onClick={handleNewResponse}>
                  <Plus className="w-3 h-3 mr-1" />
                  New Response
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {savedResponses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No Teacher Input responses yet</p>
                <p className="text-xs">Click "New Response" to add one</p>
              </div>
            ) : (
              <div className="space-y-2">
                {savedResponses.map(response => (
                  <div
                    key={response.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedResponse(response);
                      setShowResponsesDialog(true);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Users className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{response.respondentName}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(response.date), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {response.inferredFunctions.length > 0 && (
                        <div className="flex gap-1">
                          {response.inferredFunctions.slice(0, 2).map(fn => (
                            <Badge key={fn} className={`${getFunctionColor(fn)} text-xs capitalize`}>
                              {fn}
                            </Badge>
                          ))}
                          {response.inferredFunctions.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{response.inferredFunctions.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <MoreHorizontal className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            setSelectedResponse(response);
                            setShowResponsesDialog(true);
                          }}>
                            <Eye className="w-3 h-3 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleExportResponse(response);
                          }}>
                            <Download className="w-3 h-3 mr-2" />
                            Export to Word
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handlePrintResponse(response);
                          }}>
                            <Printer className="w-3 h-3 mr-2" />
                            Print
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(response.id);
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-3 h-3 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
              <DialogTitle>Brief Teacher Input Form</DialogTitle>
              <DialogDescription>
                Complete the structured interview for {student.displayName || student.name}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[calc(90vh-120px)]">
              {formRenderError ? (
                <FormErrorDisplay onRetry={handleFormRetry} />
              ) : (
                <AssessmentErrorBoundary 
                  onReset={handleFormRetry}
                  fallbackMessage="Form failed to render"
                >
                  <BriefTeacherInput
                    key={formKey}
                    student={student}
                    onSave={handleSave}
                  />
                </AssessmentErrorBoundary>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Response Detail Dialog */}
        <Dialog open={showResponsesDialog} onOpenChange={setShowResponsesDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Response Details</DialogTitle>
              <DialogDescription>
                Viewing response from {selectedResponse?.respondentName}
              </DialogDescription>
            </DialogHeader>
            {selectedResponse && (
              <ScrollArea className="max-h-[60vh]">
                <div className="space-y-4">
                  <Card>
                    <CardContent className="pt-4 space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="font-medium">Respondent:</span> {selectedResponse.respondentName}
                        </div>
                        <div>
                          <span className="font-medium">Date:</span> {format(new Date(selectedResponse.date), 'MMMM dd, yyyy')}
                        </div>
                      </div>
                      
                      {selectedResponse.strengths.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Strengths:</p>
                          <ul className="text-sm list-disc list-inside">
                            {selectedResponse.strengths.map((s, i) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Problem Behaviors:</p>
                        <div className="flex flex-wrap gap-1">
                          {selectedResponse.problemBehaviors.map(b => (
                            <Badge key={b} variant="secondary" className="text-xs">{b}</Badge>
                          ))}
                        </div>
                      </div>

                      {selectedResponse.behaviorDescription && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Description:</p>
                          <p className="text-sm">{selectedResponse.behaviorDescription}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-2 text-sm">
                        {selectedResponse.frequency && (
                          <div><span className="font-medium">Frequency:</span> {selectedResponse.frequency}</div>
                        )}
                        {selectedResponse.duration && (
                          <div><span className="font-medium">Duration:</span> {selectedResponse.duration}</div>
                        )}
                        {selectedResponse.intensity && (
                          <div><span className="font-medium">Intensity:</span> {selectedResponse.intensity}</div>
                        )}
                      </div>

                      {selectedResponse.triggers.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Triggers:</p>
                          <div className="flex flex-wrap gap-1">
                            {selectedResponse.triggers.map(t => (
                              <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedResponse.inferredFunctions.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Inferred Functions:</p>
                          <div className="flex flex-wrap gap-1">
                            {selectedResponse.inferredFunctions.map(fn => (
                              <Badge key={fn} className={`${getFunctionColor(fn)} text-xs capitalize`}>
                                {fn}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedResponse.additionalNotes && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Additional Notes:</p>
                          <p className="text-sm">{selectedResponse.additionalNotes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectedResponse && handleExportResponse(selectedResponse)}
              >
                <Download className="w-3 h-3 mr-1" />
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectedResponse && handlePrintResponse(selectedResponse)}
              >
                <Printer className="w-3 h-3 mr-1" />
                Print
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => selectedResponse && handleDelete(selectedResponse.id)}
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Delete
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
                <AlertCircle className="w-5 h-5 text-warning" />
                Existing Teacher Input Found
              </AlertDialogTitle>
              <AlertDialogDescription>
                An existing Teacher Input Form response already exists for this student.
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
                      Adds this as another response from a different respondent
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 rounded-lg border mt-2">
                  <RadioGroupItem value="replace" id="replace" className="mt-1" />
                  <div>
                    <Label htmlFor="replace" className="font-medium cursor-pointer">
                      Replace an existing response
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Overwrites the most recent response with new data
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
                      Don't add a new response
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDuplicateConfirm}>
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AssessmentErrorBoundary>
  );
}
