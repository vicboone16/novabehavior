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
 import { usePayerDirectory } from '@/hooks/usePayerDirectory';
 import { PayerType, PAYER_TYPES } from '@/types/payerConfig';
 
 interface AddCustomPayerDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
 }
 
 export function AddCustomPayerDialog({ open, onOpenChange }: AddCustomPayerDialogProps) {
   const navigate = useNavigate();
   const { addCustomPayer } = usePayerDirectory();
   
   const [formData, setFormData] = useState({
     name: '',
     payer_id: '',
     payer_type: 'commercial' as PayerType,
     phone: '',
     fax: '',
     website: '',
     notes: '',
   });
 
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     
     const result = await addCustomPayer.mutateAsync({
       name: formData.name,
       payer_id: formData.payer_id,
       payer_type: formData.payer_type,
       contact: {
         phone: formData.phone || undefined,
         fax: formData.fax || undefined,
         website: formData.website || undefined,
         notes: formData.notes || undefined,
       },
     });
 
     if (result) {
       onOpenChange(false);
       navigate(`/billing/payers/${result.id}`);
     }
   };
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="max-w-md">
         <DialogHeader>
           <DialogTitle>Add Custom Payer</DialogTitle>
         </DialogHeader>
         
         <form onSubmit={handleSubmit} className="space-y-4">
           <div className="space-y-2">
             <Label htmlFor="name">Payer Name *</Label>
             <Input
               id="name"
               value={formData.name}
               onChange={(e) => setFormData({ ...formData, name: e.target.value })}
               placeholder="e.g., Regional Health Plan"
               required
             />
           </div>
 
           <div className="space-y-2">
             <Label htmlFor="payer_id">Payer ID *</Label>
             <Input
               id="payer_id"
               value={formData.payer_id}
               onChange={(e) => setFormData({ ...formData, payer_id: e.target.value })}
               placeholder="e.g., 12345"
               required
             />
           </div>
 
           <div className="space-y-2">
             <Label htmlFor="payer_type">Payer Type</Label>
             <Select
               value={formData.payer_type}
               onValueChange={(value: PayerType) => setFormData({ ...formData, payer_type: value })}
             >
               <SelectTrigger>
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 {PAYER_TYPES.map((type) => (
                   <SelectItem key={type.value} value={type.value}>
                     {type.label}
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
           </div>
 
           <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
               <Label htmlFor="phone">Phone</Label>
               <Input
                 id="phone"
                 value={formData.phone}
                 onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                 placeholder="1-800-555-0123"
               />
             </div>
             <div className="space-y-2">
               <Label htmlFor="fax">Fax</Label>
               <Input
                 id="fax"
                 value={formData.fax}
                 onChange={(e) => setFormData({ ...formData, fax: e.target.value })}
                 placeholder="1-800-555-0124"
               />
             </div>
           </div>
 
           <div className="space-y-2">
             <Label htmlFor="website">Website</Label>
             <Input
               id="website"
               value={formData.website}
               onChange={(e) => setFormData({ ...formData, website: e.target.value })}
               placeholder="https://provider.example.com"
             />
           </div>
 
           <div className="space-y-2">
             <Label htmlFor="notes">Notes</Label>
             <Textarea
               id="notes"
               value={formData.notes}
               onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
               placeholder="Additional notes about this payer..."
               rows={3}
             />
           </div>
 
           <DialogFooter>
             <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
               Cancel
             </Button>
             <Button type="submit" disabled={addCustomPayer.isPending}>
               {addCustomPayer.isPending ? 'Adding...' : 'Add Payer'}
             </Button>
           </DialogFooter>
         </form>
       </DialogContent>
     </Dialog>
   );
 }