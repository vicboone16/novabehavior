import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, UserPlus, DollarSign, Shield, FileText, ClipboardList, Briefcase, Plus, LayoutGrid, List, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission, PERMISSIONS, type PermissionContext } from '@/lib/permissions';

// Referral components
import { ReferralKanban } from '@/components/referrals/ReferralKanban';
import { WaitlistManager } from '@/components/referrals/WaitlistManager';
import { ReferralDialog } from '@/components/referrals/ReferralDialog';

// Billing components
import { BillingDashboard } from '@/components/billing/BillingDashboard';
import { ClaimGenerator } from '@/components/billing/ClaimGenerator';
import { DenialTracker } from '@/components/billing/DenialTracker';
import { ARReadinessDashboard } from '@/components/scheduling/ARReadinessDashboard';
import { GlobalAuthorizationDashboard } from '@/components/billing/GlobalAuthorizationDashboard';
import { PatientPaymentPortal, EligibilityChecker, PriorAuthGenerator } from '@/components/payments';
import { ContractRateManager } from '@/components/billing/ContractRateManager';
import { TimesheetDashboard } from '@/components/payroll/TimesheetDashboard';
import { ERAProcessingTab } from '@/components/billing/ERAProcessingTab';
import { ClearinghouseTab } from '@/components/billing/ClearinghouseTab';
import { NeedsReviewList } from '@/components/billing/NeedsReviewList';
import { ReadyForClaimQueue } from '@/components/billing/ReadyForClaimQueue';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';
import { AnalyticsFilters } from '@/components/analytics/AnalyticsFilters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { subDays } from 'date-fns';
import { Building2 } from 'lucide-react';

const OPERATION_TABS = [
  { value: 'referrals', label: 'Referrals', icon: UserPlus, permission: PERMISSIONS.AUTH_VIEW },
  { value: 'billing', label: 'Billing', icon: DollarSign, permission: PERMISSIONS.BILLING_VIEW },
  { value: 'authorizations', label: 'Authorizations', icon: Shield, permission: PERMISSIONS.AUTH_VIEW },
  { value: 'insurance', label: 'Insurance', icon: FileText, permission: PERMISSIONS.BILLING_VIEW },
  
];

