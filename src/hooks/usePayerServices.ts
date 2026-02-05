 import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 import { PayerService, ServiceModifiers, ServiceRate, ServiceUnits, ServiceAuth, ServiceCMS1500Defaults } from '@/types/payerConfig';
 import { toast } from 'sonner';
 
 // Helper to safely parse JSONB fields from Supabase
 function parsePayerService(data: Record<string, unknown>): PayerService {
   return {
     id: data.id as string,
     payer_id: data.payer_id as string,
     agency_id: data.agency_id as string | undefined,
     service_name: data.service_name as string,
     service_category: (data.service_category as PayerService['service_category']) || 'aba',
     cpt_hcpcs_code: data.cpt_hcpcs_code as string,
     description: data.description as string | undefined,
     modifiers: data.modifiers as ServiceModifiers,
     rate: data.rate as ServiceRate,
     units: data.units as ServiceUnits,
     auth: data.auth as ServiceAuth,
     cms1500_defaults: data.cms1500_defaults as ServiceCMS1500Defaults,
     status: (data.status as 'active' | 'inactive') || 'active',
     sort_order: (data.sort_order as number) || 0,
     created_at: data.created_at as string,
     updated_at: data.updated_at as string,
     created_by: data.created_by as string | undefined,
   };
 }
 
 export function usePayerServices(payerId: string) {
   const queryClient = useQueryClient();
 
   const { data: services, isLoading } = useQuery({
     queryKey: ['payer-services', payerId],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('payer_services')
         .select('*')
         .eq('payer_id', payerId)
         .order('sort_order', { ascending: true });
 
       if (error) throw error;
       return (data || []).map(parsePayerService);
     },
     enabled: !!payerId,
   });
 
   const createService = useMutation({
     mutationFn: async (service: Partial<PayerService>) => {
       const insertData = {
         payer_id: payerId,
         service_name: service.service_name,
         service_category: service.service_category || 'aba',
         cpt_hcpcs_code: service.cpt_hcpcs_code,
         description: service.description,
         modifiers: service.modifiers ? JSON.parse(JSON.stringify(service.modifiers)) : undefined,
         rate: service.rate ? JSON.parse(JSON.stringify(service.rate)) : undefined,
         units: service.units ? JSON.parse(JSON.stringify(service.units)) : undefined,
         auth: service.auth ? JSON.parse(JSON.stringify(service.auth)) : undefined,
         cms1500_defaults: service.cms1500_defaults ? JSON.parse(JSON.stringify(service.cms1500_defaults)) : undefined,
         status: service.status || 'active',
         sort_order: service.sort_order || 0,
       };
       const { data, error } = await supabase
         .from('payer_services')
         .insert(insertData)
         .select()
         .single();
 
       if (error) throw error;
       return parsePayerService(data);
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['payer-services', payerId] });
       toast.success('Service created successfully');
     },
     onError: (error: Error) => {
       toast.error(`Failed to create service: ${error.message}`);
     },
   });
 
   const updateService = useMutation({
     mutationFn: async ({ serviceId, updates }: { serviceId: string; updates: Partial<PayerService> }) => {
       const updateData: Record<string, unknown> = {
         updated_at: new Date().toISOString(),
       };
       if (updates.service_name !== undefined) updateData.service_name = updates.service_name;
       if (updates.service_category !== undefined) updateData.service_category = updates.service_category;
       if (updates.cpt_hcpcs_code !== undefined) updateData.cpt_hcpcs_code = updates.cpt_hcpcs_code;
       if (updates.description !== undefined) updateData.description = updates.description;
       if (updates.modifiers !== undefined) updateData.modifiers = JSON.parse(JSON.stringify(updates.modifiers));
       if (updates.rate !== undefined) updateData.rate = JSON.parse(JSON.stringify(updates.rate));
       if (updates.units !== undefined) updateData.units = JSON.parse(JSON.stringify(updates.units));
       if (updates.auth !== undefined) updateData.auth = JSON.parse(JSON.stringify(updates.auth));
       if (updates.cms1500_defaults !== undefined) updateData.cms1500_defaults = JSON.parse(JSON.stringify(updates.cms1500_defaults));
       if (updates.status !== undefined) updateData.status = updates.status;
       if (updates.sort_order !== undefined) updateData.sort_order = updates.sort_order;
 
       const { data, error } = await supabase
         .from('payer_services')
         .update(updateData)
         .eq('id', serviceId)
         .select()
         .single();
 
       if (error) throw error;
       return parsePayerService(data);
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['payer-services', payerId] });
       toast.success('Service updated successfully');
     },
     onError: (error: Error) => {
       toast.error(`Failed to update service: ${error.message}`);
     },
   });
 
   const deleteService = useMutation({
     mutationFn: async (serviceId: string) => {
       const { error } = await supabase
         .from('payer_services')
         .delete()
         .eq('id', serviceId);
 
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['payer-services', payerId] });
       toast.success('Service deleted successfully');
     },
     onError: (error: Error) => {
       toast.error(`Failed to delete service: ${error.message}`);
     },
   });
 
   const duplicateService = useMutation({
     mutationFn: async (serviceId: string) => {
       // First, fetch the service to duplicate
       const { data: originalService, error: fetchError } = await supabase
         .from('payer_services')
         .select('*')
         .eq('id', serviceId)
         .single();
 
       if (fetchError) throw fetchError;
 
       // Create a copy with a new name
       const { data, error } = await supabase
         .from('payer_services')
         .insert({
           payer_id: payerId,
           service_name: `${originalService.service_name} (Copy)`,
           service_category: originalService.service_category,
           cpt_hcpcs_code: originalService.cpt_hcpcs_code,
           description: originalService.description,
           modifiers: originalService.modifiers,
           rate: originalService.rate,
           units: originalService.units,
           auth: originalService.auth,
           cms1500_defaults: originalService.cms1500_defaults,
           status: 'active',
           sort_order: (originalService.sort_order || 0) + 1,
         })
         .select()
         .single();
 
       if (error) throw error;
       return parsePayerService(data);
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['payer-services', payerId] });
       toast.success('Service duplicated successfully');
     },
     onError: (error: Error) => {
       toast.error(`Failed to duplicate service: ${error.message}`);
     },
   });
 
   return {
     services: services || [],
     isLoading,
     createService,
     updateService,
     deleteService,
     duplicateService,
   };
 }
 
 export function usePayerService(serviceId: string) {
   const queryClient = useQueryClient();
 
   const { data: service, isLoading } = useQuery({
     queryKey: ['payer-service', serviceId],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('payer_services')
         .select('*')
         .eq('id', serviceId)
         .single();
 
       if (error) throw error;
       return parsePayerService(data);
     },
     enabled: !!serviceId,
   });
 
   const updateService = useMutation({
     mutationFn: async (updates: Partial<PayerService>) => {
       const updateData: Record<string, unknown> = {
         updated_at: new Date().toISOString(),
       };
       if (updates.service_name !== undefined) updateData.service_name = updates.service_name;
       if (updates.service_category !== undefined) updateData.service_category = updates.service_category;
       if (updates.cpt_hcpcs_code !== undefined) updateData.cpt_hcpcs_code = updates.cpt_hcpcs_code;
       if (updates.description !== undefined) updateData.description = updates.description;
       if (updates.modifiers !== undefined) updateData.modifiers = JSON.parse(JSON.stringify(updates.modifiers));
       if (updates.rate !== undefined) updateData.rate = JSON.parse(JSON.stringify(updates.rate));
       if (updates.units !== undefined) updateData.units = JSON.parse(JSON.stringify(updates.units));
       if (updates.auth !== undefined) updateData.auth = JSON.parse(JSON.stringify(updates.auth));
       if (updates.cms1500_defaults !== undefined) updateData.cms1500_defaults = JSON.parse(JSON.stringify(updates.cms1500_defaults));
       if (updates.status !== undefined) updateData.status = updates.status;
       if (updates.sort_order !== undefined) updateData.sort_order = updates.sort_order;
 
       const { data, error } = await supabase
         .from('payer_services')
         .update(updateData)
         .eq('id', serviceId)
         .select()
         .single();
 
       if (error) throw error;
       return parsePayerService(data);
     },
     onSuccess: (data) => {
       queryClient.invalidateQueries({ queryKey: ['payer-service', serviceId] });
       queryClient.invalidateQueries({ queryKey: ['payer-services', data.payer_id] });
       toast.success('Service updated successfully');
     },
     onError: (error: Error) => {
       toast.error(`Failed to update service: ${error.message}`);
     },
   });
 
   const deleteService = useMutation({
     mutationFn: async () => {
       const { error } = await supabase
         .from('payer_services')
         .delete()
         .eq('id', serviceId);
 
       if (error) throw error;
     },
     onSuccess: () => {
       if (service) {
         queryClient.invalidateQueries({ queryKey: ['payer-services', service.payer_id] });
       }
       toast.success('Service deleted successfully');
     },
     onError: (error: Error) => {
       toast.error(`Failed to delete service: ${error.message}`);
     },
   });
 
   return {
     service,
     isLoading,
     updateService,
     deleteService,
   };
 }