import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Zap, Star, AlertTriangle, Flame, Target,
  Plus, Minus as MinusIcon, Gift, FileText, Siren,
  Loader2, Monitor, TrendingUp, TrendingDown, Minus
} from 'lucide-react';
import { useStudentRewardSummary } from '@/hooks/useBeaconCoreData';
import { Button } from '@/components/ui/button';

interface Props {
  studentId: string;
  studentName: string;
}

export function TeacherPreviewPanel({ studentId, studentName }: Props) {
  const { summary: rewardSummary, loading } = useStudentRewardSummary(studentId);
  const firstName = studentName.split(' ')[0] || 'Student';

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const balance = rewardSummary?.balance ?? 0;
  const earnedToday = rewardSummary?.earned_today ?? 0;

  return (
    <div className="space-y-3">
      {/* Preview badge */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg border border-dashed border-border">
        <Monitor className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs text-muted-foreground font-medium">
          Teacher App Preview — Beacon classroom view for {firstName}
        </span>
        <Badge variant="outline" className="text-[10px] ml-auto">Read-Only</Badge>
      </div>

      {/* Student Snapshot Card */}
      <Card className="border-primary/20">
        <CardHeader className="py-3 px-5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              {firstName}
            </CardTitle>
            <Badge className="bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 text-xs">
              <Flame className="w-3 h-3 mr-1" />
              Active
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="py-0 pb-4 px-5 space-y-3">
          {/* Points & Streak */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-muted/50 rounded-lg p-2.5 text-center">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <Star className="w-3.5 h-3.5 text-yellow-500" />
              </div>
              <p className="text-lg font-bold text-foreground">{balance}</p>
              <p className="text-[10px] text-muted-foreground">Balance</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-2.5 text-center">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <p className="text-lg font-bold text-foreground">{earnedToday}</p>
              <p className="text-[10px] text-muted-foreground">Today</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-2.5 text-center">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <Flame className="w-3.5 h-3.5 text-orange-500" />
              </div>
              <p className="text-lg font-bold text-foreground">🔥🔥🔥</p>
              <p className="text-[10px] text-muted-foreground">Streak</p>
            </div>
          </div>

          {/* Behavior Risk */}
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">Current Risk: Escape</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Needs fast reinforcement. Use choices before demands.
            </p>
          </div>

          {/* Quick Action Bar */}
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" className="flex-1 h-9 text-xs gap-1" disabled>
              <Plus className="w-3.5 h-3.5 text-emerald-500" /> Points
            </Button>
            <Button variant="outline" size="sm" className="flex-1 h-9 text-xs gap-1" disabled>
              <MinusIcon className="w-3.5 h-3.5 text-destructive" /> Points
            </Button>
            <Button variant="outline" size="sm" className="flex-1 h-9 text-xs gap-1" disabled>
              <Gift className="w-3.5 h-3.5 text-pink-500" /> Reward
            </Button>
            <Button variant="outline" size="sm" className="flex-1 h-9 text-xs gap-1" disabled>
              <FileText className="w-3.5 h-3.5" /> Note
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Daily Quests */}
      <Card>
        <CardHeader className="py-3 px-5">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Daily Quests
          </CardTitle>
        </CardHeader>
        <CardContent className="py-0 pb-4 px-5 space-y-3">
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-foreground">Earn 20 points</span>
              <span className="text-xs text-muted-foreground">{Math.min(earnedToday, 20)}/20</span>
            </div>
            <Progress value={Math.min((earnedToday / 20) * 100, 100)} className="h-2" />
          </div>
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-foreground">No elopement for 30 mins</span>
              <span className="text-xs text-muted-foreground">In progress</span>
            </div>
            <Progress value={65} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Support Button */}
      <Card className="border-destructive/20">
        <CardContent className="py-4 px-5">
          <div className="flex items-center gap-2 mb-2">
            <Siren className="w-4 h-4 text-destructive" />
            <h4 className="font-semibold text-sm text-foreground">Support Levels</h4>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-xs flex-1 justify-center py-1.5 border-emerald-500/30 text-emerald-600">
              Level 1 — Redirect
            </Badge>
            <Badge variant="outline" className="text-xs flex-1 justify-center py-1.5 border-yellow-500/30 text-yellow-600">
              Level 2 — Support
            </Badge>
            <Badge variant="outline" className="text-xs flex-1 justify-center py-1.5 border-destructive/30 text-destructive">
              Level 3 — Crisis
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
