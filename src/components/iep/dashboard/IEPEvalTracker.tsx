import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Eye, ChevronDown, ChevronUp, Calendar,
  CheckCircle2, Circle, ClipboardCheck, Trash2, Edit2, Save, X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDataStore } from '@/store/dataStore';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface EvalRecord {
  id: string;
  student_id: string;
  eval_type: string;
  consent_requested: boolean;
  consent_received: boolean;
  ap_consent_date: string | null;
  eval_due_date: string | null;
  school_site: string | null;
  classification: string | null;
  record_review: boolean;
  parent_input: boolean;
  teacher_input: boolean;
  teacher_forms_administered: boolean;
  parent_forms_administered: boolean;
  teacher_forms_collected: boolean;
  parent_forms_collected: boolean;
  forms_scored: boolean;
  report_drafted: boolean;
  report_finalized: boolean;
  iep_scheduled: boolean;
  present_at_iep: boolean;
  observation_1_completed: boolean;
  observation_1_date: string | null;
  observation_1_notes: string | null;
  observation_2_completed: boolean;
  observation_2_date: string | null;
  observation_2_notes: string | null;
  observation_3_completed: boolean;
  observation_3_date: string | null;
  observation_3_notes: string | null;
  observation_4_completed: boolean;
  observation_4_date: string | null;
  observation_4_notes: string | null;
  observation_5_completed: boolean;
  observation_5_date: string | null;
  observation_5_notes: string | null;
  iep_meeting_date: string | null;
  iep_meeting_notes: string | null;
  parent_meeting_date: string | null;
  parent_meeting_notes: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const EVAL_TYPES = [
  { value: 'FBA', label: 'FBA Only' },
  { value: 'Initial FBA', label: 'Initial FBA' },
  { value: 'FBA Re-evaluation', label: 'FBA Re-evaluation' },
  { value: 'Initial IEP', label: 'Initial IEP' },
  { value: 'IEP Re-evaluation', label: 'IEP Re-evaluation' },
  { value: 'Annual Review', label: 'Annual Review' },
  { value: 'Other', label: 'Other' },
];

const CHECKLIST_FIELDS = [
  { key: 'consent_requested', label: 'Consent Requested' },
  { key: 'consent_received', label: 'Consent Received' },
  { key: 'record_review', label: 'Record Review' },
  { key: 'parent_input', label: 'Parent Input' },
  { key: 'teacher_input', label: 'Teacher Input' },
  { key: 'teacher_forms_administered', label: 'Teacher Forms Administered' },
  { key: 'parent_forms_administered', label: 'Parent Forms Administered' },
  { key: 'teacher_forms_collected', label: 'Teacher Forms Collected' },
  { key: 'parent_forms_collected', label: 'Parent Forms Collected' },
  { key: 'forms_scored', label: 'Forms Scored & Interpreted' },
  { key: 'report_drafted', label: 'Report Drafted' },
  { key: 'report_finalized', label: 'Report Finalized' },
  { key: 'iep_scheduled', label: 'IEP Scheduled' },
  { key: 'present_at_iep', label: 'Present at IEP' },
] as const;

interface Props {
  onScheduleAppointment?: (data: { student_id: string; title: string; date: string; type: string; notes?: string }) => void;
}

export function IEPEvalTracker({ onScheduleAppointment }: Props) {
  const { user } = useAuth();
  const { students } = useDataStore();
  const [evals, setEvals] = useState<EvalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [observationCounts, setObservationCounts] = useState<Record<string, number>>({});
  const [newEval, setNewEval] = useState({
    student_id: '',
    eval_type: 'FBA',
    school_site: '',
    classification: '',
    ap_consent_date: '',
    eval_due_date: '',
    notes: '',
    num_observations: 2,
  });

  const fetchEvals = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('iep_evaluation_tracker')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setEvals((data as any[]) || []);
      // Set default observation counts
      const counts: Record<string, number> = {};
      (data || []).forEach((e: any) => {
        let c = 2; // default show 2
        if (e.observation_5_completed || e.observation_5_date) c = 5;
        else if (e.observation_4_completed || e.observation_4_date) c = 4;
        else if (e.observation_3_completed || e.observation_3_date) c = 3;
        counts[e.id] = c;
      });
      setObservationCounts(counts);
    } catch {
      toast.error('Failed to load evaluations');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchEvals(); }, [fetchEvals]);

  const handleAdd = async () => {
    if (!user || !newEval.student_id) return;
    try {
      const { error } = await supabase.from('iep_evaluation_tracker').insert({
        student_id: newEval.student_id,
        created_by: user.id,
        eval_type: newEval.eval_type,
        school_site: newEval.school_site || null,
        classification: newEval.classification || null,
        ap_consent_date: newEval.ap_consent_date || null,
        eval_due_date: newEval.eval_due_date || null,
        notes: newEval.notes || null,
      } as any);
      if (error) throw error;
      toast.success('Evaluation tracker created');
      setShowAddDialog(false);
      setNewEval({ student_id: '', eval_type: 'FBA', school_site: '', classification: '', ap_consent_date: '', eval_due_date: '', notes: '', num_observations: 2 });
      fetchEvals();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleToggleField = async (evalId: string, field: string, value: boolean) => {
    try {
      const { error } = await supabase
        .from('iep_evaluation_tracker')
        .update({ [field]: value, updated_at: new Date().toISOString() } as any)
        .eq('id', evalId);
      if (error) throw error;
      setEvals(prev => prev.map(e => e.id === evalId ? { ...e, [field]: value } : e));
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleUpdateField = async (evalId: string, field: string, value: any) => {
    try {
      const { error } = await supabase
        .from('iep_evaluation_tracker')
        .update({ [field]: value || null, updated_at: new Date().toISOString() } as any)
        .eq('id', evalId);
      if (error) throw error;
      setEvals(prev => prev.map(e => e.id === evalId ? { ...e, [field]: value } : e));
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (evalId: string) => {
    if (!confirm('Delete this evaluation tracker?')) return;
    try {
      const { error } = await supabase.from('iep_evaluation_tracker').delete().eq('id', evalId);
      if (error) throw error;
      toast.success('Deleted');
      fetchEvals();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleScheduleObservation = (evalRecord: EvalRecord, obsNum: number) => {
    const student = students.find(s => s.id === evalRecord.student_id);
    const obsDateField = `observation_${obsNum}_date` as keyof EvalRecord;
    const dateVal = evalRecord[obsDateField] as string | null;
    if (!dateVal) {
      toast.error('Set the observation date first');
      return;
    }
    onScheduleAppointment?.({
      student_id: evalRecord.student_id,
      title: `Observation #${obsNum} - ${student?.name || 'Student'}`,
      date: dateVal,
      type: 'observation',
      notes: `${evalRecord.eval_type} - Observation #${obsNum}`,
    });
    toast.success(`Observation #${obsNum} added to calendar`);
  };

  const handleScheduleIEPMeeting = (evalRecord: EvalRecord) => {
    const student = students.find(s => s.id === evalRecord.student_id);
    if (!evalRecord.iep_meeting_date) {
      toast.error('Set the IEP meeting date first');
      return;
    }
    onScheduleAppointment?.({
      student_id: evalRecord.student_id,
      title: `IEP Meeting - ${student?.name || 'Student'}`,
      date: evalRecord.iep_meeting_date,
      type: 'iep_meeting',
      notes: evalRecord.iep_meeting_notes || `${evalRecord.eval_type} IEP Meeting`,
    });
    toast.success('IEP meeting added to calendar');
  };

  const handleScheduleParentMeeting = (evalRecord: EvalRecord) => {
    const student = students.find(s => s.id === evalRecord.student_id);
    if (!evalRecord.parent_meeting_date) {
      toast.error('Set the parent meeting date first');
      return;
    }
    onScheduleAppointment?.({
      student_id: evalRecord.student_id,
      title: `Parent Meeting - ${student?.name || 'Student'}`,
      date: evalRecord.parent_meeting_date,
      type: 'parent_meeting',
      notes: evalRecord.parent_meeting_notes || 'Parent conference',
    });
    toast.success('Parent meeting added to calendar');
  };

  const getCompletionPct = (e: EvalRecord) => {
    const fields = CHECKLIST_FIELDS.map(f => f.key);
    const done = fields.filter(f => (e as any)[f] === true).length;
    return Math.round((done / fields.length) * 100);
  };

  const filteredEvals = evals.filter(e => {
    if (!searchQuery) return true;
    const student = students.find(s => s.id === e.student_id);
    return student?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.eval_type.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const addObservationSlot = (evalId: string) => {
    const current = observationCounts[evalId] || 2;
    if (current >= 5) return;
    setObservationCounts(prev => ({ ...prev, [evalId]: current + 1 }));
  };

  const removeObservationSlot = (evalId: string) => {
    const current = observationCounts[evalId] || 2;
    if (current <= 1) return;
    // Clear the removed observation data
    const obsNum = current;
    handleToggleField(evalId, `observation_${obsNum}_completed`, false);
    handleUpdateField(evalId, `observation_${obsNum}_date`, null);
    handleUpdateField(evalId, `observation_${obsNum}_notes`, null);
    setObservationCounts(prev => ({ ...prev, [evalId]: current - 1 }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search evaluations..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" /> New Evaluation</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>New Evaluation Tracker</DialogTitle>
              <DialogDescription>Create a new FBA/IEP evaluation tracker for a student.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Student</Label>
                <Select value={newEval.student_id} onValueChange={v => setNewEval(p => ({ ...p, student_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                  <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Evaluation Type</Label>
                <Select value={newEval.eval_type} onValueChange={v => setNewEval(p => ({ ...p, eval_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EVAL_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>School Site</Label><Input value={newEval.school_site} onChange={e => setNewEval(p => ({ ...p, school_site: e.target.value }))} /></div>
                <div><Label>Classification</Label><Input value={newEval.classification} onChange={e => setNewEval(p => ({ ...p, classification: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>AP Consent Date</Label><Input type="date" value={newEval.ap_consent_date} onChange={e => setNewEval(p => ({ ...p, ap_consent_date: e.target.value }))} /></div>
                <div><Label>Due Date</Label><Input type="date" value={newEval.eval_due_date} onChange={e => setNewEval(p => ({ ...p, eval_due_date: e.target.value }))} /></div>
              </div>
              <div><Label>Notes</Label><Textarea value={newEval.notes} onChange={e => setNewEval(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
              <Button onClick={handleAdd} className="w-full" disabled={!newEval.student_id}>Create Tracker</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {filteredEvals.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <ClipboardCheck className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No evaluations tracked yet</p>
            <p className="text-xs text-muted-foreground mt-1">Create a new evaluation to start tracking FBA/IEP progress</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredEvals.map(ev => {
            const student = students.find(s => s.id === ev.student_id);
            const pct = getCompletionPct(ev);
            const isExpanded = expandedId === ev.id;
            const numObs = observationCounts[ev.id] || 2;

            return (
              <Collapsible key={ev.id} open={isExpanded} onOpenChange={() => setExpandedId(isExpanded ? null : ev.id)}>
                <Card className="overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <CardContent className="p-4 cursor-pointer hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-xs font-semibold text-primary">{student?.name?.charAt(0) || '?'}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{student?.name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{ev.eval_type} {ev.school_site ? `• ${ev.school_site}` : ''}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {ev.eval_due_date && (
                            <span className="text-xs text-muted-foreground">Due: {new Date(ev.eval_due_date).toLocaleDateString()}</span>
                          )}
                          <Badge variant="outline" className={pct >= 100 ? 'text-emerald-600 border-emerald-300' : pct >= 50 ? 'text-amber-600 border-amber-300' : 'text-muted-foreground'}>
                            {pct}%
                          </Badge>
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-primary'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </CardContent>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="border-t px-4 py-4 space-y-4">
                      {/* Checklist grid */}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Evaluation Checklist</p>
                        <div className="grid grid-cols-2 gap-2">
                          {CHECKLIST_FIELDS.map(field => (
                            <label key={field.key} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/30 rounded p-1.5 transition-colors">
                              <Checkbox
                                checked={(ev as any)[field.key]}
                                onCheckedChange={v => handleToggleField(ev.id, field.key, v as boolean)}
                              />
                              <span className={(ev as any)[field.key] ? 'text-foreground' : 'text-muted-foreground'}>{field.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Observations */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Observations ({numObs}/5)</p>
                          <div className="flex gap-1">
                            {numObs < 5 && (
                              <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => addObservationSlot(ev.id)}>
                                <Plus className="w-3 h-3 mr-1" /> Add
                              </Button>
                            )}
                            {numObs > 1 && (
                              <Button size="sm" variant="ghost" className="h-6 text-xs px-2 text-destructive" onClick={() => removeObservationSlot(ev.id)}>
                                <X className="w-3 h-3 mr-1" /> Remove
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          {Array.from({ length: numObs }, (_, i) => i + 1).map(n => {
                            const completedKey = `observation_${n}_completed` as keyof EvalRecord;
                            const dateKey = `observation_${n}_date` as keyof EvalRecord;
                            const notesKey = `observation_${n}_notes` as keyof EvalRecord;
                            return (
                              <div key={n} className="flex items-start gap-2 p-2 rounded-lg border border-border/50 bg-muted/20">
                                <Checkbox
                                  checked={(ev as any)[completedKey]}
                                  onCheckedChange={v => handleToggleField(ev.id, completedKey, v as boolean)}
                                  className="mt-1"
                                />
                                <div className="flex-1 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium">Obs #{n}</span>
                                    <Input
                                      type="datetime-local"
                                      className="h-7 text-xs flex-1"
                                      value={(ev[dateKey] as string || '').slice(0, 16)}
                                      onChange={e => handleUpdateField(ev.id, dateKey, e.target.value ? new Date(e.target.value).toISOString() : null)}
                                    />
                                    {ev[dateKey] && onScheduleAppointment && (
                                      <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => handleScheduleObservation(ev, n)}>
                                        <Calendar className="w-3 h-3 mr-1" /> Cal
                                      </Button>
                                    )}
                                  </div>
                                  <Input
                                    placeholder="Observation notes..."
                                    className="h-7 text-xs"
                                    value={(ev[notesKey] as string) || ''}
                                    onChange={e => handleUpdateField(ev.id, notesKey, e.target.value)}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* IEP Meeting */}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">IEP Meeting</p>
                        <div className="flex items-center gap-2">
                          <Input
                            type="datetime-local"
                            className="h-8 text-xs flex-1"
                            value={(ev.iep_meeting_date || '').slice(0, 16)}
                            onChange={e => handleUpdateField(ev.id, 'iep_meeting_date', e.target.value ? new Date(e.target.value).toISOString() : null)}
                          />
                          {ev.iep_meeting_date && onScheduleAppointment && (
                            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleScheduleIEPMeeting(ev)}>
                              <Calendar className="w-3 h-3 mr-1" /> Add to Calendar
                            </Button>
                          )}
                        </div>
                        <Input
                          placeholder="Meeting notes..."
                          className="h-7 text-xs mt-1"
                          value={ev.iep_meeting_notes || ''}
                          onChange={e => handleUpdateField(ev.id, 'iep_meeting_notes', e.target.value)}
                        />
                      </div>

                      {/* Parent Meeting */}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Parent Meeting</p>
                        <div className="flex items-center gap-2">
                          <Input
                            type="datetime-local"
                            className="h-8 text-xs flex-1"
                            value={(ev.parent_meeting_date || '').slice(0, 16)}
                            onChange={e => handleUpdateField(ev.id, 'parent_meeting_date', e.target.value ? new Date(e.target.value).toISOString() : null)}
                          />
                          {ev.parent_meeting_date && onScheduleAppointment && (
                            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleScheduleParentMeeting(ev)}>
                              <Calendar className="w-3 h-3 mr-1" /> Add to Calendar
                            </Button>
                          )}
                        </div>
                        <Input
                          placeholder="Parent meeting notes..."
                          className="h-7 text-xs mt-1"
                          value={ev.parent_meeting_notes || ''}
                          onChange={e => handleUpdateField(ev.id, 'parent_meeting_notes', e.target.value)}
                        />
                      </div>

                      {/* Actions */}
                      <div className="flex justify-end pt-2 border-t">
                        <Button size="sm" variant="ghost" className="text-destructive text-xs" onClick={() => handleDelete(ev.id)}>
                          <Trash2 className="w-3 h-3 mr-1" /> Delete Tracker
                        </Button>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
}
