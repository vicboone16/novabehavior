import { useState, useEffect, useCallback } from 'react';
import { Plus, Users, X, Search, UserPlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDataStore } from '@/store/dataStore';
import { SessionStartConfirmation } from './SessionStartConfirmation';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSessionParticipants } from '@/hooks/useSessionParticipants';
import { toast } from 'sonner';

interface AccessibleStudent {
  id: string;
  name: string;
  color: string;
  isArchived?: boolean;
}

interface AccessibleStaff {
  user_id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  /** student IDs this staff has access to */
  student_ids: string[];
}

export function StudentSelector() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmStudent, setConfirmStudent] = useState<{
    id: string;
    name: string;
    color: string;
  } | null>(null);

  // Staff search state
  const [staffList, setStaffList] = useState<AccessibleStaff[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [addingStaffId, setAddingStaffId] = useState<string | null>(null);

  const { user } = useAuth();

  const {
    students,
    selectedStudentIds,
    toggleStudentSelection,
    sessionStartTime,
    startSession,
    currentSessionId,
    getStudentSessionStatus,
  } = useDataStore();

  const { participants, joinSession: addParticipant } = useSessionParticipants(currentSessionId);

  // Students with ACTIVE sessions (selected and not ended)
  const activeSessionStudents = students.filter(s =>
    selectedStudentIds.includes(s.id) &&
    !getStudentSessionStatus(s.id)?.hasEnded
  );

  // Students accessible to this user but not yet in the session
  const availableStudents: AccessibleStudent[] = students.filter(s =>
    !s.isArchived &&
    !selectedStudentIds.includes(s.id)
  );

  const filteredStudents = availableStudents.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Fetch staff who share student access
  const fetchStaff = useCallback(async () => {
    if (!user || !selectedStudentIds.length) { setStaffList([]); return; }
    setStaffLoading(true);
    try {
      // Get staff who have access to at least one of the current session's students
      const { data: accessRows } = await supabase
        .from('user_student_access')
        .select('user_id, student_id')
        .in('student_id', selectedStudentIds)
        .neq('user_id', user.id);

      if (!accessRows?.length) { setStaffList([]); setStaffLoading(false); return; }

      const uniqueUserIds = [...new Set(accessRows.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, first_name, last_name')
        .in('user_id', uniqueUserIds);

      // Build a map of user -> which students they have access to
      const accessMap = new Map<string, string[]>();
      accessRows.forEach(r => {
        const existing = accessMap.get(r.user_id) || [];
        accessMap.set(r.user_id, [...existing, r.student_id]);
      });

      setStaffList((profiles || []).map(p => ({
        user_id: p.user_id,
        display_name: p.display_name,
        first_name: p.first_name,
        last_name: p.last_name,
        student_ids: accessMap.get(p.user_id) || [],
      })));
    } catch (e) {
      console.error('[StudentSelector] staff fetch error', e);
    } finally {
      setStaffLoading(false);
    }
  }, [user, selectedStudentIds]);

  useEffect(() => {
    if (showAddDialog) fetchStaff();
  }, [showAddDialog, fetchStaff]);

  const filteredStaff = staffList.filter(s => {
    const name = s.display_name || `${s.first_name || ''} ${s.last_name || ''}`.trim();
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Already-participating staff IDs
  const participantUserIds = new Set(participants.map(p => p.user_id));

  const handleStudentClick = (student: AccessibleStudent) => {
    if (selectedStudentIds.includes(student.id)) {
      toggleStudentSelection(student.id);
      return;
    }
    setConfirmStudent(student);
  };

  const handleConfirmStart = (options: {
    linkedAppointmentId?: string;
    createAppointment: boolean;
  }) => {
    if (!confirmStudent) return;
    toggleStudentSelection(confirmStudent.id);
    // Do NOT auto-start a session when selecting a student.
    // The session should only start when the user explicitly clicks "Start" on the SessionTimer.
    // Just store the linked appointment ID if one was selected so it's ready when the session does start.
    if (options.linkedAppointmentId) {
      const { setLinkedAppointmentId, linkedAppointmentId } = useDataStore.getState();
      if (!linkedAppointmentId) setLinkedAppointmentId(options.linkedAppointmentId);
    }
    setConfirmStudent(null);
    setShowAddDialog(false);
  };

  // Add a student from the search dialog
  const handleAddStudentFromDialog = (student: AccessibleStudent) => {
    setShowAddDialog(false);
    setConfirmStudent(student);
  };

  // Add a staff member to the session
  const handleAddStaff = async (staff: AccessibleStaff) => {
    if (!currentSessionId) {
      toast.error('No active session to add staff to');
      return;
    }
    setAddingStaffId(staff.user_id);
    try {
      // Only add them for the students they have access to in this session
      const sharedStudents = staff.student_ids.filter(id => selectedStudentIds.includes(id));
      const { error } = await supabase
        .from('session_participants')
        .upsert({
          session_id: currentSessionId,
          user_id: staff.user_id,
          student_ids: sharedStudents,
          role: 'data_collector',
          note_delegate: false,
        }, { onConflict: 'session_id,user_id' });

      if (error) throw error;

      const name = staff.display_name || `${staff.first_name || ''} ${staff.last_name || ''}`.trim() || 'Staff';
      toast.success(`${name} added to session`);
    } catch (e) {
      toast.error('Could not add staff to session');
    } finally {
      setAddingStaffId(null);
    }
  };

  const staffName = (s: AccessibleStaff) =>
    s.display_name || `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Staff';

  return (
    <>
      <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">Students</h2>
            {activeSessionStudents.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {activeSessionStudents.length} active
              </Badge>
            )}
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={() => { setSearchQuery(''); setShowAddDialog(true); }}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {activeSessionStudents.map((student) => (
            <div
              key={student.id}
              className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-150 border-2 border-primary bg-primary/10 hover:shadow-md"
              onClick={() => handleStudentClick(student)}
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: student.color }}
              />
              <span className="font-medium text-sm">{student.name}</span>
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
            </div>
          ))}

          {activeSessionStudents.length === 0 && (
            <p className="text-muted-foreground text-sm">
              No active students. Click &quot;Add&quot; to add students to this session.
            </p>
          )}
        </div>
      </div>

      {/* Add Student / Staff Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Add to Session
            </DialogTitle>
          </DialogHeader>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>

          <Tabs defaultValue="students">
            <TabsList className="w-full mb-3">
              <TabsTrigger value="students" className="flex-1">
                Clients
                {filteredStudents.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 text-[10px] px-1 h-4">
                    {filteredStudents.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="staff" className="flex-1">
                Staff
                {filteredStaff.filter(s => !participantUserIds.has(s.user_id)).length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 text-[10px] px-1 h-4">
                    {filteredStaff.filter(s => !participantUserIds.has(s.user_id)).length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Clients tab */}
            <TabsContent value="students" className="mt-0">
              <ScrollArea className="h-56">
                {filteredStudents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {searchQuery ? 'No clients match your search.' : 'All accessible clients are already in the session.'}
                  </p>
                ) : (
                  <div className="space-y-1">
                    {filteredStudents.map(student => (
                      <button
                        key={student.id}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors text-left"
                        onClick={() => handleAddStudentFromDialog(student)}
                      >
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: student.color }}
                        />
                        <span className="text-sm font-medium">{student.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Staff tab */}
            <TabsContent value="staff" className="mt-0">
              <ScrollArea className="h-56">
                {staffLoading ? (
                  <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading staff...
                  </div>
                ) : filteredStaff.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {searchQuery
                      ? 'No staff match your search.'
                      : selectedStudentIds.length === 0
                        ? 'Select students first to see eligible staff.'
                        : 'No other staff have access to the current session\'s students.'}
                  </p>
                ) : (
                  <div className="space-y-1">
                    {filteredStaff.map(staff => {
                      const name = staffName(staff);
                      const alreadyIn = participantUserIds.has(staff.user_id);
                      const sharedStudents = students.filter(s => staff.student_ids.includes(s.id) && selectedStudentIds.includes(s.id));
                      return (
                        <div
                          key={staff.user_id}
                          className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-muted/40 transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{name}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                              Access to: {sharedStudents.map(s => s.name).join(', ') || 'no shared students'}
                            </p>
                          </div>
                          {alreadyIn ? (
                            <Badge variant="secondary" className="text-xs shrink-0 ml-2">In session</Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="ml-2 h-7 text-xs shrink-0"
                              disabled={addingStaffId === staff.user_id || sharedStudents.length === 0}
                              onClick={() => handleAddStaff(staff)}
                            >
                              {addingStaffId === staff.user_id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                'Add'
                              )}
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
              {!currentSessionId && selectedStudentIds.length > 0 && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Start the session first to add staff participants.
                </p>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

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
