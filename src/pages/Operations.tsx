import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Briefcase, Plus, LayoutGrid, List, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission, PERMISSIONS, type PermissionContext } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { getNavIcon } from '@/lib/navIcons';

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
import { ServiceRequestsPanel } from '@/components/service-requests/ServiceRequestsPanel';
import { subDays } from 'date-fns';
import {
  BarChart3, Shield, FileText, CreditCard, Clock, Send,
  Upload, Building2, ScrollText, AlertCircle, ClipboardCheck,
  FileStack, LineChart, Sparkles, TrendingDown, Timer, PieChart, DollarSign,
} from 'lucide-react';

export default function Operations() {
  const navigate = useNavigate();
  const { userRole, user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'referrals';
  const [activeTab, setActiveTab] = useState(initialTab);
  const { getChildrenOf } = useAppNavigation();

  const permContext: PermissionContext = {
    userRole: userRole as any,
    userId: user?.id || null,
  };

  // Get Operations children from DB
  const operationsTabs = getChildrenOf('operations');

  // Map tab value from nav_key or route param
  const getTabValue = (item: { nav_key: string; route: string | null }) => {
    // Extract ?tab= from route
    if (item.route) {
      const url = new URL(item.route, 'http://x');
      return url.searchParams.get('tab') || item.nav_key;
    }
    return item.nav_key;
  };

  if (operationsTabs.length === 0) {
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
                  Referrals, billing, authorizations & analytics
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Section tabs rendered from DB */}
      <div className="border-b border-border bg-card/50">
        <div className="container">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="h-11 bg-transparent border-none flex-wrap">
              {operationsTabs.map(tab => {
                const Icon = getNavIcon(tab.icon);
                const tabValue = getTabValue(tab);
                return (
                  <TabsTrigger
                    key={tab.nav_key}
                    value={tabValue}
                    className="gap-1.5 text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                  >
                    {Icon && <Icon className="w-3.5 h-3.5" />}
                    {tab.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="container py-6">
        {activeTab === 'referrals' && <ReferralContent />}
        {activeTab === 'billing' && <BillingContent />}
        {activeTab === 'authorizations' && <AuthorizationsContent />}
        {activeTab === 'insurance' && <InsuranceContent />}
        {activeTab === 'service-requests' && <ServiceRequestsContent />}
      </div>
    </div>
  );
}

/* ─────────────────────── Referral Content ─────────────────────── */
function ReferralContent() {
  const [referralTab, setReferralTab] = useState('pipeline');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [showReferralDialog, setShowReferralDialog] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Manage new client referrals and intake process.</p>
        <div className="flex items-center gap-2">
          <div className="flex border rounded-md">
            <Button variant={viewMode === 'kanban' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('kanban')}>
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('list')}>
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
        <TabsContent value="pipeline"><ReferralKanban viewMode={viewMode} /></TabsContent>
        <TabsContent value="waitlist"><WaitlistManager /></TabsContent>
      </Tabs>
      <ReferralDialog open={showReferralDialog} onOpenChange={setShowReferralDialog} onSuccess={() => setShowReferralDialog(false)} />
    </div>
  );
}

/* ─────────────────────── Authorizations Content ─────────────────────── */
function AuthorizationsContent() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Manage service authorizations across all clients.</p>
      <GlobalAuthorizationDashboard />
    </div>
  );
}

/* ─────────────────────── Insurance Content ─────────────────────── */
function InsuranceContent() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Insurance eligibility, payer configuration, and contract management.</p>
      <Tabs defaultValue="eligibility">
        <TabsList>
          <TabsTrigger value="eligibility" className="gap-1.5"><Shield className="w-3.5 h-3.5" />Eligibility</TabsTrigger>
          <TabsTrigger value="payers" className="gap-1.5"><Building2 className="w-3.5 h-3.5" />Payer Config</TabsTrigger>
          <TabsTrigger value="contracts" className="gap-1.5"><ScrollText className="w-3.5 h-3.5" />Contracts</TabsTrigger>
        </TabsList>
        <TabsContent value="eligibility">
          <Card><CardHeader><CardTitle>Insurance Eligibility Verification</CardTitle></CardHeader>
            <CardContent><EligibilityChecker studentId="demo" studentName="Demo Patient" clientPayers={[]} /></CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="payers">
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" />Payer Configuration</CardTitle></CardHeader>
            <CardContent><Button onClick={() => {}} className="gap-2"><Building2 className="w-4 h-4" />Open Payer Directory</Button></CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="contracts"><ContractRateManager /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ─────────────────────── Service Requests Content ─────────────────────── */
function ServiceRequestsContent() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Manage internal service requests and workflows.</p>
      <ServiceRequestsPanel />
    </div>
  );
}

