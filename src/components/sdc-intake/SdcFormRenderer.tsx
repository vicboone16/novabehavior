import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, Send, CheckCircle2, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { useSdcIntake, type FormDefinition, type FormResponse } from '@/hooks/useSdcIntake';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

interface Props {
  formInstanceId: string;
  formDefinition?: FormDefinition;
  studentName: string;
  onBack: () => void;
  /** Allow BCBA/admin to edit after submission */
  allowEditOverride?: boolean;
}

// Scoring categories for the prioritization form
const SCORE_SUFFIXES = [
  'danger_score', 'frequency_score', 'duration_score',
  'reinforcement_gain_score', 'importance_score',
  'reinforcement_for_others_score', 'change_likelihood_score',
];

function computeBehaviorTotals(responses: Record<string, any>): Record<string, number> {
  const totals: Record<string, number> = {};
  for (let i = 1; i <= 4; i++) {
    let sum = 0;
    for (const suffix of SCORE_SUFFIXES) {
      sum += Number(responses[`behavior_${i}_${suffix}`]) || 0;
    }
    totals[`behavior_${i}_total`] = sum;
  }
  return totals;
}

function suggestPriorityOrder(
  responses: Record<string, any>,
  totals: Record<string, number>,
): Record<string, string> {
  const items = [1, 2, 3, 4]
    .filter(i => (responses[`behavior_${i}_name`] || '').trim())
    .map(i => ({ idx: i, name: responses[`behavior_${i}_name`], total: totals[`behavior_${i}_total`] }))
    .sort((a, b) => b.total - a.total);

  const suggestion: Record<string, string> = {};
  items.forEach((item, rank) => {
    suggestion[`priority_${rank + 1}_behavior`] = item.name;
  });
  return suggestion;
}

