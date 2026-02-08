import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { FormField } from '@/types/formBuilder';

export default function PublicFormPage() {
  const { token } = useParams<{ token: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submission, setSubmission] = useState<any>(null);
  const [form, setForm] = useState<any>(null);
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    const fetchForm = async () => {
      if (!token) {
        setError('Invalid form link');
        setIsLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('custom_form_submissions')
          .select('*, custom_forms(*)')
          .eq('access_token', token)
          .single();

        if (fetchError || !data) {
          setError('Form not found or link is invalid');
          setIsLoading(false);
          return;
        }

        // Check if already completed
        if (data.status === 'submitted' || data.status === 'reviewed') {
          setIsCompleted(true);
          setIsLoading(false);
          return;
        }

        // Check expiration
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          setError('This form link has expired');
          setIsLoading(false);
          return;
        }

        setSubmission(data);
        setForm(data.custom_forms);
        
        // Pre-populate responses if any exist
        if (data.responses) {
          setResponses(data.responses as Record<string, unknown>);
        }
      } catch (err) {
        console.error('Error fetching form:', err);
        setError('Something went wrong');
      } finally {
        setIsLoading(false);
      }
    };

    fetchForm();
  }, [token]);

  const handleSubmit = async () => {
    if (!submission) return;

    setIsSubmitting(true);
    try {
      const { error: updateError } = await supabase
        .from('custom_form_submissions')
        .update({
          responses: responses as any,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
        })
        .eq('id', submission.id);

      if (updateError) throw updateError;
      setIsCompleted(true);
    } catch (err) {
      console.error('Error submitting form:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateResponse = (fieldId: string, value: unknown) => {
    setResponses(prev => ({ ...prev, [fieldId]: value }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">Unable to Load Form</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-600" />
            <h2 className="text-xl font-semibold mb-2">Thank You!</h2>
            <p className="text-muted-foreground">Your response has been submitted successfully.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fields: FormField[] = form?.form_schema || [];

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>{form?.title || 'Form'}</CardTitle>
            {form?.description && (
              <CardDescription>{form.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {fields
              .sort((a, b) => a.order - b.order)
              .map((field) => {
                if (field.type === 'section_header') {
                  return (
                    <div key={field.id} className="pt-4 pb-2 border-b">
                      <h3 className="text-lg font-semibold">{field.label}</h3>
                      {field.helpText && <p className="text-sm text-muted-foreground">{field.helpText}</p>}
                    </div>
                  );
                }

                if (field.type === 'paragraph') {
                  return (
                    <p key={field.id} className="text-sm text-muted-foreground">{field.label}</p>
                  );
                }

                return (
                  <div key={field.id} className="space-y-2">
                    <Label>
                      {field.label}
                      {field.required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}

                    {(field.type === 'text' || field.type === 'email' || field.type === 'phone' || field.type === 'number') && (
                      <Input
                        type={field.type === 'phone' ? 'tel' : field.type}
                        placeholder={field.placeholder}
                        value={(responses[field.id] as string) || ''}
                        onChange={(e) => updateResponse(field.id, e.target.value)}
                      />
                    )}

                    {field.type === 'date' && (
                      <Input
                        type="date"
                        value={(responses[field.id] as string) || ''}
                        onChange={(e) => updateResponse(field.id, e.target.value)}
                      />
                    )}

                    {field.type === 'textarea' && (
                      <Textarea
                        placeholder={field.placeholder}
                        value={(responses[field.id] as string) || ''}
                        onChange={(e) => updateResponse(field.id, e.target.value)}
                      />
                    )}

                    {field.type === 'select' && (
                      <Select
                        value={(responses[field.id] as string) || ''}
                        onValueChange={(val) => updateResponse(field.id, val)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={field.placeholder || 'Select...'} />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options?.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {field.type === 'radio' && (
                      <RadioGroup
                        value={(responses[field.id] as string) || ''}
                        onValueChange={(val) => updateResponse(field.id, val)}
                      >
                        {field.options?.map((opt) => (
                          <div key={opt.value} className="flex items-center space-x-2">
                            <RadioGroupItem value={opt.value} id={`${field.id}-${opt.value}`} />
                            <Label htmlFor={`${field.id}-${opt.value}`}>{opt.label}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    )}

                    {field.type === 'checkbox' && (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={(responses[field.id] as boolean) || false}
                          onCheckedChange={(checked) => updateResponse(field.id, checked)}
                        />
                        <Label>{field.placeholder || ''}</Label>
                      </div>
                    )}

                    {field.type === 'rating' && (
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Button
                            key={n}
                            type="button"
                            variant={(responses[field.id] as number) === n ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => updateResponse(field.id, n)}
                          >
                            {n}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

            <div className="pt-4">
              <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Form'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
