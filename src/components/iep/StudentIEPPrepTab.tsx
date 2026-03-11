import { IEPIntelligenceEngine } from './engine/IEPIntelligenceEngine';

interface StudentIEPPrepTabProps {
  studentId: string;
}

export function StudentIEPPrepTab({ studentId }: StudentIEPPrepTabProps) {
  return <IEPIntelligenceEngine studentId={studentId} />;
}
