import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Sparkles, Loader2 } from 'lucide-react';

const FUNCTIONS = ['attention', 'escape', 'access', 'sensory'];
const ENVIRONMENTS = ['classroom', 'home', 'community', 'clinic', 'playground', 'cafeteria', 'hallway'];
const ESCALATION_LEVELS = ['low', 'moderate', 'high', 'crisis'];
const AGE_BANDS = ['early_childhood', 'elementary', 'middle_school', 'high_school', 'transition'];
const TIERS = ['tier_1', 'tier_2', 'tier_3'];

interface Props {
  onSubmit: (params: {
    function_target: string;
    environment?: string;
    escalation_level?: string;
    age_band?: string;
    tier?: string;
    behavior_key?: string;
  }) => void;
  isLoading: boolean;
}

export function QuickRecommendForm({ onSubmit, isLoading }: Props) {
  const [functionTarget, setFunctionTarget] = useState('');
  const [environment, setEnvironment] = useState('');
  const [escalationLevel, setEscalationLevel] = useState('');
  const [ageBand, setAgeBand] = useState('');
  const [tier, setTier] = useState('');
  const [behaviorKey, setBehaviorKey] = useState('');

  const handleSubmit = () => {
    if (!functionTarget) return;
    onSubmit({
      function_target: functionTarget,
      environment: environment || undefined,
      escalation_level: escalationLevel || undefined,
      age_band: ageBand || undefined,
      tier: tier || undefined,
      behavior_key: behaviorKey || undefined,
    });
  };

  const formatLabel = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Quick Recommend
        </CardTitle>
        <CardDescription>
          Select behavior function and optional filters to get ranked strategy suggestions with MTSS and goal layers.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Function of Behavior *</Label>
            <Select value={functionTarget} onValueChange={setFunctionTarget}>
              <SelectTrigger><SelectValue placeholder="Select function" /></SelectTrigger>
              <SelectContent>
                {FUNCTIONS.map(f => <SelectItem key={f} value={f}>{formatLabel(f)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Environment</Label>
            <Select value={environment} onValueChange={setEnvironment}>
              <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__clear__">Any</SelectItem>
                {ENVIRONMENTS.map(e => <SelectItem key={e} value={e}>{formatLabel(e)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Escalation Level</Label>
            <Select value={escalationLevel} onValueChange={setEscalationLevel}>
              <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__clear__">Any</SelectItem>
                {ESCALATION_LEVELS.map(l => <SelectItem key={l} value={l}>{formatLabel(l)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Age Band</Label>
            <Select value={ageBand} onValueChange={setAgeBand}>
              <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__clear__">Any</SelectItem>
                {AGE_BANDS.map(a => <SelectItem key={a} value={a}>{formatLabel(a)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tier</Label>
            <Select value={tier} onValueChange={setTier}>
              <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__clear__">Any</SelectItem>
                {TIERS.map(t => <SelectItem key={t} value={t}>{formatLabel(t)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Behavior Key <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input
              placeholder="e.g. elopement, aggression"
              value={behaviorKey}
              onChange={e => setBehaviorKey(e.target.value)}
            />
          </div>

          <div className="flex items-end lg:col-span-3">
            <Button onClick={handleSubmit} disabled={!functionTarget || isLoading} className="w-full sm:w-auto">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Get Recommendations
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
