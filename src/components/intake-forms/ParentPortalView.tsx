import { useState, useEffect, useRef, useCallback } from 'react';
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
import { Loader2, CheckCircle, Save, Send, PenTool } from 'lucide-react';
import { toast } from 'sonner';
import { SignaturePad } from '@/components/consent/SignaturePad';

interface Props {
  token: string;
}

interface FormInstanceData {
  id: string;
  status: string;
  form_templates: {
    name: string;
    require_signature_parent: boolean;
  } | null;
  template_id: string;
}

interface Section {
  id: string;
  section_key: string;
  title: string;
  description: string | null;
  display_order: number;
  fields: Field[];
}

interface Field {
  id: string;
  field_key: string;
  field_label: string;
  field_type: string;
  is_required: boolean;
  placeholder: string | null;
  help_text: string | null;
  options_json: any;
  display_order: number;
}

export function ParentPortalView({ token }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [instance, setInstance] = useState<FormInstanceData | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const responsesRef = useRef(responses);
  useEffect(() => { responsesRef.current = responses; }, [responses]);

  useEffect(() => {
    loadFormFromToken();
  }, [token]);

  const loadFormFromToken = async () => {
    try {
      const { data: link, error: linkErr } = await supabase
        .from('form_delivery_links')
        .select('form_instance_id, expires_at')
        .eq('token', token)
        .single();
      if (linkErr || !link) { setError('Invalid or expired link'); setLoading(false); return; }
      if (link.expires_at && new Date(link.expires_at) < new Date()) { setError('This link has expired'); setLoading(false); return; }

      await supabase.from('form_delivery_links').update({ delivery_status: 'opened', opened_at: new Date().toISOString() } as any).eq('token', token);

      const { data: inst } = await supabase
        .from('form_instances')
        .select('id, status, template_id, form_templates(name, require_signature_parent)')
        .eq('id', link.form_instance_id)
        .single();
      if (!inst) { setError('Form not found'); setLoading(false); return; }
      setInstance(inst as any);

      if (inst.status === 'submitted' || inst.status === 'finalized') {
        setIsSubmitted(true);
        setLoading(false);
        return;
      }

      const { data: secs } = await supabase
        .from('form_template_sections')
        .select('*, form_template_fields(*)')
        .eq('template_id', inst.template_id)
        .order('display_order');

      const formatted = (secs || []).map((s: any) => ({
        ...s,
        fields: (s.form_template_fields || []).sort((a: any, b: any) => a.display_order - b.display_order),
      }));
      setSections(formatted);

      const { data: answers } = await supabase
        .from('form_answers')
        .select('field_key, value_raw')
        .eq('form_instance_id', link.form_instance_id);
      const map: Record<string, any> = {};
      for (const a of (answers || [])) { map[(a as any).field_key] = (a as any).value_raw; }
      setResponses(map);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveDraft = useCallback(async () => {
    if (!instance || isSaving) return;
    setIsSaving(true);
    try {
      // Build answers array for bulk RPC
      const answersArray = Object.entries(responsesRef.current)
        .filter(([_, v]) => v !== undefined)
        .map(([fieldKey, value]) => ({
          field_key: fieldKey,
          value_raw: value,
          repeat_index: 0,
        }));

      if (answersArray.length > 0) {
        await supabase.rpc('save_form_answers_bulk', {
          p_form_instance_id: instance.id,
          p_answers: answersArray,
          p_source_type: 'parent_portal',
          p_ai_generated: false,
          p_manually_edited: true,
        });
      }

      // Create autosave snapshot
      await supabase.rpc('autosave_form_instance', {
        p_form_instance_id: instance.id,
      });

      toast.success('Progress saved! You can return later to finish.');
    } catch (err: any) {
      toast.error('Save failed: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  }, [instance, isSaving]);

  const handleSubmit = async () => {
    if (!instance) return;
    // Validate required fields
    const missing: string[] = [];
    for (const section of sections) {
      for (const field of section.fields) {
        if (field.is_required) {
          const v = responses[field.field_key];
          if (!v || v === '' || (Array.isArray(v) && v.length === 0)) {
            missing.push(field.field_label);
          }
        }
      }
    }
    if (missing.length > 0) {
      toast.error(`Please complete required fields: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? ` and ${missing.length - 3} more` : ''}`);
      return;
    }

    if (instance.form_templates?.require_signature_parent && !signatureData) {
      toast.error('Please provide your signature before submitting.');
      return;
    }

    setIsSaving(true);
    try {
      // Save answers via bulk RPC
      const answersArray = Object.entries(responsesRef.current)
        .filter(([_, v]) => v !== undefined)
        .map(([fieldKey, value]) => ({
          field_key: fieldKey,
          value_raw: value,
          repeat_index: 0,
        }));

      if (answersArray.length > 0) {
        await supabase.rpc('save_form_answers_bulk', {
          p_form_instance_id: instance.id,
          p_answers: answersArray,
          p_source_type: 'parent_portal',
          p_ai_generated: false,
          p_manually_edited: true,
        });
      }

      // Save signature if required
      if (signatureData) {
        await supabase.from('form_signatures').insert({
          form_instance_id: instance.id,
          signer_name: responses['completed_by_name'] || responses['guardian_1_name'] || 'Parent/Guardian',
          signer_role: 'parent',
          signature_data: { dataUrl: signatureData },
          signed_at: new Date().toISOString(),
        } as any);
      }

      // Submit via RPC
      await supabase.rpc('submit_form_instance', {
        p_form_instance_id: instance.id,
      });

      // Mark delivery link completed
      await supabase.from('form_delivery_links').update({
        delivery_status: 'completed',
        completed_at: new Date().toISOString(),
      } as any).eq('token', token);

      setIsSubmitted(true);
      toast.success('Form submitted successfully!');
    } catch (err: any) {
      toast.error('Submit failed: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full"><CardContent className="py-12 text-center">
          <p className="text-destructive font-medium">{error}</p>
          <p className="text-sm text-muted-foreground mt-2">Please contact the school if you believe this is an error.</p>
        </CardContent></Card>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full"><CardContent className="py-12 text-center">
          <CheckCircle className="h-12 w-12 mx-auto text-emerald-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Form Submitted</h2>
          <p className="text-sm text-muted-foreground">Thank you! Your responses have been recorded. You may close this window.</p>
        </CardContent></Card>
      </div>
    );
  }

  const totalFields = sections.reduce((s, sec) => s + sec.fields.length, 0);
  const answeredCount = Object.keys(responses).filter(k => {
    const v = responses[k];
    return v !== '' && v !== null && v !== undefined;
  }).length;
  const progressPct = totalFields > 0 ? Math.round((answeredCount / totalFields) * 100) : 0;
  const currentSec = sections[currentSection];
  const requiresSig = instance?.form_templates?.require_signature_parent;
  const isLastSection = currentSection === sections.length - 1;

  return (
    <div className="min-h-screen bg-muted/30 py-6 px-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{instance?.form_templates?.name || 'Intake Form'}</CardTitle>
            <p className="text-sm text-muted-foreground">
              Section {currentSection + 1} of {sections.length}
              {requiresSig ? ' (signature required)' : ''}
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-3">
              <Progress value={progressPct} className="flex-1 h-2" />
              <span className="text-xs text-muted-foreground">{progressPct}%</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-1 justify-center">
          {sections.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSection(idx)}
              className={`h-2 rounded-full transition-all ${idx === currentSection ? 'w-6 bg-primary' : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'}`}
            />
          ))}
        </div>

        {currentSec && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{currentSec.title}</CardTitle>
              {currentSec.description && <p className="text-xs text-muted-foreground">{currentSec.description}</p>}
            </CardHeader>
            <CardContent className="space-y-4">
              {currentSec.fields.map(field => (
                <ParentFieldRenderer
                  key={field.id}
                  field={field}
                  value={responses[field.field_key]}
                  onChange={val => setResponses(prev => ({ ...prev, [field.field_key]: val }))}
                />
              ))}
            </CardContent>
          </Card>
        )}

        {isLastSection && requiresSig && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <PenTool className="h-4 w-4" /> Signature
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">
                By signing below, I confirm the information provided is accurate to the best of my knowledge.
              </p>
              <SignaturePad onSignatureChange={setSignatureData} />
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => setCurrentSection(Math.max(0, currentSection - 1))} disabled={currentSection === 0}>
            Previous
          </Button>
          <Button variant="outline" onClick={saveDraft} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Save & Continue Later
          </Button>
          {isLastSection ? (
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
              Submit
            </Button>
          ) : (
            <Button onClick={() => setCurrentSection(Math.min(sections.length - 1, currentSection + 1))}>
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Parent Field Renderer (simplified) ─────────────────────────

function ParentFieldRenderer({ field, value, onChange }: {
  field: Field; value: any; onChange: (val: any) => void;
}) {
  const options = normalizeOptions(field.options_json);
  const t = field.field_type;

  return (
    <div className="space-y-1.5">
      <Label className="text-sm">
        {field.field_label}
        {field.is_required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {field.help_text && <p className="text-xs text-muted-foreground">{field.help_text}</p>}

      {(t === 'text' || t === 'email' || t === 'phone') && (
        <Input type={t === 'email' ? 'email' : t === 'phone' ? 'tel' : 'text'} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={field.placeholder || ''} />
      )}
      {t === 'textarea' && <Textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={3} />}
      {t === 'number' && <Input type="number" value={value || ''} onChange={e => onChange(e.target.value)} />}
      {t === 'date' && <Input type="date" value={value || ''} onChange={e => onChange(e.target.value)} />}
      {t === 'select' && (
        <Select value={value || ''} onValueChange={onChange}>
          <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
          <SelectContent>{options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
      )}
      {t === 'radio' && (
        <RadioGroup value={value || ''} onValueChange={onChange}>
          {options.map(o => (
            <div key={o.value} className="flex items-center gap-2">
              <RadioGroupItem value={o.value} id={`p-${field.id}-${o.value}`} />
              <Label htmlFor={`p-${field.id}-${o.value}`} className="text-sm font-normal">{o.label}</Label>
            </div>
          ))}
        </RadioGroup>
      )}
      {t === 'yes_no' && (
        <RadioGroup value={value || ''} onValueChange={onChange} className="flex gap-4">
          <div className="flex items-center gap-2"><RadioGroupItem value="yes" id={`p-${field.id}-y`} /><Label htmlFor={`p-${field.id}-y`} className="text-sm font-normal">Yes</Label></div>
          <div className="flex items-center gap-2"><RadioGroupItem value="no" id={`p-${field.id}-n`} /><Label htmlFor={`p-${field.id}-n`} className="text-sm font-normal">No</Label></div>
        </RadioGroup>
      )}
      {t === 'multiselect' && (
        <div className="space-y-2">
          {options.map(o => (
            <label key={o.value} className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={(value || []).includes(o.value)} onCheckedChange={checked => {
                const cur = value || [];
                onChange(checked ? [...cur, o.value] : cur.filter((v: string) => v !== o.value));
              }} />
              <span className="text-sm">{o.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function normalizeOptions(raw: any): { label: string; value: string }[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw.map(opt => {
    if (typeof opt === 'string') return { label: opt, value: opt };
    if (opt && typeof opt === 'object' && 'label' in opt) return opt;
    return { label: String(opt), value: String(opt) };
  });
}
