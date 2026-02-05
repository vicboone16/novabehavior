 import { useState } from 'react';
 import { useNavigate } from 'react-router-dom';
 import { Plus, Copy, MoreVertical, FileDown, AlertTriangle } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Badge } from '@/components/ui/badge';
 import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
 } from '@/components/ui/table';
 import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
 } from '@/components/ui/dropdown-menu';
 import { usePayerServices } from '@/hooks/usePayerServices';
 import { PayerService, UNIT_DEFINITIONS, ABA_SERVICE_TEMPLATES } from '@/types/payerConfig';
 import { AddServiceDialog } from '@/components/billing/payer-detail/AddServiceDialog';
 import { ImportTemplateDialog } from '@/components/billing/payer-detail/ImportTemplateDialog';
 
 interface PayerServicesTabProps {
   payerId: string;
   payerName: string;
 }
 
 export function PayerServicesTab({ payerId, payerName }: PayerServicesTabProps) {
   const navigate = useNavigate();
   const { services, isLoading, duplicateService, deleteService } = usePayerServices(payerId);
   const [showAddDialog, setShowAddDialog] = useState(false);
   const [showImportDialog, setShowImportDialog] = useState(false);
 
   const formatModifiers = (service: PayerService): string => {
     const mods = [
       service.modifiers.modifier_1,
       service.modifiers.modifier_2,
       service.modifiers.modifier_3,
       service.modifiers.modifier_4,
     ].filter(Boolean);
     return mods.length > 0 ? mods.join(', ') : '-';
   };
 
   const formatRate = (service: PayerService): string => {
     const amount = new Intl.NumberFormat('en-US', {
       style: 'currency',
       currency: service.rate.currency || 'USD',
     }).format(service.rate.rate_amount);
     return amount;
   };
 
   const getUnitLabel = (unitDef: string): string => {
     return UNIT_DEFINITIONS.find(u => u.value === unitDef)?.label || unitDef;
   };
 
   const handleViewService = (serviceId: string) => {
     navigate(`/billing/payers/${payerId}/services/${serviceId}`);
   };
 
   const handleDuplicate = async (serviceId: string) => {
     await duplicateService.mutateAsync(serviceId);
   };
 
   const handleDelete = async (serviceId: string) => {
     if (confirm('Are you sure you want to delete this service?')) {
       await deleteService.mutateAsync(serviceId);
     }
   };
 
   return (
     <>
       <Card>
         <CardHeader className="flex flex-row items-center justify-between">
           <div>
             <CardTitle>Services</CardTitle>
             <p className="text-sm text-muted-foreground mt-1">
               Configure CPT/HCPCS codes, rates, and billing rules for {payerName}
             </p>
           </div>
           <div className="flex gap-2">
             <Button variant="outline" onClick={() => setShowImportDialog(true)} className="gap-2">
               <FileDown className="w-4 h-4" />
               Import Template
             </Button>
             <Button onClick={() => setShowAddDialog(true)} className="gap-2">
               <Plus className="w-4 h-4" />
               Add Service
             </Button>
           </div>
         </CardHeader>
         <CardContent>
           {isLoading ? (
             <div className="py-8 text-center text-muted-foreground">Loading services...</div>
           ) : services.length === 0 ? (
             <div className="py-8 text-center">
               <p className="text-muted-foreground mb-4">No services configured yet</p>
               <div className="flex gap-2 justify-center">
                 <Button variant="outline" onClick={() => setShowImportDialog(true)}>
                   Import ABA Templates
                 </Button>
                 <Button onClick={() => setShowAddDialog(true)}>Add First Service</Button>
               </div>
             </div>
           ) : (
             <div className="border rounded-lg">
               <Table>
                 <TableHeader>
                   <TableRow>
                     <TableHead>Service Name</TableHead>
                     <TableHead>CPT</TableHead>
                     <TableHead>Modifiers</TableHead>
                     <TableHead>Rate</TableHead>
                     <TableHead>Units</TableHead>
                     <TableHead>Auth</TableHead>
                     <TableHead>Status</TableHead>
                     <TableHead className="w-12"></TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {services.map((service) => (
                     <TableRow
                       key={service.id}
                       className="cursor-pointer hover:bg-muted/50"
                       onClick={() => handleViewService(service.id)}
                     >
                       <TableCell>
                         <div className="font-medium">{service.service_name}</div>
                         {service.description && (
                           <div className="text-xs text-muted-foreground truncate max-w-48">
                             {service.description}
                           </div>
                         )}
                       </TableCell>
                       <TableCell>
                         <code className="text-sm bg-muted px-2 py-0.5 rounded">
                           {service.cpt_hcpcs_code}
                         </code>
                       </TableCell>
                       <TableCell>
                         <div className="flex items-center gap-1">
                           {formatModifiers(service)}
                           {service.modifiers.modifier_required && (
                             <Badge variant="outline" className="text-xs">Req</Badge>
                           )}
                         </div>
                       </TableCell>
                       <TableCell>{formatRate(service)}</TableCell>
                       <TableCell>
                         <span className="text-sm">{getUnitLabel(service.units.unit_definition)}</span>
                       </TableCell>
                       <TableCell>
                         {service.auth.auth_required ? (
                           <Badge variant={service.auth.enforcement === 'block' ? 'destructive' : 'secondary'}>
                             {service.auth.enforcement === 'block' ? (
                               <><AlertTriangle className="w-3 h-3 mr-1" /> Required</>
                             ) : 'Required'}
                           </Badge>
                         ) : (
                           <span className="text-muted-foreground">-</span>
                         )}
                       </TableCell>
                       <TableCell>
                         <Badge variant={service.status === 'active' ? 'default' : 'secondary'}>
                           {service.status}
                         </Badge>
                       </TableCell>
                       <TableCell onClick={(e) => e.stopPropagation()}>
                         <DropdownMenu>
                           <DropdownMenuTrigger asChild>
                             <Button variant="ghost" size="icon">
                               <MoreVertical className="w-4 h-4" />
                             </Button>
                           </DropdownMenuTrigger>
                           <DropdownMenuContent align="end">
                             <DropdownMenuItem onClick={() => handleViewService(service.id)}>
                               Edit Service
                             </DropdownMenuItem>
                             <DropdownMenuItem onClick={() => handleDuplicate(service.id)}>
                               <Copy className="w-4 h-4 mr-2" />
                               Duplicate
                             </DropdownMenuItem>
                             <DropdownMenuItem
                               onClick={() => handleDelete(service.id)}
                               className="text-destructive"
                             >
                               Delete
                             </DropdownMenuItem>
                           </DropdownMenuContent>
                         </DropdownMenu>
                       </TableCell>
                     </TableRow>
                   ))}
                 </TableBody>
               </Table>
             </div>
           )}
 
           <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
             <strong>Note:</strong> Units are billed according to each service's unit definition. 
             Click on a service to configure detailed CMS-1500 line 24 mapping.
           </div>
         </CardContent>
       </Card>
 
       <AddServiceDialog
         open={showAddDialog}
         onOpenChange={setShowAddDialog}
         payerId={payerId}
       />
 
       <ImportTemplateDialog
         open={showImportDialog}
         onOpenChange={setShowImportDialog}
         payerId={payerId}
       />
     </>
   );
 }