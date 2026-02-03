import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Referral } from '@/types/referral';
import { GripVertical, Calendar, User } from 'lucide-react';

export function WaitlistManager() {
  const [loading, setLoading] = useState(true);
  const [waitlist, setWaitlist] = useState<Referral[]>([]);

  useEffect(() => {
    fetchWaitlist();
  }, []);

  const fetchWaitlist = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('status', 'waitlist')
        .order('waitlist_position', { ascending: true, nullsFirst: false })
        .order('waitlist_added_date', { ascending: true });

      if (error) throw error;
      setWaitlist(data as Referral[] || []);
    } catch (error) {
      console.error('Error fetching waitlist:', error);
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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Waitlist Management</span>
            <Badge variant="secondary">{waitlist.length} clients</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {waitlist.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No clients on waitlist. Clients in "Waitlist" status will appear here.
            </div>
          ) : (
            <div className="space-y-2">
              {waitlist.map((referral, index) => (
                <div 
                  key={referral.id}
                  className="flex items-center gap-4 p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <GripVertical className="w-4 h-4 cursor-grab" />
                    <span className="font-mono text-sm w-6">#{index + 1}</span>
                  </div>
                  
                  <div className="flex-1">
                    <p className="font-medium">
                      {referral.client_first_name} {referral.client_last_name}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {referral.waitlist_added_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Added: {new Date(referral.waitlist_added_date).toLocaleDateString()}
                        </span>
                      )}
                      {referral.funding_source && (
                        <Badge variant="outline">{referral.funding_source}</Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {referral.estimated_start_date && (
                      <Badge variant="secondary">
                        Est. Start: {new Date(referral.estimated_start_date).toLocaleDateString()}
                      </Badge>
                    )}
                    <Button variant="outline" size="sm">
                      Move to Accepted
                    </Button>
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
