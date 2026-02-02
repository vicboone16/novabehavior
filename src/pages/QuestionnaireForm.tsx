import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  ClipboardList, CheckCircle2, AlertCircle, Loader2,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Question {
  id: string;
  text: string;
  type: 'text' | 'multiple_choice' | 'rating' | 'yes_no';
  options?: string[];
  required: boolean;
}

interface Invitation {
  id: string;
  template_id: string;
  student_id: string;
  recipient_name: string;
  recipient_email: string;
  status: string;
  expires_at: string;
  form_type: string;
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  questions: Question[];
}

export default function QuestionnaireForm() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);

  useEffect(() => {
    const loadQuestionnaire = async () => {
      if (!token) {
        setError('Invalid questionnaire link');
        setIsLoading(false);
        return;
      }

      try {
        // Fetch invitation by token
        const { data: invitationData, error: invError } = await supabase
          .from('questionnaire_invitations')
          .select('*')
          .eq('access_token', token)
          .single();

        if (invError || !invitationData) {
          setError('This questionnaire link is invalid or has been removed.');
          setIsLoading(false);
          return;
        }

        // Check if already completed
        if (invitationData.status === 'completed') {
          setError('This questionnaire has already been completed. Thank you!');
          setIsLoading(false);
          return;
        }

        // Check if expired
        if (new Date(invitationData.expires_at) < new Date()) {
          setError('This questionnaire link has expired.');
          setIsLoading(false);
          return;
        }

        setInvitation(invitationData as Invitation);

        // Fetch template based on form_type
        const formType = invitationData.form_type || 'custom';
        let templateData: any = null;
        let templateError: any = null;

        if (formType === 'abas3') {
          const result = await supabase
            .from('abas3_form_templates')
            .select('*')
            .eq('id', invitationData.template_id)
            .single();
          templateData = result.data;
          templateError = result.error;
        } else if (formType === 'vbmapp') {
          const result = await supabase
            .from('vbmapp_form_templates')
            .select('*')
            .eq('id', invitationData.template_id)
            .single();
          templateData = result.data;
          templateError = result.error;
        } else if (formType === 'socially_savvy') {
          const result = await supabase
            .from('socially_savvy_form_templates')
            .select('*')
            .eq('id', invitationData.template_id)
            .single();
          templateData = result.data;
          templateError = result.error;
        } else {
          // Default: custom questionnaire templates
          const result = await supabase
            .from('questionnaire_templates')
            .select('*')
            .eq('id', invitationData.template_id)
            .single();
          templateData = result.data;
          templateError = result.error;
        }

        if (templateError || !templateData) {
          console.error('Template fetch error:', templateError);
          setError('Unable to load questionnaire. Please contact the sender.');
          setIsLoading(false);
          return;
        }

        // Map template data to common format
        setTemplate({
          id: templateData.id,
          name: templateData.form_name || templateData.name || 'Assessment',
          description: templateData.description || null,
          questions: (templateData.questions as unknown as Question[]) || [],
        } as Template);
      } catch (err) {
        console.error('Error loading questionnaire:', err);
        setError('An error occurred loading the questionnaire.');
      } finally {
        setIsLoading(false);
      }
    };

    loadQuestionnaire();
  }, [token]);

  const handleSubmit = async () => {
    if (!invitation || !template) return;

    // Validate required questions
    const unansweredRequired = template.questions.filter(
      q => q.required && !responses[q.id]?.trim()
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
      // Save response
      const { error: responseError } = await supabase
        .from('questionnaire_responses')
        .insert({
          invitation_id: invitation.id,
          student_id: invitation.student_id,
          responses: responses,
          respondent_info: {
            name: invitation.recipient_name,
            email: invitation.recipient_email,
            submitted_at: new Date().toISOString(),
          },
        });

      if (responseError) throw responseError;

      // Update invitation status
      await supabase
        .from('questionnaire_invitations')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', invitation.id);

      setSubmitted(true);
      toast({ title: 'Thank you!', description: 'Your responses have been submitted.' });
    } catch (err) {
      console.error('Error submitting questionnaire:', err);
      toast({
        title: 'Submission failed',
        description: 'Please try again or contact the sender.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading questionnaire...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-lg font-semibold mb-2">Unable to Load</h2>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <h2 className="text-xl font-semibold mb-2">Thank You!</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Your responses have been submitted successfully.
            </p>
            <p className="text-xs text-muted-foreground">
              You may now close this window.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const questions = template?.questions || [];
  const progress = (Object.keys(responses).length / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">{template?.name}</h1>
          {template?.description && (
            <p className="text-muted-foreground">{template.description}</p>
          )}
          <p className="text-sm text-muted-foreground">
            Welcome, {invitation?.recipient_name}
          </p>
        </div>

        {/* Progress */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>

        {/* Questions */}
        <div className="space-y-4">
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
                    placeholder="Enter your response..."
                    value={responses[question.id] || ''}
                    onChange={(e) =>
                      setResponses(prev => ({ ...prev, [question.id]: e.target.value }))
                    }
                    rows={3}
                  />
                )}

                {question.type === 'multiple_choice' && question.options && (
                  <RadioGroup
                    value={responses[question.id] || ''}
                    onValueChange={(value) =>
                      setResponses(prev => ({ ...prev, [question.id]: value }))
                    }
                  >
                    <div className="space-y-2">
                      {question.options.map((option, optIndex) => (
                        <div key={optIndex} className="flex items-center space-x-2">
                          <RadioGroupItem value={option} id={`${question.id}-${optIndex}`} />
                          <Label htmlFor={`${question.id}-${optIndex}`} className="cursor-pointer">
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
                      setResponses(prev => ({ ...prev, [question.id]: value }))
                    }
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id={`${question.id}-yes`} />
                      <Label htmlFor={`${question.id}-yes`} className="cursor-pointer">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id={`${question.id}-no`} />
                      <Label htmlFor={`${question.id}-no`} className="cursor-pointer">No</Label>
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
                          setResponses(prev => ({ ...prev, [question.id]: String(rating) }))
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

        {/* Submit */}
        <Button
          className="w-full h-12 text-lg"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Submit Responses
            </>
          )}
        </Button>

        {/* Expiration notice */}
        {invitation && (
          <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
            <Clock className="w-3 h-3" />
            Expires {format(new Date(invitation.expires_at), 'MMM d, yyyy')}
          </p>
        )}
      </div>
    </div>
  );
}
