import { IEPAtAGlance } from '../IEPAtAGlance';

interface Student {
  id: string;
  name: string;
  color?: string;
}

interface Props {
  student: Student;
  onClose: () => void;
}

export function IEPStudentDetail({ student, onClose }: Props) {
  return <IEPAtAGlance studentId={student.id} onBack={onClose} />;
}
