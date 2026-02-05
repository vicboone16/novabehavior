 import { useParams, useNavigate } from 'react-router-dom';
 import { ArrowLeft, Settings, FileText, Shield, ClipboardList, Activity } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
 import { Badge } from '@/components/ui/badge';
 import { useConfiguredPayer } from '@/hooks/usePayerDirectory';
 import { PayerOverviewTab } from '@/components/billing/payer-detail/PayerOverviewTab';
 import { PayerServicesTab } from '@/components/billing/payer-detail/PayerServicesTab';
 import { PayerAuthRulesTab } from '@/components/billing/payer-detail/PayerAuthRulesTab';
 import { PAYER_TYPES } from '@/types/payerConfig';
 
 export default function PayerDetailPage() {
   const { payerId } = useParams<{ payerId: string }>();
   const navigate = useNavigate();
   const { payer, isLoading } = useConfiguredPayer(payerId || '');
 
   if (isLoading) {
     return (
       <div className="min-h-screen bg-background flex items-center justify-center">
         <div className="text-muted-foreground">Loading payer details...</div>
       </div>
     );
   }
 
   if (!payer) {
     return (
       <div className="min-h-screen bg-background flex items-center justify-center">
         <div className="text-center">
           <h2 className="text-lg font-semibold mb-2">Payer not found</h2>
           <Button onClick={() => navigate('/billing/payers')}>Back to Payers</Button>
         </div>
       </div>
     );
   }
 
   const payerTypeLabel = PAYER_TYPES.find(t => t.value === payer.payer_type)?.label || payer.payer_type;
 
   return (
     <div className="min-h-screen bg-background">
       {/* Header */}
       <header className="bg-card border-b border-border sticky top-0 z-20">
         <div className="container py-3">
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-3">
               <Button variant="ghost" size="icon" onClick={() => navigate('/billing/payers')}>
                 <ArrowLeft className="w-5 h-5" />
               </Button>
               <div>
                 <div className="flex items-center gap-2">
                   <h1 className="text-lg font-bold text-foreground">{payer.name}</h1>
                   {payer.payer_id && (
                     <code className="text-sm bg-muted px-2 py-0.5 rounded">{payer.payer_id}</code>
                   )}
                 </div>
                 <div className="flex items-center gap-2 mt-0.5">
                   <Badge variant="secondary">{payerTypeLabel}</Badge>
                   <Badge variant={payer.is_active ? 'default' : 'secondary'}>
                     {payer.is_active ? 'Active' : 'Inactive'}
                   </Badge>
                 </div>
               </div>
             </div>
           </div>
         </div>
       </header>
 
       {/* Main Content */}
       <main className="container py-6">
         <Tabs defaultValue="overview">
           <TabsList className="mb-6">
             <TabsTrigger value="overview" className="gap-2">
               <Settings className="w-4 h-4" />
               Overview
             </TabsTrigger>
             <TabsTrigger value="services" className="gap-2">
               <FileText className="w-4 h-4" />
               Services
             </TabsTrigger>
             <TabsTrigger value="auth-rules" className="gap-2">
               <Shield className="w-4 h-4" />
               Auth Rules
             </TabsTrigger>
             <TabsTrigger value="eligibility" className="gap-2">
               <Activity className="w-4 h-4" />
               Eligibility
             </TabsTrigger>
           </TabsList>
 
           <TabsContent value="overview">
             <PayerOverviewTab payer={payer} />
           </TabsContent>
 
           <TabsContent value="services">
             <PayerServicesTab payerId={payerId || ''} payerName={payer.name} />
           </TabsContent>
 
           <TabsContent value="auth-rules">
             <PayerAuthRulesTab payerId={payerId || ''} />
           </TabsContent>
 
           <TabsContent value="eligibility">
             <div className="bg-card border rounded-lg p-6">
               <h3 className="text-lg font-semibold mb-4">Eligibility Settings</h3>
               <div className="text-muted-foreground">
                 <p>Electronic eligibility verification settings.</p>
                 <p className="mt-2">
                   270/271 Supported: {payer.eligibility?.supports_270_271 ? 'Yes' : 'No'}
                 </p>
               </div>
             </div>
           </TabsContent>
         </Tabs>
       </main>
     </div>
   );
 }