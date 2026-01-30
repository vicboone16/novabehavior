import { useState } from 'react';
import { useDataStore } from '@/store/dataStore';
import { SkillsTabContainer } from '@/components/skills/SkillsTabContainer';
import { SkillAcquisitionDashboard } from '@/components/SkillAcquisitionDashboard';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function SkillAcquisition() {
  const { students } = useDataStore();
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  
  const activeStudents = students.filter(s => !s.isArchived);
  const selectedStudent = activeStudents.find(s => s.id === selectedStudentId);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Skills & Curriculum</h1>
          <p className="text-sm text-muted-foreground">
            Manage skill acquisition targets, curriculum assessments, and recommendations
          </p>
        </div>

        <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Select a student" />
          </SelectTrigger>
          <SelectContent>
            {activeStudents.map(s => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedStudent ? (
        <SkillsTabContainer 
          studentId={selectedStudent.id} 
          studentName={selectedStudent.name} 
        />
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Select a student to view and manage their skill acquisition targets, curriculum systems, and recommendations.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Legacy dashboard for aggregate view */}
      {!selectedStudentId && (
        <div className="mt-8">
          <SkillAcquisitionDashboard />
        </div>
      )}
    </div>
  );
}
