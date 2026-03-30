import { History } from 'lucide-react';
import { BehaviorDataEditor } from '@/components/programming/BehaviorDataEditor';
import { useDataStore } from '@/store/dataStore';

interface HistoricalDataManagerProps {
  studentId: string;
}

export function HistoricalDataManager({ studentId }: HistoricalDataManagerProps) {
  const studentName = useDataStore(
    state => state.students.find(student => student.id === studentId)?.name ?? 'Student'
  );

  return (
    <BehaviorDataEditor
      studentId={studentId}
      studentName={studentName}
      triggerLabel="Manage Data"
      TriggerIcon={History}
    />
  );
}