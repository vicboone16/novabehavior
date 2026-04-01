import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Loader2, ChevronDown, ChevronUp, AlertTriangle, BookOpen,
  GraduationCap, Heart, Stethoscope, Brain, RefreshCw,
} from 'lucide-react';
import { useClinicalRecommendations, useClinicalNarrativeText } from '@/hooks/useClinicalNarrative';

const CATEGORY_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  immediate_priority: { label: 'Immediate Clinical Priorities', icon: AlertTriangle, color: 'text-red-600 dark:text-red-400' },
  classroom_school: { label: 'Classroom & School Supports', icon: GraduationCap, color: 'text-blue-600 dark:text-blue-400' },
  parent_caregiver: { label: 'Parent Training & Caregiver Supports', icon: Heart, color: 'text-pink-600 dark:text-pink-400' },
  regulation_sensory: { label: 'Regulation & Sensory Supports', icon: Brain, color: 'text-purple-600 dark:text-purple-400' },
  assessment_followup: { label: 'Further Assessment Recommendations', icon: Stethoscope, color: 'text-green-600 dark:text-green-400' },
};

interface Props {
  studentId: string;
}

export function BopsRecommendationViewer({ studentId }: Props) {
  const { data: recommendations, isLoading: recsLoading, refetch: refetchRecs } = useClinicalRecommendations(studentId);
  const { data: narrativeText, isLoading: narLoading } = useClinicalNarrativeText(studentId);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['immediate_priority']));
  const [showNarrative, setShowNarrative] = useState(false);

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  // Group recommendations by category
  const grouped = (recommendations || []).reduce((acc: Record<string, any[]>, rec: any) => {
    const cat = rec.category || 'assessment_followup';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(rec);
    return acc;
  }, {} as Record<string, any[]>);

  const categoryOrder = ['immediate_priority', 'classroom_school', 'parent_caregiver', 'regulation_sensory', 'assessment_followup'];

  if (recsLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const hasRecs = recommendations && recommendations.length > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                Clinical Recommendations
              </CardTitle>
              <CardDescription>
                Auto-generated from BOPS indices and clinical narrative engine
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm" variant="outline" className="gap-1 text-xs"
                onClick={() => setShowNarrative(!showNarrative)}
              >
                <Brain className="w-3 h-3" />
                {showNarrative ? 'Hide Narrative' : 'View Narrative'}
              </Button>
              <Button
                size="sm" variant="outline" className="gap-1 text-xs"
                onClick={() => refetchRecs()}
              >
                <RefreshCw className="w-3 h-3" /> Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Clinical Narrative Preview */}
      {showNarrative && (
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Clinical Narrative Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {narLoading ? (
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            ) : narrativeText ? (
              <ScrollArea className="max-h-60">
                <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {narrativeText}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground">
                No narrative data available. Run a BOPS assessment first.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recommendation Categories */}
      {!hasRecs ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p className="text-sm">No recommendations generated yet.</p>
            <p className="text-xs mt-1">Complete a BOPS assessment to generate clinical recommendations.</p>
          </CardContent>
        </Card>
      ) : (
        categoryOrder.map(catKey => {
          const items = grouped[catKey];
          if (!items || items.length === 0) return null;
          const config = CATEGORY_CONFIG[catKey] || { label: catKey, icon: BookOpen, color: 'text-foreground' };
          const Icon = config.icon;
          const isOpen = expandedCategories.has(catKey);

          return (
            <Card key={catKey}>
              <Collapsible open={isOpen} onOpenChange={() => toggleCategory(catKey)}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <CardTitle className={`text-sm flex items-center gap-2 ${config.color}`}>
                        <Icon className="w-4 h-4" />
                        {config.label}
                        <Badge variant="secondary" className="text-[10px] ml-1">
                          {items.length}
                        </Badge>
                      </CardTitle>
                      {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-2">
                    {items.map((rec: any, i: number) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-2.5 rounded-lg border bg-muted/30"
                      >
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-[10px] font-bold text-primary">{i + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground">{rec.recommendation_text || rec.text || rec.recommendation}</p>
                          {rec.source_index && (
                            <Badge variant="outline" className="text-[10px] mt-1">
                              Source: {rec.source_index}
                            </Badge>
                          )}
                        </div>
                        {rec.priority && (
                          <Badge
                            variant={rec.priority === 'high' ? 'destructive' : 'secondary'}
                            className="text-[10px] shrink-0"
                          >
                            {rec.priority}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })
      )}
    </div>
  );
}
