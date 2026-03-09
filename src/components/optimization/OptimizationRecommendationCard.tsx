import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  Tooltip, TooltipContent, TooltipTrigger, TooltipProvider
} from '@/components/ui/tooltip';
import {
  Target, AlertTriangle, TrendingUp, ArrowRight,
  MoreHorizontal, FileText, ClipboardList, BrainCircuit,
  BookOpen, Stethoscope, Loader2, History, CheckCircle2,
  PenSquare, Layers
} from 'lucide-react';
import { toast } from 'sonner';

const db = supabase as any;

interface Recommendation {
  id: string;
  run_id: string;
  title: string;
  domain: string | null;
  severity: string | null;
  rationale: string | null;
  recommendation_key: string | null;
  recommended_action: string | null;
  suggested_goal_text: string | null;
  suggested_benchmark_text: string | null;
  suggested_support_text: string | null;
  source_object_type: string | null;
  student_id: string | null;
}

interface Props {
  rec: Recommendation;
  mode: 'school' | 'clinical';
}

const SEVERITY_STYLES: Record<string, string> = {
  high: 'bg-destructive/10 text-destructive border-destructive/30',
  medium: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  low: 'bg-muted text-muted-foreground border-border',
};

const DOMAIN_ICONS: Record<string, React.ReactNode> = {
  skill: <Target className="w-3.5 h-3.5" />,
  behavior: <AlertTriangle className="w-3.5 h-3.5" />,
  caregiver: <BookOpen className="w-3.5 h-3.5" />,
  program: <TrendingUp className="w-3.5 h-3.5" />,
};

interface ExportRecord {
  export_id: string;
  export_target: string;
  created_at: string;
}

