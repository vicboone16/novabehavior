/**
 * Hook that returns students filtered to demo-only when demo mode is active.
 * When demo mode is off, returns all students unfiltered.
 */
import { useDataStore } from '@/store/dataStore';
import { useDemoMode } from '@/contexts/DemoModeContext';
import { useMemo } from 'react';

const DEMO_AGENCY_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

export function useDemoFilteredStudents() {
  const students = useDataStore((s) => s.students);
  const { isDemoMode } = useDemoMode();

  return useMemo(() => {
    if (!isDemoMode) return students;
    return students.filter((s) => s.agencyId === DEMO_AGENCY_ID);
  }, [students, isDemoMode]);
}