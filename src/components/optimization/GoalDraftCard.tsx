import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import {
  BrainCircuit, Target, CheckCircle2, FileText, Stethoscope, ClipboardList,
  MoreHorizontal, Loader2, BookOpen, Save
} from 'lucide-react';
import { toast } from 'sonner';

const db = supabase as any;

export interface GoalDraft {
  id: string;
  student_id: string;
  domain?: string;
  draft_title?: string;
  goal_text?: string;
  benchmark_text?: string;
  support_text?: string;
  rationale?: string;
  status?: string;
  mode?: string;
  created_at?: string;
}

type WorkflowTarget = 'iep_prep' | 'programming' | 'reassessment' | 'nova_ai';

interface GoalDraftCardProps {
  draft: GoalDraft;
  surface: WorkflowTarget;
  onAction?: (action: string, draft: GoalDraft) => void;
  compact?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  under_review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  promoted: 'bg-primary/10 text-primary',
};

export function GoalDraftCard({ draft, surface, onAction, compact }: GoalDraftCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const handleNovaAI = (actionKey: string) => {
    const prompt = [
      draft.draft_title && `Goal: ${draft.draft_title}`,
      draft.goal_text && `Goal Text: ${draft.goal_text}`,
      draft.benchmark_text && `Benchmarks: ${draft.benchmark_text}`,
      draft.rationale && `Rationale: ${draft.rationale}`,
      draft.domain && `Domain: ${draft.domain}`,
    ].filter(Boolean).join('\n');

    const params = new URLSearchParams();
    params.set('prompt', prompt);
    params.set('context', `goal_draft_${actionKey}`);
    if (draft.student_id) params.set('clientId', draft.student_id);
    navigate(`/nova-ai?${params.toString()}`);
  };

  const handlePromote = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await db.from('goal_suggestion_drafts').update({ status: 'promoted' }).eq('id', draft.id);
      if (error) throw error;
      toast.success('Goal draft promoted');
      onAction?.('promoted', draft);
    } catch (e: any) {
      toast.error(e.message || 'Failed to promote');
    } finally {
      setSaving(false);
    }
  };

  const novaActions = surface === 'iep_prep'
    ? [
        { key: 'rewrite_school_goal', label: 'Rewrite as School Goal', icon: <FileText className="w-3.5 h-3.5" /> },
        { key: 'expand_goal_rationale', label: 'Expand Rationale', icon: <BookOpen className="w-3.5 h-3.5" /> },
        { key: 'parent_friendly_explanation', label: 'Parent-Friendly Version', icon: <BrainCircuit className="w-3.5 h-3.5" /> },
      ]
    : surface === 'programming'
    ? [
        { key: 'rewrite_clinical_goal', label: 'Rewrite as Clinical Goal', icon: <Stethoscope className="w-3.5 h-3.5" /> },
        { key: 'expand_goal_rationale', label: 'Expand Rationale', icon: <BookOpen className="w-3.5 h-3.5" /> },
      ]
    : [
        { key: 'rewrite_school_goal', label: 'Rewrite as School Goal', icon: <FileText className="w-3.5 h-3.5" /> },
        { key: 'rewrite_clinical_goal', label: 'Rewrite as Clinical Goal', icon: <Stethoscope className="w-3.5 h-3.5" /> },
        { key: 'expand_goal_rationale', label: 'Expand Rationale', icon: <BookOpen className="w-3.5 h-3.5" /> },
      ];

  const promoteLabel = surface === 'iep_prep' ? 'Add to IEP Section'
    : surface === 'programming' ? 'Send to Clinical Program'
    : surface === 'reassessment' ? 'Insert into Reassessment'
    : 'Promote';

  return (
    <Card className="hover:border-primary/30 transition-colors group">
      <CardContent className={compact ? 'p-3' : 'p-4'}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="text-xs font-semibold text-foreground truncate">{draft.draft_title || 'Untitled Draft'}</span>
              {draft.status && (
                <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${STATUS_COLORS[draft.status] || ''}`}>
                  {draft.status.replace(/_/g, ' ')}
                </Badge>
              )}
              {draft.domain && (
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{draft.domain}</Badge>
              )}
            </div>
            {draft.goal_text && (
              <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1">{draft.goal_text}</p>
            )}
            {draft.benchmark_text && (
              <p className="text-[10px] text-muted-foreground/70 line-clamp-1 mt-0.5">
                <span className="font-medium">Benchmark:</span> {draft.benchmark_text}
              </p>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" disabled={saving}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MoreHorizontal className="w-3.5 h-3.5" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-[10px] text-muted-foreground">Goal Draft Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={handlePromote} disabled={saving}>
                <CheckCircle2 className="w-3.5 h-3.5 mr-2" /> {promoteLabel}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] text-muted-foreground">Ask Nova AI</DropdownMenuLabel>
              {novaActions.map(a => (
                <DropdownMenuItem key={a.key} onClick={() => handleNovaAI(a.key)}>
                  {a.icon} <span className="ml-2 text-xs">{a.label}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onAction?.('save_draft', draft)}>
                <Save className="w-3.5 h-3.5 mr-2" /> Save as Draft
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
