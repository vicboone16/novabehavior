import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  History, Play, GitCompareArrows, FileText, Loader2, Star, CheckCircle2,
} from 'lucide-react';

const db = supabase as any;

interface Props {
  studentId: string;
  onGenerateReport?: (sessionId: string) => void;
}

function useSessionHistory(studentId: string) {
  return useQuery({
    queryKey: ['bops-session-history', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await db
        .from('v_student_bops_session_history')
        .select('*')
        .eq('student_id', studentId)
        .order('assessment_date', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}

function useSetActiveSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, sessionId }: { studentId: string; sessionId: string }) => {
      const { error } = await db.rpc('set_active_bops_session', {
        p_student_id: studentId,
        p_session_id: sessionId,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['bops-session-history', vars.studentId] });
      qc.invalidateQueries({ queryKey: ['bops-intelligence-dashboard', vars.studentId] });
      qc.invalidateQueries({ queryKey: ['bops-engine-roster'] });
      toast.success('Active session updated');
    },
    onError: (e: any) => toast.error('Failed: ' + e.message),
  });
}

function useCompareSessions() {
  return useMutation({
    mutationFn: async ({ session1, session2 }: { session1: string; session2: string }) => {
      const { data, error } = await db.rpc('compare_bops_sessions', {
        p_session_1: session1,
        p_session_2: session2,
      });
      if (error) throw error;
      return data;
    },
    onError: (e: any) => toast.error('Comparison failed: ' + e.message),
  });
}

const entryModeLabel: Record<string, string> = {
  full_assessment: 'Full Assessment',
  manual_scores: 'Manual Entry',
};

export function BopsSessionHistory({ studentId, onGenerateReport }: Props) {
  const { data: sessions, isLoading } = useSessionHistory(studentId);
  const setActive = useSetActiveSession();
  const compare = useCompareSessions();

  const [compareBase, setCompareBase] = useState<string | null>(null);
  const [compareResult, setCompareResult] = useState<any>(null);
  const [showCompare, setShowCompare] = useState(false);

  const handleCompareSelect = (targetId: string) => {
    if (!compareBase) return;
    compare.mutate(
      { session1: compareBase, session2: targetId },
      {
        onSuccess: (data) => {
          setCompareResult(data);
          setShowCompare(true);
          setCompareBase(null);
        },
      },
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!sessions || sessions.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="w-4 h-4" /> BOPS Session History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No BOPS sessions recorded yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="w-4 h-4" /> BOPS Session History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[400px]">
            <div className="divide-y divide-border">
              {sessions.map((s: any) => {
                const isActive = !!s.is_active_session;
                const isCompareBase = compareBase === s.session_id;

                return (
                  <div
                    key={s.session_id}
                    className={`px-4 py-3 space-y-2 ${isActive ? 'bg-primary/5' : ''}`}
                  >
                    {/* Row 1: date + badges */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium text-foreground">
                          {s.assessment_date
                            ? format(new Date(s.assessment_date + 'T00:00:00'), 'MMM d, yyyy')
                            : '—'}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {entryModeLabel[s.entry_mode] || s.entry_mode || 'Assessment'}
                        </Badge>
                        <Badge
                          variant={s.status === 'completed' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {(s.status || 'unknown').replace(/_/g, ' ')}
                        </Badge>
                        {isActive && (
                          <Badge className="text-xs bg-primary text-primary-foreground gap-1">
                            <Star className="w-3 h-3" /> Active
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Row 2: names */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      {s.calculated_training_name && (
                        <div>
                          <span className="text-muted-foreground">Training: </span>
                          <span className="font-medium text-foreground">{s.calculated_training_name}</span>
                        </div>
                      )}
                      {s.calculated_clinical_name && (
                        <div>
                          <span className="text-muted-foreground">Clinical: </span>
                          <span className="font-medium text-foreground">{s.calculated_clinical_name}</span>
                        </div>
                      )}
                      {s.source_note && (
                        <div className="col-span-2 italic text-muted-foreground">
                          "{s.source_note}"
                        </div>
                      )}
                    </div>

                    {/* Row 3: actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {!isActive && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          disabled={setActive.isPending}
                          onClick={() => setActive.mutate({ studentId, sessionId: s.session_id })}
                        >
                          <CheckCircle2 className="w-3 h-3" /> Set Active
                        </Button>
                      )}
                      {compareBase && compareBase !== s.session_id ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          disabled={compare.isPending}
                          onClick={() => handleCompareSelect(s.session_id)}
                        >
                          {compare.isPending ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <GitCompareArrows className="w-3 h-3" />
                          )}
                          Compare with this
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant={isCompareBase ? 'default' : 'outline'}
                          className="h-7 text-xs gap-1"
                          onClick={() => setCompareBase(isCompareBase ? null : s.session_id)}
                        >
                          <GitCompareArrows className="w-3 h-3" />
                          {isCompareBase ? 'Cancel Compare' : 'Compare'}
                        </Button>
                      )}
                      {onGenerateReport && s.status === 'completed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          onClick={() => onGenerateReport(s.session_id)}
                        >
                          <FileText className="w-3 h-3" /> Generate Report
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Compare Results Dialog */}
      <Dialog open={showCompare} onOpenChange={setShowCompare}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitCompareArrows className="w-5 h-5 text-primary" />
              Session Comparison
            </DialogTitle>
            <DialogDescription>
              Side-by-side comparison of two BOPS sessions.
            </DialogDescription>
          </DialogHeader>
          {compareResult ? (
            <ComparisonView data={compareResult} />
          ) : (
            <p className="text-sm text-muted-foreground py-4">No comparison data.</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ComparisonView({ data }: { data: any }) {
  if (!data) return null;

  // The RPC may return a JSON object or array — handle both
  const items: any[] = Array.isArray(data) ? data : typeof data === 'object' ? Object.entries(data).map(([k, v]) => ({ key: k, ...(typeof v === 'object' && v !== null ? v : { value: v }) })) : [];

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No differences found or comparison returned empty.</p>;
  }

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="grid grid-cols-3 gap-2 text-sm border-b border-border pb-2">
          <span className="font-medium text-foreground capitalize">
            {(item.key || item.domain || `Item ${i + 1}`).replace(/_/g, ' ')}
          </span>
          <span className="text-muted-foreground text-center">
            {item.session_1_value ?? item.value_1 ?? item.value ?? '—'}
          </span>
          <span className="text-muted-foreground text-center">
            {item.session_2_value ?? item.value_2 ?? '—'}
          </span>
        </div>
      ))}
    </div>
  );
}
