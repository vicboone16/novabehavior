import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, UserPlus, DollarSign, Shield, FileText, ClipboardList, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission, PERMISSIONS, type PermissionContext } from '@/lib/permissions';

// Lazy-load sub-pages
import Referrals from './Referrals';
import Billing from './Billing';

const OPERATION_TABS = [
  { value: 'referrals', label: 'Referrals', icon: UserPlus, permission: PERMISSIONS.AUTH_VIEW },
  { value: 'billing', label: 'Billing', icon: DollarSign, permission: PERMISSIONS.BILLING_VIEW },
  { value: 'authorizations', label: 'Authorizations', icon: Shield, permission: PERMISSIONS.AUTH_VIEW },
  { value: 'insurance', label: 'Insurance', icon: FileText, permission: PERMISSIONS.BILLING_VIEW },
  { value: 'service-requests', label: 'Service Requests', icon: ClipboardList, permission: PERMISSIONS.AUTH_VIEW },
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
        {activeTab === 'service-requests' && <ServiceRequestsContent />}
      </div>
    </div>
  );
}

// Sub-content components - these embed the existing pages or provide placeholders
function ReferralContent() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Manage new client referrals and intake process.
      </p>
      {/* Renders the referral components inline */}
      <iframe src="/referrals" className="hidden" />
      <div className="text-center py-8">
        <Button onClick={() => window.location.href = '/referrals'}>
          <UserPlus className="w-4 h-4 mr-2" />
          Open Referrals Pipeline
        </Button>
      </div>
    </div>
  );
}

function BillingContent() {
  return (
    <div className="text-center py-8">
      <Button onClick={() => window.location.href = '/billing'}>
        <DollarSign className="w-4 h-4 mr-2" />
        Open Billing Dashboard
      </Button>
    </div>
  );
}

function AuthorizationsContent() {
  return (
    <div className="text-center py-8 space-y-3">
      <Shield className="w-12 h-12 text-muted-foreground mx-auto" />
      <h3 className="font-semibold">Authorizations</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        Manage service authorizations, track utilization, and monitor expiration dates.
      </p>
      <Button onClick={() => window.location.href = '/billing?tab=authorizations'}>
        Open Authorizations
      </Button>
    </div>
  );
}

function InsuranceContent() {
  return (
    <div className="text-center py-8 space-y-3">
      <FileText className="w-12 h-12 text-muted-foreground mx-auto" />
      <h3 className="font-semibold">Insurance</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        Manage insurance payers, verify eligibility, and handle prior authorizations.
      </p>
      <Button onClick={() => window.location.href = '/billing/payers'}>
        Open Insurance / Payers
      </Button>
    </div>
  );
}

function ServiceRequestsContent() {
  return (
    <div className="text-center py-8 space-y-3">
      <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto" />
      <h3 className="font-semibold">Service Requests</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        Track and manage service requests from clients, schools, and partner organizations.
      </p>
    </div>
  );
}
