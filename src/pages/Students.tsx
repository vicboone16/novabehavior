import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Plus, ChevronRight, Archive, ArchiveRestore, Users, Copy, Mail, Phone, School, CalendarDays, GraduationCap, ClipboardList, Search } from 'lucide-react';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useDataStore } from '@/store/dataStore';
import { BulkAddBehavior } from '@/components/BulkAddBehavior';
import { StudentComparison } from '@/components/StudentComparison';
import { StudentTagsDisplay } from '@/components/StudentTagSelector';
import { BulkHistoricalDataEntry } from '@/components/BulkHistoricalDataEntry';
import { format } from 'date-fns';
import { CaseType, calculateAge, getZodiacSign, ZODIAC_SYMBOLS, ZODIAC_LABELS } from '@/types/behavior';

type FilterType = 'active' | 'archived' | 'all';

interface NewStudentForm {
  firstName: string;
  lastName: string;
  displayName: string;
  dateOfBirth: string;
  dataCollectionStartDate: string;
}

const emptyForm = (): NewStudentForm => ({
  firstName: '',
  lastName: '',
  displayName: '',
  dateOfBirth: '',
  dataCollectionStartDate: format(new Date(), 'yyyy-MM-dd'),
});

export default function Students() {
  const navigate = useNavigate();
  const { students, addStudent, unarchiveStudent, duplicateBehaviorConfig } = useDataStore();
  const [filter, setFilter] = useState<FilterType>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newStudentForm, setNewStudentForm] = useState<NewStudentForm>(emptyForm());
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [showBulkDataEntry, setShowBulkDataEntry] = useState(false);
  const [sourceStudentId, setSourceStudentId] = useState('');
  const [targetStudentId, setTargetStudentId] = useState('');

  const handleAddStudent = () => {
    const { firstName, lastName, displayName, dateOfBirth, dataCollectionStartDate } = newStudentForm;
    if (!firstName.trim() || !lastName.trim()) return;

    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    // addStudent only takes a name; afterwards patch via updateStudentProfile using the matching new student
    addStudent(fullName);

    // updateStudentProfile on the newly added student (last in list with this name)
    const store = useDataStore.getState();
    const newStudent = [...store.students]
      .reverse()
      .find(s => s.name === fullName);

    if (newStudent) {
      store.updateStudentProfile(newStudent.id, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        displayName: displayName.trim() || fullName,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        dataCollectionStartDate: dataCollectionStartDate ? new Date(dataCollectionStartDate) : undefined,
      });
    }

    setNewStudentForm(emptyForm());
    setShowAddDialog(false);
  };

  const handleDuplicate = () => {
    if (sourceStudentId && targetStudentId && sourceStudentId !== targetStudentId) {
      duplicateBehaviorConfig(sourceStudentId, targetStudentId);
      setShowDuplicateDialog(false);
      setSourceStudentId('');
      setTargetStudentId('');
    }
  };

  // Sort alphabetically by display name
  const sortedStudents = [...students].sort((a, b) =>
    (a.displayName || a.name).localeCompare(b.displayName || b.name)
  );

  const filteredStudents = sortedStudents.filter(s => {
    const matchesFilter =
      filter === 'active' ? !s.isArchived :
      filter === 'archived' ? s.isArchived : true;
    const matchesSearch = searchQuery.trim() === '' ||
      (s.displayName || s.name).toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const activeStudents = students.filter(s => !s.isArchived);
  const studentsWithBehaviors = activeStudents.filter(s => s.behaviors.length > 0);
  const activeCount = activeStudents.length;
  const archivedCount = students.filter(s => s.isArchived).length;

  const canSubmit = newStudentForm.firstName.trim() && newStudentForm.lastName.trim();

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

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-2 items-stretch sm:items-center">
        {/* Search bar */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search students..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Student
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0}>
              <Button
                variant="outline"
                onClick={() => setShowDuplicateDialog(true)}
                disabled={studentsWithBehaviors.length === 0}
              >
                <Copy className="w-4 h-4 mr-2" />
                Duplicate Config
              </Button>
            </span>
          </TooltipTrigger>
          {studentsWithBehaviors.length === 0 && (
            <TooltipContent>Add behaviors to at least one student first</TooltipContent>
          )}
        </Tooltip>
        <BulkAddBehavior />
        <StudentComparison />
        <Button
          variant="outline"
          onClick={() => setShowBulkDataEntry(true)}
        >
          <ClipboardList className="w-4 h-4 mr-2" />
          Bulk Data Entry
        </Button>
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
                <h3 className="text-base font-semibold text-foreground mb-2">No Archived Students</h3>
                <p className="text-sm text-muted-foreground">Students you archive will appear here.</p>
              </>
            ) : searchQuery ? (
              <>
                <Search className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-base font-semibold text-foreground mb-2">No Results</h3>
                <p className="text-sm text-muted-foreground">No students match "{searchQuery}".</p>
              </>
            ) : (
              <>
                <User className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-base font-semibold text-foreground mb-2">No Students Yet</h3>
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
                    className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${student.isArchived ? 'opacity-50' : ''}`}
                    style={{ backgroundColor: `${student.color}20` }}
                  >
                    <User className="w-6 h-6" style={{ color: student.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground truncate">
                        {student.displayName || student.name}
                      </h3>
                      {student.dateOfBirth && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-base cursor-help">
                                {ZODIAC_SYMBOLS[getZodiacSign(new Date(student.dateOfBirth))]}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{ZODIAC_LABELS[getZodiacSign(new Date(student.dateOfBirth))]}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {student.isArchived && (
                        <Badge variant="outline" className="text-xs">
                          <Archive className="w-3 h-3 mr-1" />
                          Archived
                        </Badge>
                      )}
                    </div>

                    {/* Profile Info Row */}
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                      {student.dateOfBirth && (() => {
                        const age = calculateAge(new Date(student.dateOfBirth));
                        return (
                          <span className="flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" />
                            {age.years}y {age.months}m ({age.totalMonths} months)
                          </span>
                        );
                      })()}
                      {student.grade && (
                        <span className="flex items-center gap-1">
                          <GraduationCap className="w-3 h-3" />
                          {student.grade}
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
                          <Badge key={caseType} variant="outline" className="text-xs text-muted-foreground border-secondary/40 bg-secondary/10">
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

      {/* Add Student Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(o) => { setShowAddDialog(o); if (!o) setNewStudentForm(emptyForm()); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Add New Student
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>First Name <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="First name"
                  value={newStudentForm.firstName}
                  onChange={(e) => setNewStudentForm(f => ({ ...f, firstName: e.target.value }))}
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <Label>Last Name <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="Last name"
                  value={newStudentForm.lastName}
                  onChange={(e) => setNewStudentForm(f => ({ ...f, lastName: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Display Name</Label>
              <Input
                placeholder={
                  newStudentForm.firstName || newStudentForm.lastName
                    ? `${newStudentForm.firstName} ${newStudentForm.lastName}`.trim()
                    : 'e.g. nickname or initials'
                }
                value={newStudentForm.displayName}
                onChange={(e) => setNewStudentForm(f => ({ ...f, displayName: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Shown in the app instead of full name if set.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Date of Birth</Label>
                <Input
                  type="date"
                  value={newStudentForm.dateOfBirth}
                  onChange={(e) => setNewStudentForm(f => ({ ...f, dateOfBirth: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Data Collection Start Date</Label>
                <Input
                  type="date"
                  value={newStudentForm.dataCollectionStartDate}
                  onChange={(e) => setNewStudentForm(f => ({ ...f, dataCollectionStartDate: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddStudent} disabled={!canSubmit}>
              <Plus className="w-4 h-4 mr-2" />
              Add Student
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  {studentsWithBehaviors.sort((a,b)=>(a.displayName||a.name).localeCompare(b.displayName||b.name)).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                        {s.displayName || s.name}
                        <span className="text-muted-foreground text-xs">({s.behaviors.length} behaviors)</span>
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
                    .sort((a,b)=>(a.displayName||a.name).localeCompare(b.displayName||b.name))
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                          {s.displayName || s.name}
                          {s.behaviors.length > 0 && (
                            <span className="text-muted-foreground text-xs">({s.behaviors.length} existing)</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDuplicateDialog(false)}>Cancel</Button>
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

      {/* Bulk Historical Data Entry Dialog */}
      <BulkHistoricalDataEntry open={showBulkDataEntry} onOpenChange={setShowBulkDataEntry} />
    </div>
  );
}
