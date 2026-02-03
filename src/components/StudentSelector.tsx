import { useState } from 'react';
import { Plus, Users, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useDataStore } from '@/store/dataStore';
import { SessionStartConfirmation } from './SessionStartConfirmation';

export function StudentSelector() {
  const [newStudentName, setNewStudentName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [confirmStudent, setConfirmStudent] = useState<{
    id: string;
    name: string;
    color: string;
  } | null>(null);
  
  const { 
    students, 
    selectedStudentIds, 
    addStudent,
    toggleStudentSelection,
    selectAllStudents,
    deselectAllStudents,
    sessionStartTime,
    startSession,
  } = useDataStore();

  const handleAddStudent = () => {
    if (newStudentName.trim()) {
      addStudent(newStudentName.trim());
      setNewStudentName('');
      setIsAdding(false);
    }
  };

  const handleStudentClick = (student: { id: string; name: string; color: string }) => {
    // If already selected, just deselect (no confirmation needed)
    if (selectedStudentIds.includes(student.id)) {
      toggleStudentSelection(student.id);
      return;
    }
    
    // Show confirmation dialog when selecting a new student
    setConfirmStudent(student);
  };

  const handleConfirmStart = (options: {
    linkedAppointmentId?: string;
    createAppointment: boolean;
  }) => {
    if (!confirmStudent) return;
    
    // Select the student
    toggleStudentSelection(confirmStudent.id);
    
    // Start session if not already started, passing the linked appointment ID
    if (!sessionStartTime) {
      startSession(options.linkedAppointmentId);
    } else if (options.linkedAppointmentId) {
      // If session already running, still store the linked appointment ID
      // This allows adding students to an existing session while keeping linkage
      const { setLinkedAppointmentId, linkedAppointmentId } = useDataStore.getState();
      // Only set if we don't already have one (first student wins)
      if (!linkedAppointmentId) {
        setLinkedAppointmentId(options.linkedAppointmentId);
      }
    }
    
    setConfirmStudent(null);
  };

  return (
    <>
      <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">Students</h2>
            <Badge variant="secondary" className="ml-2">
              {selectedStudentIds.length} / {students.filter(s => !s.isArchived).length} selected
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={selectedStudentIds.length === students.filter(s => !s.isArchived).length ? deselectAllStudents : selectAllStudents}
            >
              {selectedStudentIds.length === students.filter(s => !s.isArchived).length ? 'Deselect All' : 'Select All'}
            </Button>
            <Button 
              variant="default" 
              size="sm"
              onClick={() => setIsAdding(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>
        </div>

        {isAdding && (
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Student name..."
              value={newStudentName}
              onChange={(e) => setNewStudentName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddStudent()}
              autoFocus
              className="flex-1"
            />
            <Button size="sm" onClick={handleAddStudent}>
              <Check className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsAdding(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {students.filter(s => !s.isArchived).map((student) => (
            <div
              key={student.id}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-150
                border-2 hover:shadow-md
                ${selectedStudentIds.includes(student.id) 
                  ? 'border-primary bg-primary/10' 
                  : 'border-border bg-secondary/50 hover:border-primary/50'}
              `}
              onClick={() => handleStudentClick(student)}
            >
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: student.color }}
              />
              <span className="font-medium text-sm">{student.name}</span>
              {selectedStudentIds.includes(student.id) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleStudentSelection(student.id);
                  }}
                  className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
                  title="Remove from session"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
          {students.filter(s => !s.isArchived).length === 0 && !isAdding && (
            <p className="text-muted-foreground text-sm">
              No students added yet. Click "Add" to get started.
            </p>
          )}
        </div>
      </div>

      {/* Session Start Confirmation Dialog */}
      <SessionStartConfirmation
        open={!!confirmStudent}
        onOpenChange={(open) => !open && setConfirmStudent(null)}
        student={confirmStudent}
        onConfirm={handleConfirmStart}
      />
    </>
  );
}
