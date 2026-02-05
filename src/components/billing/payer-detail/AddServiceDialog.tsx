 import { useState } from 'react';
 import { useNavigate } from 'react-router-dom';
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogFooter,
 } from '@/components/ui/dialog';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Textarea } from '@/components/ui/textarea';
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from '@/components/ui/select';
 import { usePayerServices } from '@/hooks/usePayerServices';
 import {
   ServiceCategory,
   SERVICE_CATEGORIES,
   ServiceModifiers,
   ServiceRate,
   ServiceUnits,
   ServiceAuth,
   ServiceCMS1500Defaults,
 } from '@/types/payerConfig';
 
 interface AddServiceDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   payerId: string;
 }
 
 export function AddServiceDialog({ open, onOpenChange, payerId }: AddServiceDialogProps) {
   const navigate = useNavigate();
   const { createService } = usePayerServices(payerId);
 
   const [formData, setFormData] = useState({
     service_name: '',
     service_category: 'aba' as ServiceCategory,
     cpt_hcpcs_code: '',
     description: '',
   });
 
   const defaultModifiers: ServiceModifiers = {
     modifier_1: null,
     modifier_2: null,
     modifier_3: null,
     modifier_4: null,
     modifier_required: false,
     modifier_notes: null,
   };
 
   const defaultRate: ServiceRate = {
     rate_type: 'per_unit',
     rate_amount: 0,
     currency: 'USD',
     allow_override_on_claim: false,
   };
 
   const defaultUnits: ServiceUnits = {
     unit_definition: '15_min',
     rounding_rule: 'nearest',
   };
 
   const defaultAuth: ServiceAuth = {
     auth_required: true,
     auth_unit_type: 'units',
     auth_period: 'per_auth_span',
     enforcement: 'warn',
   };
 
   const defaultCMS1500: ServiceCMS1500Defaults = {
     place_of_service_default: '11',
     diagnosis_pointer_mode: 'auto',
     rendering_provider_required: true,
     supervising_provider_required: false,
   };
 
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
 
     const result = await createService.mutateAsync({
       service_name: formData.service_name,
       service_category: formData.service_category,
       cpt_hcpcs_code: formData.cpt_hcpcs_code,
       description: formData.description || undefined,
       modifiers: defaultModifiers,
       rate: defaultRate,
       units: defaultUnits,
       auth: defaultAuth,
       cms1500_defaults: defaultCMS1500,
     });
 
     if (result) {
       onOpenChange(false);
       // Navigate to the service detail page to complete configuration
       navigate(`/billing/payers/${payerId}/services/${result.id}`);
     }
   };
 
   const resetForm = () => {
     setFormData({
       service_name: '',
       service_category: 'aba',
       cpt_hcpcs_code: '',
       description: '',
     });
   };
 
   return (
     <Dialog open={open} onOpenChange={(isOpen) => {
       if (!isOpen) resetForm();
       onOpenChange(isOpen);
     }}>
       <DialogContent className="max-w-md">
         <DialogHeader>
           <DialogTitle>Add New Service</DialogTitle>
         </DialogHeader>
 
         <form onSubmit={handleSubmit} className="space-y-4">
           <div className="space-y-2">
             <Label htmlFor="service_name">Service Name *</Label>
             <Input
               id="service_name"
               value={formData.service_name}
               onChange={(e) => setFormData({ ...formData, service_name: e.target.value })}
               placeholder="e.g., ABA Direct Therapy"
               required
             />
           </div>
 
           <div className="space-y-2">
             <Label htmlFor="cpt_code">CPT/HCPCS Code *</Label>
             <Input
               id="cpt_code"
               value={formData.cpt_hcpcs_code}
               onChange={(e) => setFormData({ ...formData, cpt_hcpcs_code: e.target.value.toUpperCase() })}
               placeholder="e.g., 97153"
               required
             />
           </div>
 
           <div className="space-y-2">
             <Label htmlFor="category">Service Category</Label>
             <Select
               value={formData.service_category}
               onValueChange={(value: ServiceCategory) => setFormData({ ...formData, service_category: value })}
             >
               <SelectTrigger>
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 {SERVICE_CATEGORIES.map((cat) => (
                   <SelectItem key={cat.value} value={cat.value}>
                     {cat.label}
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
           </div>
 
           <div className="space-y-2">
             <Label htmlFor="description">Description</Label>
             <Textarea
               id="description"
               value={formData.description}
               onChange={(e) => setFormData({ ...formData, description: e.target.value })}
               placeholder="Optional description..."
               rows={2}
             />
           </div>
 
           <p className="text-xs text-muted-foreground">
             After creating the service, you'll be taken to the detail page to configure rates, 
             modifiers, unit definitions, and CMS-1500 mapping.
           </p>
 
           <DialogFooter>
             <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
               Cancel
             </Button>
             <Button type="submit" disabled={createService.isPending}>
               {createService.isPending ? 'Creating...' : 'Create Service'}
             </Button>
           </DialogFooter>
         </form>
       </DialogContent>
     </Dialog>
   );
 }