/* ─────────────────────── Billing Content ─────────────────────── */
function BillingContent() {
  const [searchParams] = useSearchParams();
  const { getChildrenOf } = useAppNavigation();
  const initialPage = searchParams.get('billingPage') || 'overview';
  const initialSubTab = searchParams.get('billingTab') || '';
  const [activePage, setActivePage] = useState(initialPage);
  const [showClaimGenerator, setShowClaimGenerator] = useState(false);

  // Get billing sub-pages from DB
  const billingPages = getChildrenOf('ops-billing');

  // Extract billingPage value from route param
  const getPageKey = (item: { route: string | null; nav_key: string }) => {
    if (item.route) {
      const url = new URL(item.route, 'http://x');
      return url.searchParams.get('billingPage') || item.nav_key;
    }
    return item.nav_key;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Claims, payments, authorizations & analytics.</p>
        <Button onClick={() => setShowClaimGenerator(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          New Claim
        </Button>
      </div>

      {/* Page-level navigation – rendered from DB */}
      <div className="flex gap-1.5 flex-wrap border-b border-border pb-3">
        {billingPages.map(page => {
          const Icon = getNavIcon(page.icon);
          const pageKey = getPageKey(page);
          return (
            <Button
              key={page.nav_key}
              variant={activePage === pageKey ? 'secondary' : 'ghost'}
              size="sm"
              className={cn(
                'gap-1.5 text-xs',
                activePage === pageKey && 'bg-primary/10 text-primary border border-primary/20'
              )}
              onClick={() => setActivePage(pageKey)}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              {page.label}
            </Button>
          );
        })}
      </div>

      {activePage === 'overview' && <BillingOverviewPage defaultTab={initialSubTab} />}
      {activePage === 'authorizations' && <BillingAuthorizationsPage defaultTab={initialSubTab} />}
      {activePage === 'claims' && <BillingClaimsPage defaultTab={initialSubTab} />}
      {activePage === 'payments' && <BillingPaymentsPage defaultTab={initialSubTab} />}
      {activePage === 'contracts' && <BillingContractsPage defaultTab={initialSubTab} />}
      {activePage === 'analytics' && <BillingAnalyticsPage defaultTab={initialSubTab} />}

      {showClaimGenerator && (
        <ClaimGenerator open={showClaimGenerator} onOpenChange={setShowClaimGenerator} onSuccess={() => setShowClaimGenerator(false)} />
      )}
    </div>
  );
}

/* ── Overview ── */
function BillingOverviewPage({ defaultTab }: { defaultTab?: string }) {
  const [tab, setTab] = useState(defaultTab || 'dashboard');
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList>
        <TabsTrigger value="dashboard" className="gap-1.5"><DollarSign className="w-3.5 h-3.5" />Dashboard</TabsTrigger>
        <TabsTrigger value="needs-review" className="gap-1.5"><ClipboardCheck className="w-3.5 h-3.5" />Needs Review</TabsTrigger>
        <TabsTrigger value="ar-readiness" className="gap-1.5"><BarChart3 className="w-3.5 h-3.5" />AR Readiness</TabsTrigger>
      </TabsList>
      <TabsContent value="dashboard"><BillingDashboard /></TabsContent>
      <TabsContent value="needs-review"><NeedsReviewList /></TabsContent>
      <TabsContent value="ar-readiness"><ARReadinessDashboard /></TabsContent>
    </Tabs>
  );
}

/* ── Authorizations ── */
function BillingAuthorizationsPage({ defaultTab }: { defaultTab?: string }) {
  const [tab, setTab] = useState(defaultTab || 'eligibility');
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList>
        <TabsTrigger value="eligibility" className="gap-1.5"><Shield className="w-3.5 h-3.5" />Eligibility</TabsTrigger>
        <TabsTrigger value="prior-auth" className="gap-1.5"><Sparkles className="w-3.5 h-3.5" />Prior Auth</TabsTrigger>
        <TabsTrigger value="authorizations" className="gap-1.5"><Shield className="w-3.5 h-3.5" />Authorizations</TabsTrigger>
      </TabsList>
      <TabsContent value="eligibility">
        <Card><CardHeader><CardTitle>Insurance Eligibility Verification</CardTitle></CardHeader>
          <CardContent><EligibilityChecker studentId="demo" studentName="Demo Patient" clientPayers={[]} /></CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="prior-auth">
        <Card><CardHeader><CardTitle>AI-Powered Prior Authorization</CardTitle></CardHeader>
          <CardContent><PriorAuthGenerator studentId="demo" studentName="Demo Patient" payers={[]} /></CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="authorizations"><GlobalAuthorizationDashboard /></TabsContent>
    </Tabs>
  );
}

