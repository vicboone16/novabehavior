import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, Calendar, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { BillingClaim, DENIAL_REASON_CODES } from '@/types/billing';
import { differenceInDays } from 'date-fns';

export function DenialTracker() {
  const [loading, setLoading] = useState(true);
  const [deniedClaims, setDeniedClaims] = useState<BillingClaim[]>([]);

  useEffect(() => {
    fetchDeniedClaims();
  }, []);

  const fetchDeniedClaims = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('billing_claims')
        .select('*')
        .in('status', ['denied', 'appealed'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDeniedClaims(data as BillingClaim[] || []);
    } catch (error) {
      console.error('Error fetching denied claims:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDenialReasonLabel = (code: string | null | undefined) => {
    if (!code) return 'Unknown';
    const reason = DENIAL_REASON_CODES.find(r => r.code === code);
    return reason?.description || code;
  };

  const getAppealUrgency = (claim: BillingClaim) => {
    if (!claim.appeal_deadline) return null;
    const daysUntil = differenceInDays(new Date(claim.appeal_deadline), new Date());
    if (daysUntil < 0) return { label: 'Expired', variant: 'destructive' as const };
    if (daysUntil <= 7) return { label: `${daysUntil} days left`, variant: 'destructive' as const };
    if (daysUntil <= 14) return { label: `${daysUntil} days left`, variant: 'secondary' as const };
    return { label: `${daysUntil} days left`, variant: 'outline' as const };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {deniedClaims.filter(c => c.status === 'denied').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Under Appeal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {deniedClaims.filter(c => c.status === 'appealed').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Urgent Appeals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {deniedClaims.filter(c => {
                if (!c.appeal_deadline) return false;
                return differenceInDays(new Date(c.appeal_deadline), new Date()) <= 7;
              }).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Denied Claims List */}
      <Card>
        <CardHeader>
          <CardTitle>Denied & Appealed Claims</CardTitle>
        </CardHeader>
        <CardContent>
          {deniedClaims.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No denied claims. Great job!
            </div>
          ) : (
            <div className="space-y-3">
              {deniedClaims.map((claim) => {
                const urgency = getAppealUrgency(claim);
                
                return (
                  <div 
                    key={claim.id}
                    className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{claim.claim_number}</p>
                          <Badge variant={claim.status === 'denied' ? 'destructive' : 'secondary'}>
                            {claim.status === 'denied' ? 'Denied' : 'Appealed'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {getDenialReasonLabel(claim.denial_code)}
                        </p>
                        {claim.denial_reason && (
                          <p className="text-sm text-muted-foreground">{claim.denial_reason}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            ${Number(claim.total_charges).toFixed(2)}
                          </span>
                          {claim.appeal_deadline && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Deadline: {new Date(claim.appeal_deadline).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      {urgency && (
                        <Badge variant={urgency.variant}>{urgency.label}</Badge>
                      )}
                      {claim.status === 'denied' && (
                        <Button size="sm" variant="outline">
                          Start Appeal
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
