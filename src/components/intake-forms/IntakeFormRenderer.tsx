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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
  ArrowLeft, Save, Send, Loader2, CheckCircle, Clock, Bot, User as UserIcon,
  ChevronDown, ChevronRight, Lock, AlertCircle, Plus, Trash2, MapPin, ShieldCheck
} from 'lucide-react';
import { useIntakeFormsEngine, type FormTemplateSection, type FormTemplateField } from '@/hooks/useIntakeFormsEngine';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const isDirtyRef = useRef(false);
  const responsesRef = useRef(responses);

  useEffect(() => {
    isDirtyRef.current = isDirty;
    responsesRef.current = responses;
  }, [isDirty, responses]);

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

  useEffect(() => {
    if (!templateId) return;
    engine.loadTemplateSections(templateId).then(s => {
      setSections(s);
      if (s.length > 0 && !activeSection) setActiveSection(s[0].id);
    }).catch(console.error);
  }, [templateId, engine.loadTemplateSections]);

  useEffect(() => {
    if (!instanceId) return;
    engine.loadAnswers(instanceId).then(({ map }) => {
      setResponses(map);
    }).catch(console.error);
  }, [instanceId, engine.loadAnswers]);

  // Autosave interval – bulk save answers then call autosave RPC
  useEffect(() => {
    const interval = setInterval(() => {
      if (isDirtyRef.current) {
        performAutosave();
      }
    }, AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [instanceId, sections]);

  // Warn on unload
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  const performAutosave = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      // Bulk save all answers
      await engine.saveAllAnswers.mutateAsync({
        instanceId,
        answers: responsesRef.current,
      });
      // Create autosave version snapshot
      await engine.autosaveInstance.mutateAsync({ instanceId });
      setIsDirty(false);
      setLastSaved(new Date());
    } catch (err: any) {
      console.error('Autosave failed:', err);
    } finally {
      setIsSaving(false);
    }
  }, [instanceId, engine.saveAllAnswers, engine.autosaveInstance, isSaving]);

  const performSaveDraft = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await engine.saveAllAnswers.mutateAsync({
        instanceId,
        answers: responsesRef.current,
      });
      await engine.autosaveInstance.mutateAsync({ instanceId });
      setIsDirty(false);
      setLastSaved(new Date());
      toast.success('Draft saved');
    } catch (err: any) {
      toast.error('Save failed: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  }, [instanceId, engine.saveAllAnswers, engine.autosaveInstance, isSaving]);

  const performSubmit = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      // Save answers first
      await engine.saveAllAnswers.mutateAsync({
        instanceId,
        answers: responsesRef.current,
      });
      // Submit via RPC
      await engine.submitInstance.mutateAsync({ instanceId });
      setIsDirty(false);
      onBack();
    } catch (err: any) {
      toast.error('Submit failed: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  }, [instanceId, engine.saveAllAnswers, engine.submitInstance, isSaving, onBack]);

  const handleFinalize = async () => {
    setShowFinalizeDialog(false);
    try {
      if (isDirtyRef.current) {
        await engine.saveAllAnswers.mutateAsync({
          instanceId,
          answers: responsesRef.current,
        });
      }
      await engine.finalizeInstance.mutateAsync({ instanceId });
      onBack();
    } catch (err: any) {
      toast.error('Finalize failed: ' + err.message);
    }
  };

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
  const isSubmitted = instance?.status === 'submitted';
  const templateName = instance?.form_templates?.name || instance?.title_override || 'Form';
  const totalFields = sections.reduce((sum, s) => sum + (s.fields?.length || 0), 0);
  const answeredFields = Object.keys(responses).filter(k => {
    const v = responses[k];
    return v !== '' && v !== null && v !== undefined && v !== false && !(Array.isArray(v) && v.length === 0);
  }).length;
  const progress = totalFields > 0 ? Math.round((answeredFields / totalFields) * 100) : 0;

  const getSectionProgress = (section: FormTemplateSection) => {
    const fields = section.fields || [];
    const answered = fields.filter(f => {
      const v = responses[f.field_key];
      return v !== '' && v !== null && v !== undefined && v !== false && !(Array.isArray(v) && v.length === 0);
    }).length;
    return { answered, total: fields.length };
  };

  return (
    <div className="flex gap-4 max-w-5xl mx-auto">
      {/* Section Navigator */}
      <div className="w-56 shrink-0 hidden lg:block">
        <div className="sticky top-4 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Sections</p>
          <ScrollArea className="h-[calc(100vh-8rem)]">
            {sections.map((section) => {
              const prog = getSectionProgress(section);
              const isComplete = prog.answered === prog.total && prog.total > 0;
              return (
                <button
                  key={section.id}
                  onClick={() => {
                    setActiveSection(section.id);
                    setCollapsedSections(prev => { const n = new Set(prev); n.delete(section.id); return n; });
                    document.getElementById(`section-${section.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-md text-xs transition-colors flex items-center gap-2',
                    activeSection === section.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-muted-foreground'
                  )}
                >
                  {isComplete ? (
                    <CheckCircle className="h-3 w-3 text-emerald-500 shrink-0" />
                  ) : (
                    <span className="h-3 w-3 rounded-full border text-[8px] flex items-center justify-center shrink-0">
                      {prog.answered}
                    </span>
                  )}
                  <span className="truncate">{section.title}</span>
                </button>
              );
            })}
          </ScrollArea>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-4 min-w-0">
        {/* Top Bar */}
        <div className="flex items-center justify-between sticky top-0 bg-background z-10 py-3 border-b">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => {
              if (isDirty && confirm('You have unsaved changes. Save before leaving?')) {
                performSaveDraft();
              }
              onBack();
            }}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <h2 className="font-semibold text-lg truncate">{templateName}</h2>
              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                <StatusBadge status={instance?.status} />
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
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={performSaveDraft} disabled={isSaving || !isDirty || isLocked}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Save Draft
            </Button>
            {!isSubmitted && !isLocked && (
              <Button size="sm" onClick={performSubmit} disabled={isSaving}>
                <Send className="h-4 w-4 mr-1" /> Submit
              </Button>
            )}
            {isSubmitted && !isLocked && (
              <Button size="sm" variant="default" onClick={() => setShowFinalizeDialog(true)} disabled={isSaving}>
                <ShieldCheck className="h-4 w-4 mr-1" /> Finalize
              </Button>
            )}
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
          const prog = getSectionProgress(section);

          return (
            <Card key={section.id} id={`section-${section.id}`}>
              <Collapsible open={!isCollapsed} onOpenChange={() => toggleSection(section.id)}>
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 rounded-t-lg transition-colors">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        {section.title}
                      </CardTitle>
                      <Badge variant={prog.answered === prog.total && prog.total > 0 ? 'default' : 'outline'} className="text-xs">
                        {prog.answered}/{prog.total}
                      </Badge>
                    </div>
                    {section.description && (
                      <p className="text-xs text-muted-foreground text-left ml-6">{section.description}</p>
                    )}
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4 pt-0">
                    {(section.fields || []).map((field) => (
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

      {/* Finalize confirmation dialog */}
      <Dialog open={showFinalizeDialog} onOpenChange={setShowFinalizeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalize Form</DialogTitle>
            <DialogDescription>
              Finalizing will lock this form and prevent further edits. This action cannot be undone. Are you sure?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFinalizeDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleFinalize}>
              <Lock className="h-4 w-4 mr-1" /> Finalize & Lock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Status Badge ───────────────────────────────────────────────

function StatusBadge({ status }: { status?: string }) {
  const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    draft: { label: 'Draft', variant: 'outline' },
    in_progress: { label: 'In Progress', variant: 'secondary' },
    submitted: { label: 'Submitted', variant: 'default' },
    finalized: { label: 'Finalized', variant: 'default' },
    staff_review: { label: 'Needs Review', variant: 'destructive' },
  };
  const c = config[status || ''] || { label: status || 'Unknown', variant: 'outline' as const };
  return <Badge variant={c.variant} className="text-[10px]">{c.label}</Badge>;
}

// ─── Helpers ────────────────────────────────────────────────────

function normalizeOptions(raw: any): { label: string; value: string }[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw.map(opt => {
    if (typeof opt === 'string') return { label: opt, value: opt };
    if (opt && typeof opt === 'object' && 'label' in opt) return opt;
    return { label: String(opt), value: String(opt) };
  });
}

// ─── Field Renderer ─────────────────────────────────────────────

function FormFieldRenderer({
  field, value, onChange, disabled,
}: {
  field: FormTemplateField; value: any; onChange: (val: any) => void; disabled?: boolean;
}) {
  const options = normalizeOptions(field.options_json);
  const fieldType = field.field_type;
  const pm = field.profile_mapping as any;
  const hasProfileMapping = pm && pm.domain;
  const hasAiMapping = field.ai_mapping && Object.keys(field.ai_mapping).length > 0;
  const uiConfig = (field.ui_config || {}) as any;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        <Label className="text-sm">
          {field.field_label}
          {field.is_required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        {hasAiMapping && (
          <Badge variant="outline" className="text-[10px] h-4 px-1 gap-0.5 bg-violet-50 border-violet-200 text-violet-700">
            <Bot className="h-2.5 w-2.5" /> AI-extractable
          </Badge>
        )}
        {hasProfileMapping && (
          <Badge variant="outline" className="text-[10px] h-4 px-1 gap-0.5 bg-blue-50 border-blue-200 text-blue-700">
            <MapPin className="h-2.5 w-2.5" /> {pm.domain}
            {pm.mode === 'auto' && ' · auto'}
            {pm.mode === 'review' && ' · review'}
          </Badge>
        )}
      </div>
      {field.help_text && <p className="text-xs text-muted-foreground">{field.help_text}</p>}

      {(fieldType === 'text' || fieldType === 'email' || fieldType === 'phone') && (
        <Input
          type={fieldType === 'email' ? 'email' : fieldType === 'phone' ? 'tel' : 'text'}
          value={value || ''} onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder || ''} required={field.is_required} disabled={disabled}
        />
      )}

      {fieldType === 'textarea' && (
        <Textarea value={value || ''} onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder || ''} rows={4} disabled={disabled} />
      )}

      {fieldType === 'number' && (
        <Input type="number" value={value || ''} onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder || ''} disabled={disabled} />
      )}

      {fieldType === 'date' && (
        <Input type="date" value={value || ''} onChange={e => onChange(e.target.value)} disabled={disabled} />
      )}

      {fieldType === 'select' && (
        <Select value={value || ''} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger><SelectValue placeholder={field.placeholder || 'Select...'} /></SelectTrigger>
          <SelectContent>
            {options.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
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
          <Checkbox checked={!!value} onCheckedChange={checked => onChange(checked)} disabled={disabled} />
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
          {options.length === 0 && <p className="text-xs text-muted-foreground">No options configured</p>}
        </div>
      )}

      {fieldType === 'rating' && (
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(n => (
            <Button key={n} variant={value === n ? 'default' : 'outline'} size="sm" onClick={() => onChange(n)} className="w-9 h-9" disabled={disabled}>
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
        <RepeaterField columns={uiConfig.columns || []} value={value || []} onChange={onChange} disabled={disabled} />
      )}
    </div>
  );
}

// ─── Repeater Field ─────────────────────────────────────────────

function RepeaterField({ columns, value, onChange, disabled }: {
  columns: string[]; value: any[]; onChange: (val: any[]) => void; disabled?: boolean;
}) {
  const rows = Array.isArray(value) ? value : [];

  const addRow = () => {
    const emptyRow: Record<string, string> = {};
    columns.forEach(c => { emptyRow[c] = ''; });
    onChange([...rows, emptyRow]);
  };

  const updateRow = (idx: number, col: string, val: string) => {
    const updated = rows.map((r, i) => i === idx ? { ...r, [col]: val } : r);
    onChange(updated);
  };

  const removeRow = (idx: number) => onChange(rows.filter((_, i) => i !== idx));

  const formatColLabel = (col: string) => col.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  if (columns.length === 0) {
    return <p className="text-xs text-muted-foreground">No columns configured for repeater</p>;
  }

  return (
    <div className="space-y-2">
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              {columns.map(col => (
                <th key={col} className="text-left px-2 py-1.5 text-xs font-medium text-muted-foreground">{formatColLabel(col)}</th>
              ))}
              {!disabled && <th className="w-8" />}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={columns.length + 1} className="text-center py-4 text-xs text-muted-foreground">No entries yet</td></tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={idx} className="border-b last:border-b-0">
                  {columns.map(col => (
                    <td key={col} className="px-1 py-1">
                      <Input value={(row as any)[col] || ''} onChange={e => updateRow(idx, col, e.target.value)} className="h-8 text-xs" disabled={disabled} />
                    </td>
                  ))}
                  {!disabled && (
                    <td className="px-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeRow(idx)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {!disabled && (
        <Button variant="outline" size="sm" onClick={addRow} className="text-xs">
          <Plus className="h-3 w-3 mr-1" /> Add Row
        </Button>
      )}
    </div>
  );
}
