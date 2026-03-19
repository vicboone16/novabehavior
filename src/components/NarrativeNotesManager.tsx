import { useState } from 'react';
import { FileText, Plus, Trash2, Edit2, Save, X, Tag, Clock, User as UserIcon, Eye, Pencil } from 'lucide-react';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { NarrativeNote, Behavior } from '@/types/behavior';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

interface NarrativeNotesManagerProps {
  studentId: string;
  notes: NarrativeNote[];
  behaviors: Behavior[];
  onAddNote: (note: Omit<NarrativeNote, 'id'>) => void;
  onUpdateNote: (id: string, updates: Partial<NarrativeNote>) => void;
  onDeleteNote: (id: string) => void;
  canViewNotes?: boolean;
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
  const { user, profile } = useAuth();
  const [showAddNote, setShowAddNote] = useState(false);
  const [editingNote, setEditingNote] = useState<NarrativeNote | null>(null);
  const [content, setContent] = useState('');
  const [selectedBehaviorId, setSelectedBehaviorId] = useState<string>('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [dialogMode, setDialogMode] = useState<'edit' | 'preview'>('edit');

  const userName = profile?.display_name || profile?.first_name || user?.email || 'Unknown';

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
      const editEntry = {
        editedBy: user?.id || '',
        editedByName: userName,
        editedAt: new Date().toISOString(),
        previousContent: editingNote.content,
      };

      onUpdateNote(editingNote.id, {
        content: content.trim(),
        behaviorId: selectedBehaviorId && selectedBehaviorId !== 'none' ? selectedBehaviorId : undefined,
        tags: tags.length > 0 ? tags : undefined,
        modifiedBy: user?.id,
        modifiedByName: userName,
        modifiedAt: new Date().toISOString(),
        editHistory: [...(editingNote.editHistory || []), editEntry],
      });
    } else {
      onAddNote({
        studentId,
        content: content.trim(),
        timestamp: new Date(),
        behaviorId: selectedBehaviorId && selectedBehaviorId !== 'none' ? selectedBehaviorId : undefined,
        tags: tags.length > 0 ? tags : undefined,
        createdBy: user?.id,
        createdByName: userName,
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
    setDialogMode('edit');
  };

  const openEditNote = (note: NarrativeNote) => {
    setEditingNote(note);
    setContent(note.content);
    setSelectedBehaviorId(note.behaviorId || '');
    setTags(note.tags || []);
    setDialogMode('edit');
    setShowAddNote(true);
  };

  const sortedNotes = [...notes].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

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
            <Button size="sm" onClick={() => { setDialogMode('edit'); setShowAddNote(true); }}>
              <Plus className="w-4 h-4 mr-1" />
              Add Note
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {sortedNotes.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No narrative notes yet.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Add notes to document observations, updates, or summaries outside of formal sessions.
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
              {sortedNotes.map((note) => {
                const behavior = behaviors.find(b => b.id === note.behaviorId);
                return (
                  <Card key={note.id} className="border-l-4 border-l-primary/30 shadow-sm">
                    <CardContent className="py-4 px-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          {/* Clinical formatting: break content into readable paragraphs */}
                          <div className="prose prose-sm max-w-none">
                            {note.content.split('\n\n').map((paragraph, idx) => (
                              <p key={idx} className="text-sm leading-relaxed text-foreground mb-2 last:mb-0">
                                {paragraph.split('\n').map((line, lidx) => (
                                  <span key={lidx}>
                                    {lidx > 0 && <br />}
                                    {line}
                                  </span>
                                ))}
                              </p>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-0.5 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEditNote(note)}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => onDeleteNote(note.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap mt-3 pt-3 border-t border-border/50">
                        <span className="text-xs text-muted-foreground font-medium">
                          {format(new Date(note.timestamp), 'MMM d, yyyy · h:mm a')}
                        </span>
                        {note.createdByName && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <UserIcon className="w-3 h-3" />
                            {note.createdByName}
                          </span>
                        )}
                        {behavior && (
                          <Badge variant="outline" className="text-xs font-medium">
                            {behavior.name}
                          </Badge>
                        )}
                        {note.tags?.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            <Tag className="w-2.5 h-2.5 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      {/* Edit tracking info */}
                      {note.modifiedByName && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground/60 cursor-help mt-2">
                                <Clock className="w-3 h-3" />
                                <span>
                                  Edited by {note.modifiedByName} · {note.modifiedAt ? format(new Date(note.modifiedAt), 'MMM d, h:mm a') : ''}
                                </span>
                                {note.editHistory && note.editHistory.length > 0 && (
                                  <Badge variant="outline" className="text-[10px] ml-1 px-1 py-0">
                                    {note.editHistory.length} edit{note.editHistory.length > 1 ? 's' : ''}
                                  </Badge>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-sm">
                              <div className="space-y-1">
                                <p className="font-medium text-xs">Edit History</p>
                                {note.editHistory?.map((edit, idx) => (
                                  <div key={idx} className="text-xs border-t pt-1">
                                    <p className="font-medium">{edit.editedByName} — {format(new Date(edit.editedAt), 'MMM d, h:mm a')}</p>
                                    <p className="text-muted-foreground truncate max-w-[280px]">Previous: "{edit.previousContent.slice(0, 100)}{edit.previousContent.length > 100 ? '...' : ''}"</p>
                                  </div>
                                ))}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Note Dialog with Edit/Preview modes */}
      <Dialog open={showAddNote} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>
                {editingNote ? 'Edit Narrative Note' : 'Add Narrative Note'}
              </DialogTitle>
              <div className="flex gap-1 bg-muted rounded-lg p-0.5">
                <Button
                  variant={dialogMode === 'edit' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 px-3 text-xs gap-1"
                  onClick={() => setDialogMode('edit')}
                >
                  <Pencil className="w-3 h-3" />
                  Edit
                </Button>
                <Button
                  variant={dialogMode === 'preview' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 px-3 text-xs gap-1"
                  onClick={() => setDialogMode('preview')}
                  disabled={!content.trim()}
                >
                  <Eye className="w-3 h-3" />
                  Preview
                </Button>
              </div>
            </div>
          </DialogHeader>

          {dialogMode === 'edit' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Note Content</Label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter your clinical observation, update, or summary...&#10;&#10;Use paragraphs to organize your thoughts. Write naturally — this is a clinical narrative, not a form."
                  rows={8}
                  className="text-sm leading-relaxed resize-y min-h-[160px]"
                />
                <p className="text-xs text-muted-foreground">
                  Write in a clinical, professional tone. Separate sections with blank lines for readability.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Link to Behavior (Optional)</Label>
                  <Select value={selectedBehaviorId} onValueChange={setSelectedBehaviorId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a behavior" />
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
                    <Button variant="outline" size="icon" onClick={handleAddTag}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs gap-1">
                      {tag}
                      <button onClick={() => handleRemoveTag(tag)} className="ml-1 hover:text-destructive">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {editingNote && editingNote.createdByName && (
                <p className="text-xs text-muted-foreground">
                  Originally created by {editingNote.createdByName}. Your edit will be tracked.
                </p>
              )}
            </div>
          ) : (
            /* Preview Mode */
            <div className="space-y-4">
              <Card>
                <CardContent className="py-4 px-5">
                  <div className="prose prose-sm max-w-none">
                    {content.split('\n\n').map((paragraph, idx) => (
                      <p key={idx} className="text-sm leading-relaxed text-foreground mb-3 last:mb-0">
                        {paragraph.split('\n').map((line, lidx) => (
                          <span key={lidx}>
                            {lidx > 0 && <br />}
                            {line}
                          </span>
                        ))}
                      </p>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap mt-4 pt-3 border-t border-border/50">
                    <span className="text-xs text-muted-foreground font-medium">
                      {format(new Date(), 'MMM d, yyyy · h:mm a')}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <UserIcon className="w-3 h-3" />
                      {userName}
                    </span>
                    {selectedBehaviorId && selectedBehaviorId !== 'none' && (
                      <Badge variant="outline" className="text-xs">
                        {behaviors.find(b => b.id === selectedBehaviorId)?.name}
                      </Badge>
                    )}
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        <Tag className="w-2.5 h-2.5 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <p className="text-xs text-muted-foreground text-center">
                This is how your note will appear. Switch to Edit to make changes.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!content.trim()}>
              <Save className="w-4 h-4 mr-1" />
              {editingNote ? 'Update Note' : 'Save Note'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
