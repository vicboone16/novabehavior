 import { useParams, useNavigate } from 'react-router-dom';
 import { useState, useEffect } from 'react';
 import { ArrowLeft, Save, Trash2, AlertTriangle, Info } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Textarea } from '@/components/ui/textarea';
 import { Switch } from '@/components/ui/switch';
 import { Badge } from '@/components/ui/badge';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
 import { Alert, AlertDescription } from '@/components/ui/alert';
 import { usePayerService } from '@/hooks/usePayerServices';
 import { useConfiguredPayer } from '@/hooks/usePayerDirectory';
 import {
   PayerService, RATE_TYPES, UNIT_DEFINITIONS, ROUNDING_RULES, AUTH_UNIT_TYPES,
   AUTH_PERIODS, EXTENDED_PLACE_OF_SERVICE_CODES, COMMON_MODIFIERS,
   RateType, UnitDefinition, RoundingRule, AuthUnitType, AuthPeriod, AuthEnforcement, DiagnosisPointerMode
 } from '@/types/payerConfig';
 import { validateServiceConfig, getUnitDefinitionDescription } from '@/lib/claimCalculations';
 
 export default function ServiceDetailPage() {
   const { payerId, serviceId } = useParams<{ payerId: string; serviceId: string }>();
   const navigate = useNavigate();
   const { service, isLoading, updateService, deleteService } = usePayerService(serviceId || '');
   const { payer } = useConfiguredPayer(payerId || '');
   const [formData, setFormData] = useState<PayerService | null>(null);
   const [warnings, setWarnings] = useState<string[]>([]);
 
   useEffect(() => {
     if (service) {
       setFormData(service);
       setWarnings(validateServiceConfig(service));
     }
   }, [service]);
 
   const handleSave = async () => {
     if (!formData) return;
     await updateService.mutateAsync(formData);
   };
 
   const handleDelete = async () => {
     if (confirm('Are you sure you want to delete this service?')) {
       await deleteService.mutateAsync();
       navigate(`/billing/payers/${payerId}`);
     }
   };
 
   if (isLoading || !formData) {
     return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
   }
 
   return (
     <div className="min-h-screen bg-background">
       <header className="bg-card border-b border-border sticky top-0 z-20">
         <div className="container py-3">
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-3">
               <Button variant="ghost" size="icon" onClick={() => navigate(`/billing/payers/${payerId}`)}>
                 <ArrowLeft className="w-5 h-5" />
               </Button>
               <div>
                 <h1 className="text-lg font-bold">{formData.service_name}</h1>
                 <div className="flex items-center gap-2">
                   <code className="text-sm bg-muted px-2 py-0.5 rounded">{formData.cpt_hcpcs_code}</code>
                   {payer && <span className="text-sm text-muted-foreground">• {payer.name}</span>}
                 </div>
               </div>
             </div>
             <div className="flex gap-2">
               <Button variant="outline" onClick={handleDelete} className="gap-2 text-destructive">
                 <Trash2 className="w-4 h-4" /> Delete
               </Button>
               <Button onClick={handleSave} disabled={updateService.isPending} className="gap-2">
                 <Save className="w-4 h-4" /> {updateService.isPending ? 'Saving...' : 'Save Changes'}
               </Button>
             </div>
           </div>
         </div>
       </header>
 
       <main className="container py-6 space-y-6">
         {warnings.length > 0 && (
           <Alert variant="destructive">
             <AlertTriangle className="w-4 h-4" />
             <AlertDescription>
               <ul className="list-disc list-inside">{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
             </AlertDescription>
           </Alert>
         )}
 
         {/* Section A: Code & Modifiers */}
         <Card>
           <CardHeader><CardTitle>A. Code & Modifiers</CardTitle></CardHeader>
           <CardContent className="space-y-4">
             <div className="grid md:grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label>CPT/HCPCS Code *</Label>
                 <Input value={formData.cpt_hcpcs_code} onChange={(e) => setFormData({...formData, cpt_hcpcs_code: e.target.value.toUpperCase()})} />
               </div>
               <div className="space-y-2">
                 <Label>Service Name *</Label>
                 <Input value={formData.service_name} onChange={(e) => setFormData({...formData, service_name: e.target.value})} />
               </div>
             </div>
             <div className="grid grid-cols-4 gap-4">
               {[1,2,3,4].map(n => (
                 <div key={n} className="space-y-2">
                   <Label>Modifier {n}</Label>
                   <Select value={(formData.modifiers[`modifier_${n}` as keyof typeof formData.modifiers] as string | null) || ''} onValueChange={(v) => setFormData({...formData, modifiers: {...formData.modifiers, [`modifier_${n}`]: v || null}})}>
                     <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                     <SelectContent>
                       <SelectItem value="">None</SelectItem>
                       {COMMON_MODIFIERS.map(m => <SelectItem key={m.code} value={m.code}>{m.code} - {m.description}</SelectItem>)}
                     </SelectContent>
                   </Select>
                 </div>
               ))}
             </div>
             <div className="flex items-center gap-2">
               <Switch checked={formData.modifiers.modifier_required} onCheckedChange={(c) => setFormData({...formData, modifiers: {...formData.modifiers, modifier_required: c}})} />
               <Label>Modifiers required for billing</Label>
             </div>
           </CardContent>
         </Card>
 
         {/* Section B: Rate */}
         <Card>
           <CardHeader><CardTitle>B. Rate</CardTitle></CardHeader>
           <CardContent className="space-y-4">
             <div className="grid md:grid-cols-3 gap-4">
               <div className="space-y-2">
                 <Label>Rate Type</Label>
                 <Select value={formData.rate.rate_type} onValueChange={(v: RateType) => setFormData({...formData, rate: {...formData.rate, rate_type: v}})}>
                   <SelectTrigger><SelectValue /></SelectTrigger>
                   <SelectContent>{RATE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                 </Select>
               </div>
               <div className="space-y-2">
                 <Label>Rate Amount ($)</Label>
                 <Input type="number" step="0.01" value={formData.rate.rate_amount} onChange={(e) => setFormData({...formData, rate: {...formData.rate, rate_amount: parseFloat(e.target.value) || 0}})} />
               </div>
               <div className="flex items-center gap-2 pt-6">
                 <Switch checked={formData.rate.allow_override_on_claim} onCheckedChange={(c) => setFormData({...formData, rate: {...formData.rate, allow_override_on_claim: c}})} />
                 <Label>Allow override on claim</Label>
               </div>
             </div>
           </CardContent>
         </Card>
 
         {/* Section C: Units & Rounding */}
         <Card>
           <CardHeader><CardTitle>C. Units & Rounding</CardTitle></CardHeader>
           <CardContent className="space-y-4">
             <div className="grid md:grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label>Unit Definition</Label>
                 <Select value={formData.units.unit_definition} onValueChange={(v: UnitDefinition) => setFormData({...formData, units: {...formData.units, unit_definition: v}})}>
                   <SelectTrigger><SelectValue /></SelectTrigger>
                   <SelectContent>{UNIT_DEFINITIONS.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}</SelectContent>
                 </Select>
                 <p className="text-sm text-muted-foreground flex items-center gap-1"><Info className="w-3 h-3" />{getUnitDefinitionDescription(formData.units.unit_definition)}</p>
               </div>
               <div className="space-y-2">
                 <Label>Rounding Rule</Label>
                 <Select value={formData.units.rounding_rule} onValueChange={(v: RoundingRule) => setFormData({...formData, units: {...formData.units, rounding_rule: v}})}>
                   <SelectTrigger><SelectValue /></SelectTrigger>
                   <SelectContent>{ROUNDING_RULES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                 </Select>
               </div>
             </div>
             <div className="grid md:grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label>Max Units/Day (optional)</Label>
                 <Input type="number" value={formData.units.max_units_per_day || ''} onChange={(e) => setFormData({...formData, units: {...formData.units, max_units_per_day: e.target.value ? parseInt(e.target.value) : null}})} placeholder="No limit" />
               </div>
               <div className="space-y-2">
                 <Label>Max Units/Auth Period (optional)</Label>
                 <Input type="number" value={formData.units.max_units_per_auth_period || ''} onChange={(e) => setFormData({...formData, units: {...formData.units, max_units_per_auth_period: e.target.value ? parseInt(e.target.value) : null}})} placeholder="No limit" />
               </div>
             </div>
           </CardContent>
         </Card>
 
         {/* Section D: Authorization */}
         <Card>
           <CardHeader><CardTitle>D. Authorization</CardTitle></CardHeader>
           <CardContent className="space-y-4">
             <div className="flex items-center gap-2">
               <Switch checked={formData.auth.auth_required} onCheckedChange={(c) => setFormData({...formData, auth: {...formData.auth, auth_required: c}})} />
               <Label>Authorization required</Label>
             </div>
             {formData.auth.auth_required && (
               <>
                 <div className="grid md:grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <Label>Auth Unit Type</Label>
                     <Select value={formData.auth.auth_unit_type} onValueChange={(v: AuthUnitType) => setFormData({...formData, auth: {...formData.auth, auth_unit_type: v}})}>
                       <SelectTrigger><SelectValue /></SelectTrigger>
                       <SelectContent>{AUTH_UNIT_TYPES.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
                     </Select>
                   </div>
                   <div className="space-y-2">
                     <Label>Auth Period</Label>
                     <Select value={formData.auth.auth_period} onValueChange={(v: AuthPeriod) => setFormData({...formData, auth: {...formData.auth, auth_period: v}})}>
                       <SelectTrigger><SelectValue /></SelectTrigger>
                       <SelectContent>{AUTH_PERIODS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                     </Select>
                   </div>
                 </div>
                 <div className="space-y-2">
                   <Label>Enforcement</Label>
                   <RadioGroup value={formData.auth.enforcement} onValueChange={(v: AuthEnforcement) => setFormData({...formData, auth: {...formData.auth, enforcement: v}})} className="flex gap-4">
                     <div className="flex items-center gap-2"><RadioGroupItem value="warn" id="warn" /><Label htmlFor="warn">Warn</Label></div>
                     <div className="flex items-center gap-2"><RadioGroupItem value="block" id="block" /><Label htmlFor="block">Block</Label></div>
                   </RadioGroup>
                   {formData.auth.enforcement === 'block' && <p className="text-sm text-destructive flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Claims exceeding remaining auth units will be blocked</p>}
                 </div>
               </>
             )}
           </CardContent>
         </Card>
 
         {/* Section E: CMS-1500 Defaults */}
         <Card>
           <CardHeader><CardTitle>E. CMS-1500 Defaults</CardTitle></CardHeader>
           <CardContent className="space-y-4">
             <div className="space-y-2">
               <Label>Place of Service (Box 24B)</Label>
               <Select value={formData.cms1500_defaults.place_of_service_default} onValueChange={(v) => setFormData({...formData, cms1500_defaults: {...formData.cms1500_defaults, place_of_service_default: v}})}>
                 <SelectTrigger><SelectValue /></SelectTrigger>
                 <SelectContent>{EXTENDED_PLACE_OF_SERVICE_CODES.map(p => <SelectItem key={p.code} value={p.code}>{p.code} - {p.description}</SelectItem>)}</SelectContent>
               </Select>
             </div>
             <div className="space-y-2">
               <Label>Diagnosis Pointer Mode</Label>
               <RadioGroup value={formData.cms1500_defaults.diagnosis_pointer_mode} onValueChange={(v: DiagnosisPointerMode) => setFormData({...formData, cms1500_defaults: {...formData.cms1500_defaults, diagnosis_pointer_mode: v}})} className="flex gap-4">
                 <div className="flex items-center gap-2"><RadioGroupItem value="auto" id="auto" /><Label htmlFor="auto">Auto</Label></div>
                 <div className="flex items-center gap-2"><RadioGroupItem value="manual" id="manual" /><Label htmlFor="manual">Manual</Label></div>
               </RadioGroup>
             </div>
             <div className="flex gap-6">
               <div className="flex items-center gap-2">
                 <Switch checked={formData.cms1500_defaults.rendering_provider_required} onCheckedChange={(c) => setFormData({...formData, cms1500_defaults: {...formData.cms1500_defaults, rendering_provider_required: c}})} />
                 <Label>Rendering Provider Required (24J)</Label>
               </div>
               <div className="flex items-center gap-2">
                 <Switch checked={formData.cms1500_defaults.supervising_provider_required} onCheckedChange={(c) => setFormData({...formData, cms1500_defaults: {...formData.cms1500_defaults, supervising_provider_required: c}})} />
                 <Label>Supervising Provider Required</Label>
               </div>
             </div>
           </CardContent>
         </Card>
 
         {/* Section F: CMS-1500 Preview */}
         <Card>
           <CardHeader><CardTitle>F. CMS-1500 Line 24 Mapping Preview</CardTitle></CardHeader>
           <CardContent>
             <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
               <p><strong>24A</strong> Dates of Service → From session start/end</p>
               <p><strong>24B</strong> Place of Service → {formData.cms1500_defaults.place_of_service_default} ({EXTENDED_PLACE_OF_SERVICE_CODES.find(p => p.code === formData.cms1500_defaults.place_of_service_default)?.description})</p>
               <p><strong>24D</strong> Procedures → {formData.cpt_hcpcs_code} {[formData.modifiers.modifier_1, formData.modifiers.modifier_2].filter(Boolean).join(' ')}</p>
               <p><strong>24E</strong> Diagnosis Pointer → {formData.cms1500_defaults.diagnosis_pointer_mode === 'auto' ? 'Auto-assigned' : 'Manual entry'}</p>
               <p><strong>24F</strong> Charges → ${formData.rate.rate_amount} × Units</p>
               <p><strong>24G</strong> Units → {getUnitDefinitionDescription(formData.units.unit_definition)}</p>
               <p><strong>24J</strong> Rendering Provider → {formData.cms1500_defaults.rendering_provider_required ? 'Required ✓' : 'Optional'}</p>
             </div>
           </CardContent>
         </Card>
       </main>
     </div>
   );
 }