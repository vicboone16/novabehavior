import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DollarSign, FileText, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { BillingClaim, ClaimStatus } from '@/types/billing';

interface BillingDashboardProps {
  showAllClaims?: boolean;
}

export function BillingDashboard({ showAllClaims = false }: BillingDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState<BillingClaim[]>([]);
  const [stats, setStats] = useState({
    draft: { count: 0, amount: 0 },
    submitted: { count: 0, amount: 0 },
    paid: { count: 0, amount: 0 },
    denied: { count: 0, amount: 0 },
  });

  useEffect(() => {
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('billing_claims')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const claimsData = data as BillingClaim[] || [];
      setClaims(claimsData);

      // Calculate stats
      const newStats = {
        draft: { count: 0, amount: 0 },
        submitted: { count: 0, amount: 0 },
        paid: { count: 0, amount: 0 },
        denied: { count: 0, amount: 0 },
      };

      claimsData.forEach(claim => {
        if (claim.status === 'draft' || claim.status === 'ready') {
          newStats.draft.count++;
          newStats.draft.amount += Number(claim.total_charges);
        } else if (claim.status === 'submitted') {
          newStats.submitted.count++;
          newStats.submitted.amount += Number(claim.total_charges);
        } else if (claim.status === 'paid' || claim.status === 'partial') {
          newStats.paid.count++;
          newStats.paid.amount += Number(claim.paid_amount || 0);
        } else if (claim.status === 'denied' || claim.status === 'appealed') {
          newStats.denied.count++;
          newStats.denied.amount += Number(claim.total_charges);
        }
      });

      setStats(newStats);
    } catch (error) {
      console.error('Error fetching claims:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: ClaimStatus) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'ready':
        return <Badge variant="outline">Ready</Badge>;
      case 'submitted':
        return <Badge className="bg-blue-500">Submitted</Badge>;
      case 'paid':
        return <Badge className="bg-green-500">Paid</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-500">Partial</Badge>;
      case 'denied':
        return <Badge variant="destructive">Denied</Badge>;
      case 'appealed':
        return <Badge className="bg-orange-500">Appealed</Badge>;
      case 'void':
        return <Badge variant="outline">Void</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
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
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft Claims</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.draft.count}</div>
            <p className="text-xs text-muted-foreground">
              ${stats.draft.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Submitted</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.submitted.count}</div>
            <p className="text-xs text-muted-foreground">
              ${stats.submitted.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.paid.count}</div>
            <p className="text-xs text-muted-foreground">
              ${stats.paid.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Denied</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.denied.count}</div>
            <p className="text-xs text-muted-foreground">
              ${stats.denied.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Claims Table */}
      <Card>
        <CardHeader>
          <CardTitle>{showAllClaims ? 'All Claims' : 'Recent Claims'}</CardTitle>
        </CardHeader>
        <CardContent>
          {claims.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No claims yet. Click "New Claim" to generate one from session data.
            </div>
          ) : (
            <div className="space-y-2">
              {(showAllClaims ? claims : claims.slice(0, 10)).map((claim) => (
                <div 
                  key={claim.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <DollarSign className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{claim.claim_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(claim.service_date_from).toLocaleDateString()} - {new Date(claim.service_date_to).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-medium">
                        ${Number(claim.total_charges).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                      {claim.paid_amount && (
                        <p className="text-sm text-green-600">
                          Paid: ${Number(claim.paid_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                      )}
                    </div>
                    {getStatusBadge(claim.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
