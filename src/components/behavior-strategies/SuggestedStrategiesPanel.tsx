import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Sparkles, ChevronDown, ChevronUp, Loader2, Plus, Eye, Save, BookOpen, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const FUNCTIONS = ['attention', 'escape', 'access', 'sensory'];
const ENVIRONMENTS = ['classroom', 'home', 'community', 'clinic', 'playground', 'cafeteria', 'hallway'];
const ESCALATION_LEVELS = ['low', 'moderate', 'high', 'crisis'];
const AGE_BANDS = ['early_childhood', 'elementary', 'middle_school', 'high_school', 'transition'];
const TIERS = ['tier_1', 'tier_2', 'tier_3'];

interface StrategyResult {
  strategy_id: string;
  strategy_key: string;
  strategy_name: string;
  strategy_group: string;
  category: string;
  evidence_level: string;
  priority_score: number;
  rationale: string;
  teacher_quick_version: string;
  family_version: string;
}

interface SuggestedStrategiesPanelProps {
  /** Pre-filled function from FBA/BIP analysis */
  detectedFunction?: string;
  /** Pre-filled environment */
  detectedEnvironment?: string;
  /** Student ID to attach when saving */
  studentId?: string;
  /** Called when user clicks "Add to Draft" with strategy content to append */
  onAddToDraft?: (content: {
    strategyName: string;
    description: string;
    teacherQuickVersion: string;
    familyVersion: string;
    category: string;
  }) => void;
  /** Called when user appends a raw strategy string (BIP-style) */
  onAppendStrategy?: (strategy: string, type?: string) => void;
}

const formatLabel = (s: string) => s?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '';

