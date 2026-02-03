import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { supabase } from '@/integrations/supabase/client';

interface OutcomesSummaryProps {
  dateRange: {
    from: Date;
    to: Date;
  };
  compact?: boolean;
}

export function OutcomesSummary({ dateRange, compact = false }: OutcomesSummaryProps) {
  const [loading, setLoading] = useState(true);
  const [outcomeData, setOutcomeData] = useState<{ name: string; value: number; color: string }[]>([]);

  useEffect(() => {
    fetchOutcomeData();
  }, [dateRange]);

  const fetchOutcomeData = async () => {
    try {
      setLoading(true);
      
      // Placeholder data - would aggregate from actual goal progress
      setOutcomeData([
        { name: 'Mastered', value: 15, color: 'hsl(var(--primary))' },
        { name: 'In Progress', value: 45, color: 'hsl(var(--muted-foreground))' },
        { name: 'Not Started', value: 10, color: 'hsl(var(--muted))' },
      ]);
    } catch (error) {
      console.error('Error fetching outcome data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="h-[200px] animate-pulse bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Goal Outcomes</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={compact ? 200 : 300}>
          <PieChart>
            <Pie
              data={outcomeData}
              cx="50%"
              cy="50%"
              innerRadius={compact ? 40 : 60}
              outerRadius={compact ? 70 : 100}
              dataKey="value"
              label={!compact}
            >
              {outcomeData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
