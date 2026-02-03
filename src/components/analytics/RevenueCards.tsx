import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface RevenueCardsProps {
  dateRange: {
    from: Date;
    to: Date;
  };
  expanded?: boolean;
}

export function RevenueCards({ dateRange, expanded = false }: RevenueCardsProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalBilled: 0,
    totalCollected: 0,
    outstanding: 0,
    collectionRate: 0,
  });

  useEffect(() => {
    fetchRevenueData();
  }, [dateRange]);

  const fetchRevenueData = async () => {
    try {
      setLoading(true);
      
      const { data: claims, error } = await supabase
        .from('billing_claims')
        .select('total_charges, paid_amount, status')
        .gte('service_date_from', dateRange.from.toISOString().split('T')[0])
        .lte('service_date_to', dateRange.to.toISOString().split('T')[0]);

      if (error) throw error;

      const totalBilled = claims?.reduce((sum, c) => sum + Number(c.total_charges), 0) || 0;
      const totalCollected = claims?.reduce((sum, c) => sum + Number(c.paid_amount || 0), 0) || 0;
      const outstanding = totalBilled - totalCollected;
      const collectionRate = totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0;

      setStats({ totalBilled, totalCollected, outstanding, collectionRate });
    } catch (error) {
      console.error('Error fetching revenue data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="h-16 animate-pulse bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Billed</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(stats.totalBilled)}</div>
          <p className="text-xs text-muted-foreground">For selected period</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Collected</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalCollected)}</div>
          <p className="text-xs text-muted-foreground">Payments received</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Outstanding AR</CardTitle>
          <Clock className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">{formatCurrency(stats.outstanding)}</div>
          <p className="text-xs text-muted-foreground">Pending collection</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
          {stats.collectionRate >= 90 ? (
            <TrendingUp className="h-4 w-4 text-green-500" />
          ) : (
            <TrendingDown className="h-4 w-4 text-destructive" />
          )}
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${stats.collectionRate >= 90 ? 'text-green-600' : 'text-destructive'}`}>
            {stats.collectionRate.toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground">Target: 90%+</p>
        </CardContent>
      </Card>
    </div>
  );
}
