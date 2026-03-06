import { useState, useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Users, Search, Loader2 } from 'lucide-react';
import { useStaffAssignments, type StaffAssignment, type StaffAssignmentFormData } from '@/hooks/useStaffAssignments';
import { AssignmentTable } from '@/components/staff-assignments/AssignmentTable';
import { AssignmentModal } from '@/components/staff-assignments/AssignmentModal';
import { BulkClassroomAssignModal } from '@/components/staff-assignments/BulkClassroomAssignModal';
import { RoleMatrix } from '@/components/staff-assignments/RoleMatrix';

type TabMode = 'agency' | 'classroom' | 'student' | 'matrix';

export default function StaffAssignments() {
  const {
    assignments, loading,
    profiles, agencies, classrooms, students,
    createAssignment, updateAssignment, removeAssignment, bulkAssignClassroom,
  } = useStaffAssignments();

  const [tab, setTab] = useState<TabMode>('agency');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StaffAssignment | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterActive, setFilterActive] = useState<string>('active');

  const modalMode = tab === 'matrix' ? 'agency' : tab;

  // Filter assignments by tab mode
  const tabAssignments = useMemo(() => {
    let filtered = assignments;

    if (tab === 'agency') filtered = filtered.filter(a => a.agency_id && !a.classroom_id && !a.student_id);
    else if (tab === 'classroom') filtered = filtered.filter(a => a.classroom_id);
    else if (tab === 'student') filtered = filtered.filter(a => a.student_id);

    // Search
    if (search) {
      const term = search.toLowerCase();
      filtered = filtered.filter(a =>
        (a.staff_name || '').toLowerCase().includes(term) ||
        (a.email || '').toLowerCase().includes(term) ||
        (a.student_name || '').toLowerCase().includes(term)
      );
    }

    // Role filter
    if (filterRole !== 'all') {
      filtered = filtered.filter(a => a.role_slug === filterRole);
    }

    // Active filter
    if (filterActive === 'active') filtered = filtered.filter(a => a.is_active);
    else if (filterActive === 'inactive') filtered = filtered.filter(a => !a.is_active);

    return filtered;
  }, [assignments, tab, search, filterRole, filterActive]);

  const handleEdit = (a: StaffAssignment) => {
    setEditing(a);
    setModalOpen(true);
  };

  const handleSave = async (data: StaffAssignmentFormData) => {
    if (editing) {
      return updateAssignment(editing.id, data);
    }
    return createAssignment(data);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Staff Assignments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage who has access to agency, classroom, and student-level workflows across NovaTrack Core, Beacon, and connected apps.
          </p>
        </div>
        {tab !== 'matrix' && (
          <div className="flex gap-2">
            {tab === 'classroom' && (
              <Button variant="outline" onClick={() => setBulkOpen(true)}>
                <Users className="h-4 w-4 mr-2" />
                Quick Assign Team
              </Button>
            )}
            <Button onClick={() => { setEditing(null); setModalOpen(true); }}>
              <UserPlus className="h-4 w-4 mr-2" />
              Assign Staff
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      {tab !== 'matrix' && (
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search staff, email, student..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Roles" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="teacher">Teacher</SelectItem>
              <SelectItem value="aide">Aide</SelectItem>
              <SelectItem value="behavior_staff">Behavior Staff</SelectItem>
              <SelectItem value="supervisor">Supervisor</SelectItem>
              <SelectItem value="bcba">BCBA</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterActive} onValueChange={setFilterActive}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabMode)}>
        <TabsList>
          <TabsTrigger value="agency">Agency</TabsTrigger>
          <TabsTrigger value="classroom">Classroom</TabsTrigger>
          <TabsTrigger value="student">Student</TabsTrigger>
          <TabsTrigger value="matrix">Role Matrix</TabsTrigger>
        </TabsList>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <TabsContent value="agency">
              <AssignmentTable assignments={tabAssignments} mode="agency" onEdit={handleEdit} onRemove={removeAssignment} />
            </TabsContent>
            <TabsContent value="classroom">
              <AssignmentTable assignments={tabAssignments} mode="classroom" onEdit={handleEdit} onRemove={removeAssignment} />
            </TabsContent>
            <TabsContent value="student">
              <p className="text-sm text-muted-foreground mb-3">
                Use student-level assignments when staff need direct data collection or note/document access for specific students.
              </p>
              <AssignmentTable assignments={tabAssignments} mode="student" onEdit={handleEdit} onRemove={removeAssignment} />
            </TabsContent>
            <TabsContent value="matrix">
              <RoleMatrix />
            </TabsContent>
          </>
        )}
      </Tabs>

      <AssignmentModal
        open={modalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
        editingAssignment={editing}
        mode={modalMode}
        profiles={profiles}
        agencies={agencies}
        classrooms={classrooms}
        students={students}
      />
    </div>
  );
}
