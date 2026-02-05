import { useState } from 'react';
 import { useNavigate } from 'react-router-dom';
 import { ArrowLeft, Plus, FileText, DollarSign, AlertCircle, BarChart3, Shield, CreditCard, Sparkles, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { BillingDashboard } from '@/components/billing/BillingDashboard';
import { ClaimGenerator } from '@/components/billing/ClaimGenerator';
import { DenialTracker } from '@/components/billing/DenialTracker';
import { ARReadinessDashboard } from '@/components/scheduling/ARReadinessDashboard';
import { GlobalAuthorizationDashboard } from '@/components/billing/GlobalAuthorizationDashboard';
import { PatientPaymentPortal, EligibilityChecker, PriorAuthGenerator } from '@/components/payments';

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
          <TabsList className="mb-6 flex-wrap">
            <TabsTrigger value="dashboard" className="gap-2">
              <DollarSign className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-2">
              <CreditCard className="w-4 h-4" />
              Payments
            </TabsTrigger>
            <TabsTrigger value="eligibility" className="gap-2">
              <Shield className="w-4 h-4" />
              Eligibility
            </TabsTrigger>
            <TabsTrigger value="prior-auth" className="gap-2">
              <Sparkles className="w-4 h-4" />
              Prior Auth
            </TabsTrigger>
            <TabsTrigger value="ar-readiness" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              AR Readiness
            </TabsTrigger>
            <TabsTrigger value="authorizations" className="gap-2">
              <Shield className="w-4 h-4" />
              Authorizations
            </TabsTrigger>
            <TabsTrigger value="claims" className="gap-2">
              <FileText className="w-4 h-4" />
              All Claims
            </TabsTrigger>
            <TabsTrigger value="denials" className="gap-2">
              <AlertCircle className="w-4 h-4" />
              Denials
            </TabsTrigger>
             <TabsTrigger value="payers" className="gap-2">
               <Building2 className="w-4 h-4" />
               Payer Config
             </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <BillingDashboard />
          </TabsContent>

          <TabsContent value="payments">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Patient Payments</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Select a patient from the Students page to collect payments, or use the payment portal below for demo purposes.
                  </p>
                  <PatientPaymentPortal studentId="demo" studentName="Demo Patient" />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="eligibility">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Insurance Eligibility Verification</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Real-time eligibility checking via pVerify. Select a patient to verify their insurance coverage.
                  </p>
                  <EligibilityChecker 
                    studentId="demo" 
                    studentName="Demo Patient"
                    clientPayers={[]}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="prior-auth">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>AI-Powered Prior Authorization</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Generate clinical justifications for prior authorization requests using AI.
                  </p>
                  <PriorAuthGenerator 
                    studentId="demo" 
                    studentName="Demo Patient"
                    payers={[]}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="ar-readiness">
            <ARReadinessDashboard />
          </TabsContent>

          <TabsContent value="authorizations">
            <GlobalAuthorizationDashboard />
          </TabsContent>

          <TabsContent value="claims">
            <BillingDashboard showAllClaims />
          </TabsContent>

          <TabsContent value="denials">
            <DenialTracker />
          </TabsContent>

           <TabsContent value="payers">
             <Card>
               <CardHeader>
                 <CardTitle className="flex items-center gap-2">
                   <Building2 className="w-5 h-5" />
                   Payer Configuration
                 </CardTitle>
               </CardHeader>
               <CardContent>
                 <p className="text-muted-foreground mb-4">
                   Configure payer-specific billing rules, CPT codes, rates, and CMS-1500 mapping defaults.
                 </p>
                 <Button onClick={() => navigate('/billing/payers')} className="gap-2">
                   <Building2 className="w-4 h-4" />
                   Open Payer Directory
                 </Button>
               </CardContent>
             </Card>
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
