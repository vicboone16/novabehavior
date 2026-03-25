import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Sparkles, TrendingUp, TrendingDown, Minus, 
  Lightbulb, Home, Star, Gift, MessageSquare,
  BarChart3, Loader2, Heart, CheckCircle2, Wand2
} from 'lucide-react';
import { useLatestParentInsight } from '@/hooks/useParentInsights';
import { useBehaviorTranslations } from '@/hooks/useBehaviorTranslation';
import { useStudentRewardSummary } from '@/hooks/useBeaconCoreData';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Props {
  studentId: string;
  studentName: string;
  isAdmin?: boolean;
}

export function ParentPreviewPanel({ studentId, studentName, isAdmin }: Props) {
  const { insight, loading: insightLoading } = useLatestParentInsight(studentId);
  const { translate, translateFunction } = useBehaviorTranslations();
  const { summary: rewardSummary } = useStudentRewardSummary(studentId);
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);

  const firstName = studentName.split(' ')[0] || 'Your child';

  async function handleGenerate() {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-parent-insight', {
        body: { student_id: studentId },
      });
      if (error) throw error;
      toast({ title: 'Insight generated', description: `Status: draft — ready for review.` });
      // Force page reload to refresh the hook
      window.location.reload();
    } catch (err: any) {
      toast({ title: 'Generation failed', description: err.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  }

  if (insightLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasInsight = !!insight;
  const pointsEarned = insight?.points_earned ?? rewardSummary?.earned_today ?? 0;
  const headline = insight?.headline || `${firstName} had a productive day today!`;
  const behaviorSummary = insight?.behavior_summary || [];
  const whatThisMeans = insight?.what_this_means || `${firstName} is making progress with daily routines and learning to manage challenges with support.`;
  const whatYouCanDo = insight?.what_you_can_do || [
    'Give choices before tasks',
    'Use short, clear instructions',
    'Reinforce quickly after compliance',
  ];
  const teacherNote = insight?.teacher_note;

  return (
    <div className="space-y-3">
      {/* Preview badge + Generate button */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg border border-dashed border-border">
        <Heart className="w-3.5 h-3.5 text-pink-500" />
        <span className="text-xs text-muted-foreground font-medium">
          Parent App Preview — This is what {firstName}'s family would see
        </span>
        <div className="ml-auto flex items-center gap-2">
          {!hasInsight && (
            <Badge variant="outline" className="text-[10px]">Sample Data</Badge>
          )}
          {hasInsight && (
            <Badge 
              variant="outline" 
              className={`text-[10px] ${
                insight.status === 'published' ? 'border-emerald-500/50 text-emerald-600' :
                insight.status === 'reviewed' ? 'border-blue-500/50 text-blue-600' :
                'border-amber-500/50 text-amber-600'
              }`}
            >
              {insight.status}
            </Badge>
          )}
          {isAdmin && (
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[10px] gap-1"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Wand2 className="w-3 h-3" />
              )}
              Generate Today's Insight
            </Button>
          )}
        </div>
      </div>

      {/* Today's Progress */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="py-4 px-5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-foreground">Today's Progress</h3>
          </div>
          <p className="text-lg font-semibold text-foreground mb-1">{headline}</p>
          {pointsEarned > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Star className="w-4 h-4 text-yellow-500" />
              <span>{firstName} earned <strong className="text-foreground">{pointsEarned} points</strong> today</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Behavior Summary */}
      <Card>
        <CardHeader className="py-3 px-5">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Behavior Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="py-0 pb-4 px-5">
          {behaviorSummary.length > 0 ? (
            <div className="space-y-2">
              {behaviorSummary.map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{item.label || item.behavior}</span>
                  <div className="flex items-center gap-1">
                    {item.trend === 'improving' ? (
                      <><TrendingDown className="w-3.5 h-3.5 text-emerald-500" /><span className="text-emerald-600 text-xs">Improving</span></>
                    ) : item.trend === 'worsening' ? (
                      <><TrendingUp className="w-3.5 h-3.5 text-destructive" /><span className="text-destructive text-xs">Needs support</span></>
                    ) : (
                      <><Minus className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-muted-foreground text-xs">Stable</span></>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-foreground">Following directions</span>
                <span className="flex items-center gap-1 text-emerald-600 text-xs">
                  <TrendingDown className="w-3.5 h-3.5" /> Improving
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-foreground">Protesting</span>
                <span className="flex items-center gap-1 text-emerald-600 text-xs">
                  <TrendingDown className="w-3.5 h-3.5" /> Improving
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-foreground">Transitions</span>
                <span className="flex items-center gap-1 text-muted-foreground text-xs">
                  <Minus className="w-3.5 h-3.5" /> Stable
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* What This Means */}
      <Card className="border-blue-500/20">
        <CardContent className="py-4 px-5">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
            <div>
              <h4 className="font-semibold text-sm text-foreground mb-1">What This Means</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{whatThisMeans}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* What You Can Do */}
      <Card className="border-emerald-500/20">
        <CardContent className="py-4 px-5">
          <div className="flex items-start gap-3">
            <Home className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-sm text-foreground mb-2">What You Can Do at Home</h4>
              <ul className="space-y-1.5">
                {(whatYouCanDo as string[]).map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rewards */}
      {rewardSummary && (
        <Card>
          <CardContent className="py-4 px-5">
            <div className="flex items-center gap-2 mb-2">
              <Gift className="w-4 h-4 text-pink-500" />
              <h4 className="font-semibold text-sm text-foreground">Rewards</h4>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-muted/50 rounded-lg p-2.5 text-center">
                <p className="text-lg font-bold text-foreground">{rewardSummary.balance}</p>
                <p className="text-[11px] text-muted-foreground">Points Available</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-2.5 text-center">
                <p className="text-lg font-bold text-foreground">{rewardSummary.total_spent}</p>
                <p className="text-[11px] text-muted-foreground">Points Redeemed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Teacher Notes */}
      {teacherNote && (
        <Card className="border-amber-500/20">
          <CardContent className="py-4 px-5">
            <div className="flex items-start gap-3">
              <MessageSquare className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-semibold text-sm text-foreground mb-1">Teacher Notes</h4>
                <p className="text-sm text-muted-foreground italic">"{teacherNote}"</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
