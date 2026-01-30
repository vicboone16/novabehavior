import { useState } from 'react';
import { MessageSquare, Plus, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Behavior, SkillTarget } from '@/types/behavior';
import { useToast } from '@/hooks/use-toast';

export interface BehaviorNote {
  id: string;
  behaviorId: string;
  behaviorName: string;
  content: string;
  timestamp: Date;
}

export interface SkillNote {
  id: string;
  skillTargetId: string;
  skillName: string;
  content: string;
  timestamp: Date;
}

export interface ObservationNotes {
  id: string;
  studentId: string;
  observationDate: Date;
  behaviorNotes: BehaviorNote[];
  skillNotes: SkillNote[];
  narrativeNotes: string;
}

interface ObservationNotesPanelProps {
  studentId: string;
  behaviors: Behavior[];
  skillTargets: SkillTarget[];
  onSave: (notes: ObservationNotes) => void;
  initialNotes?: ObservationNotes;
}

export function ObservationNotesPanel({
  studentId,
  behaviors,
  skillTargets,
  onSave,
  initialNotes,
}: ObservationNotesPanelProps) {
  const { toast } = useToast();
  
  const [behaviorNotes, setBehaviorNotes] = useState<BehaviorNote[]>(
    initialNotes?.behaviorNotes || []
  );
  const [skillNotes, setSkillNotes] = useState<SkillNote[]>(
    initialNotes?.skillNotes || []
  );
  const [narrativeNotes, setNarrativeNotes] = useState(
    initialNotes?.narrativeNotes || ''
  );
  
  // Pending notes being edited
  const [pendingBehaviorNotes, setPendingBehaviorNotes] = useState<Record<string, string>>({});
  const [pendingSkillNotes, setPendingSkillNotes] = useState<Record<string, string>>({});

  const addBehaviorNote = (behaviorId: string, behaviorName: string) => {
    const content = pendingBehaviorNotes[behaviorId];
    if (!content?.trim()) {
      toast({
        title: 'Note is empty',
        description: 'Please enter a note before saving.',
        variant: 'destructive',
      });
      return;
    }

    const note: BehaviorNote = {
      id: crypto.randomUUID(),
      behaviorId,
      behaviorName,
      content: content.trim(),
      timestamp: new Date(),
    };

    setBehaviorNotes(prev => [...prev, note]);
    setPendingBehaviorNotes(prev => ({ ...prev, [behaviorId]: '' }));
    toast({ title: 'Note added' });
  };

  const addSkillNote = (skillTargetId: string, skillName: string) => {
    const content = pendingSkillNotes[skillTargetId];
    if (!content?.trim()) {
      toast({
        title: 'Note is empty',
        description: 'Please enter a note before saving.',
        variant: 'destructive',
      });
      return;
    }

    const note: SkillNote = {
      id: crypto.randomUUID(),
      skillTargetId,
      skillName,
      content: content.trim(),
      timestamp: new Date(),
    };

    setSkillNotes(prev => [...prev, note]);
    setPendingSkillNotes(prev => ({ ...prev, [skillTargetId]: '' }));
    toast({ title: 'Note added' });
  };

  const removeBehaviorNote = (noteId: string) => {
    setBehaviorNotes(prev => prev.filter(n => n.id !== noteId));
  };

  const removeSkillNote = (noteId: string) => {
    setSkillNotes(prev => prev.filter(n => n.id !== noteId));
  };

  const handleSaveAll = () => {
    const notes: ObservationNotes = {
      id: initialNotes?.id || crypto.randomUUID(),
      studentId,
      observationDate: new Date(),
      behaviorNotes,
      skillNotes,
      narrativeNotes,
    };

    onSave(notes);
    toast({
      title: 'Notes saved',
      description: `${behaviorNotes.length} behavior notes, ${skillNotes.length} skill notes saved.`,
    });
  };

  const getBehaviorNotes = (behaviorId: string) => {
    return behaviorNotes.filter(n => n.behaviorId === behaviorId);
  };

  const getSkillNotes = (skillTargetId: string) => {
    return skillNotes.filter(n => n.skillTargetId === skillTargetId);
  };

  return (
    <div className="space-y-4">
      {/* Behavior Notes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Behavior Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {behaviors.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No behaviors defined for this student
            </p>
          ) : (
            <Accordion type="multiple" className="w-full">
              {behaviors.map((behavior) => {
                const notes = getBehaviorNotes(behavior.id);
                return (
                  <AccordionItem key={behavior.id} value={behavior.id}>
                    <AccordionTrigger className="text-sm py-2">
                      <div className="flex items-center gap-2">
                        {behavior.name}
                        {notes.length > 0 && (
                          <Badge variant="secondary" className="text-[10px]">
                            {notes.length} note{notes.length !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pt-2">
                        {/* Existing notes */}
                        {notes.length > 0 && (
                          <ScrollArea className="max-h-[150px]">
                            <div className="space-y-2">
                              {notes.map((note) => (
                                <div 
                                  key={note.id}
                                  className="flex items-start gap-2 p-2 bg-muted/50 rounded text-xs"
                                >
                                  <p className="flex-1">{note.content}</p>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                                    onClick={() => removeBehaviorNote(note.id)}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        )}
                        
                        {/* Add new note */}
                        <div className="space-y-2">
                          <Textarea
                            placeholder={`Add note for ${behavior.name}...`}
                            value={pendingBehaviorNotes[behavior.id] || ''}
                            onChange={(e) => setPendingBehaviorNotes(prev => ({
                              ...prev,
                              [behavior.id]: e.target.value,
                            }))}
                            className="text-xs min-h-[60px]"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full gap-1 h-7 text-xs"
                            onClick={() => addBehaviorNote(behavior.id, behavior.name)}
                          >
                            <Plus className="w-3 h-3" />
                            Add Note
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Skill Notes */}
      {skillTargets.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Skill Target Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" className="w-full">
              {skillTargets.map((skill) => {
                const notes = getSkillNotes(skill.id);
                return (
                  <AccordionItem key={skill.id} value={skill.id}>
                    <AccordionTrigger className="text-sm py-2">
                      <div className="flex items-center gap-2">
                        {skill.name}
                        <Badge variant="outline" className="text-[10px]">
                          {skill.domain || 'General'}
                        </Badge>
                        {notes.length > 0 && (
                          <Badge variant="secondary" className="text-[10px]">
                            {notes.length} note{notes.length !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pt-2">
                        {/* Existing notes */}
                        {notes.length > 0 && (
                          <ScrollArea className="max-h-[150px]">
                            <div className="space-y-2">
                              {notes.map((note) => (
                                <div 
                                  key={note.id}
                                  className="flex items-start gap-2 p-2 bg-muted/50 rounded text-xs"
                                >
                                  <p className="flex-1">{note.content}</p>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                                    onClick={() => removeSkillNote(note.id)}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        )}
                        
                        {/* Add new note */}
                        <div className="space-y-2">
                          <Textarea
                            placeholder={`Add note for ${skill.name}...`}
                            value={pendingSkillNotes[skill.id] || ''}
                            onChange={(e) => setPendingSkillNotes(prev => ({
                              ...prev,
                              [skill.id]: e.target.value,
                            }))}
                            className="text-xs min-h-[60px]"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full gap-1 h-7 text-xs"
                            onClick={() => addSkillNote(skill.id, skill.name)}
                          >
                            <Plus className="w-3 h-3" />
                            Add Note
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* Narrative Notes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Narrative Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Additional narrative observations, clinical notes, environmental factors, or other relevant information observed during this session..."
            value={narrativeNotes}
            onChange={(e) => setNarrativeNotes(e.target.value)}
            className="min-h-[150px]"
          />
        </CardContent>
      </Card>

      {/* Save All Button */}
      <Button className="w-full gap-2" onClick={handleSaveAll}>
        <Save className="w-4 h-4" />
        Save All Observation Notes
      </Button>
    </div>
  );
}
