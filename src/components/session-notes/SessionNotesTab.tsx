import { useState } from 'react';
import { format } from 'date-fns';
import { 
  FileText, 
  Plus, 
  Clock, 
  User, 
  Eye, 
  Edit2, 
  Lock, 
  Trash2,
  CheckCircle2,
  AlertCircle,
  Filter,
  Download,
  RefreshCw,
  MapPin,
  DollarSign,
  Link2,
} from 'lucide-react';
import { NovaAILauncher } from '@/components/nova-ai/NovaAILauncher';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ConfirmDialog } from '@/components/ui/alert-dialog-confirm';
import { useSessionNotes } from '@/hooks/useSessionNotes';
import { useAuth } from '@/contexts/AuthContext';
import { 
  EnhancedSessionNote,
  SessionNoteType,
  NoteStatus,
  NOTE_TYPE_LABELS,
  SERVICE_SETTING_LABELS,
} from '@/types/sessionNotes';
import { NoteCreationDialog } from './NoteCreationDialog';
import { NoteViewDialog } from './NoteViewDialog';
import { NoteEditorDialog } from './NoteEditorDialog';

interface SessionNotesTabProps {
  studentId: string;
  studentName: string;
}

const STATUS_CONFIG: Record<NoteStatus, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: 'Draft', color: 'bg-muted text-muted-foreground', icon: Edit2 },
  submitted: { label: 'Submitted', color: 'bg-warning/20 text-warning-foreground', icon: Clock },
  locked: { label: 'Locked', color: 'bg-primary/20 text-primary', icon: Lock },
};

export function SessionNotesTab({ studentId, studentName }: SessionNotesTabProps) {
  const { user, userRole } = useAuth();
  const { notes, templates, loading, deleteNote, lockNote, refreshNotes } = useSessionNotes(studentId);
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [viewingNote, setViewingNote] = useState<EnhancedSessionNote | null>(null);
  const [editingNote, setEditingNote] = useState<EnhancedSessionNote | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  
  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [billableFilter, setBillableFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState('');

  const isAdmin = userRole === 'super_admin' || userRole === 'admin';

  const filteredNotes = notes.filter(note => {
    const matchesType = typeFilter === 'all' || note.note_type === typeFilter;
    const matchesStatus = statusFilter === 'all' || note.status === statusFilter;
    const matchesBillable = billableFilter === 'all' || 
      (billableFilter === 'billable' && note.billable) || 
      (billableFilter === 'non_billable' && !note.billable);
    const matchesDate = !dateFilter || format(new Date(note.start_time), 'yyyy-MM-dd') === dateFilter;
    return matchesType && matchesStatus && matchesBillable && matchesDate;
  });

  const handleDelete = async () => {
    if (deleteConfirm) {
      await deleteNote(deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  const handleLock = async (noteId: string) => {
    await lockNote(noteId);
  };

  const canEdit = (note: EnhancedSessionNote) => {
    if (isAdmin) return true;
    return note.author_user_id === user?.id && note.status === 'draft';
  };

  const canDelete = (note: EnhancedSessionNote) => {
    if (isAdmin) return true;
    return note.author_user_id === user?.id && note.status === 'draft';
  };

  const getStatusBadge = (status: NoteStatus) => {
    const config = STATUS_CONFIG[status];
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} text-xs gap-1`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getBillableBadge = (billable: boolean) => {
    if (billable) {
      return (
        <Badge className="bg-primary/20 text-primary text-xs gap-1">
          <DollarSign className="w-3 h-3" />
          BILLABLE
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-xs text-muted-foreground gap-1">
        NON-BILLABLE
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Session Notes (Clinical)
          </h3>
          <p className="text-sm text-muted-foreground">
            Clinical documentation for {studentName}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refreshNotes}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Note
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filter:</span>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Note Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(NOTE_TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={billableFilter} onValueChange={setBillableFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Billable" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Notes</SelectItem>
                <SelectItem value="billable">Billable Only</SelectItem>
                <SelectItem value="non_billable">Non-Billable Only</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="locked">Locked</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-[160px]"
              placeholder="Filter by date"
            />
            {(typeFilter !== 'all' || statusFilter !== 'all' || billableFilter !== 'all' || dateFilter) && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setTypeFilter('all');
                  setStatusFilter('all');
                  setBillableFilter('all');
                  setDateFilter('');
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notes Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-2">Loading notes...</p>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No session notes found.</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Note
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Note Type</TableHead>
                  <TableHead>Billable</TableHead>
                  <TableHead>Linked</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNotes.map(note => (
                  <TableRow key={note.id}>
                    <TableCell className="font-medium">
                      <div>
                        {format(new Date(note.start_time), 'MMM d, yyyy')}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(note.start_time), 'h:mm a')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {NOTE_TYPE_LABELS[note.note_type] || note.note_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {getBillableBadge(note.billable)}
                    </TableCell>
                    <TableCell>
                      {note.session_id || note.pulled_data_snapshot ? (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Link2 className="w-3 h-3" />
                          Yes
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          No
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm">{note.author_name || 'Unknown'}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(note.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setViewingNote(note)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {canEdit(note) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setEditingNote(note)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}
                        {isAdmin && note.status !== 'locked' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleLock(note.id)}
                          >
                            <Lock className="w-4 h-4" />
                          </Button>
                        )}
                        {canDelete(note) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirm(note.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Note Dialog */}
      <NoteCreationDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        studentId={studentId}
        studentName={studentName}
        templates={templates}
        onNoteCreated={refreshNotes}
      />

      {/* View Note Dialog */}
      {viewingNote && (
        <NoteViewDialog
          note={viewingNote}
          open={!!viewingNote}
          onOpenChange={(open) => !open && setViewingNote(null)}
        />
      )}

      {/* Edit Note Dialog */}
      {editingNote && (
        <NoteEditorDialog
          note={editingNote}
          open={!!editingNote}
          onOpenChange={(open) => !open && setEditingNote(null)}
          templates={templates}
          onSaved={refreshNotes}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Delete Session Note?"
        description="This action cannot be undone. The note and all its version history will be permanently deleted."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </div>
  );
}
