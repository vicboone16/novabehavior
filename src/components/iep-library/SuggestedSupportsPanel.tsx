import { useState } from 'react';
import { ChevronDown, ChevronUp, Lightbulb, Plus, X, Bookmark, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { RecommendedSupport, StudentIEPProfile } from '@/types/iepLibrary';
import { DOMAIN_DISPLAY_NAMES } from '@/types/iepLibrary';

interface SuggestedSupportsPanelProps {
  recommendations: RecommendedSupport[];
  isLoading: boolean;
  onAccept: (itemId: string) => void;
  onDismiss: (itemId: string) => void;
  onSaveForLater: (itemId: string) => void;
  studentProfile?: StudentIEPProfile;
}

export function SuggestedSupportsPanel({
  recommendations,
  isLoading,
  onAccept,
  onDismiss,
  onSaveForLater,
  studentProfile
}: SuggestedSupportsPanelProps) {
  const [isOpen, setIsOpen] = useState(true);

  if (!studentProfile) {
    return null;
  }

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                <CardTitle className="text-base">Suggested Supports</CardTitle>
                {recommendations.length > 0 && (
                  <Badge variant="secondary">{recommendations.length}</Badge>
                )}
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>
          </CollapsibleTrigger>
          <p className="text-sm text-muted-foreground">
            Recommendations based on the student's profile, goals, and classroom needs.
          </p>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="text-center py-6 text-muted-foreground">
                Analyzing student profile and generating recommendations...
              </div>
            ) : recommendations.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <p>No new recommendations available.</p>
                <p className="text-xs mt-1">
                  Recommendations are generated based on the student's grade, 
                  classification, and active skill domains.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recommendations.map((rec) => (
                  <RecommendationCard
                    key={rec.library_item.id}
                    recommendation={rec}
                    onAccept={() => onAccept(rec.library_item.id)}
                    onDismiss={() => onDismiss(rec.library_item.id)}
                    onSaveForLater={() => onSaveForLater(rec.library_item.id)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

interface RecommendationCardProps {
  recommendation: RecommendedSupport;
  onAccept: () => void;
  onDismiss: () => void;
  onSaveForLater: () => void;
}

function RecommendationCard({ recommendation, onAccept, onDismiss, onSaveForLater }: RecommendationCardProps) {
  const { library_item, reason, confidence, matching_factors } = recommendation;

  const getConfidenceColor = (conf: number) => {
    if (conf >= 70) return 'text-green-600';
    if (conf >= 40) return 'text-amber-600';
    return 'text-muted-foreground';
  };

  return (
    <div className="p-3 border rounded-lg bg-muted/30">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium">{library_item.title}</span>
            <Badge 
              variant={library_item.item_type === 'accommodation' ? 'default' : 'destructive'} 
              className="text-xs"
            >
              {library_item.item_type === 'accommodation' ? 'Accommodation' : 'Modification'}
            </Badge>
          </div>
          
          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
            {library_item.description}
          </p>

          {/* Confidence and Reason */}
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-1">
              <span className={`text-sm font-medium ${getConfidenceColor(confidence)}`}>
                {confidence}%
              </span>
              <span className="text-xs text-muted-foreground">confidence</span>
            </div>
            <Progress value={confidence} className="w-20 h-1.5" />
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-3.5 h-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">{reason}</p>
                <div className="mt-2 space-y-1 text-xs">
                  {matching_factors.grade_band_match && (
                    <div className="flex items-center gap-1 text-green-600">✓ Grade band match</div>
                  )}
                  {matching_factors.disability_match && (
                    <div className="flex items-center gap-1 text-green-600">✓ Classification match</div>
                  )}
                  {matching_factors.domain_match && (
                    <div className="flex items-center gap-1 text-green-600">✓ Domain match</div>
                  )}
                  {matching_factors.similar_student_acceptance > 0 && (
                    <div className="flex items-center gap-1 text-green-600">
                      ✓ {matching_factors.similar_student_acceptance}% similar student acceptance
                    </div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Domain tags */}
          <div className="flex flex-wrap gap-1">
            {library_item.domains.slice(0, 3).map(domain => (
              <Badge key={domain} variant="outline" className="text-xs">
                {DOMAIN_DISPLAY_NAMES[domain] || domain}
              </Badge>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1">
          <Button size="sm" onClick={onAccept} className="gap-1">
            <Plus className="w-3.5 h-3.5" />
            Add
          </Button>
          <Button variant="ghost" size="sm" onClick={onSaveForLater} className="gap-1">
            <Bookmark className="w-3.5 h-3.5" />
            Later
          </Button>
          <Button variant="ghost" size="sm" onClick={onDismiss} className="gap-1 text-muted-foreground">
            <X className="w-3.5 h-3.5" />
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  );
}
