import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Sparkles, TrendingUp, TrendingDown, Minus, 
  Lightbulb, Home, Star, Gift, MessageSquare,
  BarChart3, Loader2, Heart, CheckCircle2
} from 'lucide-react';
import { useLatestParentInsight } from '@/hooks/useParentInsights';
import { useBehaviorTranslations } from '@/hooks/useBehaviorTranslation';
import { useStudentRewardSummary } from '@/hooks/useBeaconCoreData';

interface Props {
  studentId: string;
  studentName: string;
}

export function ParentPreviewPanel({ studentId, studentName }: Props) {
  const { insight, loading: insightLoading } = useLatestParentInsight(studentId);
  const { translate, translateFunction } = useBehaviorTranslations();
  const { summary: rewardSummary } = useStudentRewardSummary(studentId);

  const firstName = studentName.split(' ')[0] || 'Your child';

  if (insightLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Mock/preview data when no insights exist yet
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
      {/* Preview badge */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg border border-dashed border-border">
        <Heart className="w-3.5 h-3.5 text-pink-500" />
        <span className="text-xs text-muted-foreground font-medium">
          Parent App Preview — This is what {firstName}'s family would see
        </span>
        {!hasInsight && (
          <Badge variant="outline" className="text-[10px] ml-auto">Sample Data</Badge>
        )}
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
