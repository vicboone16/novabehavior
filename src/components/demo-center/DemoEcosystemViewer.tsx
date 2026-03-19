/**
 * Cross-app ecosystem viewer — shows data flowing in from teacher/parent apps with source labels.
 */
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Globe, Laptop, Smartphone, Users, ArrowRight, Filter } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { DemoCrossAppInput } from '@/hooks/useDemoEcosystem';
import type { DemoLearner } from '@/pages/DemoCenter';

const SOURCE_LABELS: Record<string, { label: string; icon: typeof Globe; color: string }> = {
  teacher_mode_core: { label: 'Teacher Mode (Core)', icon: Laptop, color: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-300/30' },
  teacher_app: { label: 'Teacher App', icon: Laptop, color: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-300/30' },
  behavior_decoded_parent_app: { label: 'Behavior Decoded', icon: Smartphone, color: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-300/30' },
  caregiver_portal: { label: 'Caregiver Portal', icon: Users, color: 'bg-pink-500/15 text-pink-700 dark:text-pink-400 border-pink-300/30' },
  clinician_entered: { label: 'Clinician Entered', icon: Users, color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-300/30' },
};

const DOWNSTREAM_LABELS: Record<string, string> = {
  parent_training: '→ Parent Training',
  teacher_consult: '→ Teacher Consult',
  assessment_review: '→ Assessment Review',
  fba_bip: '→ FBA/BIP',
  recommendation: '→ Recommendation',
  alert_task: '→ Alert / Task',
};

interface Props {
  inputs: DemoCrossAppInput[];
  learners: DemoLearner[];
}

export function DemoEcosystemViewer({ inputs, learners }: Props) {
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [learnerFilter, setLearnerFilter] = useState<string>('all');

  const learnerMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of learners) m.set(l.id, l.learner_name);
    return m;
  }, [learners]);

  const filtered = useMemo(() => {
    let result = inputs;
    if (sourceFilter !== 'all') result = result.filter(i => i.source_app === sourceFilter);
    if (learnerFilter !== 'all') result = result.filter(i => i.learner_id === learnerFilter);
    return result;
  }, [inputs, sourceFilter, learnerFilter]);

  // Source distribution
  const sourceCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of inputs) m.set(i.source_app, (m.get(i.source_app) || 0) + 1);
    return m;
  }, [inputs]);

  return (
    <div className="space-y-4">
      {/* Source distribution cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(SOURCE_LABELS).map(([key, cfg]) => {
          const Icon = cfg.icon;
          const count = sourceCounts.get(key) || 0;
          return (
            <Card
              key={key}
              className={`cursor-pointer transition-colors ${sourceFilter === key ? 'border-primary ring-1 ring-primary/20' : 'hover:border-primary/30'}`}
              onClick={() => setSourceFilter(sourceFilter === key ? 'all' : key)}
            >
              <CardContent className="py-3 px-3">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[10px] font-medium truncate">{cfg.label}</span>
                </div>
                <p className="text-xl font-bold">{count}</p>
                <p className="text-[10px] text-muted-foreground">inputs</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-muted-foreground" />
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
        <Badge variant="outline" className="text-xs">{filtered.length} inputs</Badge>
      </div>

      {/* Input stream */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {filtered.map(input => {
          const src = SOURCE_LABELS[input.source_app] || SOURCE_LABELS.clinician_entered;
          const SrcIcon = src.icon;
          const data = input.input_data || {};
          return (
            <Card key={input.id} className="hover:border-primary/20 transition-colors">
              <CardContent className="py-3 px-4">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5">
                    <SrcIcon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-medium">
                        {learnerMap.get(input.learner_id) || 'Unknown'}
                      </span>
                      <Badge className={`${src.color} text-[9px] border`}>
                        {src.label}
                      </Badge>
                      <Badge variant="outline" className="text-[9px]">
                        {input.input_type.replace(/_/g, ' ')}
                      </Badge>
                      {input.downstream_use && (
                        <Badge variant="secondary" className="text-[9px] gap-0.5">
                          <ArrowRight className="w-2.5 h-2.5" />
                          {DOWNSTREAM_LABELS[input.downstream_use] || input.downstream_use}
                        </Badge>
                      )}
                    </div>
                    {/* Data preview */}
                    {data.behavior && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">{data.behavior}</span>
                        {data.antecedent && ` — antecedent: ${data.antecedent}`}
                        {data.context && ` — ${data.context}`}
                        {data.count != null && ` — count: ${data.count}`}
                        {data.duration_minutes != null && ` — ${data.duration_minutes} min`}
                      </p>
                    )}
                    {data.question && (
                      <p className="text-xs text-muted-foreground italic">"{data.question}"</p>
                    )}
                    {data.skill && (
                      <p className="text-xs text-muted-foreground">
                        Probe: {data.skill} — {data.correct}/{data.trials} correct
                      </p>
                    )}
                    {data.notes && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{data.notes}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                    {formatDistanceToNow(new Date(input.occurred_at), { addSuffix: true })}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No inputs match the current filters</p>
        )}
      </div>
    </div>
  );
}
