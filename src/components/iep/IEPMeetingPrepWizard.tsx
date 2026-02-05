import { useState } from 'react';
import { format, subDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useIEPMeetingPrep } from '@/hooks/useIEPMeetingPrep';
import { 
  IEPMeetingPrep, 
  MEETING_TYPES, 
  Attendee, 
  DocumentCheckItem,
  Recommendation,
  DEFAULT_DOCUMENTS_CHECKLIST 
} from '@/types/iepMeeting';
import { Student } from '@/types/behavior';
import { 
  ChevronRight, 
  ChevronLeft, 
  Calendar, 
  Users, 
  FileText, 
  BarChart3,
  Lightbulb,
  Check,
  Plus,
  Trash2,
  Loader2,
  Sparkles
} from 'lucide-react';

interface IEPMeetingPrepWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student;
  existingPrep?: IEPMeetingPrep;
}

const WIZARD_STEPS = [
  { id: 'details', title: 'Meeting Details', icon: Calendar },
  { id: 'data', title: 'Data Review', icon: BarChart3 },
  { id: 'goals', title: 'Goal Progress', icon: FileText },
  { id: 'recommendations', title: 'Recommendations', icon: Lightbulb },
  { id: 'documents', title: 'Documents', icon: FileText },
  { id: 'attendees', title: 'Attendees', icon: Users },
];