export function SdcFormRenderer({ formInstanceId, formDefinition, studentName, onBack, allowEditOverride = true }: Props) {
  const intake = useSdcIntake();
  const [formDef, setFormDef] = useState<FormDefinition | null>(formDefinition || null);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [existingResponse, setExistingResponse] = useState<FormResponse | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [prioritySuggestionApplied, setPrioritySuggestionApplied] = useState(false);
  const autosaveTimer = useRef<NodeJS.Timeout | null>(null);

  const isPrioritizationForm = formDef?.slug === 'sdc_prioritizing_target_behaviors';
  const behaviorTotals = useMemo(() => isPrioritizationForm ? computeBehaviorTotals(responses) : {}, [responses, isPrioritizationForm]);

  // Fields are disabled when submitted AND not in edit-override mode
  const fieldsDisabled = isSubmitted && !isEditMode;

  useEffect(() => { loadFormData(); }, [formInstanceId]);

  // Auto-apply priority suggestion
  useEffect(() => {
    if (!isPrioritizationForm || prioritySuggestionApplied) return;
    const hasAnyBehavior = [1, 2, 3, 4].some(i => (responses[`behavior_${i}_name`] || '').trim());
    const hasAnyPriority = [1, 2, 3, 4].some(i => (responses[`priority_${i}_behavior`] || '').trim());
    if (hasAnyBehavior && !hasAnyPriority) {
      const suggestion = suggestPriorityOrder(responses, behaviorTotals);
      if (Object.keys(suggestion).length > 0) {
        setResponses(prev => ({ ...prev, ...suggestion }));
      }
    }
  }, [behaviorTotals, isPrioritizationForm]);

  const loadFormData = async () => {
    try {
      const resp = await intake.fetchFormResponse(formInstanceId);
      setExistingResponse(resp);
      if (resp?.response_json) setResponses(resp.response_json as Record<string, any>);
      if (resp?.is_final) setIsSubmitted(true);
      if (!formDefinition) {
        // Fetch the specific form definition for this instance
        const { data } = await (await import('@/integrations/supabase/client')).supabase
          .from('form_instances')
          .select('form_definition_id, form_definitions(*)')
          .eq('id', formInstanceId)
          .single();
        if (data?.form_definitions) {
          setFormDef(data.form_definitions as unknown as FormDefinition);
        }
      }
    } catch (err: any) {
      toast.error('Failed to load form: ' + err.message);
    }
  };

  const handleFieldChange = useCallback((key: string, value: any) => {
    setResponses(prev => {
      const next = { ...prev, [key]: value };
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      autosaveTimer.current = setTimeout(() => {
        const saveData = isPrioritizationForm ? { ...next, ...computeBehaviorTotals(next) } : next;
        intake.saveDraftResponse(formInstanceId, saveData).catch(() => {});
      }, 3000);
      return next;
    });
    if (key.startsWith('priority_') && key.endsWith('_behavior')) {
      setPrioritySuggestionApplied(true);
    }
  }, [formInstanceId, intake, isPrioritizationForm]);

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
      const saveData = isPrioritizationForm ? { ...responses, ...behaviorTotals } : responses;
      await intake.saveDraftResponse(formInstanceId, saveData);
    } catch (err: any) {
      toast.error('Failed to save: ' + err.message);
    } finally { setIsSaving(false); }
  };

  const handleApplyPrioritySuggestion = () => {
    const suggestion = suggestPriorityOrder(responses, behaviorTotals);
    setResponses(prev => ({ ...prev, ...suggestion }));
    setPrioritySuggestionApplied(true);
    toast.success('Priority order updated from scores');
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const submitData = isPrioritizationForm ? { ...responses, ...behaviorTotals } : responses;
      await intake.submitFinalResponse(
        formInstanceId,
        submitData,
        responses.teacher_or_respondent_name || responses.teacher_name || responses.completed_by,
        responses.respondent_role,
      );
      setIsSubmitted(true);
      setIsEditMode(false);
      setShowSubmitConfirm(false);
    } catch (err: any) {
      toast.error('Failed to submit: ' + err.message);
    } finally { setIsSubmitting(false); }
  };

  const handleEditOverrideSave = async () => {
    setIsSaving(true);
    try {
      const saveData = isPrioritizationForm ? { ...responses, ...behaviorTotals } : responses;
      await intake.submitFinalResponse(formInstanceId, saveData);
      setIsEditMode(false);
      toast.success('Edits saved');
    } catch (err: any) {
      toast.error('Failed to save edits: ' + err.message);
    } finally { setIsSaving(false); }
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

    switch (field.type) {
      case 'text':
        return (
          <div key={key} className="space-y-1">
            <Label className="text-sm">{field.label}{field.required && <span className="text-destructive"> *</span>}</Label>
            <Input value={val} onChange={e => handleFieldChange(key, e.target.value)} placeholder={field.placeholder || ''} disabled={fieldsDisabled} />
          </div>
        );
      case 'textarea':
        return (
          <div key={key} className="space-y-1">
            <Label className="text-sm">{field.label}{field.required && <span className="text-destructive"> *</span>}</Label>
            <Textarea value={val} onChange={e => handleFieldChange(key, e.target.value)} placeholder={field.placeholder || ''} disabled={fieldsDisabled} rows={3} />
          </div>
        );
      case 'date':
        return (
          <div key={key} className="space-y-1">
            <Label className="text-sm">{field.label}</Label>
            <Input type="date" value={val} onChange={e => handleFieldChange(key, e.target.value)} disabled={fieldsDisabled} />
          </div>
        );
      case 'select':
        return (
          <div key={key} className="space-y-1">
            <Label className="text-sm">{field.label}{field.required && <span className="text-destructive"> *</span>}</Label>
            <Select value={String(val)} onValueChange={v => handleFieldChange(key, v)} disabled={fieldsDisabled}>
              <SelectTrigger>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {(field.options || []).map((opt: any) => (
                  <SelectItem key={String(opt.value)} value={String(opt.value)}>{opt.label}</SelectItem>
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
                    <Checkbox checked={checked} onCheckedChange={() => handleMultiselectToggle(key, opt.value)} disabled={fieldsDisabled} />
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
            <RadioGroup value={val} onValueChange={v => handleFieldChange(key, v)} disabled={fieldsDisabled}>
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
            <div className="flex gap-1.5 flex-wrap">
              {(field.options || []).map((opt: any) => (
                <Button
                  key={String(opt.value)}
                  variant={String(val) === String(opt.value) ? 'default' : 'outline'}
                  size="sm" className="min-w-[36px]"
                  onClick={() => handleFieldChange(key, String(opt.value))}
                  disabled={fieldsDisabled}
                >{opt.label}</Button>
              ))}
            </div>
          </div>
        );
      case 'calculated_number':
        return (
          <div key={key} className="space-y-1">
            <Label className="text-sm">{field.label}</Label>
            <div className="flex items-center gap-2">
              <Input value={behaviorTotals[key] ?? responses[key] ?? 0} disabled className="w-24 font-semibold text-center bg-muted/50" />
              {key.match(/behavior_(\d+)_total/) && (
                <span className="text-xs text-muted-foreground">
                  {responses[`behavior_${key.match(/behavior_(\d+)_total/)?.[1]}_name`] || '—'}
                </span>
              )}
            </div>
          </div>
        );
      default:
        return (
          <div key={key} className="space-y-1">
            <Label className="text-sm">{field.label}</Label>
            <Input value={val} onChange={e => handleFieldChange(key, e.target.value)} disabled={fieldsDisabled} />
          </div>
        );
    }
  };

  // Custom scoring grid for prioritization form
  const renderScoringSection = (section: any) => {
    if (section.key !== 'scoring' || !isPrioritizationForm) return null;
    const behaviors = [1, 2, 3, 4];
    const categories = [
      { suffix: 'danger_score', label: 'Danger' },
      { suffix: 'frequency_score', label: 'Frequency' },
      { suffix: 'duration_score', label: 'Duration' },
      { suffix: 'reinforcement_gain_score', label: 'Reinforcement Gain' },
      { suffix: 'importance_score', label: 'Importance' },
      { suffix: 'reinforcement_for_others_score', label: 'Others Reinforcement' },
      { suffix: 'change_likelihood_score', label: 'Likelihood of Success' },
    ];

    return (
      <Card key={section.key}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{section.label}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-3 font-medium text-muted-foreground">Category</th>
                  {behaviors.map(i => (
                    <th key={i} className="text-center py-2 px-2 font-medium min-w-[100px]">
                      {responses[`behavior_${i}_name`] || `Behavior ${i}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categories.map(cat => (
                  <tr key={cat.suffix} className="border-b border-border/50">
                    <td className="py-2 pr-3 text-xs text-muted-foreground">{cat.label}</td>
                    {behaviors.map(i => {
                      const fieldKey = `behavior_${i}_${cat.suffix}`;
                      const field = section.fields.find((f: any) => f.key === fieldKey);
                      const val = responses[fieldKey] ?? '';
                      return (
                        <td key={i} className="text-center py-1.5 px-1">
                          <div className="flex gap-0.5 justify-center">
                            {(field?.options || []).map((opt: any) => (
                              <Button
                                key={String(opt.value)}
                                variant={String(val) === String(opt.value) ? 'default' : 'outline'}
                                size="sm" className="h-7 w-7 p-0 text-xs"
                                onClick={() => handleFieldChange(fieldKey, String(opt.value))}
                                disabled={fieldsDisabled}
                              >{opt.label}</Button>
                            ))}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="border-t-2 border-primary/30 font-semibold">
                  <td className="py-2 pr-3 text-xs">TOTAL</td>
                  {behaviors.map(i => (
                    <td key={i} className="text-center py-2">
                      <Badge variant="secondary" className="text-sm font-bold min-w-[32px]">
                        {behaviorTotals[`behavior_${i}_total`] ?? 0}
                      </Badge>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderPrioritySection = (section: any) => {
    if (section.key !== 'priority_order' || !isPrioritizationForm) return null;
    return (
      <Card key={section.key}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{section.label}</CardTitle>
            {!fieldsDisabled && (
              <Button variant="outline" size="sm" onClick={handleApplyPrioritySuggestion}>
                Auto-Rank from Scores
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[1, 2, 3, 4].map(i => {
              const name = responses[`behavior_${i}_name`];
              if (!name) return null;
              return (
                <div key={i} className="text-center p-2 rounded-lg border bg-muted/30">
                  <p className="text-xs text-muted-foreground truncate">{name}</p>
                  <p className="text-lg font-bold">{behaviorTotals[`behavior_${i}_total`] ?? 0}</p>
                </div>
              );
            })}
          </div>
          {section.fields
            .filter((f: any) => f.key.startsWith('priority_'))
            .map((field: any) => (
              <div key={field.key} className="space-y-1">
                <Label className="text-sm font-medium">{field.label}</Label>
                <Input
                  value={responses[field.key] ?? ''}
                  onChange={e => handleFieldChange(field.key, e.target.value)}
                  disabled={fieldsDisabled}
                  placeholder="Enter behavior name..."
                />
              </div>
            ))}
        </CardContent>
      </Card>
    );
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
          {isSubmitted && !isEditMode && (
            <>
              <Badge className="bg-green-500/15 text-green-700 border-green-200">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Submitted
              </Badge>
              {allowEditOverride && (
                <Button variant="outline" size="sm" onClick={() => setIsEditMode(true)}>
                  <Edit2 className="w-3 h-3 mr-1" />
                  Edit
                </Button>
              )}
            </>
          )}
          {isSubmitted && isEditMode && (
            <>
              <Badge variant="outline" className="text-xs">Editing</Badge>
              <Button variant="outline" size="sm" onClick={() => setIsEditMode(false)}>Cancel</Button>
              <Button size="sm" onClick={handleEditOverrideSave} disabled={isSaving}>
                <Save className="w-3 h-3 mr-1" />
                {isSaving ? 'Saving...' : 'Save Edits'}
              </Button>
            </>
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
          <p className="text-sm text-muted-foreground">
            Complete this questionnaire to document staff observations, behavior patterns, triggers, and related supports.
          </p>
          <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
            <span>Student: {studentName}</span>
            {existingResponse && <span>Status: {isSubmitted ? 'Submitted' : 'Draft'}</span>}
          </div>
        </CardHeader>
      </Card>

      {/* Sections */}
      {sections.map((section: any) => {
        if (isPrioritizationForm && section.key === 'scoring') return renderScoringSection(section);
        if (isPrioritizationForm && section.key === 'priority_order') return renderPrioritySection(section);

        return (
          <Card key={section.key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{section.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(section.fields || []).map((field: any) => renderField(field))}
            </CardContent>
          </Card>
        );
      })}

      {/* Submit confirmation */}
      <Dialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit this form as final?</DialogTitle>
            <DialogDescription>
              You can still allow admin edits later, but this will mark the form as submitted.
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
