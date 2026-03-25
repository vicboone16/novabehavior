import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, ArrowRight, Monitor, Smartphone, 
  Database, CheckCircle2, AlertTriangle, Clock,
  TrendingUp, TrendingDown, Minus, Activity, Loader2
} from 'lucide-react';
import { useLatestParentInsight } from '@/hooks/useParentInsights';
import { useStudentRewardSummary } from '@/hooks/useBeaconCoreData';

interface Props {
  studentId: string;
  studentName: string;
}

export function ClinicalSyncPanel({ studentId, studentName }: Props) {
  const { insight, loading: insightLoading } = useLatestParentInsight(studentId);
  const { summary: rewardSummary, loading: rewardLoading } = useStudentRewardSummary(studentId);

  const firstName = studentName.split(' ')[0] || 'Student';
  const loading = insightLoading || rewardLoading;

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Preview badge */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg border border-dashed border-border">
        <Brain className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs text-muted-foreground font-medium">
          Clinical Sync Status — How data flows for {firstName}
        </span>
      </div>

      {/* Data Flow Diagram */}
      <Card className="border-primary/20">
        <CardHeader className="py-3 px-5">
          <CardTitle className="text-sm">Data Flow Pipeline</CardTitle>
        </CardHeader>
        <CardContent className="py-0 pb-4 px-5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <FlowNode 
              icon={<Monitor className="w-4 h-4" />} 
              label="Teacher (Beacon)" 
              status="active"
              detail="Live data entry"
            />
            <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
            <FlowNode 
              icon={<Database className="w-4 h-4" />} 
              label="Core Engine" 
              status="active"
              detail="Analysis layer"
            />
            <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
            <FlowNode 
              icon={<Smartphone className="w-4 h-4" />} 
              label="Parent App" 
              status={insight ? 'active' : 'pending'}
              detail={insight ? 'Insight ready' : 'Awaiting insight'}
            />
          </div>
        </CardContent>
      </Card>

      {/* Sync Status Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">Beacon → Core</span>
            </div>
            <div className="space-y-1.5">
              <SyncRow label="Points Ledger" status="synced" value={rewardSummary ? `${rewardSummary.total_earned} earned` : 'No data'} />
              <SyncRow label="Game Events" status="synced" value="Real-time" />
              <SyncRow label="Behavior Logs" status="synced" value="Auto-aggregate" />
              <SyncRow label="Mayday Alerts" status="synced" value="Instant" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-pink-500" />
              <span className="text-xs font-semibold text-foreground">Core → Parent</span>
            </div>
            <div className="space-y-1.5">
              <SyncRow 
                label="Daily Insight" 
                status={insight ? 'synced' : 'pending'} 
                value={insight ? insight.insight_date : 'Not generated'} 
              />
              <SyncRow 
                label="Behavior Translation" 
                status="synced" 
                value="10 mappings" 
              />
              <SyncRow 
                label="Reward Summary" 
                status={rewardSummary ? 'synced' : 'pending'}
                value={rewardSummary ? `${rewardSummary.balance} bal` : 'No data'} 
              />
              <SyncRow label="Teacher Notes" status="synced" value="Pass-through" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Clinical Intelligence Summary */}
      <Card>
        <CardHeader className="py-3 px-5">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            Clinical Analysis ({firstName})
          </CardTitle>
        </CardHeader>
        <CardContent className="py-0 pb-4 px-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Primary Function</p>
              <p className="text-sm font-semibold text-foreground">Escape</p>
              <p className="text-[11px] text-muted-foreground">Task avoidance pattern</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Risk Level</p>
              <div className="flex items-center gap-1.5">
                <Badge className="bg-orange-500/15 text-orange-600 dark:text-orange-400 text-xs">Medium</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Escape-maintained</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Trend</p>
              <div className="flex items-center gap-1.5">
                <TrendingDown className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-semibold text-emerald-600">Improving</span>
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Reinforcement</p>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-semibold text-foreground">Effective</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* What Each Surface Sees */}
      <Card>
        <CardHeader className="py-3 px-5">
          <CardTitle className="text-sm">One Behavior → Three Views</CardTitle>
        </CardHeader>
        <CardContent className="py-0 pb-4 px-5">
          <div className="space-y-2">
            <ViewRow 
              surface="Teacher" 
              icon={<Monitor className="w-3.5 h-3.5" />}
              sees="What to do: Use choices before demands. Reinforce compliance within 3s."
              color="text-primary"
            />
            <ViewRow 
              surface="Parent" 
              icon={<Smartphone className="w-3.5 h-3.5" />}
              sees={`What it means: ${firstName} is learning to handle challenging activities with support.`}
              color="text-pink-500"
            />
            <ViewRow 
              surface="BCBA" 
              icon={<Brain className="w-3.5 h-3.5" />}
              sees="Why it's happening: Escape-maintained task avoidance. DRA + antecedent modification recommended."
              color="text-purple-500"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FlowNode({ icon, label, status, detail }: { 
  icon: React.ReactNode; 
  label: string; 
  status: 'active' | 'pending' | 'error';
  detail: string;
}) {
  const borderColor = status === 'active' ? 'border-emerald-500/30' : status === 'error' ? 'border-destructive/30' : 'border-yellow-500/30';
  const StatusIcon = status === 'active' ? CheckCircle2 : status === 'error' ? AlertTriangle : Clock;
  const iconColor = status === 'active' ? 'text-emerald-500' : status === 'error' ? 'text-destructive' : 'text-yellow-500';

  return (
    <div className={`flex flex-col items-center gap-1 p-2 rounded-lg border ${borderColor} bg-card min-w-[80px]`}>
      <div className="text-muted-foreground">{icon}</div>
      <span className="font-medium text-foreground text-center leading-tight">{label}</span>
      <div className="flex items-center gap-0.5">
        <StatusIcon className={`w-3 h-3 ${iconColor}`} />
        <span className="text-[10px] text-muted-foreground">{detail}</span>
      </div>
    </div>
  );
}

function SyncRow({ label, status, value }: { label: string; status: 'synced' | 'pending' | 'error'; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        {status === 'synced' ? (
          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
        ) : status === 'error' ? (
          <AlertTriangle className="w-3 h-3 text-destructive" />
        ) : (
          <Clock className="w-3 h-3 text-yellow-500" />
        )}
        <span className="text-[11px] text-foreground">{label}</span>
      </div>
      <span className="text-[10px] text-muted-foreground">{value}</span>
    </div>
  );
}

function ViewRow({ surface, icon, sees, color }: { surface: string; icon: React.ReactNode; sees: string; color: string }) {
  return (
    <div className="flex items-start gap-3 p-2.5 bg-muted/30 rounded-lg">
      <div className={`${color} mt-0.5 shrink-0`}>{icon}</div>
      <div>
        <p className={`text-xs font-semibold ${color}`}>{surface}</p>
        <p className="text-[11px] text-muted-foreground leading-relaxed">{sees}</p>
      </div>
    </div>
  );
}