const evidenceColors: Record<string, string> = {
  strong: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  moderate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  emerging: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  expert: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

export function SuggestedStrategiesPanel({
  detectedFunction,
  detectedEnvironment,
  studentId,
  onAddToDraft,
  onAppendStrategy,
}: SuggestedStrategiesPanelProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [functionTarget, setFunctionTarget] = useState(detectedFunction || '');
  const [environment, setEnvironment] = useState(detectedEnvironment || 'classroom');
  const [escalationLevel, setEscalationLevel] = useState('');
  const [ageBand, setAgeBand] = useState('');
  const [tier, setTier] = useState('');

  const [results, setResults] = useState<StrategyResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  // Sync detected values when they change
  if (detectedFunction && detectedFunction !== functionTarget && !hasSearched) {
    setFunctionTarget(detectedFunction);
  }

  const handleSearch = useCallback(async () => {
    if (!functionTarget) {
      toast.error('Please select a function of behavior');
      return;
    }
    setLoading(true);
    setHasSearched(true);
    try {
      const args: any = { p_function_target: functionTarget };
      if (environment && environment !== '__clear__') args.p_environment = environment;
      if (escalationLevel && escalationLevel !== '__clear__') args.p_escalation_level = escalationLevel;
      if (ageBand && ageBand !== '__clear__') args.p_age_band = ageBand;
      if (tier && tier !== '__clear__') args.p_tier = tier;

      const { data, error } = await (supabase.rpc as any)('recommend_behavior_strategies_v2', args);
      if (error) throw error;
      setResults((data || []).sort((a: StrategyResult, b: StrategyResult) => b.priority_score - a.priority_score));
    } catch (err: any) {
      toast.error('Recommendation failed: ' + err.message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [functionTarget, environment, escalationLevel, ageBand, tier]);

  const handleSaveSet = useCallback(async () => {
    if (results.length === 0) return;
    setSaving(true);
    try {
      const { data: resultData, error: resultErr } = await supabase
        .from('behavior_recommendation_results')
        .insert({
          function_target: functionTarget,
          environment: environment || null,
          escalation_level: escalationLevel || null,
          age_band: ageBand || null,
          tier: tier || null,
          student_id: studentId || null,
        })
        .select('id')
        .single();

      if (resultErr) throw resultErr;

      const stratRows = results.map(s => ({
        recommendation_result_id: resultData.id,
        strategy_id: s.strategy_id,
        priority_score: s.priority_score,
        rationale: s.rationale || null,
        selected: true,
        source: 'fba_bip_panel',
      }));

      const { error: stratErr } = await supabase
        .from('behavior_recommendation_result_strategies')
        .insert(stratRows);
      if (stratErr) throw stratErr;

      toast.success('Recommendation set saved');
    } catch (err: any) {
      toast.error('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  }, [results, functionTarget, environment, escalationLevel, ageBand, tier, studentId]);

  const handleAddToDraft = (r: StrategyResult) => {
    if (onAddToDraft) {
      onAddToDraft({
        strategyName: r.strategy_name,
        description: r.rationale || r.strategy_name,
        teacherQuickVersion: r.teacher_quick_version || '',
        familyVersion: r.family_version || '',
        category: r.category || '',
      });
    }
    if (onAppendStrategy) {
      const text = r.teacher_quick_version || r.strategy_name;
      onAppendStrategy(text, r.category);
    }
    setAddedIds(prev => new Set(prev).add(r.strategy_id));
    toast.success(`Added: ${r.strategy_name}`);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-primary/20">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Suggested Strategies
                {results.length > 0 && (
                  <Badge variant="secondary" className="text-xs">{results.length}</Badge>
                )}
              </CardTitle>
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
            <CardDescription className="text-xs">
              Get evidence-based strategy recommendations from the library
            </CardDescription>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {/* Filters */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Function *</Label>
                <Select value={functionTarget} onValueChange={setFunctionTarget}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {FUNCTIONS.map(f => <SelectItem key={f} value={f}>{formatLabel(f)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Environment</Label>
                <Select value={environment} onValueChange={setEnvironment}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__clear__">Any</SelectItem>
                    {ENVIRONMENTS.map(e => <SelectItem key={e} value={e}>{formatLabel(e)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Escalation</Label>
                <Select value={escalationLevel} onValueChange={setEscalationLevel}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__clear__">Any</SelectItem>
                    {ESCALATION_LEVELS.map(l => <SelectItem key={l} value={l}>{formatLabel(l)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Age Band</Label>
                <Select value={ageBand} onValueChange={setAgeBand}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__clear__">Any</SelectItem>
                    {AGE_BANDS.map(a => <SelectItem key={a} value={a}>{formatLabel(a)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tier</Label>
                <Select value={tier} onValueChange={setTier}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__clear__">Any</SelectItem>
                    {TIERS.map(t => <SelectItem key={t} value={t}>{formatLabel(t)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={handleSearch} disabled={!functionTarget || loading} size="sm" className="w-full h-8 text-xs">
                  {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                  Suggest
                </Button>
              </div>
            </div>

            {/* Results */}
            {results.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">{results.length} strategies found</span>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleSaveSet} disabled={saving}>
                    {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                    Save Set
                  </Button>
                </div>
                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                  {results.map((r, i) => {
                    const isAdded = addedIds.has(r.strategy_id);
                    return (
                      <div key={r.strategy_id} className="border rounded-md p-2.5 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            <span className="text-xs font-bold text-primary bg-primary/10 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                              {i + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium leading-tight">{r.strategy_name}</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {r.strategy_group && <Badge variant="outline" className="text-[10px] px-1 py-0">{formatLabel(r.strategy_group)}</Badge>}
                                {r.evidence_level && (
                                  <Badge className={`text-[10px] px-1 py-0 ${evidenceColors[r.evidence_level] || ''}`}>
                                    {formatLabel(r.evidence_level)}
                                  </Badge>
                                )}
                                <Badge variant="outline" className="text-[10px] px-1 py-0 font-mono">
                                  {r.priority_score}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                        {r.rationale && <p className="text-[11px] text-muted-foreground">{r.rationale}</p>}
                        {r.teacher_quick_version && (
                          <p className="text-xs text-muted-foreground border-l-2 border-primary/30 pl-2 italic">
                            {r.teacher_quick_version}
                          </p>
                        )}
                        <div className="flex gap-1 pt-1">
                          <Button
                            variant={isAdded ? 'secondary' : 'outline'}
                            size="sm"
                            className="h-6 text-[10px] px-2"
                            disabled={isAdded}
                            onClick={() => handleAddToDraft(r)}
                          >
                            {isAdded ? '✓ Added' : <><Plus className="h-3 w-3 mr-0.5" /> Add to Draft</>}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] px-2"
                            onClick={() => navigate(`/behavior-strategies?detail=${r.strategy_id}`)}
                          >
                            <Eye className="h-3 w-3 mr-0.5" /> View
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty state */}
            {hasSearched && !loading && results.length === 0 && (
              <div className="text-center py-4 space-y-2">
                <AlertCircle className="h-6 w-6 text-muted-foreground mx-auto" />
                <p className="text-xs text-muted-foreground">No strong strategy matches. Try clearing optional filters.</p>
                <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => {
                  setEscalationLevel('');
                  setAgeBand('');
                  setTier('');
                  setHasSearched(false);
                }}>
                  Clear Filters
                </Button>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
