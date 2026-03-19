/**
 * Clinical data viewer — sessions, assessments, FBA/BIP, billing for the demo tenant.
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FileText, ClipboardCheck, Shield, CreditCard, Brain, ArrowRight } from 'lucide-react';
import { TOOLTIPS, EMPTY_STATES } from '@/lib/demoCopy';
import type { DemoSessionNote, DemoAssessment, DemoFbaBip, DemoBillingRecord } from '@/hooks/useDemoEcosystem';
import type { DemoLearner, DemoStaff } from '@/pages/DemoCenter';

const NOTE_TYPE_LABELS: Record<string, string> = {
  session: 'Session Note',
  narrative: 'Narrative Note',
  supervision: 'Supervision Note',
  teacher_summary: 'Teacher Summary',
  caregiver_summary: 'Caregiver Summary',
};

const NOTE_TYPE_COLORS: Record<string, string> = {
  session: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  narrative: 'bg-purple-500/15 text-purple-700 dark:text-purple-400',
  supervision: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  teacher_summary: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400',
  caregiver_summary: 'bg-pink-500/15 text-pink-700 dark:text-pink-400',
};

interface Props {
  sessionNotes: DemoSessionNote[];
  assessments: DemoAssessment[];
  fbaBips: DemoFbaBip[];
  billingRecords: DemoBillingRecord[];
  learners: DemoLearner[];
  staff: DemoStaff[];
}

export function DemoClinicalViewer({ sessionNotes, assessments, fbaBips, billingRecords, learners, staff }: Props) {
  const [tab, setTab] = useState('notes');
  const [learnerFilter, setLearnerFilter] = useState('all');

  const learnerMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of learners) m.set(l.id, l.learner_name);
    return m;
  }, [learners]);
  const staffMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of staff) m.set(s.id, s.display_name);
    return m;
  }, [staff]);

  const filterByLearner = <T extends { learner_id: string }>(items: T[]) =>
    learnerFilter === 'all' ? items : items.filter(i => i.learner_id === learnerFilter);

  const NOTE_TOOLTIPS: Record<string, string> = {
    session: TOOLTIPS.sessionNote,
    narrative: TOOLTIPS.narrativeNote,
    supervision: TOOLTIPS.supervisionNote,
    teacher_summary: TOOLTIPS.teacherSummary,
    caregiver_summary: TOOLTIPS.caregiverSummary,
  };

  return (
    <TooltipProvider delayDuration={200}>
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Select value={learnerFilter} onValueChange={setLearnerFilter}>
          <SelectTrigger className="w-[200px] h-8 text-xs">
            <SelectValue placeholder="All Learners" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Learners</SelectItem>
            {learners.map(l => (
              <SelectItem key={l.id} value={l.id}>{l.learner_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto p-1 flex flex-wrap gap-1">
          <TabsTrigger value="notes" className="text-xs gap-1"><FileText className="w-3 h-3" /> Notes ({filterByLearner(sessionNotes).length})</TabsTrigger>
          <TabsTrigger value="assessments" className="text-xs gap-1"><ClipboardCheck className="w-3 h-3" /> Assessments ({filterByLearner(assessments).length})</TabsTrigger>
          <TabsTrigger value="fba" className="text-xs gap-1"><Brain className="w-3 h-3" /> FBA/BIP ({filterByLearner(fbaBips).length})</TabsTrigger>
          <TabsTrigger value="billing" className="text-xs gap-1"><CreditCard className="w-3 h-3" /> Billing ({filterByLearner(billingRecords).length})</TabsTrigger>
        </TabsList>

        <TabsContent value="notes" className="mt-3 space-y-2 max-h-[400px] overflow-y-auto">
          {filterByLearner(sessionNotes).map(n => (
            <Card key={n.id}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-sm font-medium">{learnerMap.get(n.learner_id)}</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge className={`${NOTE_TYPE_COLORS[n.note_type]} text-[9px] cursor-help`}>
                        {NOTE_TYPE_LABELS[n.note_type] || n.note_type}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent><p className="text-xs max-w-[200px]">{NOTE_TOOLTIPS[n.note_type] || ''}</p></TooltipContent>
                  </Tooltip>
                  <span className="text-[10px] text-muted-foreground">{n.session_date}</span>
                  {n.cpt_code && <Badge variant="outline" className="text-[9px]">{n.cpt_code}</Badge>}
                  {n.duration_minutes && <span className="text-[10px] text-muted-foreground">{n.duration_minutes} min</span>}
                  {n.source_app && n.source_app !== 'clinician_entered' && (
                    <Badge variant="secondary" className="text-[9px]">from {n.source_app.replace(/_/g, ' ')}</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {staffMap.get(n.staff_id)} · {n.status}
                </p>
                {n.content?.narrative && <p className="text-xs mt-1 line-clamp-2">{n.content.narrative}</p>}
                {n.content?.summary && <p className="text-xs mt-1 line-clamp-2">{n.content.summary}</p>}
                {n.content?.notes && <p className="text-xs mt-1 line-clamp-2">{n.content.notes}</p>}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="assessments" className="mt-3 space-y-2 max-h-[400px] overflow-y-auto">
          {filterByLearner(assessments).map(a => (
            <Card key={a.id} className={a.status === 'pending' ? 'border-amber-300/30' : a.status === 'in_progress' ? 'border-blue-300/30' : ''}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-sm font-medium">{learnerMap.get(a.learner_id)}</span>
                  <Badge variant="outline" className="text-[9px]">{a.assessment_type}</Badge>
                  <Badge className={`text-[9px] ${a.status === 'completed' ? 'bg-emerald-500/15 text-emerald-700' : a.status === 'pending' ? 'bg-amber-500/15 text-amber-700' : 'bg-blue-500/15 text-blue-700'}`}>
                    {a.status}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">{a.assessment_date}</span>
                </div>
                {a.summary && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.summary}</p>}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="fba" className="mt-3 space-y-2 max-h-[400px] overflow-y-auto">
          {filterByLearner(fbaBips).map(f => (
            <Card key={f.id} className={f.status === 'in_progress' ? 'border-blue-300/30' : ''}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-sm font-medium">{learnerMap.get(f.learner_id)}</span>
                  <Badge variant="outline" className="text-[9px] uppercase">{f.document_type.replace('_', ' ')}</Badge>
                  <Badge className={`text-[9px] ${f.status === 'active' ? 'bg-emerald-500/15 text-emerald-700' : f.status === 'in_progress' ? 'bg-blue-500/15 text-blue-700' : 'bg-muted text-muted-foreground'}`}>
                    {f.status}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">{f.document_date}</span>
                </div>
                {f.linked_inputs && f.linked_inputs.length > 0 && (
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    {f.linked_inputs.map((li, i) => (
                      <Badge key={i} variant="secondary" className="text-[9px]">{li.replace(/_/g, ' ')}</Badge>
                    ))}
                  </div>
                )}
                {f.summary && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{f.summary}</p>}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="billing" className="mt-3 space-y-2 max-h-[400px] overflow-y-auto">
          {filterByLearner(billingRecords).map(b => (
            <Card key={b.id} className={b.status === 'denied' || b.status === 'rejected' ? 'border-destructive/30' : ''}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-sm font-medium">{learnerMap.get(b.learner_id)}</span>
                  <Badge variant="outline" className="text-[9px] uppercase">{b.record_type}</Badge>
                  <Badge className={`text-[9px] ${
                    b.status === 'active' || b.status === 'paid' || b.status === 'received' ? 'bg-emerald-500/15 text-emerald-700' :
                    b.status === 'denied' || b.status === 'rejected' ? 'bg-destructive text-destructive-foreground' :
                    'bg-amber-500/15 text-amber-700'
                  }`}>
                    {b.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{b.payer_name}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {b.cpt_code && <span>{b.cpt_code}</span>}
                  {b.units_authorized != null && <span>{b.units_used}/{b.units_authorized} units</span>}
                  {b.amount != null && b.amount > 0 && <span className="font-medium">${b.amount.toLocaleString()}</span>}
                  {b.expiry_date && <span>expires {b.expiry_date}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
    </TooltipProvider>
  );
}
