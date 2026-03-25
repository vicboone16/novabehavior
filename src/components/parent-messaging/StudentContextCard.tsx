import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, TrendingUp, Lightbulb, Heart, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

interface Props {
  studentId: string;
  studentName: string;
}

export function StudentContextCard({ studentId, studentName }: Props) {
  const [context, setContext] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;
    Promise.all([
      db.from('v_beacon_student_reward_summary').select('*').eq('student_id', studentId).maybeSingle(),
      db.from('parent_insights').select('headline, insight_type, created_at').eq('student_id', studentId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      db.from('parent_actions').select('action_type').eq('student_id', studentId),
    ]).then(([rewardRes, insightRes, actionsRes]: any[]) => {
      setContext({
        rewards: rewardRes.data,
        lastInsight: insightRes.data,
        actionCount: (actionsRes.data || []).length,
      });
      setLoading(false);
    });
  }, [studentId]);

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const firstName = studentName.split(' ')[0];

  return (
    <div className="space-y-3 p-3">
      {/* Student header */}
      <div className="text-center">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
          <span className="text-lg font-bold text-primary">{firstName.charAt(0)}</span>
        </div>
        <h3 className="font-semibold text-sm text-foreground">{studentName}</h3>
      </div>

      {/* Points */}
      {context?.rewards && (
        <Card className="border-border/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <Star className="w-3.5 h-3.5 text-yellow-500" />
              <span className="text-xs font-medium text-foreground">Points</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-muted/50 rounded p-1.5">
                <p className="text-base font-bold text-foreground">{context.rewards.balance || 0}</p>
                <p className="text-[10px] text-muted-foreground">Balance</p>
              </div>
              <div className="bg-muted/50 rounded p-1.5">
                <p className="text-base font-bold text-foreground">{context.rewards.earned_today || 0}</p>
                <p className="text-[10px] text-muted-foreground">Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Last insight */}
      {context?.lastInsight && (
        <Card className="border-border/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-xs font-medium text-foreground">Last Insight</span>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">{context.lastInsight.headline}</p>
            <Badge variant="outline" className="mt-1.5 text-[9px] capitalize">{context.lastInsight.insight_type}</Badge>
          </CardContent>
        </Card>
      )}

      {/* Parent engagement */}
      <Card className="border-border/50">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <Heart className="w-3.5 h-3.5 text-pink-500" />
            <span className="text-xs font-medium text-foreground">Engagement</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {context?.actionCount > 0
              ? `${context.actionCount} parent action${context.actionCount !== 1 ? 's' : ''} recorded`
              : 'No parent engagement yet'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
