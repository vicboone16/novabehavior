import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, Send, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useSdcIntake, type FormDefinition, type FormResponse } from '@/hooks/useSdcIntake';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

interface Props {
  formInstanceId: string;
  formDefinition?: FormDefinition;
  studentName: string;
  onBack: () => void;
}

export function SdcFormRenderer({ formInstanceId, formDefinition, studentName, onBack }: Props) {
  const intake = useSdcIntake();
  const [formDef, setFormDef] = useState<FormDefinition | null>(formDefinition || null);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [existingResponse, setExistingResponse] = useState<FormResponse | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const autosaveTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadFormData();
  }, [formInstanceId]);

  const loadFormData = async () => {
    try {
      // Load existing response
      const resp = await intake.fetchFormResponse(formInstanceId);
      setExistingResponse(resp);
      if (resp?.response_json) {
        setResponses(resp.response_json as Record<string, any>);
      }
      if (resp?.is_final) {
        setIsSubmitted(true);
      }

      // Load form definition if not provided
      if (!formDefinition) {
        const defs = await intake.fetchFormDefinitions();
        // We'd need the form_definition_id from form_instances, but for now use what's available
        if (defs.length > 0) setFormDef(defs[0]);
      }
    } catch (err: any) {
      toast.error('Failed to load form: ' + err.message);
    }
  };

  const handleFieldChange = useCallback((key: string, value: any) => {
    setResponses(prev => {
      const next = { ...prev, [key]: value };
      // Auto-save debounce
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      autosaveTimer.current = setTimeout(() => {
        intake.saveDraftResponse(formInstanceId, next).catch(() => {});
      }, 3000);
      return next;
    });
  }, [formInstanceId, intake]);

  const handleMultiselectToggle = useCallback((key: string, value: string) => {
    setResponses(prev => {
      const current = Array.isArray(prev[key]) ? prev[key] : [];
      const next = current.includes(value)
        ? current.filter((v: string) => v !== value)
        : [...current, value];
      const updated = { ...prev, [key]: next };
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      autosaveTimer.current = setTimeout(() => {
        intake.saveDraftResponse(formInstanceId, updated).catch(() => {});
      }, 3000);
      return updated;
    });
  }, [formInstanceId, intake]);

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      await intake.saveDraftResponse(formInstanceId, responses);
    } catch (err: any) {
      toast.error('Failed to save: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await intake.submitFinalResponse(
        formInstanceId,
        responses,
        responses.teacher_or_respondent_name || responses.teacher_name || responses.completed_by,
        responses.respondent_role,
      );
      setIsSubmitted(true);
      setShowSubmitConfirm(false);
    } catch (err: any) {
      toast.error('Failed to submit: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const schema = formDef?.schema_json;
  const sections: any[] = schema?.sections || [];

  const shouldShowField = (field: any): boolean => {
    if (!field.show_if) return true;
    const { field: depField, equals } = field.show_if;
    return responses[depField] === equals;
  };

  const renderField = (field: any) => {
    if (!shouldShowField(field)) return null;
    const key = field.key;
    const val = responses[key] ?? '';
    const disabled = isSubmitted;

    switch (field.type) {
      case 'text':
        return (
          <div key={key} className="space-y-1">
            <Label className="text-sm">{field.label}{field.required && <span className="text-destructive"> *</span>}</Label>
            <Input
              value={val}
              onChange={e => handleFieldChange(key, e.target.value)}
              placeholder={field.placeholder || ''}
              disabled={disabled}
            />
          </div>
        );
      case 'textarea':
        return (
          <div key={key} className="space-y-1">
            <Label className="text-sm">{field.label}{field.required && <span className="text-destructive"> *</span>}</Label>
            <Textarea
              value={val}
              onChange={e => handleFieldChange(key, e.target.value)}
              placeholder={field.placeholder || ''}
              disabled={disabled}
              rows={3}
            />
          </div>
        );
      case 'date':
        return (
          <div key={key} className="space-y-1">
            <Label className="text-sm">{field.label}</Label>
            <Input
              type="date"
              value={val}
              onChange={e => handleFieldChange(key, e.target.value)}
              disabled={disabled}
            />
          </div>
        );
      case 'select':
        return (
          <div key={key} className="space-y-1">
            <Label className="text-sm">{field.label}{field.required && <span className="text-destructive"> *</span>}</Label>
            <Select value={val} onValueChange={v => handleFieldChange(key, v)} disabled={disabled}>
              <SelectTrigger>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {(field.options || []).map((opt: any) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      case 'multiselect':
        return (
          <div key={key} className="space-y-2">
            <Label className="text-sm">{field.label}{field.required && <span className="text-destructive"> *</span>}</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {(field.options || []).map((opt: any) => {
                const checked = Array.isArray(responses[key]) && responses[key].includes(opt.value);
                return (
                  <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer p-1.5 rounded hover:bg-muted/50">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => handleMultiselectToggle(key, opt.value)}
                      disabled={disabled}
                    />
                    <span>{opt.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        );
      case 'radio':
        return (
          <div key={key} className="space-y-2">
            <Label className="text-sm">{field.label}{field.required && <span className="text-destructive"> *</span>}</Label>
            <RadioGroup value={val} onValueChange={v => handleFieldChange(key, v)} disabled={disabled}>
              {(field.options || []).map((opt: any) => (
                <div key={opt.value} className="flex items-center gap-2">
                  <RadioGroupItem value={opt.value} id={`${key}-${opt.value}`} />
                  <Label htmlFor={`${key}-${opt.value}`} className="font-normal text-sm">{opt.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );
      case 'scale':
        return (
          <div key={key} className="space-y-2">
            <Label className="text-sm">{field.label}</Label>
            <div className="flex gap-2 flex-wrap">
              {(field.options || []).map((opt: any) => (
                <Button
                  key={opt.value}
                  variant={val === opt.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleFieldChange(key, opt.value)}
                  disabled={disabled}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
        );
      default:
        return (
          <div key={key} className="space-y-1">
            <Label className="text-sm">{field.label}</Label>
            <Input
              value={val}
              onChange={e => handleFieldChange(key, e.target.value)}
              disabled={disabled}
            />
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Package
        </Button>
        <div className="flex items-center gap-2">
          {isSubmitted && (
            <Badge className="bg-green-500/15 text-green-700 border-green-200">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Submitted
            </Badge>
          )}
          {!isSubmitted && (
            <>
              <Button variant="outline" size="sm" onClick={handleSaveDraft} disabled={isSaving}>
                <Save className="w-3 h-3 mr-1" />
                {isSaving ? 'Saving...' : 'Save Draft'}
              </Button>
              <Button size="sm" onClick={() => setShowSubmitConfirm(true)}>
                <Send className="w-3 h-3 mr-1" />
                Submit
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Form title */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{formDef?.name || 'Form'}</CardTitle>
          <p className="text-sm text-muted-foreground">{formDef?.description}</p>
          <p className="text-xs text-muted-foreground">Student: {studentName}</p>
        </CardHeader>
      </Card>

      {/* Sections */}
      {sections.map((section: any) => (
        <Card key={section.key}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{section.label}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(section.fields || []).map((field: any) => renderField(field))}
          </CardContent>
        </Card>
      ))}

      {/* Submit confirmation */}
      <Dialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Form?</DialogTitle>
            <DialogDescription>
              This will mark the form as final. You can still edit it as a BCBA/admin after submission.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitConfirm(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Confirm Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
