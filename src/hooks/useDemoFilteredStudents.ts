/**
 * Hook that returns students filtered by agency context.
 * - In demo mode: only show demo agency students
 * - In a real agency: exclude demo agency students
 */
import { useDataStore } from '@/store/dataStore';
import { useDemoMode } from '@/contexts/DemoModeContext';
import { useAgencyContext } from '@/hooks/useAgencyContext';
import { useMemo } from 'react';

const DEMO_AGENCY_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

export function useDemoFilteredStudents() {
  const students = useDataStore((s) => s.students);
  const { isDemoMode } = useDemoMode();
  const { currentAgency } = useAgencyContext();

  return useMemo(() => {
    const isInDemoAgency = isDemoMode || currentAgency?.id === DEMO_AGENCY_ID;

    if (isInDemoAgency) {
      // In demo mode, only show demo students
      return students.filter((s) => s.agencyId === DEMO_AGENCY_ID);
    }

    // In a real agency, exclude demo students and optionally filter to current agency
    return students.filter((s) => {
      if (s.agencyId === DEMO_AGENCY_ID) return false;
      // If we have a current agency, prefer showing only that agency's students
      if (currentAgency?.id && s.agencyId) {
        return s.agencyId === currentAgency.id;
      }
      return true;
    });
  }, [students, isDemoMode, currentAgency?.id]);
}