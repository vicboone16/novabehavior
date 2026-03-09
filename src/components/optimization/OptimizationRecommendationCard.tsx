import { useState } from 'react';
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Target, AlertTriangle, TrendingUp, ArrowRight,
  MoreHorizontal, FileText, ClipboardList, BrainCircuit,
  BookOpen, Stethoscope, Check, Loader2, Copy
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

export function OptimizationRecommendationCard({ rec, mode }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportTarget, setExportTarget] = useState('');
  const [draftTitle, setDraftTitle] = useState(rec.title);
  const [saving, setSaving] = useState(false);

  const severity = rec.severity || 'low';
  const domain = rec.domain || 'program';

  const handleExport = async (target: string, destinationKey?: string) => {
    if (!user) return;
    setSaving(true);
    try {
      await db.from('goal_optimization_exports').insert({
        run_id: rec.run_id,
        output_id: rec.id,
        export_target: target,
        destination_key: destinationKey || null,
        exported_text: [rec.title, rec.rationale, rec.recommended_action, rec.suggested_goal_text].filter(Boolean).join('\n\n'),
        context_json: { mode, domain: rec.domain, severity: rec.severity },
        created_by: user.id,
      });
      toast.success(`Sent to ${target.replace(/_/g, ' ')}`);
      setShowExportDialog(false);
    } catch (e) {
      console.error(e);
      toast.error('Export failed');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateDraft = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await db.from('goal_suggestion_drafts').insert({
        student_id: rec.student_id,
        run_id: rec.run_id,
        output_id: rec.id,
        draft_title: draftTitle || rec.title,
        draft_mode: mode === 'school' ? 'iep' : 'clinical',
        goal_text: rec.suggested_goal_text,
        benchmark_text: rec.suggested_benchmark_text,
        support_text: rec.suggested_support_text,
        domain: rec.domain,
        created_by: user.id,
      });
      toast.success('Goal draft created');
      setShowDraftDialog(false);
    } catch (e) {
      console.error(e);
      toast.error('Failed to create draft');
    } finally {
      setSaving(false);
    }
  };

  const handleAskNovaAI = () => {
    const prompt = `Analyze this optimization recommendation and provide clinical reasoning, implementation suggestions, and report-ready language:\n\nTitle: ${rec.title}\nDomain: ${rec.domain}\nRationale: ${rec.rationale}\nRecommended Action: ${rec.recommended_action}${rec.suggested_goal_text ? `\nSuggested Goal: ${rec.suggested_goal_text}` : ''}`;
    navigate(`/nova-ai?prompt=${encodeURIComponent(prompt)}&context=optimization`);
  };

  return (
    <>
      <Card className={`border ${SEVERITY_STYLES[severity]} transition-colors`}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {DOMAIN_ICONS[domain] || <Target className="w-3.5 h-3.5" />}
              <h4 className="text-sm font-semibold truncate">{rec.title}</h4>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Badge variant="outline" className="text-[10px] capitalize">{domain}</Badge>
              <Badge variant={severity === 'high' ? 'destructive' : 'secondary'} className="text-[10px] capitalize">{severity}</Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {mode === 'school' && (
                    <DropdownMenuItem onClick={() => handleExport('iep_prep')}>
                      <FileText className="w-3.5 h-3.5 mr-2" /> Send to IEP Prep
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => handleExport('reassessment')}>
                    <ClipboardList className="w-3.5 h-3.5 mr-2" /> Send to Reassessment
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('programming_dashboard')}>
                    <Stethoscope className="w-3.5 h-3.5 mr-2" /> Send to Programming
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleAskNovaAI}>
                    <BrainCircuit className="w-3.5 h-3.5 mr-2" /> Ask Nova AI
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowDraftDialog(true)}>
                    <Target className="w-3.5 h-3.5 mr-2" /> Convert to Goal Draft
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {rec.rationale && (
            <p className="text-xs text-muted-foreground">{rec.rationale}</p>
          )}

          {rec.recommended_action && (
            <div className="flex items-start gap-1.5">
              <ArrowRight className="w-3 h-3 mt-0.5 text-primary shrink-0" />
              <p className="text-xs font-medium">{rec.recommended_action}</p>
            </div>
          )}

          {rec.suggested_goal_text && (
            <div className="bg-background/60 rounded p-2">
              <p className="text-[10px] text-muted-foreground font-medium mb-0.5">Suggested Goal</p>
              <p className="text-xs">{rec.suggested_goal_text}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5 pt-1">
            {mode === 'school' && (
              <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1" onClick={() => handleExport('iep_prep')}>
                <FileText className="w-3 h-3" /> IEP Prep
              </Button>
            )}
            <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1" onClick={() => handleExport('reassessment')}>
              <ClipboardList className="w-3 h-3" /> Reassessment
            </Button>
            <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1" onClick={handleAskNovaAI}>
              <BrainCircuit className="w-3 h-3" /> Nova AI
            </Button>
            <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1" onClick={() => setShowDraftDialog(true)}>
              <Target className="w-3 h-3" /> Goal Draft
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
    </>
  );
}
