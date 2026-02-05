 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Plus, Shield } from 'lucide-react';
 
 interface PayerAuthRulesTabProps {
   payerId: string;
 }
 
 export function PayerAuthRulesTab({ payerId }: PayerAuthRulesTabProps) {
   return (
     <Card>
       <CardHeader className="flex flex-row items-center justify-between">
         <CardTitle className="flex items-center gap-2">
           <Shield className="w-5 h-5" />
           Authorization Rules
         </CardTitle>
         <Button variant="outline" className="gap-2">
           <Plus className="w-4 h-4" />
           Add Rule
         </Button>
       </CardHeader>
       <CardContent>
         <div className="py-8 text-center text-muted-foreground">
           <p>No authorization rules configured yet.</p>
           <p className="text-sm mt-2">
             Authorization rules allow you to automatically require authorizations for specific CPT codes
             or places of service.
           </p>
         </div>
       </CardContent>
     </Card>
   );
 }