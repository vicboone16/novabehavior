import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Plus, ChevronRight, Archive, ArchiveRestore, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDataStore } from '@/store/dataStore';
import { BulkAddBehavior } from '@/components/BulkAddBehavior';
import { StudentComparison } from '@/components/StudentComparison';

type FilterType = 'active' | 'archived' | 'all';

export default function Students() {
  const navigate = useNavigate();
  const { students, addStudent, unarchiveStudent } = useDataStore();
  const [newStudentName, setNewStudentName] = useState('');
  const [filter, setFilter] = useState<FilterType>('active');

  const handleAddStudent = () => {
    if (newStudentName.trim()) {
      addStudent(newStudentName.trim());
      setNewStudentName('');
    }
  };

  const filteredStudents = students.filter(s => {
    if (filter === 'active') return !s.isArchived;
    if (filter === 'archived') return s.isArchived;
    return true;
  });

  const activeCount = students.filter(s => !s.isArchived).length;
  const archivedCount = students.filter(s => s.isArchived).length;

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
      <div className="flex flex-wrap gap-2">
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
        <BulkAddBehavior />
        <StudentComparison />
      </div>

      {/* Filter Tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
        <TabsList>
          <TabsTrigger value="active" className="gap-2">
            <Users className="w-4 h-4" />
            Active
            <Badge variant="secondary" className="ml-1">{activeCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="archived" className="gap-2">
            <Archive className="w-4 h-4" />
            Archived
            <Badge variant="secondary" className="ml-1">{archivedCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-2">
            All
            <Badge variant="secondary" className="ml-1">{students.length}</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Student List */}
      <div className="grid gap-3">
        {filteredStudents.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            {filter === 'archived' ? (
              <>
                <Archive className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-base font-semibold text-foreground mb-2">
                  No Archived Students
                </h3>
                <p className="text-sm text-muted-foreground">
                  Students you archive will appear here.
                </p>
              </>
            ) : (
              <>
                <User className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-base font-semibold text-foreground mb-2">
                  No Students Yet
                </h3>
                <p className="text-sm text-muted-foreground">
                  Add a student above to get started with behavior tracking.
                </p>
              </>
            )}
          </div>
        ) : (
          filteredStudents.map((student) => (
            <div
              key={student.id}
              className={`bg-card border rounded-xl p-4 hover:border-primary/30 transition-colors cursor-pointer ${
                student.isArchived ? 'border-muted bg-muted/30' : 'border-border'
              }`}
              onClick={() => navigate(`/students/${student.id}`)}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    student.isArchived ? 'opacity-50' : ''
                  }`}
                  style={{ backgroundColor: `${student.color}20` }}
                >
                  <User className="w-6 h-6" style={{ color: student.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground truncate">
                      {student.name}
                    </h3>
                    {student.isArchived && (
                      <Badge variant="outline" className="text-xs">
                        <Archive className="w-3 h-3 mr-1" />
                        Archived
                      </Badge>
                    )}
                  </div>
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
                {student.isArchived && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      unarchiveStudent(student.id);
                    }}
                  >
                    <ArchiveRestore className="w-4 h-4" />
                    Restore
                  </Button>
                )}
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
