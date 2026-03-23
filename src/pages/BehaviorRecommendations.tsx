import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Save, BookOpen, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useBehaviorRecommendations, RecommendationResult, QuickRecommendParams, SupplementalLayers } from '@/hooks/useBehaviorRecommendations';
import { QuickRecommendForm } from '@/components/behavior-recommendations/QuickRecommendForm';
import { RecommendationResultCard } from '@/components/behavior-recommendations/RecommendationResultCard';
import { ProfileCard } from '@/components/behavior-recommendations/ProfileCard';
import { SavedResultRow } from '@/components/behavior-recommendations/SavedResultRow';
import { SupplementalLayersDisplay } from '@/components/behavior-recommendations/SupplementalLayersDisplay';

export default function BehaviorRecommendations() {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const canEdit = ['super_admin', 'admin'].includes(userRole || '');

  const {
    profiles, savedResults, isLoading,
    quickRecommend, saveRecommendationSet, updateProfile,
    recommendWithSupplements,
  } = useBehaviorRecommendations();

  const [tab, setTab] = useState('quick');
  const [recommending, setRecommending] = useState(false);
  const [results, setResults] = useState<RecommendationResult[]>([]);
  const [supplements, setSupplements] = useState<SupplementalLayers | null>(null);
  const [lastParams, setLastParams] = useState<QuickRecommendParams | null>(null);
  const [saving, setSaving] = useState(false);

  const handleRecommend = async (params: QuickRecommendParams & { behavior_key?: string }) => {
    setRecommending(true);
    const { behavior_key, ...coreParams } = params;
    setLastParams(coreParams);

    if (behavior_key) {
      const { strategies, supplements: supp } = await recommendWithSupplements(coreParams, behavior_key);
      setResults(strategies);
      setSupplements(supp);
    } else {
      const data = await quickRecommend(coreParams);
      setResults(data);
      setSupplements(null);
    }
    setRecommending(false);
  };

  const handleSaveSet = async () => {
    if (!lastParams || results.length === 0) return;
    setSaving(true);
    const id = await saveRecommendationSet(lastParams, results);
    setSaving(false);
    if (id) navigate(`/behavior-recommendations/result/${id}`);
  };

  const handleViewStrategy = (strategyId: string) => {
    navigate(`/behavior-strategies?detail=${strategyId}`);
  };

  const handleToggleProfile = async (id: string, active: boolean) => {
    await updateProfile(id, { is_active: active });
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Behavior Recommendation Engine</h1>
        <p className="text-muted-foreground mt-1">
          Get ranked strategy suggestions based on function, environment, and escalation level.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="quick">
            <Sparkles className="h-4 w-4 mr-1.5" />
            Quick Recommend
          </TabsTrigger>
          <TabsTrigger value="profiles">
            <BookOpen className="h-4 w-4 mr-1.5" />
            Profiles
            {profiles.length > 0 && <Badge variant="secondary" className="ml-1.5 text-xs">{profiles.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="saved">
            <Save className="h-4 w-4 mr-1.5" />
            Saved Results
            {savedResults.length > 0 && <Badge variant="secondary" className="ml-1.5 text-xs">{savedResults.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* QUICK RECOMMEND */}
        <TabsContent value="quick" className="space-y-4">
          <QuickRecommendForm onSubmit={handleRecommend} isLoading={recommending} />

          {/* Supplemental Layers (MTSS, goals, strategies) */}
          {supplements && <SupplementalLayersDisplay supplements={supplements} />}

          {results.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">
                  {results.length} Strategies Found
                </h3>
                <Button onClick={handleSaveSet} disabled={saving} size="sm">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
                  Save Recommendation Set
                </Button>
              </div>
              {results
                .sort((a, b) => b.priority_score - a.priority_score)
                .map((r, i) => (
                  <RecommendationResultCard
                    key={r.strategy_id}
                    result={r}
                    rank={i + 1}
                    onViewStrategy={handleViewStrategy}
                  />
                ))}
            </div>
          )}

          {!recommending && results.length === 0 && lastParams && (
            <div className="text-center py-12 space-y-3">
              <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto" />
              <h3 className="font-semibold text-foreground">No strong strategy matches yet</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Try clearing optional filters or selecting a different function target to broaden results.
              </p>
              <Button variant="outline" size="sm" onClick={() => { setLastParams(null); setResults([]); setSupplements(null); }}>
                Clear & Try Again
              </Button>
            </div>
          )}
        </TabsContent>

        {/* PROFILES */}
        <TabsContent value="profiles" className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : profiles.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <BookOpen className="h-10 w-10 text-muted-foreground mx-auto" />
              <h3 className="font-semibold text-foreground">No recommendation profiles yet</h3>
              <p className="text-sm text-muted-foreground">Profiles map function/environment combos to curated strategy sets.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {profiles.map(p => (
                <ProfileCard
                  key={p.id}
                  profile={p}
                  canEdit={canEdit}
                  onToggleActive={handleToggleProfile}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* SAVED RESULTS */}
        <TabsContent value="saved" className="space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : savedResults.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <Save className="h-10 w-10 text-muted-foreground mx-auto" />
              <h3 className="font-semibold text-foreground">No saved recommendation sets</h3>
              <p className="text-sm text-muted-foreground">Run a Quick Recommend and save the results to see them here.</p>
            </div>
          ) : (
            savedResults.map(r => <SavedResultRow key={r.id} result={r} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
