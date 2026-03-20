import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle, AlertCircle, Save, Send, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface FormSection {
  section_key: string;
  section_title: string;
  description?: string;
  fields: FormFieldDef[];
}

interface FormFieldDef {
  field_key: string;
  label: string;
  type: string; // text, textarea, number, date, select, radio, checkbox, rating, likert, section_header, paragraph, grid, signature
  required?: boolean;
  placeholder?: string;
  help_text?: string;
  options?: { label: string; value: string }[];
  min?: number;
  max?: number;
  rows?: string[];
  columns?: string[];
  scale_labels?: { min: string; max: string };
}

export default function ClinicalFormPage() {
  const { token } = useParams<{ token: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submission, setSubmission] = useState<any>(null);
  const [template, setTemplate] = useState<any>(null);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [currentSection, setCurrentSection] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    const fetchForm = async () => {
      if (!token) { setError('Invalid form link'); setIsLoading(false); return; }
      try {
        const { data, error: fetchError } = await (supabase as any)
          .from('clinical_form_submissions')
          .select('*, clinical_form_templates(*)')
          .eq('access_token', token)
          .single();

        if (fetchError || !data) { setError('Form not found or link is invalid'); setIsLoading(false); return; }
        if (data.status === 'submitted') { setIsCompleted(true); setIsLoading(false); return; }
        if (data.expires_at && new Date(data.expires_at) < new Date()) { setError('This form link has expired'); setIsLoading(false); return; }

        setSubmission(data);
        setTemplate(data.clinical_form_templates);
        if (data.responses && Object.keys(data.responses).length > 0) {
          setResponses(data.responses);
        }

        // Mark as opened
        if (data.status === 'sent') {
          await (supabase as any).from('clinical_form_submissions').update({ status: 'in_progress' }).eq('id', data.id);
        }
      } catch (err) {
        setError('Something went wrong');
      } finally {
        setIsLoading(false);
      }
    };
    fetchForm();
  }, [token]);

  const sections: FormSection[] = template?.sections || [];

  const saveProgress = useCallback(async () => {
    if (!submission) return;
    setIsSaving(true);
    try {
      await (supabase as any).from('clinical_form_submissions')
        .update({ responses, status: 'in_progress', updated_at: new Date().toISOString() })
        .eq('id', submission.id);
      toast.success('Progress saved');
    } catch { toast.error('Failed to save'); }
    finally { setIsSaving(false); }
  }, [submission, responses]);

  const handleSubmit = async () => {
    if (!submission) return;
    setIsSubmitting(true);
    try {
      await (supabase as any).from('clinical_form_submissions')
        .update({ responses, status: 'submitted', submitted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', submission.id);
      setIsCompleted(true);
    } catch { toast.error('Failed to submit'); }
    finally { setIsSubmitting(false); }
  };

  const updateResponse = (key: string, value: any) => {
    setResponses(prev => ({ ...prev, [key]: value }));
  };

  // Auto-save every 20 seconds
  useEffect(() => {
    if (!submission || isCompleted) return;
    const interval = setInterval(() => {
      if (Object.keys(responses).length > 0) saveProgress();
    }, 20000);
    return () => clearInterval(interval);
  }, [submission, responses, isCompleted, saveProgress]);

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
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-emerald-600" />
            <h2 className="text-xl font-semibold mb-2">Thank You!</h2>
            <p className="text-muted-foreground">Your response has been submitted successfully.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentSectionData = sections[currentSection];
  const progressPercent = sections.length > 0 ? ((currentSection + 1) / sections.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-background py-6 px-4">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{template?.form_name || 'Form'}</CardTitle>
            {template?.description && <CardDescription>{template.description}</CardDescription>}
            <div className="flex items-center gap-3 pt-2">
              <Progress value={progressPercent} className="h-2 flex-1" />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                Section {currentSection + 1} of {sections.length}
              </span>
            </div>
          </CardHeader>
        </Card>

        {/* Current Section */}
        {currentSectionData && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{currentSectionData.section_title}</CardTitle>
              {currentSectionData.description && (
                <CardDescription className="text-sm">{currentSectionData.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-5">
              {currentSectionData.fields.map(field => (
                <FieldRenderer
                  key={field.field_key}
                  field={field}
                  value={responses[field.field_key]}
                  onChange={(val) => updateResponse(field.field_key, val)}
                />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => setCurrentSection(s => Math.max(0, s - 1))}
            disabled={currentSection === 0}
            className="gap-1.5"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </Button>

          <Button variant="ghost" size="sm" onClick={saveProgress} disabled={isSaving} className="gap-1.5 text-xs">
            <Save className="w-3.5 h-3.5" />
            {isSaving ? 'Saving...' : 'Save Draft'}
          </Button>

          {currentSection < sections.length - 1 ? (
            <Button onClick={() => setCurrentSection(s => s + 1)} className="gap-1.5">
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-1.5">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Submit
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function FieldRenderer({ field, value, onChange }: { field: FormFieldDef; value: any; onChange: (v: any) => void }) {
  if (field.type === 'section_header') {
    return (
      <div className="pt-3 pb-1 border-b border-border">
        <h4 className="text-sm font-semibold">{field.label}</h4>
        {field.help_text && <p className="text-xs text-muted-foreground">{field.help_text}</p>}
      </div>
    );
  }

  if (field.type === 'paragraph') {
    return <p className="text-sm text-muted-foreground">{field.label}</p>;
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-sm">
        {field.label}
        {field.required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {field.help_text && <p className="text-xs text-muted-foreground">{field.help_text}</p>}

      {(field.type === 'text' || field.type === 'email' || field.type === 'phone' || field.type === 'number' || field.type === 'date') && (
        <Input
          type={field.type === 'phone' ? 'tel' : field.type}
          placeholder={field.placeholder}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
        />
      )}

      {field.type === 'textarea' && (
        <Textarea
          placeholder={field.placeholder}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          rows={4}
        />
      )}

      {field.type === 'select' && (
        <Select value={value || ''} onValueChange={onChange}>
          <SelectTrigger><SelectValue placeholder={field.placeholder || 'Select...'} /></SelectTrigger>
          <SelectContent>
            {field.options?.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {field.type === 'radio' && (
        <RadioGroup value={value || ''} onValueChange={onChange} className="space-y-1">
          {field.options?.map(opt => (
            <div key={opt.value} className="flex items-center space-x-2">
              <RadioGroupItem value={opt.value} id={`${field.field_key}-${opt.value}`} />
              <Label htmlFor={`${field.field_key}-${opt.value}`} className="text-sm font-normal">{opt.label}</Label>
            </div>
          ))}
        </RadioGroup>
      )}

      {field.type === 'checkbox' && (
        <div className="flex items-center space-x-2">
          <Checkbox checked={value || false} onCheckedChange={onChange} />
          <Label className="text-sm font-normal">{field.placeholder || ''}</Label>
        </div>
      )}

      {field.type === 'rating' && (
        <div className="flex gap-2">
          {Array.from({ length: field.max || 5 }, (_, i) => i + (field.min || 1)).map(n => (
            <Button key={n} type="button" variant={value === n ? 'default' : 'outline'} size="sm" onClick={() => onChange(n)}>
              {n}
            </Button>
          ))}
          {field.scale_labels && (
            <div className="flex justify-between w-full text-xs text-muted-foreground mt-1">
              <span>{field.scale_labels.min}</span>
              <span>{field.scale_labels.max}</span>
            </div>
          )}
        </div>
      )}

      {field.type === 'likert' && field.options && (
        <RadioGroup value={value || ''} onValueChange={onChange} className="flex flex-wrap gap-2">
          {field.options.map(opt => (
            <div key={opt.value} className="flex items-center gap-1.5">
              <RadioGroupItem value={opt.value} id={`${field.field_key}-${opt.value}`} />
              <Label htmlFor={`${field.field_key}-${opt.value}`} className="text-xs font-normal">{opt.label}</Label>
            </div>
          ))}
        </RadioGroup>
      )}

      {field.type === 'grid' && field.rows && field.columns && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="text-left p-2 border border-border bg-muted/50"></th>
                {field.columns.map(col => (
                  <th key={col} className="p-2 border border-border bg-muted/50 text-center whitespace-nowrap">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {field.rows.map(row => (
                <tr key={row}>
                  <td className="p-2 border border-border font-medium">{row}</td>
                  {field.columns!.map(col => (
                    <td key={col} className="p-2 border border-border text-center">
                      <Input
                        className="h-7 text-xs text-center w-16 mx-auto"
                        value={(value as Record<string, Record<string, string>>)?.[row]?.[col] || ''}
                        onChange={e => {
                          const grid = { ...(value || {}) };
                          if (!grid[row]) grid[row] = {};
                          grid[row][col] = e.target.value;
                          onChange(grid);
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