export function IEPMeetingPrepWizard({
  open,
  onOpenChange,
  student,
  existingPrep,
}: IEPMeetingPrepWizardProps) {
  const { createPrep, updatePrep } = useIEPMeetingPrep(student.id);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [prepId, setPrepId] = useState<string | null>(existingPrep?.id || null);

  // Form state
  const [meetingDate, setMeetingDate] = useState(
    existingPrep?.meeting_date || format(new Date(), 'yyyy-MM-dd')
  );
  const [meetingType, setMeetingType] = useState<string>(existingPrep?.meeting_type || 'annual');
  const [attendees, setAttendees] = useState<Attendee[]>(
    existingPrep?.attendees || [
      { id: '1', name: '', role: 'Parent/Guardian', confirmed: false },
      { id: '2', name: '', role: 'General Education Teacher', confirmed: false },
      { id: '3', name: '', role: 'Special Education Teacher', confirmed: false },
      { id: '4', name: '', role: 'School Administrator', confirmed: false },
    ]
  );
  const [documents, setDocuments] = useState<DocumentCheckItem[]>(
    existingPrep?.documents_checklist || DEFAULT_DOCUMENTS_CHECKLIST
  );
  const [recommendations, setRecommendations] = useState<Recommendation[]>(
    existingPrep?.recommendations || []
  );

  const progress = ((currentStep + 1) / WIZARD_STEPS.length) * 100;

  const handleNext = async () => {
    // Save on first step
    if (currentStep === 0 && !prepId) {
      setIsSubmitting(true);
      const prep = await createPrep({
        student_id: student.id,
        meeting_date: meetingDate,
        meeting_type: meetingType,
        attendees,
      });
      if (prep) {
        setPrepId(prep.id);
      }
      setIsSubmitting(false);
    }

    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSave = async () => {
    if (!prepId) return;
    
    setIsSubmitting(true);
    await updatePrep(prepId, {
      meeting_date: meetingDate,
      meeting_type: meetingType,
      attendees,
      documents_checklist: documents,
      recommendations,
      status: 'ready',
    });
    setIsSubmitting(false);
    onOpenChange(false);
  };

  const addAttendee = () => {
    setAttendees(prev => [
      ...prev,
      { id: crypto.randomUUID(), name: '', role: '', confirmed: false },
    ]);
  };

  const updateAttendee = (id: string, updates: Partial<Attendee>) => {
    setAttendees(prev =>
      prev.map(a => (a.id === id ? { ...a, ...updates } : a))
    );
  };

  const removeAttendee = (id: string) => {
    setAttendees(prev => prev.filter(a => a.id !== id));
  };

  const toggleDocument = (id: string) => {
    setDocuments(prev =>
      prev.map(d => (d.id === id ? { ...d, included: !d.included } : d))
    );
  };

  const addRecommendation = (type: Recommendation['type']) => {
    setRecommendations(prev => [
      ...prev,
      { id: crypto.randomUUID(), type, text: '', aiGenerated: false },
    ]);
  };

  const updateRecommendation = (id: string, updates: Partial<Recommendation>) => {
    setRecommendations(prev =>
      prev.map(r => (r.id === id ? { ...r, ...updates } : r))
    );
  };

  const removeRecommendation = (id: string) => {
    setRecommendations(prev => prev.filter(r => r.id !== id));
  };

  const renderStepContent = () => {
    switch (WIZARD_STEPS[currentStep].id) {
      case 'details':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Meeting Date</Label>
              <Input
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Meeting Type</Label>
              <Select value={meetingType} onValueChange={setMeetingType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MEETING_TYPES).map(([value, { label, description }]) => (
                    <SelectItem key={value} value={value}>
                      <div>
                        <p>{label}</p>
                        <p className="text-xs text-muted-foreground">{description}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Student: {student.name}</h4>
              <p className="text-sm text-muted-foreground">
                This wizard will help you prepare for the {MEETING_TYPES[meetingType]?.label || meetingType} meeting
                scheduled for {format(new Date(meetingDate), 'MMMM d, yyyy')}.
              </p>
            </div>
          </div>
        );

      case 'data':
        return (
          <div className="space-y-4">
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h4 className="font-medium">Auto-Generated Data Summary</h4>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Data from the last 90 days will be compiled into a summary for the meeting.
              </p>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-background rounded p-3">
                  <p className="text-muted-foreground">Period</p>
                  <p className="font-medium">
                    {format(subDays(new Date(), 90), 'MMM d')} - {format(new Date(), 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="bg-background rounded p-3">
                  <p className="text-muted-foreground">Behaviors Tracked</p>
                  <p className="font-medium">{student.behaviors.length}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {student.behaviors.map(behavior => (
                <div key={behavior.id} className="flex items-center justify-between border rounded-lg p-3">
                  <span className="font-medium">{behavior.name}</span>
                  <Badge variant="outline">Data available</Badge>
                </div>
              ))}
              {student.behaviors.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  No behaviors tracked for this student
                </p>
              )}
            </div>
          </div>
        );

      case 'goals':
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Review current IEP goals and their progress status.
            </p>
            
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Goal progress will be pulled from the student's skill acquisition programs.
              </p>
            </div>
          </div>
        );

      case 'recommendations':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Add recommendations for the IEP team
              </p>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => addRecommendation('continue')}>
                  <Plus className="w-3 h-3 mr-1" />
                  Continue
                </Button>
                <Button size="sm" variant="outline" onClick={() => addRecommendation('modify')}>
                  <Plus className="w-3 h-3 mr-1" />
                  Modify
                </Button>
                <Button size="sm" variant="outline" onClick={() => addRecommendation('add')}>
                  <Plus className="w-3 h-3 mr-1" />
                  Add New
                </Button>
              </div>
            </div>

            {recommendations.length === 0 ? (
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <Lightbulb className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No recommendations added yet
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recommendations.map(rec => (
                  <div key={rec.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="capitalize">{rec.type}</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRecommendation(rec.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                    <Textarea
                      value={rec.text}
                      onChange={(e) => updateRecommendation(rec.id, { text: e.target.value })}
                      placeholder="Enter recommendation..."
                      rows={2}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'documents':
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Check off documents to include in the meeting packet
            </p>

            <div className="space-y-2">
              {documents.map(doc => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 border rounded-lg p-3 cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleDocument(doc.id)}
                >
                  <Checkbox checked={doc.included} />
                  <span className={doc.included ? 'font-medium' : ''}>{doc.document}</span>
                  {doc.included && <Check className="w-4 h-4 text-primary ml-auto" />}
                </div>
              ))}
            </div>

            <div className="text-sm text-muted-foreground">
              {documents.filter(d => d.included).length} of {documents.length} documents selected
            </div>
          </div>
        );

      case 'attendees':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                List expected meeting attendees
              </p>
              <Button size="sm" variant="outline" onClick={addAttendee}>
                <Plus className="w-3 h-3 mr-1" />
                Add Attendee
              </Button>
            </div>

            <div className="space-y-3">
              {attendees.map(attendee => (
                <div key={attendee.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={attendee.confirmed}
                        onCheckedChange={(checked) =>
                          updateAttendee(attendee.id, { confirmed: checked === true })
                        }
                      />
                      <span className="text-xs text-muted-foreground">Confirmed</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAttendee(attendee.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={attendee.name}
                      onChange={(e) => updateAttendee(attendee.id, { name: e.target.value })}
                      placeholder="Name"
                    />
                    <Input
                      value={attendee.role}
                      onChange={(e) => updateAttendee(attendee.id, { role: e.target.value })}
                      placeholder="Role"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>IEP Meeting Preparation</DialogTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{student.name}</span>
            <span>•</span>
            <span>Step {currentStep + 1} of {WIZARD_STEPS.length}</span>
          </div>
        </DialogHeader>

        {/* Progress */}
        <Progress value={progress} className="h-2" />

        {/* Step indicators */}
        <div className="flex justify-between mb-4">
          {WIZARD_STEPS.map((step, index) => {
            const Icon = step.icon;
            const isComplete = index < currentStep;
            const isCurrent = index === currentStep;
            
            return (
              <div
                key={step.id}
                className={`flex flex-col items-center gap-1 cursor-pointer ${
                  isCurrent ? 'text-primary' : isComplete ? 'text-primary/70' : 'text-muted-foreground'
                }`}
                onClick={() => index <= currentStep && setCurrentStep(index)}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isCurrent
                      ? 'bg-primary text-primary-foreground'
                      : isComplete
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted'
                  }`}
                >
                  {isComplete ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <span className="text-xs hidden sm:block">{step.title}</span>
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <ScrollArea className="h-[400px] pr-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{WIZARD_STEPS[currentStep].title}</CardTitle>
            </CardHeader>
            <CardContent>{renderStepContent()}</CardContent>
          </Card>
        </ScrollArea>

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>

          {currentStep === WIZARD_STEPS.length - 1 ? (
            <Button onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save & Finish
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
