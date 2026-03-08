import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Settings, ToggleLeft, ToggleRight } from 'lucide-react';
import type { RecommendationProfile } from '@/hooks/useBehaviorRecommendations';

interface Props {
  profile: RecommendationProfile;
  canEdit: boolean;
  onToggleActive: (id: string, active: boolean) => void;
}

const formatLabel = (s: string | null) => s?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '—';

export function ProfileCard({ profile, canEdit, onToggleActive }: Props) {
  return (
    <Card className={`transition-opacity ${!profile.is_active ? 'opacity-60' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-foreground truncate">{profile.title || 'Untitled Profile'}</h4>
            {profile.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{profile.description}</p>
            )}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {profile.function_target && <Badge variant="outline" className="text-xs">{formatLabel(profile.function_target)}</Badge>}
              {profile.environment && <Badge variant="secondary" className="text-xs">{formatLabel(profile.environment)}</Badge>}
              {profile.escalation_level && <Badge variant="secondary" className="text-xs">{formatLabel(profile.escalation_level)}</Badge>}
              {profile.tier && <Badge variant="secondary" className="text-xs">{formatLabel(profile.tier)}</Badge>}
              {profile.age_band && <Badge variant="secondary" className="text-xs">{formatLabel(profile.age_band)}</Badge>}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {profile.strategy_count ?? 0} linked strategies
            </p>
          </div>
          {canEdit && profile.id && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleActive(profile.id!, !profile.is_active)}
            >
              {profile.is_active
                ? <ToggleRight className="h-4 w-4 text-green-600" />
                : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
