import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search, Clock, X } from 'lucide-react';
import { useTOIEvents } from '@/hooks/useTOIEvents';
import { TOIQuickTypeButtons } from './TOIQuickTypeButtons';
import { ActiveTOICard } from './ActiveTOICard';
import { EndTOIDialog } from './EndTOIDialog';
import { EditTOIDrawer } from './EditTOIDrawer';
import { TOIEvent, TOIEventType, TOI_EVENT_LABELS } from '@/types/toi';

interface Student {
  id: string;
  name: string;
  color?: string;
}

interface TeacherModeTOIProps {
  students: Student[];
}

export function TeacherModeTOI({ students }: TeacherModeTOIProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [endDialogOpen, setEndDialogOpen] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<TOIEvent | null>(null);

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  const {
    activeEvent,
    startTOI,
    endTOI,
    updateTOI,
    deleteTOI,
  } = useTOIEvents({
    studentId: selectedStudentId,
  });

  // Filter students by search
  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleQuickStart = async (
    type: TOIEventType,
    displayLabel: string,
    defaults?: { location?: string; contributor?: string }
  ) => {
    if (!selectedStudentId) return;

    await startTOI({
      student_id: selectedStudentId,
      event_type: type,
      display_label: displayLabel,
      start_time: new Date().toISOString(),
      location: defaults?.location as any,
      suspected_contributor: defaults?.contributor as any,
    });
  };

  const handleEnd = async (eventId: string, endTime: string) => {
    await endTOI(eventId, endTime);
    setEndDialogOpen(false);
  };

  const handleEdit = async (eventId: string, updates: any) => {
    await updateTOI(eventId, updates);
    setEditDrawerOpen(false);
  };

  const handleDelete = async (eventId: string) => {
    await deleteTOI(eventId);
    setEditDrawerOpen(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5" />
            TOI Quick Entry
          </CardTitle>
          {selectedStudent && (
            <Badge variant="outline" className="gap-1">
              {selectedStudent.name}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 ml-1"
                onClick={() => setSelectedStudentId('')}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Student Selector */}
        {!selectedStudentId ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search student..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto">
              {filteredStudents.map((student) => (
                <Button
                  key={student.id}
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedStudentId(student.id)}
                  className="gap-2"
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: student.color || '#888' }}
                  />
                  {student.name}
                </Button>
              ))}
              {filteredStudents.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 w-full text-center">
                  No students found
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Active TOI Card */}
            {activeEvent ? (
              <ActiveTOICard
                event={activeEvent}
                onEnd={() => {
                  setSelectedEvent(activeEvent);
                  setEndDialogOpen(true);
                }}
                onEdit={() => {
                  setSelectedEvent(activeEvent);
                  setEditDrawerOpen(true);
                }}
              />
            ) : (
              <>
                {/* Quick Type Buttons */}
                <div>
                  <p className="text-sm font-medium mb-2">Quick Start TOI:</p>
                  <TOIQuickTypeButtons
                    onQuickStart={handleQuickStart}
                    disabled={!!activeEvent}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>

      {/* Dialogs */}
      <EndTOIDialog
        open={endDialogOpen}
        onOpenChange={setEndDialogOpen}
        event={selectedEvent}
        onEnd={handleEnd}
        onEdit={() => {
          setEndDialogOpen(false);
          setEditDrawerOpen(true);
        }}
      />

      <EditTOIDrawer
        open={editDrawerOpen}
        onOpenChange={setEditDrawerOpen}
        event={selectedEvent}
        onSave={handleEdit}
        onDelete={handleDelete}
      />
    </Card>
  );
}
