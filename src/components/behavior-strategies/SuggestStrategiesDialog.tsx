import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles, Eye } from 'lucide-react';
import type { StrategyRecommendation, BehaviorStrategy } from '@/hooks/useBehaviorStrategyLibrary';

const FUNCTIONS = ['attention', 'escape', 'access', 'sensory'];
const ENVIRONMENTS = ['classroom', 'home', 'community', 'clinic', 'playground', 'virtual'];
const ESCALATIONS = ['low', 'moderate', 'high', 'crisis'];

interface Props {
  open: boolean;
  onClose: () => void;
  onRecommend: (fn: string, env?: string) => Promise<StrategyRecommendation[]>;
  strategies: BehaviorStrategy[];
  onViewStrategy: (id: string) => void;
}

export function SuggestStrategiesDialog({ open, onClose, onRecommend, strategies, onViewStrategy }: Props) {
  const [fnTarget, setFnTarget] = useState('');
  const [environment, setEnvironment] = useState('');
  const [escalationFilter, setEscalationFilter] = useState('');
  const [results, setResults] = useState<StrategyRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSuggest = async () => {
    if (!fnTarget) return;
    setLoading(true);
    setSearched(true);
    const recs = await onRecommend(fnTarget, environment || undefined);

    // If escalation filter, filter by the full strategy data
    if (escalationFilter) {
      const filtered = recs.filter(r => {
        const full = strategies.find(s => s.id === r.strategy_id);
        return full?.escalation_levels?.includes(escalationFilter);
      });
      setResults(filtered);
    } else {
      setResults(recs);
    }
    setLoading(false);
  };

  const handleClose = () => {
    setResults([]);
    setSearched(false);
    setFnTarget('');
    setEnvironment('');
    setEscalationFilter('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Suggest Strategies
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium">Function of Behavior *</label>
            <Select value={fnTarget} onValueChange={setFnTarget}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select function..." /></SelectTrigger>
              <SelectContent>
                {FUNCTIONS.map(f => <SelectItem key={f} value={f} className="capitalize">{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium">Environment (optional)</label>
            <Select value={environment || "__none__"} onValueChange={(v) => setEnvironment(v === "__none__" ? "" : v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Any environment" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Any</SelectItem>
                {ENVIRONMENTS.map(e => <SelectItem key={e} value={e} className="capitalize">{e}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium">Escalation Level (optional filter)</label>
            <Select value={escalationFilter || "__none__"} onValueChange={(v) => setEscalationFilter(v === "__none__" ? "" : v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Any level" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Any</SelectItem>
                {ESCALATIONS.map(e => <SelectItem key={e} value={e} className="capitalize">{e}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleSuggest} disabled={!fnTarget || loading} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Get Recommendations
          </Button>

          {searched && !loading && (
            <div className="space-y-2 mt-2">
              {results.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No strategies matched. Try different parameters.</p>
              ) : (
                results.map(r => {
                  const full = strategies.find(s => s.id === r.strategy_id);
                  return (
                    <div key={r.strategy_id} className="flex items-center justify-between gap-2 p-2 rounded-md border bg-card">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{r.strategy_name}</p>
                        <div className="flex gap-1 mt-0.5">
                          <Badge variant="outline" className="text-[10px]">{r.category}</Badge>
                          {full?.evidence_level && <Badge variant="secondary" className="text-[10px]">{full.evidence_level}</Badge>}
                        </div>
                        {full?.teacher_quick_version && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{full.teacher_quick_version}</p>
                        )}
                      </div>
                      <Button size="sm" variant="ghost" className="shrink-0 h-7" onClick={() => onViewStrategy(r.strategy_id)}>
                        <Eye className="h-3 w-3 mr-1" /> View
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
