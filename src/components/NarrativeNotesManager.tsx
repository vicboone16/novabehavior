import { useState } from 'react';
import { FileText, Plus, Trash2, Edit2, Save, X, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { NarrativeNote, Behavior } from '@/types/behavior';
import { format } from 'date-fns';

interface NarrativeNotesManagerProps {
  studentId: string;
  notes: NarrativeNote[];
  behaviors: Behavior[];
  onAddNote: (note: Omit<NarrativeNote, 'id'>) => void;
  onUpdateNote: (id: string, updates: Partial<NarrativeNote>) => void;
  onDeleteNote: (id: string) => void;
  canViewNotes?: boolean; // Permission to view notes - if false, shows restricted message
}

export function NarrativeNotesManager({
  studentId,
  notes,
  behaviors,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  canViewNotes = true,
}: NarrativeNotesManagerProps) {
  const [showAddNote, setShowAddNote] = useState(false);
  const [editingNote, setEditingNote] = useState<NarrativeNote | null>(null);
  const [content, setContent] = useState('');
  const [selectedBehaviorId, setSelectedBehaviorId] = useState<string>('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleSave = () => {
    if (!content.trim()) return;

    if (editingNote) {
      onUpdateNote(editingNote.id, {
        content: content.trim(),
        behaviorId: selectedBehaviorId && selectedBehaviorId !== 'none' ? selectedBehaviorId : undefined,
        tags: tags.length > 0 ? tags : undefined,
      });
    } else {
      onAddNote({
        studentId,
        content: content.trim(),
        timestamp: new Date(),
        behaviorId: selectedBehaviorId && selectedBehaviorId !== 'none' ? selectedBehaviorId : undefined,
        tags: tags.length > 0 ? tags : undefined,
      });
    }

    resetForm();
  };

  const resetForm = () => {
    setContent('');
    setSelectedBehaviorId('');
    setTags([]);
    setTagInput('');
    setShowAddNote(false);
    setEditingNote(null);
  };

  const openEditNote = (note: NarrativeNote) => {
    setEditingNote(note);
    setContent(note.content);
    setSelectedBehaviorId(note.behaviorId || '');
    setTags(note.tags || []);
    setShowAddNote(true);
  };

  const sortedNotes = [...notes].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // If user doesn't have permission to view notes, show restricted message
  if (!canViewNotes) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Narrative Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Notes Access Restricted</p>
            <p className="text-xs mt-1">
              You don't have permission to view notes for this student.
              <br />
              Contact an administrator to request access.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Narrative Notes
            </CardTitle>
            <Button size="sm" onClick={() => setShowAddNote(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Add Note
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {sortedNotes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No narrative notes yet. Add notes to document observations outside of sessions.
            </p>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {sortedNotes.map((note) => {
                const behavior = behaviors.find(b => b.id === note.behaviorId);
                return (
                  <div
                    key={note.id}
                    className="p-3 bg-secondary/30 rounded-lg space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEditNote(note)}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => onDeleteNote(note.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(note.timestamp), 'MMM d, yyyy h:mm a')}
                      </span>
                      {behavior && (
                        <Badge variant="outline" className="text-xs">
                          {behavior.name}
                        </Badge>
                      )}
                      {note.tags?.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          <Tag className="w-2 h-2 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Note Dialog */}
      <Dialog open={showAddNote} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingNote ? 'Edit Narrative Note' : 'Add Narrative Note'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Note Content</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter your observation or note..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Link to Behavior (Optional)</Label>
              <Select value={selectedBehaviorId} onValueChange={setSelectedBehaviorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a behavior (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {behaviors.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Add a tag..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
                <Button variant="outline" onClick={handleAddTag}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs gap-1">
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!content.trim()}>
              {editingNote ? 'Update Note' : 'Add Note'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
