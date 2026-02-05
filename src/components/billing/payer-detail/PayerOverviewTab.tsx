 import { useState } from 'react';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
 import { Switch } from '@/components/ui/switch';
 import { Building2, Phone, Globe, FileText, Save } from 'lucide-react';
 import { ConfiguredPayer, PayerType, PAYER_TYPES } from '@/types/payerConfig';
 import { useConfiguredPayer } from '@/hooks/usePayerDirectory';
 
 interface PayerOverviewTabProps {
   payer: ConfiguredPayer;
 }
 
 export function PayerOverviewTab({ payer }: PayerOverviewTabProps) {
   const { updatePayer } = useConfiguredPayer(payer.id);
   const [isEditing, setIsEditing] = useState(false);
   const [formData, setFormData] = useState({
     name: payer.name,
     payer_id: payer.payer_id || '',
     payer_type: payer.payer_type,
     phone: payer.contact?.phone || '',
     fax: payer.contact?.fax || '',
     website: payer.contact?.website || '',
     notes: payer.contact?.notes || '',
     timely_filing_days: payer.timely_filing_days || 90,
     claims_submission_method: payer.claims_submission_method || 'manual',
     is_active: payer.is_active,
   });
 
   const handleSave = async () => {
     await updatePayer.mutateAsync({
       name: formData.name,
       payer_id: formData.payer_id,
       payer_type: formData.payer_type,
       contact: {
         phone: formData.phone || undefined,
         fax: formData.fax || undefined,
         website: formData.website || undefined,
         notes: formData.notes || undefined,
       },
       timely_filing_days: formData.timely_filing_days,
       claims_submission_method: formData.claims_submission_method,
       is_active: formData.is_active,
     });
     setIsEditing(false);
   };
 
   return (
     <div className="grid gap-6 md:grid-cols-2">
       {/* Payer Information */}
       <Card>
         <CardHeader className="flex flex-row items-center justify-between">
           <CardTitle className="flex items-center gap-2">
             <Building2 className="w-5 h-5" />
             Payer Information
           </CardTitle>
           {!isEditing && (
             <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
               Edit
             </Button>
           )}
         </CardHeader>
         <CardContent className="space-y-4">
           <div className="space-y-2">
             <Label>Payer Name</Label>
             {isEditing ? (
               <Input
                 value={formData.name}
                 onChange={(e) => setFormData({ ...formData, name: e.target.value })}
               />
             ) : (
               <p className="text-sm">{payer.name}</p>
             )}
           </div>
 
           <div className="space-y-2">
             <Label>Payer ID</Label>
             {isEditing ? (
               <Input
                 value={formData.payer_id}
                 onChange={(e) => setFormData({ ...formData, payer_id: e.target.value })}
               />
             ) : (
               <code className="text-sm bg-muted px-2 py-0.5 rounded">{payer.payer_id || 'Not set'}</code>
             )}
           </div>
 
           <div className="space-y-2">
             <Label>Payer Type</Label>
             {isEditing ? (
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
             ) : (
               <p className="text-sm">{PAYER_TYPES.find(t => t.value === payer.payer_type)?.label}</p>
             )}
           </div>
 
           <div className="flex items-center justify-between">
             <Label>Active Status</Label>
             {isEditing ? (
               <Switch
                 checked={formData.is_active}
                 onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
               />
             ) : (
               <span className={payer.is_active ? 'text-green-600' : 'text-muted-foreground'}>
                 {payer.is_active ? 'Active' : 'Inactive'}
               </span>
             )}
           </div>
 
           {isEditing && (
             <div className="flex gap-2 pt-4">
               <Button onClick={handleSave} disabled={updatePayer.isPending} className="gap-2">
                 <Save className="w-4 h-4" />
                 Save Changes
               </Button>
               <Button variant="outline" onClick={() => setIsEditing(false)}>
                 Cancel
               </Button>
             </div>
           )}
         </CardContent>
       </Card>
 
       {/* Contact Information */}
       <Card>
         <CardHeader>
           <CardTitle className="flex items-center gap-2">
             <Phone className="w-5 h-5" />
             Contact Information
           </CardTitle>
         </CardHeader>
         <CardContent className="space-y-4">
           <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
               <Label>Phone</Label>
               {isEditing ? (
                 <Input
                   value={formData.phone}
                   onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                   placeholder="1-800-555-0123"
                 />
               ) : (
                 <p className="text-sm">{payer.contact?.phone || 'Not set'}</p>
               )}
             </div>
             <div className="space-y-2">
               <Label>Fax</Label>
               {isEditing ? (
                 <Input
                   value={formData.fax}
                   onChange={(e) => setFormData({ ...formData, fax: e.target.value })}
                   placeholder="1-800-555-0124"
                 />
               ) : (
                 <p className="text-sm">{payer.contact?.fax || 'Not set'}</p>
               )}
             </div>
           </div>
 
           <div className="space-y-2">
             <Label className="flex items-center gap-1">
               <Globe className="w-3 h-3" />
               Website
             </Label>
             {isEditing ? (
               <Input
                 value={formData.website}
                 onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                 placeholder="https://provider.example.com"
               />
             ) : (
               <p className="text-sm">
                 {payer.contact?.website ? (
                   <a href={payer.contact.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                     {payer.contact.website}
                   </a>
                 ) : 'Not set'}
               </p>
             )}
           </div>
 
           <div className="space-y-2">
             <Label>Notes</Label>
             {isEditing ? (
               <Textarea
                 value={formData.notes}
                 onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                 placeholder="Additional notes..."
                 rows={3}
               />
             ) : (
               <p className="text-sm text-muted-foreground">{payer.contact?.notes || 'No notes'}</p>
             )}
           </div>
         </CardContent>
       </Card>
 
       {/* Claim Settings */}
       <Card className="md:col-span-2">
         <CardHeader>
           <CardTitle className="flex items-center gap-2">
             <FileText className="w-5 h-5" />
             Claim Settings
           </CardTitle>
         </CardHeader>
         <CardContent>
           <div className="grid gap-4 md:grid-cols-3">
             <div className="space-y-2">
               <Label>Timely Filing Limit (Days)</Label>
               {isEditing ? (
                 <Input
                   type="number"
                   value={formData.timely_filing_days}
                   onChange={(e) => setFormData({ ...formData, timely_filing_days: parseInt(e.target.value) || 90 })}
                 />
               ) : (
                 <p className="text-sm">{payer.timely_filing_days || 90} days</p>
               )}
             </div>
 
             <div className="space-y-2">
               <Label>Submission Method</Label>
               {isEditing ? (
                 <Select
                   value={formData.claims_submission_method}
                   onValueChange={(value) => setFormData({ ...formData, claims_submission_method: value })}
                 >
                   <SelectTrigger>
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="manual">Manual</SelectItem>
                     <SelectItem value="electronic">Electronic (EDI)</SelectItem>
                     <SelectItem value="clearinghouse">Clearinghouse</SelectItem>
                     <SelectItem value="portal">Payer Portal</SelectItem>
                   </SelectContent>
                 </Select>
               ) : (
                 <p className="text-sm capitalize">{payer.claims_submission_method || 'Manual'}</p>
               )}
             </div>
 
             <div className="space-y-2">
               <Label>ERA/835 Enabled</Label>
               <p className="text-sm">{payer.eligibility?.supports_270_271 ? 'Yes' : 'No'}</p>
             </div>
           </div>
         </CardContent>
       </Card>
     </div>
   );
 }