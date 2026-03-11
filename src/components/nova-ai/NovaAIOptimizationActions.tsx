import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BrainCircuit, Zap, Loader2, Target, FileText, Stethoscope, BookOpen
} from 'lucide-react';

const db = supabase as any;

interface QuickAction {
  id: string;
  action_key: string;
  action_title: string;
  source_type: string;
  default_reasoning_mode: string;
  default_prompt_text: string;
  sort_order: number;
}

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  recommendation: <Zap className="w-3.5 h-3.5 text-yellow-600" />,
  goal_draft: <Target className="w-3.5 h-3.5 text-primary" />,
};

interface NovaAIOptimizationActionsProps {
  onLaunch: (action: QuickAction, contextText: string) => void;
  contextText?: string;
  compact?: boolean;
}

export function NovaAIOptimizationActions({ onLaunch, contextText, compact }: NovaAIOptimizationActionsProps) {
  const [actions, setActions] = useState<QuickAction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    db.from('v_nova_ai_optimization_quick_actions').select('*').order('sort_order').then(({ data }: any) => {
      setActions(data || []);
      setLoading(false);
    });
  }, []);

  if (loading || actions.length === 0) return null;

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {actions.map(a => (
          <Button
            key={a.id}
            variant="outline"
            size="sm"
            className="h-6 text-[10px] gap-1"
            onClick={() => onLaunch(a, contextText || a.default_prompt_text)}
          >
            {SOURCE_ICONS[a.source_type] || <BrainCircuit className="w-3 h-3" />}
            {a.action_title}
          </Button>
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <BrainCircuit className="w-4 h-4 text-primary" />
          Optimization Quick Actions
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{actions.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {actions.map(a => (
            <Card
              key={a.id}
              className="cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all group"
              onClick={() => onLaunch(a, contextText || a.default_prompt_text)}
            >
              <CardContent className="p-3 flex items-start gap-2.5">
                {SOURCE_ICONS[a.source_type] || <BrainCircuit className="w-3.5 h-3.5 text-primary mt-0.5" />}
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground">{a.action_title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{a.default_prompt_text}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
