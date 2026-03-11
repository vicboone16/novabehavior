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
  BrainCircuit, Zap, MoreHorizontal, Loader2, FileText, Stethoscope,
  ClipboardList, CheckCircle2, AlertTriangle, Info
} from 'lucide-react';
import { toast } from 'sonner';

const db = supabase as any;

export interface OptimizationRec {
  id: string;
  student_id?: string;
  client_id?: string;
  domain?: string;
  title?: string;
  rationale?: string;
  recommended_action?: string;
  suggested_goal_text?: string;
  suggested_benchmark_text?: string;
  suggested_support_text?: string;
  severity?: string;
}

type WorkflowTarget = 'iep_prep' | 'programming' | 'reassessment' | 'nova_ai';

interface Props {
  rec: OptimizationRec;
  surface: WorkflowTarget;
  onAction?: (action: string, rec: OptimizationRec) => void;
  compact?: boolean;
}

const SEVERITY_STYLES: Record<string, { icon: React.ReactNode; badge: string }> = {
  high: { icon: <AlertTriangle className="w-3 h-3 text-destructive" />, badge: 'bg-destructive/10 text-destructive border-destructive/20' },
  medium: { icon: <Zap className="w-3 h-3 text-yellow-600" />, badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  low: { icon: <Info className="w-3 h-3 text-muted-foreground" />, badge: 'bg-muted text-muted-foreground' },
};

export function OptimizationRecommendationMiniCard({ rec, surface, onAction, compact }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const sev = SEVERITY_STYLES[rec.severity || 'medium'] || SEVERITY_STYLES.medium;

  const handleNovaAI = (actionKey: string) => {
    const prompt = [
      rec.title && `Recommendation: ${rec.title}`,
      rec.rationale && `Rationale: ${rec.rationale}`,
      rec.recommended_action && `Action: ${rec.recommended_action}`,
      rec.domain && `Domain: ${rec.domain}`,
    ].filter(Boolean).join('\n');

    const params = new URLSearchParams();
    params.set('prompt', prompt);
    params.set('context', `optimization_${actionKey}`);
    if (rec.student_id) params.set('clientId', rec.student_id);
    navigate(`/nova-ai?${params.toString()}`);
  };

  const promoteLabel = surface === 'iep_prep' ? 'Add to IEP Section'
    : surface === 'programming' ? 'Send to Clinical Program'
    : surface === 'reassessment' ? 'Insert into Reassessment'
    : 'Review';

  return (
    <Card className="hover:border-primary/30 transition-colors group">
      <CardContent className={compact ? 'p-3' : 'p-4'}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              {sev.icon}
              <span className="text-xs font-semibold text-foreground truncate">{rec.title || 'Recommendation'}</span>
              {rec.severity && (
                <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${sev.badge}`}>
                  {rec.severity}
                </Badge>
              )}
              {rec.domain && (
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{rec.domain}</Badge>
              )}
            </div>
            {rec.rationale && (
              <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1">{rec.rationale}</p>
            )}
            {rec.recommended_action && (
              <p className="text-[10px] text-muted-foreground/70 line-clamp-1 mt-0.5">
                <span className="font-medium">Action:</span> {rec.recommended_action}
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
              <DropdownMenuLabel className="text-[10px] text-muted-foreground">Recommendation Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onAction?.('promote', rec)}>
                <CheckCircle2 className="w-3.5 h-3.5 mr-2" /> {promoteLabel}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] text-muted-foreground">Ask Nova AI</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleNovaAI('explain_recommendation')}>
                <BrainCircuit className="w-3.5 h-3.5 mr-2" /> Explain Recommendation
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleNovaAI('parent_friendly_explanation')}>
                <BrainCircuit className="w-3.5 h-3.5 mr-2" /> Parent-Friendly Explanation
              </DropdownMenuItem>
              {surface === 'iep_prep' && (
                <DropdownMenuItem onClick={() => handleNovaAI('rewrite_school_goal')}>
                  <FileText className="w-3.5 h-3.5 mr-2" /> Rewrite as School Goal
                </DropdownMenuItem>
              )}
              {surface === 'programming' && (
                <DropdownMenuItem onClick={() => handleNovaAI('rewrite_clinical_goal')}>
                  <Stethoscope className="w-3.5 h-3.5 mr-2" /> Rewrite as Clinical Goal
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
