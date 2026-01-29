import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Plus, ChevronRight, Archive, ArchiveRestore, Users, Copy, Mail, Phone, School, CalendarDays, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useDataStore } from '@/store/dataStore';
import { BulkAddBehavior } from '@/components/BulkAddBehavior';
import { StudentComparison } from '@/components/StudentComparison';
import { StudentTagsDisplay } from '@/components/StudentTagSelector';
import { format } from 'date-fns';
import { CaseType } from '@/types/behavior';

type FilterType = 'active' | 'archived' | 'all';

export default function Students() {
  const navigate = useNavigate();
  const { students, addStudent, unarchiveStudent, duplicateBehaviorConfig } = useDataStore();
  const [newStudentName, setNewStudentName] = useState('');
  const [filter, setFilter] = useState<FilterType>('active');
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [sourceStudentId, setSourceStudentId] = useState('');
  const [targetStudentId, setTargetStudentId] = useState('');

  const handleAddStudent = () => {
    if (newStudentName.trim()) {
      addStudent(newStudentName.trim());
      setNewStudentName('');
    }
  };

  const handleDuplicate = () => {
    if (sourceStudentId && targetStudentId && sourceStudentId !== targetStudentId) {
      duplicateBehaviorConfig(sourceStudentId, targetStudentId);
      setShowDuplicateDialog(false);
      setSourceStudentId('');
      setTargetStudentId('');
    }
  };

  const filteredStudents = students.filter(s => {
    if (filter === 'active') return !s.isArchived;
    if (filter === 'archived') return s.isArchived;
    return true;
  });

  const activeStudents = students.filter(s => !s.isArchived);
  const studentsWithBehaviors = activeStudents.filter(s => s.behaviors.length > 0);
  const activeCount = activeStudents.length;
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
        <Button 
          variant="outline" 
          onClick={() => setShowDuplicateDialog(true)}
          disabled={studentsWithBehaviors.length === 0}
        >
          <Copy className="w-4 h-4 mr-2" />
          Duplicate Config
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
          filteredStudents.map((student) => {
            const caseTypeLabels: Record<CaseType, string> = {
              'school-based': 'School-Based',
              'fba-only': 'FBA Only',
              'direct-services': 'Direct Services',
              'consultation': 'Consultation',
            };

            return (
              <div
                key={student.id}
                className={`bg-card border rounded-xl p-4 hover:border-primary/30 transition-colors cursor-pointer ${
                  student.isArchived ? 'border-muted bg-muted/30' : 'border-border'
                }`}
                onClick={() => navigate(`/students/${student.id}`)}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
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
                    
                    {/* Profile Info Row */}
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                      {student.dateOfBirth && (
                        <span className="flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" />
                          DOB: {format(new Date(student.dateOfBirth), 'MM/dd/yyyy')}
                        </span>
                      )}
                      {student.grade && (
                        <span className="flex items-center gap-1">
                          <GraduationCap className="w-3 h-3" />
                          Grade {student.grade}
                        </span>
                      )}
                      {student.school && (
                        <span className="flex items-center gap-1">
                          <School className="w-3 h-3" />
                          {student.school}
                        </span>
                      )}
                    </div>
                    
                    {/* Case Types */}
                    {student.caseTypes && student.caseTypes.length > 0 && (
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                        {student.caseTypes.map((caseType) => (
                          <Badge key={caseType} variant="secondary" className="text-xs">
                            {caseTypeLabels[caseType]}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    {/* Contact Info */}
                    {(student.contactEmail || student.contactPhone) && (
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                        {student.contactEmail && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {student.contactEmail}
                          </span>
                        )}
                        {student.contactPhone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {student.contactPhone}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Tags */}
                    <div className="mt-1.5">
                      <StudentTagsDisplay studentId={student.id} />
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
                  <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Duplicate Config Dialog */}
      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="w-5 h-5" />
              Duplicate Behavior Configuration
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Copy all behaviors and custom ABC options from one student to another.
            </p>
            <div className="space-y-2">
              <Label>Copy from (source)</Label>
              <Select value={sourceStudentId} onValueChange={setSourceStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source student..." />
                </SelectTrigger>
                <SelectContent>
                  {studentsWithBehaviors.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: s.color }}
                        />
                        {s.name}
                        <span className="text-muted-foreground text-xs">
                          ({s.behaviors.length} behaviors)
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Copy to (target)</Label>
              <Select value={targetStudentId} onValueChange={setTargetStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select target student..." />
                </SelectTrigger>
                <SelectContent>
                  {activeStudents
                    .filter((s) => s.id !== sourceStudentId)
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: s.color }}
                          />
                          {s.name}
                          {s.behaviors.length > 0 && (
                            <span className="text-muted-foreground text-xs">
                              ({s.behaviors.length} existing)
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDuplicateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDuplicate}
              disabled={!sourceStudentId || !targetStudentId || sourceStudentId === targetStudentId}
            >
              <Copy className="w-4 h-4 mr-2" />
              Duplicate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
