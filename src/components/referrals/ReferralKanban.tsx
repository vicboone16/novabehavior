import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Referral, REFERRAL_STAGES, ReferralStatus } from '@/types/referral';
import { ReferralCard } from './ReferralCard';
import { ReferralDetailPanel } from './ReferralDetailPanel';

interface ReferralKanbanProps {
  viewMode: 'kanban' | 'list';
}

export function ReferralKanban({ viewMode }: ReferralKanbanProps) {
  const [loading, setLoading] = useState(true);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);

  useEffect(() => {
    fetchReferrals();
  }, []);

  const fetchReferrals = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('referrals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReferrals(data as Referral[] || []);
    } catch (error) {
      console.error('Error fetching referrals:', error);
    } finally {
      setLoading(false);
    }
  };

  const getReferralsByStatus = (status: ReferralStatus) => {
    return referrals.filter(r => r.status === status);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>All Referrals</CardTitle>
        </CardHeader>
        <CardContent>
          {referrals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No referrals yet. Click "New Referral" to add one.
            </div>
          ) : (
            <div className="space-y-2">
              {referrals.map((referral) => (
                <ReferralCard 
                  key={referral.id} 
                  referral={referral} 
                  onClick={() => setSelectedReferral(referral)}
                  variant="list"
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {REFERRAL_STAGES.filter(s => s.value !== 'converted').map((stage) => {
        const stageReferrals = getReferralsByStatus(stage.value);
        return (
          <div key={stage.value} className="flex-shrink-0 w-72">
            <Card className="h-full">
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">{stage.label}</CardTitle>
                  <Badge variant="secondary">{stageReferrals.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 min-h-[400px]">
                {stageReferrals.length === 0 ? (
                  <div className="text-center py-4 text-xs text-muted-foreground">
                    No referrals
                  </div>
                ) : (
                  stageReferrals.map((referral) => (
                    <ReferralCard 
                      key={referral.id} 
                      referral={referral}
                      onClick={() => setSelectedReferral(referral)}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        );
      })}

      {/* Detail Panel */}
      {selectedReferral && (
        <ReferralDetailPanel
          referral={selectedReferral}
          onClose={() => setSelectedReferral(null)}
          onUpdate={fetchReferrals}
        />
      )}
    </div>
  );
}
