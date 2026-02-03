import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, FileText, DollarSign, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { BillingDashboard } from '@/components/billing/BillingDashboard';
import { ClaimGenerator } from '@/components/billing/ClaimGenerator';
import { DenialTracker } from '@/components/billing/DenialTracker';

export default function Billing() {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showClaimGenerator, setShowClaimGenerator] = useState(false);

  const canManageBilling = userRole === 'admin' || userRole === 'super_admin';

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
                <h1 className="text-lg font-bold text-foreground">Billing & Claims</h1>
                <p className="text-xs text-muted-foreground">CMS-1500 claim generation and tracking</p>
              </div>
            </div>
            <Button onClick={() => setShowClaimGenerator(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              New Claim
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="dashboard" className="gap-2">
              <DollarSign className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="claims" className="gap-2">
              <FileText className="w-4 h-4" />
              All Claims
            </TabsTrigger>
            <TabsTrigger value="denials" className="gap-2">
              <AlertCircle className="w-4 h-4" />
              Denials
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <BillingDashboard />
          </TabsContent>

          <TabsContent value="claims">
            <BillingDashboard showAllClaims />
          </TabsContent>

          <TabsContent value="denials">
            <DenialTracker />
          </TabsContent>
        </Tabs>
      </main>

      {/* Claim Generator Wizard */}
      {showClaimGenerator && (
        <ClaimGenerator
          open={showClaimGenerator}
          onOpenChange={setShowClaimGenerator}
          onSuccess={() => {
            setShowClaimGenerator(false);
          }}
        />
      )}
    </div>
  );
}
