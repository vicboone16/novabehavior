import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { supabase } from '@/integrations/supabase/client';

interface UtilizationChartsProps {
  dateRange: {
    from: Date;
    to: Date;
  };
  compact?: boolean;
}

export function UtilizationCharts({ dateRange, compact = false }: UtilizationChartsProps) {
  const [loading, setLoading] = useState(true);
  const [utilizationData, setUtilizationData] = useState<{ name: string; used: number; approved: number }[]>([]);

  useEffect(() => {
    fetchUtilizationData();
  }, [dateRange]);

  const fetchUtilizationData = async () => {
    try {
      setLoading(true);
      
      const { data: authorizations, error } = await supabase
        .from('authorizations')
        .select(`
          *,
          payers(name)
        `)
        .eq('status', 'active');

      if (error) throw error;

      const chartData = (authorizations || []).slice(0, 6).map(auth => ({
        name: (auth.payers as { name: string } | null)?.name?.substring(0, 15) || 'Unknown',
        used: auth.units_used || 0,
        approved: auth.units_approved || 0,
      }));

      setUtilizationData(chartData);
    } catch (error) {
      console.error('Error fetching utilization data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="h-[300px] animate-pulse bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Authorization Utilization</CardTitle>
      </CardHeader>
      <CardContent>
        {utilizationData.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            No authorization data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={compact ? 200 : 300}>
            <BarChart data={utilizationData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="name" 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                }}
              />
              <Bar dataKey="used" fill="hsl(var(--primary))" name="Used" />
              <Bar dataKey="approved" fill="hsl(var(--muted))" name="Approved" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
