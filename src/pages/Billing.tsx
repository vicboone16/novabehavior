import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, FileText, DollarSign, AlertCircle, BarChart3, Shield, CreditCard, Sparkles, Building2, ScrollText, Clock, Upload, Send, Download, LineChart, ClipboardCheck, FileStack } from 'lucide-react';
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
import { ContractRateManager } from '@/components/billing/ContractRateManager';
import { TimesheetDashboard } from '@/components/payroll/TimesheetDashboard';
import { ERAProcessingTab } from '@/components/billing/ERAProcessingTab';
import { ClearinghouseTab } from '@/components/billing/ClearinghouseTab';
import { NeedsReviewList } from '@/components/billing/NeedsReviewList';
import { ReadyForClaimQueue } from '@/components/billing/ReadyForClaimQueue';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';
import { AnalyticsFilters } from '@/components/analytics/AnalyticsFilters';
import { subDays } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAgencyContext } from '@/hooks/useAgencyContext';

export default function Billing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { userRole } = useAuth();
  const { currentAgency } = useAgencyContext();
  const initialTab = searchParams.get('tab') || 'dashboard';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showClaimGenerator, setShowClaimGenerator] = useState(false);
  const [priorAuthStudentId, setPriorAuthStudentId] = useState('');
  const [eligibilityStudentId, setEligibilityStudentId] = useState('');

  // Load students for Prior Auth tab
  const { data: students = [] } = useQuery({
    queryKey: ['billing-students', currentAgency?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('students')
        .select('id, name, first_name, last_name')
        .order('name', { ascending: true });
      return (data ?? []) as Array<{ id: string; name: string; first_name: string | null; last_name: string | null }>;
    },
    enabled: !!currentAgency?.id,
  });

  // Load payers for the selected student (via student_payers)
  const { data: studentPayers = [] } = useQuery({
    queryKey: ['student-payers-for-auth', priorAuthStudentId],
    queryFn: async () => {
      const { data } = await supabase
        .from('student_payers')
        .select('payer_id, payers(id, name)')
        .eq('student_id', priorAuthStudentId)
        .eq('is_active', true)
        .order('billing_order', { ascending: true });
      return (data ?? []).map((sp: any) => ({ id: sp.payers?.id, name: sp.payers?.name })).filter(p => p.id);
    },
    enabled: !!priorAuthStudentId,
  });

  // Load payers for the eligibility student
  const { data: eligibilityStudentPayers = [] } = useQuery({
    queryKey: ['student-payers-for-eligibility', eligibilityStudentId],
    queryFn: async () => {
      const { data } = await supabase
        .from('student_payers')
        .select('id, member_id, payer_id, payers(id, name, payer_id)')
        .eq('student_id', eligibilityStudentId)
        .eq('is_active', true)
        .order('billing_order', { ascending: true });
      return (data ?? []).map((sp: any) => ({
        id: sp.id,
        payer_id: sp.payers?.payer_id ?? sp.payer_id ?? '',
        member_id: sp.member_id ?? '',
        payer: { name: sp.payers?.name ?? '' },
      }));
    },
    enabled: !!eligibilityStudentId,
  });

  // Analytics state
  const [analyticsTab, setAnalyticsTab] = useState('overview');
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [analyticsFilters, setAnalyticsFilters] = useState({
    staffId: null as string | null,
    payerId: null as string | null,
  });
  const canManageBilling = userRole === 'admin' || userRole === 'super_admin';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-20">
        <div className="container py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-lg font-bold text-foreground">Billing & Analytics</h1>
                <p className="text-xs text-muted-foreground">Claims, payments, and business intelligence</p>
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
            <TabsTrigger value="contracts" className="gap-2">
              <ScrollText className="w-4 h-4" />
              Contracts
            </TabsTrigger>
            <TabsTrigger value="timesheets" className="gap-2">
              <Clock className="w-4 h-4" />
              Timesheets
            </TabsTrigger>
            <TabsTrigger value="needs-review" className="gap-2">
              <ClipboardCheck className="w-4 h-4" />
              Needs Review
            </TabsTrigger>
            <TabsTrigger value="ready-for-claim" className="gap-2">
              <FileStack className="w-4 h-4" />
              Ready for Claim
            </TabsTrigger>
            <TabsTrigger value="era" className="gap-2">
              <Upload className="w-4 h-4" />
              ERA/835
            </TabsTrigger>
            <TabsTrigger value="clearinghouse" className="gap-2">
              <Send className="w-4 h-4" />
              Clearinghouse
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <LineChart className="w-4 h-4" />
              Analytics
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
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Select Client</label>
                    <select
                      value={eligibilityStudentId}
                      onChange={e => setEligibilityStudentId(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">— choose a client —</option>
                      {students.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name || `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim()}
                        </option>
                      ))}
                    </select>
                  </div>
                  {eligibilityStudentId ? (
                    <EligibilityChecker
                      studentId={eligibilityStudentId}
                      studentName={
                        (() => {
                          const s = students.find(x => x.id === eligibilityStudentId);
                          return s ? (s.name || `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim()) : '';
                        })()
                      }
                      clientPayers={eligibilityStudentPayers}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Select a client above to check their insurance eligibility.
                    </p>
                  )}
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
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Select Client</label>
                    <select
                      value={priorAuthStudentId}
                      onChange={e => setPriorAuthStudentId(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">— choose a client —</option>
                      {students.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name || `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim()}
                        </option>
                      ))}
                    </select>
                  </div>
                  {priorAuthStudentId ? (
                    <PriorAuthGenerator
                      studentId={priorAuthStudentId}
                      studentName={
                        (() => {
                          const s = students.find(x => x.id === priorAuthStudentId);
                          return s ? (s.name || `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim()) : '';
                        })()
                      }
                      payers={studentPayers}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Select a client above to generate a prior authorization request.
                    </p>
                  )}
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

          <TabsContent value="contracts">
            <ContractRateManager />
          </TabsContent>

          <TabsContent value="timesheets">
            <TimesheetDashboard />
          </TabsContent>

          <TabsContent value="needs-review">
            <NeedsReviewList />
          </TabsContent>

          <TabsContent value="ready-for-claim">
            <ReadyForClaimQueue />
          </TabsContent>

          <TabsContent value="era">
            <ERAProcessingTab />
          </TabsContent>

          <TabsContent value="clearinghouse">
            <ClearinghouseTab />
          </TabsContent>

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
                  <AnalyticsFilters
                    dateRange={dateRange}
                    onDateRangeChange={setDateRange}
                    filters={analyticsFilters}
                    onFiltersChange={setAnalyticsFilters}
                  />
                  <Button variant="outline" className="gap-2">
                    <Download className="w-4 h-4" />
                    Export
                  </Button>
                </div>
              </div>
              <AnalyticsDashboard
                dateRange={dateRange}
                filters={analyticsFilters}
                view={analyticsTab as 'overview' | 'revenue' | 'utilization' | 'productivity'}
              />
            </div>
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
