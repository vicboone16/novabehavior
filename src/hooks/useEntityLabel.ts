import { useAgencyContext } from '@/hooks/useAgencyContext';

export function useEntityLabel() {
  const { currentAgency } = useAgencyContext();
  
  // Default to 'client' if no agency or no label set
  const base = (currentAgency as any)?.primary_entity_label || 'client';
  
  const labels: Record<string, { singular: string; plural: string }> = {
    client: { singular: 'Client', plural: 'Clients' },
    student: { singular: 'Student', plural: 'Students' },
  };
  
  return labels[base] || labels.client;
}