export default function Operations() {
  const navigate = useNavigate();
  const { userRole, user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'referrals';
  const [activeTab, setActiveTab] = useState(initialTab);

  const permContext: PermissionContext = {
    userRole: userRole as any,
    userId: user?.id || null,
  };

  const visibleTabs = OPERATION_TABS.filter(tab =>
    hasPermission(permContext, tab.permission)
  );

  if (visibleTabs.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-2">
          <Briefcase className="w-12 h-12 text-muted-foreground mx-auto" />
          <h2 className="text-lg font-semibold">Access Restricted</h2>
          <p className="text-sm text-muted-foreground">You don't have permission to view Operations.</p>
          <Button variant="outline" onClick={() => navigate('/')}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-20">
        <div className="container py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-lg font-bold flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-primary" />
                  Operations
                </h1>
                <p className="text-xs text-muted-foreground">
                  Referrals, billing, authorizations, insurance & service requests
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="border-b border-border bg-card/50">
        <div className="container">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="h-11 bg-transparent border-none flex-wrap">
              {visibleTabs.map(tab => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="gap-1.5 text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="container py-6">
        {activeTab === 'referrals' && <ReferralContent />}
        {activeTab === 'billing' && <BillingContent />}
        {activeTab === 'authorizations' && <AuthorizationsContent />}
        {activeTab === 'insurance' && <InsuranceContent />}
        
      </div>
    </div>
  );
}

// Referral Content - full inline pipeline
function ReferralContent() {
  const [referralTab, setReferralTab] = useState('pipeline');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [showReferralDialog, setShowReferralDialog] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Manage new client referrals and intake process.
        </p>
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

      <Tabs value={referralTab} onValueChange={setReferralTab}>
        <TabsList>
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

      <ReferralDialog
        open={showReferralDialog}
        onOpenChange={setShowReferralDialog}
        onSuccess={() => setShowReferralDialog(false)}
      />
    </div>
  );
}

// Billing Content - full inline billing dashboard
function BillingContent() {
  const navigate = useNavigate();
  const [billingTab, setBillingTab] = useState('dashboard');
  const [showClaimGenerator, setShowClaimGenerator] = useState(false);
  const [analyticsTab, setAnalyticsTab] = useState('overview');
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [analyticsFilters, setAnalyticsFilters] = useState({
    staffId: null as string | null,
    payerId: null as string | null,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Claims, payments, and business intelligence.
        </p>
        <Button onClick={() => setShowClaimGenerator(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          New Claim
        </Button>
      </div>

      <Tabs value={billingTab} onValueChange={setBillingTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="eligibility">Eligibility</TabsTrigger>
          <TabsTrigger value="prior-auth">Prior Auth</TabsTrigger>
          <TabsTrigger value="ar-readiness">AR Readiness</TabsTrigger>
          <TabsTrigger value="authorizations">Authorizations</TabsTrigger>
          <TabsTrigger value="claims">All Claims</TabsTrigger>
          <TabsTrigger value="denials">Denials</TabsTrigger>
          <TabsTrigger value="payers">Payer Config</TabsTrigger>
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
          <TabsTrigger value="timesheets">Timesheets</TabsTrigger>
          <TabsTrigger value="needs-review">Needs Review</TabsTrigger>
          <TabsTrigger value="ready-for-claim">Ready for Claim</TabsTrigger>
          <TabsTrigger value="era">ERA/835</TabsTrigger>
          <TabsTrigger value="clearinghouse">Clearinghouse</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard"><BillingDashboard /></TabsContent>
        <TabsContent value="payments">
          <Card><CardHeader><CardTitle>Patient Payments</CardTitle></CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">Select a patient from the Students page to collect payments.</p>
              <PatientPaymentPortal studentId="demo" studentName="Demo Patient" />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="eligibility">
          <Card><CardHeader><CardTitle>Insurance Eligibility Verification</CardTitle></CardHeader>
            <CardContent>
              <EligibilityChecker studentId="demo" studentName="Demo Patient" clientPayers={[]} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="prior-auth">
          <Card><CardHeader><CardTitle>AI-Powered Prior Authorization</CardTitle></CardHeader>
            <CardContent>
              <PriorAuthGenerator studentId="demo" studentName="Demo Patient" payers={[]} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="ar-readiness"><ARReadinessDashboard /></TabsContent>
        <TabsContent value="authorizations"><GlobalAuthorizationDashboard /></TabsContent>
        <TabsContent value="claims"><BillingDashboard showAllClaims /></TabsContent>
        <TabsContent value="denials"><DenialTracker /></TabsContent>
        <TabsContent value="payers">
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" />Payer Configuration</CardTitle></CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/billing/payers')} className="gap-2"><Building2 className="w-4 h-4" />Open Payer Directory</Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="contracts"><ContractRateManager /></TabsContent>
        <TabsContent value="timesheets"><TimesheetDashboard /></TabsContent>
        <TabsContent value="needs-review"><NeedsReviewList /></TabsContent>
        <TabsContent value="ready-for-claim"><ReadyForClaimQueue /></TabsContent>
        <TabsContent value="era"><ERAProcessingTab /></TabsContent>
        <TabsContent value="clearinghouse"><ClearinghouseTab /></TabsContent>
        <TabsContent value="analytics">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Tabs value={analyticsTab} onValueChange={setAnalyticsTab}>
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="revenue">Revenue</TabsTrigger>
                  <TabsTrigger value="utilization">Utilization</TabsTrigger>
                  <TabsTrigger value="productivity">Productivity</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex items-center gap-2">
                <AnalyticsFilters dateRange={dateRange} onDateRangeChange={setDateRange} filters={analyticsFilters} onFiltersChange={setAnalyticsFilters} />
                <Button variant="outline" className="gap-2"><Download className="w-4 h-4" />Export</Button>
              </div>
            </div>
            <AnalyticsDashboard dateRange={dateRange} filters={analyticsFilters} view={analyticsTab as 'overview' | 'revenue' | 'utilization' | 'productivity'} />
          </div>
        </TabsContent>
      </Tabs>

      {showClaimGenerator && (
        <ClaimGenerator open={showClaimGenerator} onOpenChange={setShowClaimGenerator} onSuccess={() => setShowClaimGenerator(false)} />
      )}
    </div>
  );
}

// Authorizations - inline
function AuthorizationsContent() {
  return <GlobalAuthorizationDashboard />;
}

// Insurance - inline eligibility + payer config
function InsuranceContent() {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Insurance Eligibility Verification</CardTitle></CardHeader>
        <CardContent>
          <EligibilityChecker studentId="demo" studentName="Demo Patient" clientPayers={[]} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" />Payer Configuration</CardTitle></CardHeader>
        <CardContent>
          <Button onClick={() => navigate('/billing/payers')} className="gap-2"><Building2 className="w-4 h-4" />Open Payer Directory</Button>
        </CardContent>
      </Card>
    </div>
  );
}
