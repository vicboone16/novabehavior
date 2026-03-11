import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BrainCircuit, CheckCircle2, Target, XCircle, Edit2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const db = supabase as any;

interface Props {
  goalDrafts: any[];
  studentId: string;
  onRefresh?: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  selected: 'bg-primary/10 text-primary',
  approved: 'bg-success/10 text-success',
  excluded: 'bg-destructive/10 text-destructive',
};

export function IEPGoalSuggestionsSection({ goalDrafts, studentId, onRefresh }: Props) {
  const navigate = useNavigate();

  const askNovaAI = (draft: any) => {
    const params = new URLSearchParams();
    params.set('prompt', `Review this goal draft for IEP: "${draft.draft_title}". Goal: ${draft.goal_text || 'N/A'}. Benchmark: ${draft.benchmark_text || 'N/A'}. Rationale: ${draft.rationale || 'N/A'}.`);
    params.set('clientId', studentId);
    params.set('context', 'iep_goal_suggestion');
    navigate(`/nova-ai?${params.toString()}`);
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await db.from('iep_meeting_goal_draft_items').update({ status }).eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success(`Goal ${status}`); onRefresh?.(); }
  };

  if (goalDrafts.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          No goal suggestions yet. Use "Pull Goal Drafts" to import suggestions.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {goalDrafts.map(d => (
        <Card key={d.id} className="hover:border-primary/20 transition-colors">
          <CardContent className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-xs font-semibold truncate">{d.draft_title || 'Goal Draft'}</span>
                  <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${STATUS_COLORS[d.status] || ''}`}>
                    {d.status?.replace(/_/g, ' ')}
                  </Badge>
                </div>
                {d.goal_text && <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1">{d.goal_text}</p>}
                {d.benchmark_text && (
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5"><span className="font-medium">Benchmark:</span> {d.benchmark_text}</p>
                )}
                {d.support_text && (
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5"><span className="font-medium">Support:</span> {d.support_text}</p>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => askNovaAI(d)}>
                  <BrainCircuit className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-success" onClick={() => updateStatus(d.id, 'approved')}>
                  <CheckCircle2 className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => updateStatus(d.id, 'excluded')}>
                  <XCircle className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
