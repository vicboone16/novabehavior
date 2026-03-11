import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BrainCircuit, CheckCircle2, Zap, AlertTriangle, Info } from 'lucide-react';

interface Props {
  recommendations: any[];
  studentId: string;
  onApprove?: (rec: any) => void;
}

const SEV: Record<string, { icon: React.ReactNode; cls: string }> = {
  high: { icon: <AlertTriangle className="w-3 h-3" />, cls: 'text-destructive border-destructive/30' },
  medium: { icon: <Zap className="w-3 h-3" />, cls: 'text-warning border-warning/30' },
  low: { icon: <Info className="w-3 h-3" />, cls: 'text-muted-foreground border-muted' },
};

export function IEPRecommendationsSection({ recommendations, studentId, onApprove }: Props) {
  const navigate = useNavigate();

  const askNovaAI = (rec: any) => {
    const params = new URLSearchParams();
    params.set('prompt', `Explain this IEP recommendation: "${rec.title}". Rationale: ${rec.rationale || 'N/A'}. Recommended action: ${rec.recommended_action || 'N/A'}.`);
    params.set('clientId', studentId);
    params.set('context', 'iep_recommendation');
    navigate(`/nova-ai?${params.toString()}`);
  };

  if (recommendations.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          No recommendations yet. Use "Pull Optimization Recommendations" to import suggestions.
        </CardContent>
      </Card>
    );
  }

  const grouped: Record<string, any[]> = {};
  recommendations.forEach(r => {
    const cat = r.recommendation_category || 'general';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(r);
  });

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([cat, recs]) => (
        <div key={cat}>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{cat.replace(/_/g, ' ')}</h4>
          <div className="space-y-2">
            {recs.map(r => {
              const sev = SEV[r.severity || 'medium'] || SEV.medium;
              return (
                <Card key={r.id} className="hover:border-primary/20 transition-colors">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {sev.icon}
                          <span className="text-xs font-semibold truncate">{r.title || 'Recommendation'}</span>
                          <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${sev.cls}`}>{r.severity}</Badge>
                        </div>
                        {r.rationale && <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1">{r.rationale}</p>}
                        {r.recommended_action && (
                          <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                            <span className="font-medium">Action:</span> {r.recommended_action}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => askNovaAI(r)}>
                          <BrainCircuit className="w-3 h-3" />
                        </Button>
                        {onApprove && (
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-success" onClick={() => onApprove(r)}>
                            <CheckCircle2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