export function OptimizationRecommendationCard({ rec, mode }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [draftTitle, setDraftTitle] = useState(rec.title);
  const [saving, setSaving] = useState(false);
  const [exportHistory, setExportHistory] = useState<ExportRecord[]>([]);
  const [exportedTargets, setExportedTargets] = useState<Set<string>>(new Set());

  // Load export history for this recommendation
  useEffect(() => {
    db.from('v_goal_optimization_export_history')
      .select('export_id, export_target, created_at')
      .eq('output_id', rec.id)
      .order('created_at', { ascending: false })
      .then(({ data }: any) => {
        const records = (data || []) as ExportRecord[];
        setExportHistory(records);
        setExportedTargets(new Set(records.map(r => r.export_target)));
      });
  }, [rec.id]);

  const severity = rec.severity || 'low';
  const domain = rec.domain || 'program';

  const handleExportViaRPC = async (target: string) => {
    if (!user) return;
    setSaving(true);
    try {
      let rpcName = '';
      let params: any = {};

      switch (target) {
        case 'iep_prep':
          rpcName = 'export_optimization_to_iep_prep';
          params = { p_output_id: rec.id, p_run_id: rec.run_id, p_created_by: user.id };
          break;
        case 'reassessment':
          rpcName = 'export_optimization_to_reassessment';
          params = { p_output_id: rec.id, p_run_id: rec.run_id, p_created_by: user.id };
          break;
        case 'programming_dashboard':
          rpcName = 'export_optimization_to_programming_dashboard';
          params = { p_output_id: rec.id, p_run_id: rec.run_id, p_created_by: user.id };
          break;
        case 'nova_ai':
          rpcName = 'export_optimization_to_nova_ai';
          params = { p_output_id: rec.id, p_run_id: rec.run_id, p_created_by: user.id };
          break;
        default:
          // Fallback direct insert
          await db.from('goal_optimization_exports').insert({
            run_id: rec.run_id, output_id: rec.id, export_target: target,
            exported_text: [rec.title, rec.rationale, rec.recommended_action].filter(Boolean).join('\n\n'),
            context_json: { mode, domain: rec.domain, severity: rec.severity },
            created_by: user.id,
          });
          toast.success(`Sent to ${target.replace(/_/g, ' ')}`);
          setExportedTargets(prev => new Set([...prev, target]));
          setSaving(false);
          return;
      }

      const { error } = await db.rpc(rpcName, params);
      if (error) throw error;

      setExportedTargets(prev => new Set([...prev, target]));

      if (target === 'nova_ai') {
        const prompt = `Analyze this optimization recommendation and provide clinical reasoning, implementation suggestions, and report-ready language:\n\nTitle: ${rec.title}\nDomain: ${rec.domain}\nSeverity: ${rec.severity}\nRationale: ${rec.rationale}\nRecommended Action: ${rec.recommended_action}${rec.suggested_goal_text ? `\nSuggested Goal: ${rec.suggested_goal_text}` : ''}`;
        navigate(`/nova-ai?prompt=${encodeURIComponent(prompt)}&context=optimization`);
      } else {
        toast.success(`Sent to ${target.replace(/_/g, ' ')}`);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Export failed');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateDraft = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await db.rpc('export_optimization_to_goal_draft', {
        p_output_id: rec.id,
        p_run_id: rec.run_id,
        p_draft_title: draftTitle || rec.title,
        p_draft_mode: mode === 'school' ? 'iep' : 'clinical',
        p_created_by: user.id,
      });
      if (error) throw error;
      setExportedTargets(prev => new Set([...prev, 'suggested_goal_draft']));
      toast.success('Goal draft created');
      setShowDraftDialog(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Failed to create draft');
    } finally {
      setSaving(false);
    }
  };

  const handleAskNovaAI = () => handleExportViaRPC('nova_ai');

  const formatTarget = (t: string) => t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <TooltipProvider>
      <Card className={`border ${SEVERITY_STYLES[severity]} transition-colors`}>
        <CardContent className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {DOMAIN_ICONS[domain] || <Target className="w-3.5 h-3.5" />}
              <h4 className="text-sm font-semibold truncate">{rec.title}</h4>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Badge variant="outline" className="text-[10px] capitalize">{domain}</Badge>
              <Badge variant={severity === 'high' ? 'destructive' : 'secondary'} className="text-[10px] capitalize">{severity}</Badge>
              {exportedTargets.size > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-[10px] gap-0.5 cursor-pointer" onClick={() => setShowHistoryDialog(true)}>
                      <CheckCircle2 className="w-2.5 h-2.5" /> {exportedTargets.size}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent><p className="text-xs">Exported to {exportedTargets.size} workflow(s)</p></TooltipContent>
                </Tooltip>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  {mode === 'school' && (
                    <DropdownMenuItem onClick={() => handleExportViaRPC('iep_prep')} disabled={saving}>
                      <FileText className="w-3.5 h-3.5 mr-2" /> Send to IEP Prep
                      {exportedTargets.has('iep_prep') && <CheckCircle2 className="w-3 h-3 ml-auto text-primary" />}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => handleExportViaRPC('reassessment')} disabled={saving}>
                    <ClipboardList className="w-3.5 h-3.5 mr-2" /> Send to Reassessment
                    {exportedTargets.has('reassessment') && <CheckCircle2 className="w-3 h-3 ml-auto text-primary" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExportViaRPC('programming_dashboard')} disabled={saving}>
                    <Stethoscope className="w-3.5 h-3.5 mr-2" /> Send to Programming
                    {exportedTargets.has('programming_dashboard') && <CheckCircle2 className="w-3 h-3 ml-auto text-primary" />}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleAskNovaAI} disabled={saving}>
                    <BrainCircuit className="w-3.5 h-3.5 mr-2" /> Ask Nova AI
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowDraftDialog(true)} disabled={saving}>
                    <PenSquare className="w-3.5 h-3.5 mr-2" /> Convert to Goal Draft
                    {exportedTargets.has('suggested_goal_draft') && <CheckCircle2 className="w-3 h-3 ml-auto text-primary" />}
                  </DropdownMenuItem>
                  {exportHistory.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setShowHistoryDialog(true)}>
                        <History className="w-3.5 h-3.5 mr-2" /> Export History ({exportHistory.length})
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Rationale */}
          {rec.rationale && (
            <p className="text-xs text-muted-foreground leading-relaxed">{rec.rationale}</p>
          )}

          {/* Recommended action */}
          {rec.recommended_action && (
            <div className="flex items-start gap-1.5">
              <ArrowRight className="w-3 h-3 mt-0.5 text-primary shrink-0" />
              <p className="text-xs font-medium">{rec.recommended_action}</p>
            </div>
          )}

          {/* Suggested texts */}
          {rec.suggested_goal_text && (
            <div className="bg-background/60 rounded p-2">
              <p className="text-[10px] text-muted-foreground font-medium mb-0.5">Suggested Goal</p>
              <p className="text-xs">{rec.suggested_goal_text}</p>
            </div>
          )}
          {rec.suggested_benchmark_text && (
            <div className="bg-background/60 rounded p-2">
              <p className="text-[10px] text-muted-foreground font-medium mb-0.5">Suggested Benchmark</p>
              <p className="text-xs">{rec.suggested_benchmark_text}</p>
            </div>
          )}
          {rec.suggested_support_text && (
            <div className="bg-background/60 rounded p-2">
              <p className="text-[10px] text-muted-foreground font-medium mb-0.5">Suggested Support</p>
              <p className="text-xs">{rec.suggested_support_text}</p>
            </div>
          )}

          {/* Quick action buttons */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {mode === 'school' && (
              <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1" onClick={() => handleExportViaRPC('iep_prep')} disabled={saving}>
                <FileText className="w-3 h-3" /> IEP Prep
                {exportedTargets.has('iep_prep') && <CheckCircle2 className="w-2.5 h-2.5 text-primary" />}
              </Button>
            )}
            <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1" onClick={() => handleExportViaRPC('reassessment')} disabled={saving}>
              <ClipboardList className="w-3 h-3" /> Reassessment
              {exportedTargets.has('reassessment') && <CheckCircle2 className="w-2.5 h-2.5 text-primary" />}
            </Button>
            <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1" onClick={() => handleExportViaRPC('programming_dashboard')} disabled={saving}>
              <Layers className="w-3 h-3" /> Programming
              {exportedTargets.has('programming_dashboard') && <CheckCircle2 className="w-2.5 h-2.5 text-primary" />}
            </Button>
            <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1" onClick={handleAskNovaAI} disabled={saving}>
              <BrainCircuit className="w-3 h-3" /> Nova AI
            </Button>
            <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1" onClick={() => setShowDraftDialog(true)} disabled={saving}>
              <PenSquare className="w-3 h-3" /> Goal Draft
              {exportedTargets.has('suggested_goal_draft') && <CheckCircle2 className="w-2.5 h-2.5 text-primary" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Goal Draft Dialog */}
      <Dialog open={showDraftDialog} onOpenChange={setShowDraftDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Convert to Goal Draft</DialogTitle>
            <DialogDescription className="text-xs">Create a reusable goal draft from this recommendation.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Draft Title</Label>
              <Input value={draftTitle} onChange={e => setDraftTitle(e.target.value)} />
            </div>
            {rec.suggested_goal_text && (
              <div className="bg-muted/50 rounded p-2">
                <p className="text-[10px] text-muted-foreground font-medium mb-0.5">Goal Text</p>
                <p className="text-xs">{rec.suggested_goal_text}</p>
              </div>
            )}
            {rec.suggested_benchmark_text && (
              <div className="bg-muted/50 rounded p-2">
                <p className="text-[10px] text-muted-foreground font-medium mb-0.5">Benchmark</p>
                <p className="text-xs">{rec.suggested_benchmark_text}</p>
              </div>
            )}
            {rec.suggested_support_text && (
              <div className="bg-muted/50 rounded p-2">
                <p className="text-[10px] text-muted-foreground font-medium mb-0.5">Support</p>
                <p className="text-xs">{rec.suggested_support_text}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowDraftDialog(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreateDraft} disabled={saving}>
              {saving && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
              Create Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <History className="w-4 h-4" /> Export History
            </DialogTitle>
            <DialogDescription className="text-xs">Where this recommendation has been sent.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2 max-h-64 overflow-y-auto">
            {exportHistory.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No exports yet</p>
            ) : (
              exportHistory.map(h => (
                <div key={h.export_id} className="flex items-center justify-between p-2 rounded bg-muted/40">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-medium">{formatTarget(h.export_target)}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(h.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
