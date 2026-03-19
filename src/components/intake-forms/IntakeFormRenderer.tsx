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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ArrowLeft, Save, Send, Loader2, CheckCircle, Clock, Bot, User as UserIcon, ChevronDown, ChevronRight, Lock, AlertCircle } from 'lucide-react';
import { useIntakeFormsEngine, type FormTemplateSection } from '@/hooks/useIntakeFormsEngine';
import { toast } from 'sonner';

const AUTOSAVE_INTERVAL_MS = 20_000;

interface Props {
  instanceId: string;
  onBack: () => void;
}

export function IntakeFormRenderer({ instanceId, onBack }: Props) {
  const engine = useIntakeFormsEngine();
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [sections, setSections] = useState<FormTemplateSection[]>([]);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDirtyRef = useRef(false);
  const responsesRef = useRef(responses);

  // Keep refs in sync
  useEffect(() => {
    isDirtyRef.current = isDirty;
    responsesRef.current = responses;
  }, [isDirty, responses]);

  // Load instance
  const { data: instance, isLoading: instanceLoading } = useQuery({
    queryKey: ['intake-instance', instanceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('form_instances')
        .select('*, form_templates(*), form_signatures(*)')
        .eq('id', instanceId)
        .single();
      if (error) throw error;
      return data as any;
    },
  });

  const templateId = instance?.template_id;

  // Load template sections + fields
  useEffect(() => {
    if (!templateId) return;
    engine.loadTemplateSections(templateId).then(setSections).catch(console.error);
  }, [templateId, engine.loadTemplateSections]);

  // Load existing answers
  useEffect(() => {
    if (!instanceId) return;
    engine.loadAnswers(instanceId).then(({ map }) => {
      setResponses(map);
    }).catch(console.error);
  }, [instanceId, engine.loadAnswers]);

  // Autosave timer
  useEffect(() => {
    const interval = setInterval(() => {
      if (isDirtyRef.current) {
        performSave(false, true);
      }
    }, AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [instanceId, sections]);

  // Warn on unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  const performSave = useCallback(async (isFinal: boolean, silent = false) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await engine.saveAllAnswers.mutateAsync({
        instanceId,
        answers: responsesRef.current,
        sections,
        isFinal,
      });
      setIsDirty(false);
      setLastSaved(new Date());
      if (isFinal) {
        toast.success('Form submitted successfully');
        onBack();
      } else if (!silent) {
        toast.success('Draft saved');
      }
    } catch (err: any) {
      console.error('Save failed:', err);
      toast.error('Save failed: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  }, [instanceId, sections, engine.saveAllAnswers, isSaving, onBack]);

  const updateField = (fieldKey: string, value: any) => {
    setResponses(prev => ({ ...prev, [fieldKey]: value }));
    setIsDirty(true);
  };

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  if (instanceLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isLocked = instance?.status === 'finalized' || !!instance?.locked_at;
  const templateName = instance?.form_templates?.name || instance?.title_override || 'Form';
  const totalFields = sections.reduce((sum, s) => sum + (s.fields?.length || 0), 0);
  const answeredFields = Object.keys(responses).filter(k => {
    const v = responses[k];
    return v !== '' && v !== null && v !== undefined && v !== false && !(Array.isArray(v) && v.length === 0);
  }).length;
  const progress = totalFields > 0 ? Math.round((answeredFields / totalFields) * 100) : 0;

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* Top Bar */}
      <div className="flex items-center justify-between sticky top-0 bg-background z-10 py-3 border-b">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => {
            if (isDirty) {
              if (confirm('You have unsaved changes. Save before leaving?')) {
                performSave(false);
              }
            }
            onBack();
          }}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="font-semibold text-lg">{templateName}</h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">{instance?.status}</Badge>
              {instance?.completion_mode && (
                <Badge variant="secondary" className="text-[10px]">{instance.completion_mode}</Badge>
              )}
              {isLocked && (
                <Badge variant="destructive" className="text-[10px] gap-0.5">
                  <Lock className="h-2.5 w-2.5" /> Locked
                </Badge>
              )}
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
            disabled={isSaving || !isDirty || isLocked}
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Save Draft
          </Button>
          <Button
            size="sm"
            onClick={() => performSave(true)}
            disabled={isSaving || isLocked}
          >
            <Send className="h-4 w-4 mr-1" />
            Submit
          </Button>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3">
        <Progress value={progress} className="flex-1 h-2" />
        <span className="text-xs text-muted-foreground shrink-0">
          {answeredFields}/{totalFields} fields · {progress}%
        </span>
      </div>

      {/* Sections */}
      {sections.map((section) => {
        const isCollapsed = collapsedSections.has(section.id);
        const sectionFields = section.fields || [];
        const sectionAnswered = sectionFields.filter(f => {
          const v = responses[f.field_key];
          return v !== '' && v !== null && v !== undefined;
        }).length;

        return (
          <Card key={section.id}>
            <Collapsible open={!isCollapsed} onOpenChange={() => toggleSection(section.id)}>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 rounded-t-lg transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      {section.title}
                    </CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {sectionAnswered}/{sectionFields.length}
                    </Badge>
                  </div>
                  {section.description && (
                    <p className="text-xs text-muted-foreground text-left ml-6">{section.description}</p>
                  )}
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4 pt-0">
                  {sectionFields.map((field) => (
                    <FormFieldRenderer
                      key={field.id}
                      field={field}
                      value={responses[field.field_key]}
                      onChange={(val) => updateField(field.field_key, val)}
                      disabled={isLocked}
                    />
                  ))}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}

      {sections.length === 0 && !instanceLoading && (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No form sections configured for this template</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Field Renderer ─────────────────────────────────────────────

function FormFieldRenderer({
  field,
  value,
  onChange,
  disabled,
}: {
  field: any;
  value: any;
  onChange: (val: any) => void;
  disabled?: boolean;
}) {
  const options = (field.options_json || []) as { label: string; value: string }[];
  const fieldType = field.field_type;
  const hasProfileMapping = field.profile_mapping && Object.keys(field.profile_mapping).length > 0 && field.profile_mapping.domain;
  const hasAiMapping = field.ai_mapping && Object.keys(field.ai_mapping).length > 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Label className="text-sm">
          {field.field_label}
          {field.is_required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        {hasAiMapping && (
          <Badge variant="outline" className="text-[10px] h-4 px-1 gap-0.5">
            <Bot className="h-2.5 w-2.5" /> AI
          </Badge>
        )}
        {hasProfileMapping && (
          <Badge variant="outline" className="text-[10px] h-4 px-1 gap-0.5">
            <UserIcon className="h-2.5 w-2.5" /> {field.profile_mapping.domain}
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
          disabled={disabled}
        />
      )}

      {fieldType === 'textarea' && (
        <Textarea
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder || ''}
          rows={4}
          disabled={disabled}
        />
      )}

      {fieldType === 'number' && (
        <Input
          type="number"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder || ''}
          disabled={disabled}
        />
      )}

      {fieldType === 'date' && (
        <Input
          type="date"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
        />
      )}

      {fieldType === 'select' && (
        <Select value={value || ''} onValueChange={onChange} disabled={disabled}>
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
        <RadioGroup value={value || ''} onValueChange={onChange} disabled={disabled}>
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
            disabled={disabled}
          />
          <span className="text-sm">{field.placeholder || 'Yes'}</span>
        </div>
      )}

      {fieldType === 'yes_no' && (
        <RadioGroup value={value || ''} onValueChange={onChange} className="flex gap-4" disabled={disabled}>
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
                disabled={disabled}
              />
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
          {options.length === 0 && (
            <p className="text-xs text-muted-foreground">No options configured for this field</p>
          )}
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
              disabled={disabled}
            >
              {n}
            </Button>
          ))}
        </div>
      )}

      {fieldType === 'file' && (
        <Input type="file" onChange={e => onChange(e.target.files?.[0]?.name || '')} disabled={disabled} />
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
