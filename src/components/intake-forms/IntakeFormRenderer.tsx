import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Send, Loader2, CheckCircle, Clock, Bot, User as UserIcon } from 'lucide-react';
import { useIntakeFormsEngine } from '@/hooks/useIntakeFormsEngine';
import { toast } from 'sonner';

interface Props {
  instanceId: string;
  onBack: () => void;
}

export function IntakeFormRenderer({ instanceId, onBack }: Props) {
  const engine = useIntakeFormsEngine();
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [isDirty, setIsDirty] = useState(false);
  const autosaveTimer = useRef<NodeJS.Timeout | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load instance details
  const { data: instance, isLoading: instanceLoading } = useQuery({
    queryKey: ['intake-instance', instanceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('form_instances')
        .select('*, form_templates(*), form_responses(*)')
        .eq('id', instanceId)
        .single();
      if (error) throw error;
      return data as any;
    },
  });

  // Load template sections + fields
  const templateId = instance?.template_id;
  const { data: sections = [] } = useQuery({
    queryKey: ['intake-template-sections', templateId],
    queryFn: async () => {
      if (!templateId) return [];
      const { data, error } = await supabase
        .from('form_template_sections')
        .select('*, form_template_fields(*)')
        .eq('template_id', templateId)
        .order('display_order');
      if (error) throw error;
      return (data || []).map((s: any) => ({
        ...s,
        fields: (s.form_template_fields || []).sort((a: any, b: any) => a.display_order - b.display_order),
      }));
    },
    enabled: !!templateId,
  });

  // Hydrate from existing response
  useEffect(() => {
    if (instance?.form_responses?.length > 0) {
      const latest = instance.form_responses[0];
      setResponses(latest.response_json || {});
    }
  }, [instance]);

  // Autosave every 20 seconds
  useEffect(() => {
    if (!isDirty) return;
    autosaveTimer.current = setTimeout(() => {
      performSave(false);
    }, 20000);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [isDirty, responses]);

  const performSave = useCallback(async (isFinal: boolean) => {
    setIsSaving(true);
    try {
      await engine.saveResponse.mutateAsync({
        instanceId,
        responseJson: responses,
        isFinal,
      });
      setIsDirty(false);
      setLastSaved(new Date());
      if (isFinal) onBack();
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  }, [instanceId, responses, engine.saveResponse, onBack]);

  const updateField = (fieldKey: string, value: any) => {
    setResponses(prev => ({ ...prev, [fieldKey]: value }));
    setIsDirty(true);
  };

  if (instanceLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const templateName = instance?.form_templates?.name || instance?.title_override || 'Form';
  const totalFields = sections.reduce((sum: number, s: any) => sum + (s.fields?.length || 0), 0);
  const answeredFields = Object.keys(responses).filter(k => responses[k] !== '' && responses[k] !== null && responses[k] !== undefined).length;
  const progress = totalFields > 0 ? Math.round((answeredFields / totalFields) * 100) : 0;

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* Top Bar */}
      <div className="flex items-center justify-between sticky top-0 bg-background z-10 py-3 border-b">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="font-semibold text-lg">{templateName}</h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">{instance?.status}</Badge>
              {lastSaved && (
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-primary" />
                  Saved {lastSaved.toLocaleTimeString()}
                </span>
              )}
              {isDirty && <span className="text-destructive">• Unsaved changes</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => performSave(false)}
            disabled={isSaving || !isDirty}
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Save Draft
          </Button>
          <Button
            size="sm"
            onClick={() => performSave(true)}
            disabled={isSaving}
          >
            <Send className="h-4 w-4 mr-1" />
            Submit
          </Button>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3">
        <Progress value={progress} className="flex-1 h-2" />
        <span className="text-xs text-muted-foreground shrink-0">{progress}% complete</span>
      </div>

      {/* Sections */}
      {sections.map((section: any) => (
        <Card key={section.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{section.title}</CardTitle>
            {section.description && (
              <p className="text-xs text-muted-foreground">{section.description}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {(section.fields || []).map((field: any) => (
              <FormFieldRenderer
                key={field.id}
                field={field}
                value={responses[field.field_key]}
                onChange={(val) => updateField(field.field_key, val)}
              />
            ))}
          </CardContent>
        </Card>
      ))}

      {sections.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No form sections configured for this template</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Field Renderer ─────────────────────────────────────────────

function FormFieldRenderer({ field, value, onChange }: { field: any; value: any; onChange: (val: any) => void }) {
  const options = (field.options_json || []) as { label: string; value: string }[];
  const fieldType = field.field_type;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Label className="text-sm">
          {field.field_label}
          {field.is_required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        {field.ai_mapping && Object.keys(field.ai_mapping).length > 0 && (
          <Badge variant="outline" className="text-[10px] h-4 px-1 gap-0.5">
            <Bot className="h-2.5 w-2.5" /> AI
          </Badge>
        )}
        {field.profile_mapping && Object.keys(field.profile_mapping).length > 0 && (
          <Badge variant="outline" className="text-[10px] h-4 px-1 gap-0.5">
            <UserIcon className="h-2.5 w-2.5" /> Maps
          </Badge>
        )}
      </div>
      {field.help_text && (
        <p className="text-xs text-muted-foreground">{field.help_text}</p>
      )}

      {(fieldType === 'text' || fieldType === 'email' || fieldType === 'phone') && (
        <Input
          type={fieldType === 'email' ? 'email' : fieldType === 'phone' ? 'tel' : 'text'}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder || ''}
          required={field.is_required}
        />
      )}

      {fieldType === 'textarea' && (
        <Textarea
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder || ''}
          rows={4}
        />
      )}

      {fieldType === 'number' && (
        <Input
          type="number"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder || ''}
        />
      )}

      {fieldType === 'date' && (
        <Input
          type="date"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
        />
      )}

      {fieldType === 'select' && (
        <Select value={value || ''} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder={field.placeholder || 'Select...'} />
          </SelectTrigger>
          <SelectContent>
            {options.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {fieldType === 'radio' && (
        <RadioGroup value={value || ''} onValueChange={onChange}>
          {options.map(opt => (
            <div key={opt.value} className="flex items-center gap-2">
              <RadioGroupItem value={opt.value} id={`${field.id}-${opt.value}`} />
              <Label htmlFor={`${field.id}-${opt.value}`} className="text-sm font-normal">{opt.label}</Label>
            </div>
          ))}
        </RadioGroup>
      )}

      {fieldType === 'checkbox' && (
        <div className="flex items-center gap-2">
          <Checkbox
            checked={!!value}
            onCheckedChange={checked => onChange(checked)}
          />
          <span className="text-sm">{field.placeholder || 'Yes'}</span>
        </div>
      )}

      {fieldType === 'yes_no' && (
        <RadioGroup value={value || ''} onValueChange={onChange} className="flex gap-4">
          <div className="flex items-center gap-2">
            <RadioGroupItem value="yes" id={`${field.id}-yes`} />
            <Label htmlFor={`${field.id}-yes`} className="text-sm font-normal">Yes</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="no" id={`${field.id}-no`} />
            <Label htmlFor={`${field.id}-no`} className="text-sm font-normal">No</Label>
          </div>
        </RadioGroup>
      )}

      {fieldType === 'multiselect' && (
        <div className="space-y-2">
          {options.map(opt => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={(value || []).includes(opt.value)}
                onCheckedChange={checked => {
                  const current = value || [];
                  onChange(checked ? [...current, opt.value] : current.filter((v: string) => v !== opt.value));
                }}
              />
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
        </div>
      )}

      {fieldType === 'rating' && (
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(n => (
            <Button
              key={n}
              variant={value === n ? 'default' : 'outline'}
              size="sm"
              onClick={() => onChange(n)}
              className="w-9 h-9"
            >
              {n}
            </Button>
          ))}
        </div>
      )}

      {fieldType === 'file' && (
        <Input type="file" onChange={e => onChange(e.target.files?.[0]?.name || '')} />
      )}

      {fieldType === 'signature' && (
        <div className="border-2 border-dashed rounded-lg p-6 text-center text-muted-foreground">
          <p className="text-sm">Signature capture will appear here</p>
        </div>
      )}

      {fieldType === 'repeater' && (
        <div className="border rounded-lg p-3 text-sm text-muted-foreground">
          Repeater table for: {field.field_label}
        </div>
      )}
    </div>
  );
}
