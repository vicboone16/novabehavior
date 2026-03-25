import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Star, Trophy, Sparkles, Zap, Users, CheckCircle2 } from 'lucide-react';

const TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  daily: { icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  weekly: { icon: Star, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  challenge: { icon: Trophy, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  social: { icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
};

interface Quest {
  id: string;
  quest_type: string;
  title: string;
  description?: string;
  goal_value: number;
  progress_value: number;
  reward_points: number;
  reward_type: string;
  is_completed: boolean;
}

export function QuestCard({ quest }: { quest: Quest }) {
  const cfg = TYPE_CONFIG[quest.quest_type] || TYPE_CONFIG.daily;
  const Icon = cfg.icon;
  const pct = Math.min(100, Math.round((quest.progress_value / Math.max(1, quest.goal_value)) * 100));

  return (
    <Card className={`transition-all ${quest.is_completed ? 'opacity-75 border-emerald-500/30' : 'hover:shadow-md'}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${cfg.bg}`}>
            {quest.is_completed ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            ) : (
              <Icon className={`w-5 h-5 ${cfg.color}`} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h4 className="font-semibold text-sm text-foreground truncate">{quest.title}</h4>
              <Badge variant="outline" className="text-[10px] shrink-0 capitalize">{quest.quest_type}</Badge>
            </div>
            {quest.description && (
              <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{quest.description}</p>
            )}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {quest.is_completed ? 'Complete!' : `${quest.progress_value} / ${quest.goal_value}`}
                </span>
                <span className="flex items-center gap-1 font-medium text-foreground">
                  <Sparkles className="w-3 h-3 text-yellow-500" />
                  {quest.reward_points} pts
                </span>
              </div>
              <Progress value={pct} className="h-2" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
