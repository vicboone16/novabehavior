 import { useState } from 'react';
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogFooter,
 } from '@/components/ui/dialog';
 import { Button } from '@/components/ui/button';
 import { Checkbox } from '@/components/ui/checkbox';
 import { Label } from '@/components/ui/label';
 import { Badge } from '@/components/ui/badge';
 import { usePayerServices } from '@/hooks/usePayerServices';
 import { ABA_SERVICE_TEMPLATES, PayerService } from '@/types/payerConfig';
 
 interface ImportTemplateDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   payerId: string;
 }
 
 export function ImportTemplateDialog({ open, onOpenChange, payerId }: ImportTemplateDialogProps) {
   const { createService, services } = usePayerServices(payerId);
   const [selectedTemplates, setSelectedTemplates] = useState<number[]>([]);
   const [isImporting, setIsImporting] = useState(false);
 
   // Check which templates already exist
   const existingCodes = new Set(services.map(s => s.cpt_hcpcs_code));
 
   const handleToggleTemplate = (index: number) => {
     setSelectedTemplates(prev =>
       prev.includes(index)
         ? prev.filter(i => i !== index)
         : [...prev, index]
     );
   };
 
   const handleSelectAll = () => {
     const available = ABA_SERVICE_TEMPLATES
       .map((_, i) => i)
       .filter(i => !existingCodes.has(ABA_SERVICE_TEMPLATES[i].cpt_hcpcs_code || ''));
     setSelectedTemplates(available);
   };
 
   const handleImport = async () => {
     setIsImporting(true);
     try {
       for (const index of selectedTemplates) {
         const template = ABA_SERVICE_TEMPLATES[index];
         await createService.mutateAsync(template as Partial<PayerService>);
       }
       onOpenChange(false);
       setSelectedTemplates([]);
     } finally {
       setIsImporting(false);
     }
   };
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="max-w-lg">
         <DialogHeader>
           <DialogTitle>Import ABA Service Templates</DialogTitle>
         </DialogHeader>
 
         <div className="space-y-4">
           <p className="text-sm text-muted-foreground">
             Select standard ABA service codes to import. You can customize rates and settings after import.
           </p>
 
           <div className="flex justify-between items-center">
             <span className="text-sm text-muted-foreground">
               {selectedTemplates.length} of {ABA_SERVICE_TEMPLATES.length} selected
             </span>
             <Button variant="link" size="sm" onClick={handleSelectAll}>
               Select All Available
             </Button>
           </div>
 
           <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
             {ABA_SERVICE_TEMPLATES.map((template, index) => {
               const exists = existingCodes.has(template.cpt_hcpcs_code || '');
               const isSelected = selectedTemplates.includes(index);
 
               return (
                 <div
                   key={index}
                   className={`p-3 flex items-start gap-3 ${exists ? 'opacity-50' : ''}`}
                 >
                   <Checkbox
                     id={`template-${index}`}
                     checked={isSelected}
                     onCheckedChange={() => handleToggleTemplate(index)}
                     disabled={exists}
                   />
                   <div className="flex-1">
                     <Label
                       htmlFor={`template-${index}`}
                       className={`font-medium ${exists ? 'text-muted-foreground' : ''}`}
                     >
                       {template.service_name}
                     </Label>
                     <div className="flex gap-2 mt-1">
                       <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                         {template.cpt_hcpcs_code}
                       </code>
                       {template.modifiers?.modifier_1 && (
                         <Badge variant="secondary" className="text-xs">
                           {template.modifiers.modifier_1}
                         </Badge>
                       )}
                       <span className="text-xs text-muted-foreground">
                         ${template.rate?.rate_amount}/unit
                       </span>
                       {exists && (
                         <Badge variant="outline" className="text-xs">Already added</Badge>
                       )}
                     </div>
                   </div>
                 </div>
               );
             })}
           </div>
         </div>
 
         <DialogFooter>
           <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
             Cancel
           </Button>
           <Button
             onClick={handleImport}
             disabled={selectedTemplates.length === 0 || isImporting}
           >
             {isImporting ? 'Importing...' : `Import ${selectedTemplates.length} Services`}
           </Button>
         </DialogFooter>
       </DialogContent>
     </Dialog>
   );
 }