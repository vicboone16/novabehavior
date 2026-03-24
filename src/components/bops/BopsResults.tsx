import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useBopsQuestions, useStudentBopsProfile, useBopsConstellations, useBopsAssessmentItems, calculateBopsScores } from '@/hooks/useBopsData';
import { Loader2 } from 'lucide-react';

export function BopsResults({ studentId }: { studentId: string }) {
  const { data: questions, isLoading: qL } = useBopsQuestions();
  const { data: responses, isLoading: rL } = useBopsAssessmentItems(undefined); // TODO: pass assessment ID
  const { data: profile } = useStudentBopsProfile(studentId);
  const { data: constellations } = useBopsConstellations();

  const scores = useMemo(() => {
    if (!responses?.length || !questions?.length) return null;
    const mapped = responses.map((r: any) => ({
      item_number: r.item_number as number,
      value: r.value as number,
      domain: r.domain as string,
    }));
    return calculateBopsScores(mapped, questions as any);
  }, [responses, questions]);

  if (qL || rL) return <Loader2 className="animate-spin mx-auto mt-8" />;

  if (!scores) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {profile ? 'Assessment responses needed to generate results. Complete the assessment first.' : 'No BOPS profile or assessment data found.'}
        </CardContent>
      </Card>
    );
  }

  const constellationMatch = constellations?.find(c =>
    c.constellation_id === `${scores.primary}_${scores.secondary}` ||
    c.constellation_id === `${scores.secondary}_${scores.primary}`
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">BOPS Classification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 rounded-lg border bg-primary/5">
              <p className="text-xs text-muted-foreground">Profile Type</p>
              <p className="font-bold text-lg capitalize">{scores.profileType}</p>
            </div>
            <div className="p-3 rounded-lg border">
              <p className="text-xs text-muted-foreground">Primary</p>
              <p className="font-semibold capitalize">{scores.primary}</p>
            </div>
            <div className="p-3 rounded-lg border">
              <p className="text-xs text-muted-foreground">Secondary</p>
              <p className="font-semibold capitalize">{scores.secondary}</p>
            </div>
            <div className="p-3 rounded-lg border">
              <p className="text-xs text-muted-foreground">Storm Score</p>
              <p className="font-bold text-lg">{(scores.stormScore * 100).toFixed(0)}%</p>
            </div>
          </div>

          {constellationMatch && (
            <div className="p-4 rounded-lg border bg-muted/50">
              <p className="text-xs font-medium text-muted-foreground">Constellation</p>
              <p className="font-semibold">{constellationMatch.training_name}</p>
              <p className="text-sm text-muted-foreground">{constellationMatch.clinical_name}</p>
              {constellationMatch.nickname && (
                <Badge variant="secondary" className="mt-1">{constellationMatch.nickname}</Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Domain Scores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(scores.scores)
              .filter(([d]) => !['navigator', 'storm'].includes(d))
              .sort((a, b) => (b[1] as number) - (a[1] as number))
              .map(([domain, score]) => {
                const s = score as number;
                return (
                  <div key={domain} className="flex items-center gap-3">
                    <span className="text-sm font-medium capitalize w-24 shrink-0">{domain}</span>
                    <div className="flex-1">
                      <Progress value={s * 100} className="h-3" />
                    </div>
                    <span className="text-sm font-mono w-12 text-right">{(s * 100).toFixed(0)}%</span>
                    {s >= 0.7 && <Badge variant="destructive" className="text-xs">High</Badge>}
                    {s >= 0.5 && s < 0.7 && <Badge variant="secondary" className="text-xs">Mod</Badge>}
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Clinical Indices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Escalation Index', value: scores.escalationIndex },
              { label: 'Hidden Need Index', value: scores.hiddenNeedIndex },
              { label: 'Sensory Load', value: scores.sensoryLoadIndex },
              { label: 'Power Conflict', value: scores.powerConflictIndex },
              { label: 'Social Complexity', value: scores.socialComplexityIndex },
              { label: 'Recovery Burden', value: scores.recoveryBurdenIndex },
            ].map(idx => (
              <div key={idx.label} className="p-3 rounded-lg border text-center">
                <p className="text-xs text-muted-foreground">{idx.label}</p>
                <p className="text-xl font-bold">{(idx.value * 100).toFixed(0)}%</p>
                <Progress value={idx.value * 100} className="h-1.5 mt-1" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {profile && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stored Profile (Current)</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p><strong>Primary:</strong> {profile.primary_archetype}</p>
            <p><strong>Secondary:</strong> {profile.secondary_archetype}</p>
            <p><strong>Clinical Name:</strong> {profile.clinical_name}</p>
            <p><strong>CFI Recommendation:</strong> {profile.recommended_cfi}</p>
            <div className="flex gap-1 flex-wrap">
              {(Array.isArray(profile.safety_flags) ? profile.safety_flags : []).map((f: string) => (
                <Badge key={f} variant="destructive">{f}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
