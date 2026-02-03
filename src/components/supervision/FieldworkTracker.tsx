import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Plus, Clock, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { FieldworkHours } from '@/types/supervision';
import { useAuth } from '@/contexts/AuthContext';

export function FieldworkTracker() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [fieldworkHours, setFieldworkHours] = useState<FieldworkHours[]>([]);
  const [totalHours, setTotalHours] = useState({
    supervised: 0,
    independent: 0,
    total: 0,
  });

  const TARGET_HOURS = 2000; // BACB requirement

  useEffect(() => {
    fetchFieldworkData();
  }, [user?.id]);

  const fetchFieldworkData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('fieldwork_hours')
        .select('*')
        .or(`trainee_user_id.eq.${user.id},supervisor_user_id.eq.${user.id}`)
        .order('fieldwork_date', { ascending: false });

      if (error) throw error;

      setFieldworkHours(data as FieldworkHours[] || []);

      // Calculate totals
      const supervised = data?.filter(h => h.hours_type === 'supervised').reduce((sum, h) => sum + Number(h.hours), 0) || 0;
      const independent = data?.filter(h => h.hours_type === 'independent').reduce((sum, h) => sum + Number(h.hours), 0) || 0;

      setTotalHours({
        supervised,
        independent,
        total: supervised + independent,
      });
    } catch (error) {
      console.error('Error fetching fieldwork data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const progressPercentage = Math.min((totalHours.total / TARGET_HOURS) * 100, 100);

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Fieldwork Progress</span>
            <Badge variant="outline">{progressPercentage.toFixed(1)}% Complete</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Total Hours: {totalHours.total.toFixed(1)}</span>
              <span>Target: {TARGET_HOURS} hours</span>
            </div>
            <Progress value={progressPercentage} className="h-3" />
          </div>
          
          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-primary">{totalHours.supervised.toFixed(1)}</p>
              <p className="text-sm text-muted-foreground">Supervised Hours</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold">{totalHours.independent.toFixed(1)}</p>
              <p className="text-sm text-muted-foreground">Independent Hours</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Fieldwork Entries */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Fieldwork Log</CardTitle>
          <Button size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            Log Hours
          </Button>
        </CardHeader>
        <CardContent>
          {fieldworkHours.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No fieldwork hours logged yet. Start logging your experience!
            </div>
          ) : (
            <div className="space-y-3">
              {fieldworkHours.slice(0, 10).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{Number(entry.hours).toFixed(1)} hours</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(entry.fieldwork_date).toLocaleDateString()} • {entry.experience_type}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={entry.hours_type === 'supervised' ? 'default' : 'secondary'}>
                      {entry.hours_type}
                    </Badge>
                    {entry.verified ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <Clock className="w-4 h-4 text-yellow-500" />
                    )}
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
