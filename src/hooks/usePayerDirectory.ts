 import { useMemo } from 'react';
 import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 import { PayerDirectoryEntry, ConfiguredPayer, PayerType } from '@/types/payerConfig';
 import { toast } from 'sonner';
 
 export function usePayerDirectory(searchTerm: string = '') {
   const queryClient = useQueryClient();
 
   // Fetch all directory entries
   const { data: directoryEntries, isLoading: isLoadingDirectory } = useQuery({
     queryKey: ['payer-directory'],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('payer_directory')
         .select('*')
         .eq('active', true)
         .order('payer_name');
 
       if (error) throw error;
       return data as unknown as PayerDirectoryEntry[];
     },
   });
 
   // Fetch configured payers (already added to our system)
   const { data: configuredPayers, isLoading: isLoadingConfigured } = useQuery({
     queryKey: ['configured-payers'],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('payers')
         .select('*')
         .order('name');
 
       if (error) throw error;
       return data as unknown as ConfiguredPayer[];
     },
   });
 
   // Filter directory entries based on search term
   const filteredEntries = useMemo(() => {
     if (!directoryEntries) return [];
     if (!searchTerm.trim()) return directoryEntries;
 
     const term = searchTerm.toLowerCase();
     return directoryEntries.filter(entry => 
       entry.payer_name.toLowerCase().includes(term) ||
       entry.payer_id.toLowerCase().includes(term) ||
       entry.aliases?.some(alias => alias.toLowerCase().includes(term))
     );
   }, [directoryEntries, searchTerm]);
 
   // Check if a directory payer is already configured
   const isPayerConfigured = (directoryPayerId: string): boolean => {
     return configuredPayers?.some(p => p.directory_payer_id === directoryPayerId) ?? false;
   };
 
   // Get configured payer for a directory entry
   const getConfiguredPayer = (directoryPayerId: string): ConfiguredPayer | undefined => {
     return configuredPayers?.find(p => p.directory_payer_id === directoryPayerId);
   };
 
   // Add payer from directory
   const addPayerFromDirectory = useMutation({
     mutationFn: async (directoryEntry: PayerDirectoryEntry) => {
       // Determine payer type from source
       let payerType: PayerType = 'commercial';
       if (directoryEntry.source.source_name === 'state_medicaid') {
         payerType = 'medicaid';
       } else if (directoryEntry.payer_name.toLowerCase().includes('medicare')) {
         payerType = 'medicare';
       } else if (directoryEntry.payer_name.toLowerCase().includes('tricare')) {
         payerType = 'tricare';
       }
 
       const insertData = {
         name: directoryEntry.payer_name,
         payer_id: directoryEntry.payer_id,
         payer_type: payerType,
         directory_payer_id: directoryEntry.id,
         directory_link: JSON.parse(JSON.stringify({
           source_name: directoryEntry.source.source_name,
           payer_directory_key: directoryEntry.payer_id,
         })),
         eligibility: JSON.parse(JSON.stringify({
           supports_270_271: directoryEntry.eligibility_supported,
         })),
         is_active: true,
       };
       const { data, error } = await supabase
         .from('payers')
         .insert(insertData)
         .select()
         .single();
 
       if (error) throw error;
       return data;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['configured-payers'] });
       toast.success('Payer added successfully');
     },
     onError: (error: Error) => {
       toast.error(`Failed to add payer: ${error.message}`);
     },
   });
 
   // Add custom payer (not from directory)
   const addCustomPayer = useMutation({
     mutationFn: async (payer: Partial<ConfiguredPayer>) => {
       const insertData = {
         name: payer.name,
         payer_id: payer.payer_id,
         payer_type: payer.payer_type || 'commercial',
         contact: payer.contact ? JSON.parse(JSON.stringify(payer.contact)) : undefined,
         eligibility: payer.eligibility ? JSON.parse(JSON.stringify(payer.eligibility)) : undefined,
         is_active: true,
       };
       const { data, error } = await supabase
         .from('payers')
         .insert(insertData)
         .select()
         .single();
 
       if (error) throw error;
       return data;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['configured-payers'] });
       toast.success('Custom payer added successfully');
     },
     onError: (error: Error) => {
       toast.error(`Failed to add payer: ${error.message}`);
     },
   });
 
   return {
     directoryEntries: filteredEntries,
     configuredPayers,
     isLoading: isLoadingDirectory || isLoadingConfigured,
     isPayerConfigured,
     getConfiguredPayer,
     addPayerFromDirectory,
     addCustomPayer,
   };
 }
 
 export function useConfiguredPayer(payerId: string) {
   const queryClient = useQueryClient();
 
   const { data: payer, isLoading } = useQuery({
     queryKey: ['payer', payerId],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('payers')
         .select('*')
         .eq('id', payerId)
         .single();
 
       if (error) throw error;
       return data as unknown as ConfiguredPayer;
     },
     enabled: !!payerId,
   });
 
   const updatePayer = useMutation({
     mutationFn: async (updates: Partial<ConfiguredPayer>) => {
       // Convert to plain JSON for Supabase
       const updateData: Record<string, unknown> = {};
       if (updates.name !== undefined) updateData.name = updates.name;
       if (updates.payer_id !== undefined) updateData.payer_id = updates.payer_id;
       if (updates.payer_type !== undefined) updateData.payer_type = updates.payer_type;
       if (updates.status !== undefined) updateData.status = updates.status;
       if (updates.contact !== undefined) updateData.contact = JSON.parse(JSON.stringify(updates.contact));
       if (updates.eligibility !== undefined) updateData.eligibility = JSON.parse(JSON.stringify(updates.eligibility));
       if (updates.timely_filing_days !== undefined) updateData.timely_filing_days = updates.timely_filing_days;
       if (updates.claims_submission_method !== undefined) updateData.claims_submission_method = updates.claims_submission_method;
       if (updates.is_active !== undefined) updateData.is_active = updates.is_active;
 
       const { data, error } = await supabase
         .from('payers')
         .update(updateData)
         .eq('id', payerId)
         .select()
         .single();
 
       if (error) throw error;
       return data;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['payer', payerId] });
       queryClient.invalidateQueries({ queryKey: ['configured-payers'] });
       toast.success('Payer updated successfully');
     },
     onError: (error: Error) => {
       toast.error(`Failed to update payer: ${error.message}`);
     },
   });
 
   const deletePayer = useMutation({
     mutationFn: async () => {
       const { error } = await supabase
         .from('payers')
         .delete()
         .eq('id', payerId);
 
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['configured-payers'] });
       toast.success('Payer deleted successfully');
     },
     onError: (error: Error) => {
       toast.error(`Failed to delete payer: ${error.message}`);
     },
   });
 
   return {
     payer,
     isLoading,
     updatePayer,
     deletePayer,
   };
 }