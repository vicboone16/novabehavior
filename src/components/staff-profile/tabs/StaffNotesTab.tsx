import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Plus, Save, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

interface StaffNotesTabProps {
  userId: string;
  profile: any;
}

interface StaffNote {
  id: string;
  note_type: string;
  content: string;
  visibility: string;
  created_by: string;
  created_at: string;
  creator_profile?: {
    display_name: string;
    first_name: string;
    last_name: string;
  };
}

const NOTE_TYPES = [
  { value: 'general', label: 'General' },
  { value: 'performance', label: 'Performance' },
  { value: 'training', label: 'Training' },
  { value: 'hr', label: 'HR' },
  { value: 'other', label: 'Other' },
];

const VISIBILITY_OPTIONS = [
  { value: 'admin_only', label: 'Admin Only' },
  { value: 'supervisors', label: 'Supervisors' },
  { value: 'self_visible', label: 'Visible to Staff' },
];

export function StaffNotesTab({ userId, profile }: StaffNotesTabProps) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<StaffNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddNote, setShowAddNote] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newNote, setNewNote] = useState({
    content: '',
    note_type: 'general',
    visibility: 'admin_only',
  });

  useEffect(() => {
    loadNotes();
  }, [userId]);

  const loadNotes = async () => {
    try {
      // For demo purposes, we'll simulate notes since the table doesn't exist yet
      // In production, you'd query from a staff_notes table
      setNotes([]);
    } catch (error) {
      console.error('Error loading notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.content.trim()) {
      toast.error('Please enter note content');
      return;
    }

    setSaving(true);
    try {
      // Simulate adding a note
      const mockNote: StaffNote = {
        id: crypto.randomUUID(),
        note_type: newNote.note_type,
        content: newNote.content,
        visibility: newNote.visibility,
        created_by: user?.id || '',
        created_at: new Date().toISOString(),
      };

      setNotes(prev => [mockNote, ...prev]);
      setNewNote({ content: '', note_type: 'general', visibility: 'admin_only' });
      setShowAddNote(false);
      toast.success('Note added');
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Failed to add note');
    } finally {
      setSaving(false);
    }
  };

  const getVisibilityBadge = (visibility: string) => {
    switch (visibility) {
      case 'admin_only':
        return <Badge variant="destructive">Admin Only</Badge>;
      case 'supervisors':
        return <Badge variant="secondary">Supervisors</Badge>;
      case 'self_visible':
        return <Badge variant="outline">Visible to Staff</Badge>;
      default:
        return null;
    }
  };

  const getNoteTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      general: 'bg-blue-100 text-blue-800',
      performance: 'bg-green-100 text-green-800',
      training: 'bg-purple-100 text-purple-800',
      hr: 'bg-amber-100 text-amber-800',
      other: 'bg-gray-100 text-gray-800',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[type] || colors.other}`}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </span>
    );
  };

  return (
    <div className="space-y-6 mt-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Staff Notes
          </CardTitle>
          {!showAddNote && (
            <Button size="sm" onClick={() => setShowAddNote(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Note
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {/* Add Note Form */}
          {showAddNote && (
            <div className="mb-6 p-4 border rounded-lg space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Note Type</label>
                  <Select
                    value={newNote.note_type}
                    onValueChange={(value) => setNewNote(prev => ({ ...prev, note_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NOTE_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Visibility</label>
                  <Select
                    value={newNote.visibility}
                    onValueChange={(value) => setNewNote(prev => ({ ...prev, visibility: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VISIBILITY_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Textarea
                value={newNote.content}
                onChange={(e) => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Enter note content..."
                rows={4}
              />
              
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowAddNote(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddNote} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Note'}
                </Button>
              </div>
            </div>
          )}

          {/* Notes List */}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading notes...</div>
          ) : notes.length > 0 ? (
            <div className="space-y-4">
              {notes.map(note => (
                <div key={note.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getNoteTypeBadge(note.note_type)}
                      {getVisibilityBadge(note.visibility)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {format(new Date(note.created_at), 'MMM d, yyyy h:mm a')}
                    </div>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                  {note.creator_profile && (
                    <p className="text-xs text-muted-foreground mt-2">
                      By {note.creator_profile.display_name || 
                         `${note.creator_profile.first_name} ${note.creator_profile.last_name}`}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Notes</h3>
              <p className="text-muted-foreground">Staff notes will appear here.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
