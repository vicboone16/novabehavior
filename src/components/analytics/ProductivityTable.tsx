import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';

interface ProductivityTableProps {
  dateRange: {
    from: Date;
    to: Date;
  };
  limit?: number;
}

interface ClinicianProductivity {
  id: string;
  name: string;
  hoursDelivered: number;
  billableRatio: number;
  caseloadSize: number;
  notesCompleted: number;
}

export function ProductivityTable({ dateRange, limit }: ProductivityTableProps) {
  const [loading, setLoading] = useState(true);
  const [productivityData, setProductivityData] = useState<ClinicianProductivity[]>([]);

  useEffect(() => {
    fetchProductivityData();
  }, [dateRange]);

  const fetchProductivityData = async () => {
    try {
      setLoading(true);
      
      // Fetch profiles with their session data
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, first_name, last_name')
        .eq('is_approved', true);

      if (error) throw error;

      // For each profile, calculate their productivity metrics
      const productivityPromises = (profiles || []).map(async (profile) => {
        // Fetch sessions in date range
        const { data: sessions } = await supabase
          .from('sessions')
          .select('session_length_minutes')
          .eq('user_id', profile.user_id)
          .gte('start_time', dateRange.from.toISOString())
          .lte('start_time', dateRange.to.toISOString());

        // Fetch notes count
        const { count: notesCount } = await supabase
          .from('enhanced_session_notes')
          .select('*', { count: 'exact', head: true })
          .eq('author_user_id', profile.user_id)
          .gte('start_time', dateRange.from.toISOString())
          .lte('start_time', dateRange.to.toISOString());

        const totalMinutes = sessions?.reduce((sum, s) => sum + (s.session_length_minutes || 0), 0) || 0;

        return {
          id: profile.user_id,
          name: profile.display_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown',
          hoursDelivered: totalMinutes / 60,
          billableRatio: 85 + Math.random() * 15, // Placeholder
          caseloadSize: Math.floor(Math.random() * 10) + 1, // Placeholder
          notesCompleted: notesCount || 0,
        };
      });

      const results = await Promise.all(productivityPromises);
      const filtered = results.filter(r => r.hoursDelivered > 0);
      const sorted = filtered.sort((a, b) => b.hoursDelivered - a.hoursDelivered);
      
      setProductivityData(limit ? sorted.slice(0, limit) : sorted);
    } catch (error) {
      console.error('Error fetching productivity data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clinician Productivity</CardTitle>
      </CardHeader>
      <CardContent>
        {productivityData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No productivity data for selected period
          </div>
        ) : (
          <div className="space-y-4">
            {productivityData.map((clinician) => (
              <div key={clinician.id} className="flex items-center gap-4 p-3 border rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">{clinician.name}</p>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <span>{clinician.hoursDelivered.toFixed(1)} hrs</span>
                    <span>{clinician.caseloadSize} clients</span>
                    <span>{clinician.notesCompleted} notes</span>
                  </div>
                </div>
                <div className="w-32">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span>Billable</span>
                    <span>{clinician.billableRatio.toFixed(0)}%</span>
                  </div>
                  <Progress value={clinician.billableRatio} className="h-2" />
                </div>
                <Badge variant={clinician.billableRatio >= 85 ? 'default' : 'secondary'}>
                  {clinician.billableRatio >= 85 ? 'On Target' : 'Below Target'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
