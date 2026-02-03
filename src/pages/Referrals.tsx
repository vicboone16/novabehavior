import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, LayoutGrid, List, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { ReferralKanban } from '@/components/referrals/ReferralKanban';
import { WaitlistManager } from '@/components/referrals/WaitlistManager';
import { ReferralDialog } from '@/components/referrals/ReferralDialog';

export default function Referrals() {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const [activeTab, setActiveTab] = useState('pipeline');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [showReferralDialog, setShowReferralDialog] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-20">
        <div className="container py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-lg font-bold text-foreground">Referral & Intake Pipeline</h1>
                <p className="text-xs text-muted-foreground">Manage new client referrals and intake process</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex border rounded-md">
                <Button
                  variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('kanban')}
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
              <Button onClick={() => setShowReferralDialog(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                New Referral
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="waitlist">Waitlist</TabsTrigger>
          </TabsList>

          <TabsContent value="pipeline">
            <ReferralKanban viewMode={viewMode} />
          </TabsContent>

          <TabsContent value="waitlist">
            <WaitlistManager />
          </TabsContent>
        </Tabs>
      </main>

      {/* New Referral Dialog */}
      <ReferralDialog
        open={showReferralDialog}
        onOpenChange={setShowReferralDialog}
        onSuccess={() => {
          setShowReferralDialog(false);
        }}
      />
    </div>
  );
}
