import {
  Target, CheckCircle2, AlertTriangle, Hand, Shield, Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSkillMasteryIntelligence } from '@/hooks/useSkillMasteryIntelligence';

interface Props {
  studentId: string | null | undefined;
}

/**
 * Compact skill mastery intelligence card for embedding in Skill Dashboard.
 */
export function SkillMasteryIntelligenceCard({ studentId }: Props) {
  const { targets, flags, stats, loading } = useSkillMasteryIntelligence(studentId);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-4 flex justify-center">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (targets.length === 0) return null;

  return (
    <Card className={flags.length > 0 ? 'border-orange-500/30' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Target className="w-4 h-4" />
          Skill Mastery Intelligence
          {flags.length > 0 && (
            <Badge variant="outline" className="ml-auto text-[10px] border-orange-500/50 text-orange-500">
              {flags.length} flag{flags.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-3">
          <MiniStat label="Mastered" value={stats.mastered} icon={<CheckCircle2 className="w-3 h-3 text-emerald-500" />} />
          <MiniStat label="In Progress" value={stats.inProgress} icon={<Target className="w-3 h-3 text-blue-500" />} />
          <MiniStat label="Not Started" value={stats.notStarted} icon={<Target className="w-3 h-3 text-muted-foreground" />} />
          <MiniStat label="Stalled" value={stats.stalled} icon={<AlertTriangle className="w-3 h-3 text-orange-500" />} />
          <MiniStat label="Prompt Dep." value={stats.promptDependent} icon={<Hand className="w-3 h-3 text-yellow-500" />} />
          <MiniStat label="Ready ↑" value={stats.readyToAdvance} icon={<CheckCircle2 className="w-3 h-3 text-emerald-500" />} />
        </div>

        {flags.length > 0 && (
          <div className="space-y-1 border-t border-border/50 pt-2">
            {flags.slice(0, 5).map((flag, i) => (
              <p key={i} className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{flag.targetTitle}:</span>{' '}
                {flag.type === 'stalled' && 'Target stalled — review teaching procedure'}
                {flag.type === 'prompt_dependent' && 'Prompt dependency detected — review fading strategy'}
                {flag.type === 'ready_to_advance' && 'Criterion met — consider advancement'}
                {flag.type === 'mastery_mismatch' && 'Needs generalization training'}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      {icon}
      <div>
        <p className="text-sm font-bold leading-none">{value}</p>
        <p className="text-[9px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
