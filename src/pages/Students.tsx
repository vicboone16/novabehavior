import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Plus, ChevronRight, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useDataStore } from '@/store/dataStore';
import { ConfirmDialog } from '@/components/ui/alert-dialog-confirm';

export default function Students() {
  const navigate = useNavigate();
  const { students, addStudent, removeStudent } = useDataStore();
  const [newStudentName, setNewStudentName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleAddStudent = () => {
    if (newStudentName.trim()) {
      addStudent(newStudentName.trim());
      setNewStudentName('');
    }
  };

  const handleDeleteStudent = (id: string) => {
    removeStudent(id);
    setDeleteConfirm(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Students</h2>
          <p className="text-muted-foreground text-sm">
            Manage student profiles, behaviors, and goals
          </p>
        </div>
      </div>

      {/* Add Student */}
      <div className="flex gap-2">
        <Input
          placeholder="Enter student name..."
          value={newStudentName}
          onChange={(e) => setNewStudentName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddStudent()}
          className="max-w-xs"
        />
        <Button onClick={handleAddStudent} disabled={!newStudentName.trim()}>
          <Plus className="w-4 h-4 mr-2" />
          Add Student
        </Button>
      </div>

      {/* Student List */}
      <div className="grid gap-3">
        {students.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <User className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-base font-semibold text-foreground mb-2">
              No Students Yet
            </h3>
            <p className="text-sm text-muted-foreground">
              Add a student above to get started with behavior tracking.
            </p>
          </div>
        ) : (
          students.map((student) => (
            <div
              key={student.id}
              className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors cursor-pointer"
              onClick={() => navigate(`/students/${student.id}`)}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${student.color}20` }}
                >
                  <User className="w-6 h-6" style={{ color: student.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">
                    {student.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {student.behaviors.length} behaviors
                    </Badge>
                    {student.customAntecedents?.length ? (
                      <Badge variant="outline" className="text-xs">
                        {student.customAntecedents.length} custom A's
                      </Badge>
                    ) : null}
                    {student.customConsequences?.length ? (
                      <Badge variant="outline" className="text-xs">
                        {student.customConsequences.length} custom C's
                      </Badge>
                    ) : null}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirm(student.id);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
        title="Delete Student"
        description="Are you sure you want to delete this student? All their data, behaviors, and goals will be permanently removed. This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => deleteConfirm && handleDeleteStudent(deleteConfirm)}
        variant="destructive"
      />
    </div>
  );
}