/* ── Claims Processing ── */
function BillingClaimsPage({ defaultTab }: { defaultTab?: string }) {
  const [tab, setTab] = useState(defaultTab || 'timesheets');
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList>
        <TabsTrigger value="timesheets" className="gap-1.5"><Clock className="w-3.5 h-3.5" />Timesheets</TabsTrigger>
        <TabsTrigger value="ready-for-claim" className="gap-1.5"><FileStack className="w-3.5 h-3.5" />Ready for Claim</TabsTrigger>
        <TabsTrigger value="all-claims" className="gap-1.5"><FileText className="w-3.5 h-3.5" />All Claims</TabsTrigger>
        <TabsTrigger value="denials" className="gap-1.5"><AlertCircle className="w-3.5 h-3.5" />Denials</TabsTrigger>
      </TabsList>
      <TabsContent value="timesheets"><TimesheetDashboard /></TabsContent>
      <TabsContent value="ready-for-claim"><ReadyForClaimQueue /></TabsContent>
      <TabsContent value="all-claims"><BillingDashboard showAllClaims /></TabsContent>
      <TabsContent value="denials"><DenialTracker /></TabsContent>
    </Tabs>
  );
}

/* ── Payments & Reconciliation ── */
function BillingPaymentsPage({ defaultTab }: { defaultTab?: string }) {
  const [tab, setTab] = useState(defaultTab || 'payments');
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList>
        <TabsTrigger value="payments" className="gap-1.5"><CreditCard className="w-3.5 h-3.5" />Payments</TabsTrigger>
        <TabsTrigger value="era" className="gap-1.5"><Upload className="w-3.5 h-3.5" />ERA/835</TabsTrigger>
        <TabsTrigger value="clearinghouse" className="gap-1.5"><Send className="w-3.5 h-3.5" />Clearinghouse</TabsTrigger>
      </TabsList>
      <TabsContent value="payments">
        <Card><CardHeader><CardTitle>Patient Payments</CardTitle></CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">Select a patient from the Students page to collect payments.</p>
            <PatientPaymentPortal studentId="demo" studentName="Demo Patient" />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="era"><ERAProcessingTab /></TabsContent>
      <TabsContent value="clearinghouse"><ClearinghouseTab /></TabsContent>
    </Tabs>
  );
}

/* ── Contracts & Payers ── */
function BillingContractsPage({ defaultTab }: { defaultTab?: string }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState(defaultTab || 'payers');
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList>
        <TabsTrigger value="payers" className="gap-1.5"><Building2 className="w-3.5 h-3.5" />Payer Config</TabsTrigger>
        <TabsTrigger value="contracts" className="gap-1.5"><ScrollText className="w-3.5 h-3.5" />Contracts</TabsTrigger>
      </TabsList>
      <TabsContent value="payers">
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" />Payer Configuration</CardTitle></CardHeader>
          <CardContent><Button onClick={() => navigate('/billing/payers')} className="gap-2"><Building2 className="w-4 h-4" />Open Payer Directory</Button></CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="contracts"><ContractRateManager /></TabsContent>
    </Tabs>
  );
}

/* ── Analytics ── */
function BillingAnalyticsPage({ defaultTab }: { defaultTab?: string }) {
  const [tab, setTab] = useState(defaultTab || 'revenue');
  const [dateRange, setDateRange] = useState({ from: subDays(new Date(), 30), to: new Date() });
  const [filters, setFilters] = useState({ staffId: null as string | null, payerId: null as string | null });

  const viewMap: Record<string, 'overview' | 'revenue' | 'utilization' | 'productivity'> = {
    revenue: 'revenue',
    'ar-aging': 'utilization',
    'denial-trends': 'overview',
    'claim-performance': 'productivity',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="revenue" className="gap-1.5"><DollarSign className="w-3.5 h-3.5" />Revenue</TabsTrigger>
            <TabsTrigger value="ar-aging" className="gap-1.5"><Timer className="w-3.5 h-3.5" />AR Aging</TabsTrigger>
            <TabsTrigger value="denial-trends" className="gap-1.5"><TrendingDown className="w-3.5 h-3.5" />Denial Trends</TabsTrigger>
            <TabsTrigger value="claim-performance" className="gap-1.5"><PieChart className="w-3.5 h-3.5" />Claim Performance</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <AnalyticsFilters dateRange={dateRange} onDateRangeChange={setDateRange} filters={filters} onFiltersChange={setFilters} />
          <Button variant="outline" className="gap-2"><Download className="w-4 h-4" />Export</Button>
        </div>
      </div>
      <AnalyticsDashboard dateRange={dateRange} filters={filters} view={viewMap[tab] || 'revenue'} />
    </div>
  );
}
