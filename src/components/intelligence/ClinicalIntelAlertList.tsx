import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ChevronRight, Filter, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { CIIntelAlert } from '@/hooks/useClinicalIntelligenceAlerts';

const severityColors: Record<string, string> = {
  critical: 'bg-destructive text-destructive-foreground',
  action: 'bg-orange-500 text-white',
  high: 'bg-orange-500 text-white',
  watch: 'bg-yellow-500 text-white',
  medium: 'bg-yellow-500 text-white',
  info: 'bg-blue-500 text-white',
};

const domainLabels: Record<string, string> = {
  behavior: 'Behavior',
  skill: 'Skill',
  caregiver: 'Caregiver',
  supervision: 'Supervision',
  clinical_tracking: 'Clinical Tracking',
  programming: 'Programming',
  general: 'General',
};

function getDrilldownRoute(alert: CIIntelAlert): string | null {
  if (!alert.client_id) return null;
  const base = `/students/${alert.client_id}`;
  switch (alert.domain) {
    case 'skill': return base + '?tab=programming';
    case 'behavior': return base + '?tab=programming';
    case 'programming': return base + '?tab=programming';
    case 'caregiver': return base + '?tab=caregiver-training';
    default: return base + '?tab=intelligence';
  }
}

interface Props {
  alerts: CIIntelAlert[];
  loading: boolean;
  resolveAlert: (id: string, userId: string) => Promise<boolean>;
  showFilters?: boolean;
  maxItems?: number;
  compact?: boolean;
  emptyMessage?: string;
}

export function ClinicalIntelAlertList({
  alerts,
  loading,
  resolveAlert,
  showFilters = true,
  maxItems,
  compact = false,
  emptyMessage = 'No active intelligence alerts right now',
}: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [severityFilter, setSeverityFilter] = useState('all');
  const [domainFilter, setDomainFilter] = useState('all');

  const filtered = useMemo(() => {
    const severityOrder: Record<string, number> = { critical: 0, action: 1, high: 1, watch: 2, medium: 2, info: 3 };
    let data = [...alerts];
    if (severityFilter !== 'all') data = data.filter(a => a.severity === severityFilter);
    if (domainFilter !== 'all') data = data.filter(a => a.domain === domainFilter);
    data.sort((a, b) => (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4));
    return maxItems ? data.slice(0, maxItems) : data;
  }, [alerts, severityFilter, domainFilter, maxItems]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {showFilters && alerts.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severity</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>
          <Select value={domainFilter} onValueChange={setDomainFilter}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Domain" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Domains</SelectItem>
              <SelectItem value="behavior">Behavior</SelectItem>
              <SelectItem value="skill">Skill</SelectItem>
              <SelectItem value="caregiver">Caregiver</SelectItem>
              <SelectItem value="programming">Programming</SelectItem>
              <SelectItem value="supervision">Supervision</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground ml-auto">
            {filtered.length} alert{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          </CardContent>
        </Card>
      ) : (
        filtered.map(alert => {
          const drilldown = getDrilldownRoute(alert);
          return (
            <Card
              key={alert.alert_id}
              className={
                alert.severity === 'critical' ? 'border-destructive/40' :
                alert.severity === 'high' || alert.severity === 'action' ? 'border-orange-500/40' : ''
              }
            >
              <CardContent className={compact ? 'py-2 px-3' : 'py-3 px-4'}>
                <div className="flex items-start gap-3">
                  <Badge className={`${severityColors[alert.severity] || 'bg-muted'} text-[10px] shrink-0 mt-0.5`}>
                    {alert.severity}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className={compact ? 'text-xs font-medium' : 'text-sm font-medium'}>{alert.title}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <Badge variant="outline" className="text-[9px]">
                        {domainLabels[alert.domain] || alert.domain}
                      </Badge>
                      {alert.client_name && (
                        <span className="text-[10px] text-muted-foreground">{alert.client_name}</span>
                      )}
                      {alert.suggested_action && (
                        <span className="text-[10px] text-muted-foreground italic">→ {alert.suggested_action}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {drilldown && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => navigate(drilldown)}
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={async () => {
                        if (!user) return;
                        const ok = await resolveAlert(alert.alert_id, user.id);
                        if (ok) toast.success('Alert resolved');
                      }}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
