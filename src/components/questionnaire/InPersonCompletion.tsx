import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  ClipboardList, CheckCircle2, Loader2, Users, UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Question {
  id: string;
  text: string;
  type: 'text' | 'multiple_choice' | 'rating' | 'yes_no';
  options?: string[];
  required: boolean;
}

interface InPersonCompletionProps {
  templateId: string;
  templateType: 'custom' | 'abas3' | 'vbmapp' | 'socially_savvy';
  studentId: string;
  studentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function InPersonCompletion({
  templateId,
  templateType,
  studentId,
  studentName,
  open,
  onOpenChange,
  onComplete,
}: InPersonCompletionProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [template, setTemplate] = useState<{
    name: string;
    description: string | null;
    questions: Question[];
  } | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [respondentName, setRespondentName] = useState('');
  const [respondentType, setRespondentType] = useState<string>('parent');

  useEffect(() => {
    if (!open || !templateId) return;

    const loadTemplate = async () => {
      setIsLoading(true);
      try {
        let templateData: any = null;

        if (templateType === 'abas3') {
          const { data } = await supabase
            .from('abas3_form_templates')
            .select('*')
            .eq('id', templateId)
            .single();
          templateData = data;
        } else if (templateType === 'vbmapp') {
          const { data } = await supabase
            .from('vbmapp_form_templates')
            .select('*')
            .eq('id', templateId)
            .single();
          templateData = data;
        } else if (templateType === 'socially_savvy') {
          const { data } = await supabase
            .from('socially_savvy_form_templates')
            .select('*')
            .eq('id', templateId)
            .single();
          templateData = data;
        } else {
          const { data } = await supabase
            .from('questionnaire_templates')
            .select('*')
            .eq('id', templateId)
            .single();
          templateData = data;
        }

        if (templateData) {
          setTemplate({
            name: templateData.form_name || templateData.name || 'Questionnaire',
            description: templateData.description || null,
            questions: (templateData.questions as unknown as Question[]) || [],
          });
        }
      } catch (error) {
        console.error('Error loading template:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTemplate();
  }, [templateId, templateType, open]);

  const handleSubmit = async () => {
    if (!template || !respondentName.trim()) {
      toast({
        title: 'Please enter respondent name',
        variant: 'destructive',
      });
      return;
    }

    // Validate required questions
    const unansweredRequired = template.questions.filter(
      (q) => q.required && !responses[q.id]?.trim()
    );

    if (unansweredRequired.length > 0) {
      toast({
        title: 'Please complete all required questions',
        description: `${unansweredRequired.length} required question(s) not answered`,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create an invitation record for tracking (marked as in-person)
      const { data: invitation, error: invError } = await supabase
        .from('questionnaire_invitations')
        .insert({
          template_id: templateId,
          student_id: studentId,
          recipient_name: respondentName.trim(),
          recipient_email: `in-person-${Date.now()}@internal.local`,
          recipient_type: respondentType,
          created_by: user?.id,
          sent_at: new Date().toISOString(),
          form_type: templateType,
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (invError) throw invError;

      // Save the response
      const { error: responseError } = await supabase
        .from('questionnaire_responses')
        .insert({
          invitation_id: invitation.id,
          student_id: studentId,
          responses: responses,
          respondent_info: {
            name: respondentName.trim(),
            type: respondentType,
            completed_in_person: true,
            completed_by: user?.id,
            submitted_at: new Date().toISOString(),
          },
        });

      if (responseError) throw responseError;

      // Create corresponding assessment record if standardized
      if (templateType === 'abas3') {
        await supabase.from('abas3_assessments').insert({
          student_id: studentId,
          form_template_id: templateId,
          invitation_id: invitation.id,
          date_administered: new Date().toISOString().split('T')[0],
          administered_by: user?.id,
          respondent_name: respondentName.trim(),
          respondent_relationship: respondentType,
          status: 'completed',
          completed_at: new Date().toISOString(),
          raw_responses: responses,
        });
      } else if (templateType === 'socially_savvy') {
        await supabase.from('socially_savvy_assessments').insert({
          student_id: studentId,
          form_template_id: templateId,
          invitation_id: invitation.id,
          date_administered: new Date().toISOString().split('T')[0],
          administered_by: user?.id,
          respondent_name: respondentName.trim(),
          respondent_relationship: respondentType,
          status: 'completed',
          completed_at: new Date().toISOString(),
          raw_responses: responses,
        });
      }

      toast({
        title: 'Questionnaire Completed!',
        description: `Responses for ${respondentName} have been saved.`,
      });

      // Reset state
      setResponses({});
      setRespondentName('');
      setRespondentType('parent');
      onComplete();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving responses:', error);
      toast({
        title: 'Failed to save responses',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Loading...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const questions = template?.questions || [];
  const progress = (Object.keys(responses).length / Math.max(questions.length, 1)) * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <DialogTitle>In-Person Completion</DialogTitle>
          </div>
          <DialogDescription>
            Complete {template?.name} with a parent, teacher, or caregiver present for {studentName}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 pb-4">
            {/* Respondent Info */}
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-4">
                  <UserCheck className="w-5 h-5 text-primary" />
                  <span className="font-medium">Respondent Information</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Respondent Name *</Label>
                    <Input
                      value={respondentName}
                      onChange={(e) => setRespondentName(e.target.value)}
                      placeholder="e.g., Mrs. Johnson"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Respondent Type</Label>
                    <Select value={respondentType} onValueChange={setRespondentType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="parent">Parent</SelectItem>
                        <SelectItem value="teacher">Teacher</SelectItem>
                        <SelectItem value="caregiver">Caregiver</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Progress */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  {Object.keys(responses).length} of {questions.length} questions answered
                </p>
              </CardContent>
            </Card>

            {/* Questions */}
            {questions.map((question, index) => (
              <Card key={question.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-start gap-2">
                    <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-sm">
                      {index + 1}
                    </span>
                    <span>
                      {question.text}
                      {question.required && <span className="text-destructive ml-1">*</span>}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {question.type === 'text' && (
                    <Textarea
                      placeholder="Enter response..."
                      value={responses[question.id] || ''}
                      onChange={(e) =>
                        setResponses((prev) => ({ ...prev, [question.id]: e.target.value }))
                      }
                      rows={3}
                    />
                  )}

                  {question.type === 'multiple_choice' && question.options && (
                    <RadioGroup
                      value={responses[question.id] || ''}
                      onValueChange={(value) =>
                        setResponses((prev) => ({ ...prev, [question.id]: value }))
                      }
                    >
                      <div className="space-y-2">
                        {question.options.map((option, optIndex) => (
                          <div key={optIndex} className="flex items-center space-x-2">
                            <RadioGroupItem value={option} id={`ip-${question.id}-${optIndex}`} />
                            <Label htmlFor={`ip-${question.id}-${optIndex}`} className="cursor-pointer">
                              {option}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </RadioGroup>
                  )}

                  {question.type === 'yes_no' && (
                    <RadioGroup
                      value={responses[question.id] || ''}
                      onValueChange={(value) =>
                        setResponses((prev) => ({ ...prev, [question.id]: value }))
                      }
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id={`ip-${question.id}-yes`} />
                        <Label htmlFor={`ip-${question.id}-yes`} className="cursor-pointer">
                          Yes
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id={`ip-${question.id}-no`} />
                        <Label htmlFor={`ip-${question.id}-no`} className="cursor-pointer">
                          No
                        </Label>
                      </div>
                    </RadioGroup>
                  )}

                  {question.type === 'rating' && (
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <Button
                          key={rating}
                          variant={responses[question.id] === String(rating) ? 'default' : 'outline'}
                          className="w-12 h-12"
                          onClick={() =>
                            setResponses((prev) => ({ ...prev, [question.id]: String(rating) }))
                          }
                        >
                          {rating}
                        </Button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Complete & Save
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
