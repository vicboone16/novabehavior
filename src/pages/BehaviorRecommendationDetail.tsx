import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Loader2, Eye, ExternalLink } from 'lucide-react';
import { useBehaviorRecommendations, SavedResultDetail } from '@/hooks/useBehaviorRecommendations';
import { InterventionPackets } from '@/components/behavior-strategies/InterventionPackets';
import { supabase } from '@/integrations/supabase/client';

const formatLabel = (s: string | null) => s?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '—';

export default function BehaviorRecommendationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fetchResultDetail } = useBehaviorRecommendations();

  const [details, setDetails] = useState<SavedResultDetail[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const data = await fetchResultDetail(id);
    setDetails(data.sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0)));
    setLoading(false);
  }, [id, fetchResultDetail]);

  useEffect(() => { load(); }, [load]);

  const meta = details[0];

  const handleToggle = async (strategyId: string, selected: boolean) => {
    // Find the result_strategy row id
    try {
      const { data } = await supabase
        .from('behavior_recommendation_result_strategies')
        .select('id')
        .eq('recommendation_result_id', id!)
        .eq('strategy_id', strategyId)
        .single();
      if (data) {
        await supabase.from('behavior_recommendation_result_strategies')
          .update({ selected })
          .eq('id', data.id);
        setDetails(prev => prev.map(d =>
          d.strategy_id === strategyId ? { ...d, selected } : d
        ));
      }
    } catch { /* silent */ }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!details.length) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-4xl text-center space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Recommendation not found</h2>
        <Button variant="outline" onClick={() => navigate('/behavior-recommendations')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl space-y-6">
      <Button variant="ghost" onClick={() => navigate('/behavior-recommendations')} className="mb-2">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Recommendations
      </Button>

      {/* Meta header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Recommendation Result</h1>
        <div className="flex flex-wrap gap-2">
          {meta?.function_target && <Badge variant="outline">{formatLabel(meta.function_target)}</Badge>}
          {meta?.environment && <Badge variant="secondary">{formatLabel(meta.environment)}</Badge>}
          {meta?.escalation_level && <Badge variant="secondary">{formatLabel(meta.escalation_level)}</Badge>}
          {meta?.tier && <Badge variant="secondary">{formatLabel(meta.tier)}</Badge>}
          {meta?.age_band && <Badge variant="secondary">{formatLabel(meta.age_band)}</Badge>}
        </div>
        <div className="text-xs text-muted-foreground">
          {meta?.created_at && <>Created {new Date(meta.created_at).toLocaleString()}</>}
          {meta?.student_id && <> · Student: {meta.student_id.slice(0, 8)}…</>}
        </div>
      </div>

      {/* Strategy list */}
      <div className="space-y-3">
        <h3 className="font-semibold text-foreground">{details.length} Suggested Strategies</h3>
        {details.map((d, i) => (
          <Card key={d.strategy_id || i}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-foreground">{d.strategy_name || 'Unknown Strategy'}</h4>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {d.strategy_group && <Badge variant="outline" className="text-xs">{formatLabel(d.strategy_group)}</Badge>}
                      {d.priority_score != null && (
                        <Badge variant="outline" className="text-xs font-mono">Score: {d.priority_score}</Badge>
                      )}
                    </div>
                    {d.rationale && (
                      <p className="text-xs text-muted-foreground mt-2">{d.rationale}</p>
                    )}
                    {d.teacher_quick_version && (
                      <p className="text-sm text-muted-foreground mt-2 border-l-2 border-primary/30 pl-2 italic">
                        {d.teacher_quick_version}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{d.selected ? 'Selected' : 'Not selected'}</span>
                    <Switch
                      checked={!!d.selected}
                      onCheckedChange={(checked) => d.strategy_id && handleToggle(d.strategy_id, checked)}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => d.strategy_id && navigate(`/behavior-strategies?detail=${d.strategy_id}`)}
                  >
                    <Eye className="h-4 w-4 mr-1" /> View
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Intervention Packets from selected strategies */}
      {details.length > 0 && (
        <InterventionPackets
          reportId={id || ''}
          reportType="recommendation"
          studentId={meta?.student_id || undefined}
          strategies={details.filter(d => d.selected).map(d => ({
            id: d.strategy_id || '',
            strategy_name: d.strategy_name || 'Unknown',
            strategy_group: d.strategy_group || null,
            category: null,
            description: d.rationale || null,
            teacher_quick_version: d.teacher_quick_version || null,
            family_version: (d as any).family_version || null,
            data_to_collect: null,
            fidelity_tips: null,
            staff_scripts: null,
            implementation_notes: null,
            evidence_level: null,
          }))}
        />
      )}
    </div>
  );
}
