import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Target, Zap, Loader2, Lightbulb } from 'lucide-react';
import { GoalDraftCard, type GoalDraft } from './GoalDraftCard';
import { OptimizationRecommendationMiniCard, type OptimizationRec } from './OptimizationRecommendationMiniCard';

const db = supabase as any;

type Surface = 'iep_prep' | 'programming' | 'reassessment' | 'nova_ai';

interface GoalSuggestionEnginePanelProps {
  studentId: string;
  surface: Surface;
  onDraftAction?: (action: string, draft: GoalDraft) => void;
  onRecAction?: (action: string, rec: OptimizationRec) => void;
}

const SURFACE_CONFIG: Record<Surface, {
  draftView: string;
  recView: string;
  draftTitle: string;
  recTitle: string;
  sections: { key: string; label: string }[];
}> = {
  iep_prep: {
    draftView: 'v_iep_goal_suggestion_drafts',
    recView: 'v_iep_prep_optimization_recommendations',
    draftTitle: 'Suggested Annual Goals',
    recTitle: 'Optimization Recommendations',
    sections: [
      { key: 'goals', label: 'Suggested Goals' },
      { key: 'recommendations', label: 'Recommendations' },
    ],
  },
  programming: {
    draftView: 'v_clinical_goal_suggestion_drafts',
    recView: 'v_programming_optimization_recommendations',
    draftTitle: 'Clinical Goal Suggestions',
    recTitle: 'Program Optimization',
    sections: [
      { key: 'goals', label: 'Goal Suggestions' },
      { key: 'recommendations', label: 'Optimization' },
    ],
  },
  reassessment: {
    draftView: 'v_reassessment_goal_suggestion_drafts',
    recView: 'v_reassessment_optimization_recommendations',
    draftTitle: 'Suggested Goal Revisions',
    recTitle: 'Optimization Recommendations',
    sections: [
      { key: 'goals', label: 'Goal Revisions' },
      { key: 'recommendations', label: 'Recommendations' },
    ],
  },
  nova_ai: {
    draftView: 'v_reassessment_goal_suggestion_drafts',
    recView: 'v_programming_optimization_recommendations',
    draftTitle: 'Goal Drafts',
    recTitle: 'Recommendations',
    sections: [
      { key: 'goals', label: 'Drafts' },
      { key: 'recommendations', label: 'Recommendations' },
    ],
  },
};

export function GoalSuggestionEnginePanel({ studentId, surface, onDraftAction, onRecAction }: GoalSuggestionEnginePanelProps) {
  const [drafts, setDrafts] = useState<GoalDraft[]>([]);
  const [recs, setRecs] = useState<OptimizationRec[]>([]);
  const [loading, setLoading] = useState(true);
  const config = SURFACE_CONFIG[surface];

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);

    Promise.all([
      db.from(config.draftView).select('*').eq('student_id', studentId).limit(50),
      db.from(config.recView).select('*').eq('student_id', studentId).limit(50),
    ]).then(([draftRes, recRes]: any[]) => {
      setDrafts(draftRes.data || []);
      setRecs(recRes.data || []);
    }).finally(() => setLoading(false));
  }, [studentId, config.draftView, config.recView]);

  const totalCount = drafts.length + recs.length;

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-primary" />
            Goal Suggestion Engine
            {totalCount > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{totalCount}</Badge>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {totalCount === 0 ? (
          <div className="text-center py-6">
            <Lightbulb className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No suggestions available yet. Run optimization to generate recommendations.</p>
          </div>
        ) : (
          <Tabs defaultValue="goals" className="w-full">
            <TabsList className="w-full h-8">
              {config.sections.map(s => (
                <TabsTrigger key={s.key} value={s.key} className="text-xs flex-1 gap-1">
                  {s.key === 'goals' ? <Target className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
                  {s.label}
                  <Badge variant="outline" className="text-[9px] px-1 py-0 ml-1">
                    {s.key === 'goals' ? drafts.length : recs.length}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="goals" className="mt-3 space-y-2">
              {drafts.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No goal drafts available</p>
              ) : (
                drafts.map(d => (
                  <GoalDraftCard key={d.id} draft={d} surface={surface} onAction={onDraftAction} compact />
                ))
              )}
            </TabsContent>

            <TabsContent value="recommendations" className="mt-3 space-y-2">
              {recs.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No optimization recommendations</p>
              ) : (
                recs.map(r => (
                  <OptimizationRecommendationMiniCard key={r.id} rec={r} surface={surface} onAction={onRecAction} compact />
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
