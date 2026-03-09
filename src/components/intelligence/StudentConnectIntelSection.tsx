import { Heart, Star, TrendingUp, Loader2, Sparkles, Shield, BookOpen, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useStudentConnectAlerts, useStudentIntelSummary } from '@/hooks/useClinicalIntelligenceAlerts';
import { useBehaviorEventIntelligence } from '@/hooks/useBehaviorEventIntelligence';
import { useParentTrainingIntelAlerts } from '@/hooks/useParentTrainingIntelligence';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  studentId: string | null | undefined;
}

const toneIcons: Record<string, React.ReactNode> = {
  positive: <Star className="w-4 h-4 text-emerald-500" />,
  needs_attention: <TrendingUp className="w-4 h-4 text-orange-500" />,
  neutral: <Heart className="w-4 h-4 text-blue-500" />,
};

const toneBadgeColors: Record<string, string> = {
  positive: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  needs_attention: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
  neutral: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
};

// Map caregiver alert types to student-connect-safe labels
const caregiverConnectLabels: Record<string, { label: string; tone: 'positive' | 'neutral' | 'needs_attention' }> = {
  caregiver_improving: { label: 'Making progress in caregiver training', tone: 'positive' },
  caregiver_goal_mastered: { label: 'Caregiver goal met! 🎉', tone: 'positive' },
  caregiver_module_completed: { label: 'Caregiver training module completed', tone: 'positive' },
};

export function StudentConnectIntelSection({ studentId }: Props) {
  const { summary, loading: summaryLoading } = useStudentIntelSummary(studentId);
  const { alerts, loading: alertsLoading } = useStudentConnectAlerts(studentId);
  const { connectHighlights, loading: bxLoading } = useBehaviorEventIntelligence(studentId);
  const { alerts: caregiverAlerts, loading: cgLoading } = useParentTrainingIntelAlerts({
    clientId: studentId || undefined,
    activeOnly: true,
    studentConnectOnly: true,
  });

  const loading = summaryLoading || alertsLoading || bxLoading || cgLoading;

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Transform caregiver alerts to connect-safe highlights
  const caregiverHighlights = caregiverAlerts
    .filter(a => a.alert_type && caregiverConnectLabels[a.alert_type])
    .map(a => caregiverConnectLabels[a.alert_type!]);

  if (!summary && alerts.length === 0 && connectHighlights.length === 0 && caregiverHighlights.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Progress updates will appear here as data becomes available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary highlights */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {summary.mastered_targets > 0 && (
            <ProgressCard label="Goals Met" value={summary.mastered_targets} color="text-emerald-500" />
          )}
          {summary.in_progress_targets > 0 && (
            <ProgressCard label="Goals In Progress" value={summary.in_progress_targets} color="text-blue-500" />
          )}
          {summary.strong_replacements > 0 && (
            <ProgressCard label="Strong Support Skills" value={summary.strong_replacements} color="text-emerald-500" />
          )}
          {summary.total_targets > 0 && (
            <ProgressCard label="Total Skills Tracked" value={summary.total_targets} color="text-foreground" />
          )}
        </div>
      )}

      {/* Caregiver Training Highlights (simplified, encouraging) */}
      {caregiverHighlights.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-500" />
              Caregiver Training Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {caregiverHighlights.map((h, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-md border border-border/30">
                  {h.tone === 'positive' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <Heart className="w-4 h-4 text-blue-500 shrink-0" />
                  )}
                  <p className="text-sm text-foreground">{h.label}</p>
                  <Badge variant="outline" className={`ml-auto text-[9px] ${toneBadgeColors[h.tone] || ''}`}>
                    {h.tone === 'positive' ? '✨' : '💙'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Behavior Support Highlights (simplified, role-appropriate) */}
      {connectHighlights.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-500" />
              Behavior Support Highlights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {connectHighlights.map((h, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-md border border-border/30">
                  {h.tone === 'positive' ? (
                    <Star className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : h.tone === 'needs_attention' ? (
                    <TrendingUp className="w-4 h-4 text-orange-500 shrink-0" />
                  ) : (
                    <Heart className="w-4 h-4 text-blue-500 shrink-0" />
                  )}
                  <p className="text-sm text-foreground">{h.label}</p>
                  <Badge variant="outline" className={`ml-auto text-[9px] ${toneBadgeColors[h.tone] || ''}`}>
                    {h.tone === 'positive' ? '✨' : h.tone === 'needs_attention' ? '📋' : '💙'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Student-connect-safe alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Progress Updates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.slice(0, 10).map(alert => (
                <div key={alert.alert_id} className="flex items-start gap-3 p-2 rounded-md border border-border/30">
                  {toneIcons[alert.tone] || toneIcons.neutral}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{alert.friendly_title}</p>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <Badge variant="outline" className={`text-[9px] ${toneBadgeColors[alert.tone] || ''}`}>
                    {alert.tone === 'positive' ? '✨' : alert.tone === 'needs_attention' ? '📋' : '💙'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ProgressCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className="py-3 px-4 text-center">
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
