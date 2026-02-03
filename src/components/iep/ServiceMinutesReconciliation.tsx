import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock, AlertTriangle, CheckCircle, Calendar, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInMinutes } from 'date-fns';

interface ServiceMinutesReconciliationProps {
  clientId: string;
}

interface ServicePlan {
  id: string;
  service_line: string;
  mandated_minutes_per_period: number;
  period_type: string;
  source: string;
  effective_start_date: string;
  effective_end_date: string | null;
}

interface DeliveredSummary {
  service_line: string;
  total_minutes: number;
  session_count: number;
}

export function ServiceMinutesReconciliation({ clientId }: ServiceMinutesReconciliationProps) {
  const [servicePlans, setServicePlans] = useState<ServicePlan[]>([]);
  const [deliveredMinutes, setDeliveredMinutes] = useState<DeliveredSummary[]>([]);
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [clientId, period]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load service plans
      const { data: plans, error: plansError } = await supabase
        .from('service_plan_minutes')
        .select('*')
        .eq('client_id', clientId)
        .or(`effective_end_date.is.null,effective_end_date.gte.${format(new Date(), 'yyyy-MM-dd')}`);

      if (plansError) throw plansError;
      setServicePlans(plans || []);

      // Calculate period dates
      const today = new Date();
      let startDate: Date, endDate: Date;
      
      if (period === 'week') {
        startDate = startOfWeek(today, { weekStartsOn: 1 });
        endDate = endOfWeek(today, { weekStartsOn: 1 });
      } else {
        startDate = startOfMonth(today);
        endDate = endOfMonth(today);
      }

      // Load delivered minutes
      const sessions: any[] = [];

      // Aggregate by service line
      const aggregated: Record<string, DeliveredSummary> = {};
      
      for (const session of sessions || []) {
        const serviceLine = session.service_type || 'unknown';
        
        if (!aggregated[serviceLine]) {
          aggregated[serviceLine] = {
            service_line: serviceLine,
            total_minutes: 0,
            session_count: 0,
          };
        }
        
        // Calculate duration
        if (session.start_time && session.end_time) {
          const duration = differenceInMinutes(new Date(session.end_time), new Date(session.start_time));
          aggregated[serviceLine].total_minutes += duration;
        }
        aggregated[serviceLine].session_count++;
      }

      setDeliveredMinutes(Object.values(aggregated));
    } catch (error) {
      console.error('Error loading reconciliation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getComplianceStatus = (plan: ServicePlan) => {
    const delivered = deliveredMinutes.find(d => 
      d.service_line.toLowerCase().includes(plan.service_line.toLowerCase()) ||
      plan.service_line.toLowerCase().includes(d.service_line.toLowerCase())
    );
    
    const deliveredMins = delivered?.total_minutes || 0;
    const mandated = plan.mandated_minutes_per_period;
    
    // Adjust mandated minutes based on period mismatch
    let adjustedMandated = mandated;
    if (plan.period_type === 'month' && period === 'week') {
      adjustedMandated = Math.round(mandated / 4);
    } else if (plan.period_type === 'week' && period === 'month') {
      adjustedMandated = mandated * 4;
    }
    
    const percentage = adjustedMandated > 0 ? (deliveredMins / adjustedMandated) * 100 : 0;
    
    return {
      delivered: deliveredMins,
      mandated: adjustedMandated,
      percentage: Math.min(100, percentage),
      isCompliant: percentage >= 90,
      isAtRisk: percentage < 90 && percentage >= 70,
      isCritical: percentage < 70,
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Service Minutes Reconciliation
          </h3>
          <p className="text-sm text-muted-foreground">
            Mandated vs. delivered service hours
          </p>
        </div>
        <Select value={period} onValueChange={(v: 'week' | 'month') => setPeriod(v)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading...
          </CardContent>
        </Card>
      ) : servicePlans.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium">No Service Plans</h3>
            <p className="text-sm text-muted-foreground">
              Add mandated service minutes from IEP or contract to enable reconciliation.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            {servicePlans.map(plan => {
              const status = getComplianceStatus(plan);
              return (
                <Card key={plan.id} className={
                  status.isCritical ? 'border-destructive' :
                  status.isAtRisk ? 'border-amber-300' : ''
                }>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{plan.service_line}</span>
                      {status.isCompliant ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : status.isAtRisk ? (
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                      )}
                    </div>
                    
                    <div className="text-2xl font-bold mb-1">
                      {status.delivered} / {status.mandated}
                      <span className="text-sm font-normal text-muted-foreground ml-1">min</span>
                    </div>
                    
                    <Progress 
                      value={status.percentage} 
                      className={`h-2 ${
                        status.isCritical ? '[&>div]:bg-destructive' :
                        status.isAtRisk ? '[&>div]:bg-amber-500' : ''
                      }`}
                    />
                    
                    <p className="text-sm text-muted-foreground mt-2">
                      {Math.round(status.percentage)}% of {plan.period_type}ly requirement
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Detailed Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detailed Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service Line</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Mandated</TableHead>
                    <TableHead>Delivered</TableHead>
                    <TableHead>Sessions</TableHead>
                    <TableHead>Variance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {servicePlans.map(plan => {
                    const status = getComplianceStatus(plan);
                    const delivered = deliveredMinutes.find(d => 
                      d.service_line.toLowerCase().includes(plan.service_line.toLowerCase())
                    );
                    const variance = status.delivered - status.mandated;
                    
                    return (
                      <TableRow key={plan.id}>
                        <TableCell className="font-medium">{plan.service_line}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{plan.source}</Badge>
                        </TableCell>
                        <TableCell>{status.mandated} min</TableCell>
                        <TableCell>{status.delivered} min</TableCell>
                        <TableCell>{delivered?.session_count || 0}</TableCell>
                        <TableCell>
                          <span className={
                            variance >= 0 ? 'text-green-600' : 'text-destructive'
                          }>
                            {variance >= 0 ? '+' : ''}{variance} min
                          </span>
                        </TableCell>
                        <TableCell>
                          {status.isCompliant ? (
                            <Badge className="bg-green-500">On Track</Badge>
                          ) : status.isAtRisk ? (
                            <Badge className="bg-amber-500">At Risk</Badge>
                          ) : (
                            <Badge variant="destructive">Critical</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Compliance Alert */}
          {servicePlans.some(p => getComplianceStatus(p).isCritical) && (
            <Card className="border-destructive bg-destructive/5">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <div>
                    <p className="font-medium text-destructive">Compliance Risk Detected</p>
                    <p className="text-sm text-muted-foreground">
                      One or more service lines are below 70% of mandated minutes. Immediate attention required.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
