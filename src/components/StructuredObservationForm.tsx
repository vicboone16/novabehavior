import { useState } from 'react';
import { FileText, Save, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

type FrequencyRating = 'not_observed' | 'sometimes' | 'frequently';

interface BehaviorChecklistItem {
  id: string;
  category: string;
  behavior: string;
  rating: FrequencyRating;
}

export interface StructuredObservationData {
  id: string;
  studentId: string;
  observationDate: Date;
  observer: string;
  teacherClass: string;
  // Part 1 - Narrative observations
  teacherPosition: string;
  teacherTechniques: string;
  additionalObservations: string;
  // Part 2 - Behavior checklist
  behaviorChecklist: BehaviorChecklistItem[];
  // Overall notes
  notes: string;
}

interface StructuredObservationFormProps {
  studentId: string;
  studentName: string;
  onSave: (data: StructuredObservationData) => void;
}

// Default behavior checklist based on the FBA template
const DEFAULT_BEHAVIOR_CHECKLIST: Omit<BehaviorChecklistItem, 'id' | 'rating'>[] = [
  // 1. Response to Teacher/Lesson
  { category: 'Response to Teacher/Lesson', behavior: 'Listening to teacher/classmates or following directions' },
  { category: 'Response to Teacher/Lesson', behavior: 'Interacting with teacher in class/group' },
  { category: 'Response to Teacher/Lesson', behavior: 'Working with teacher one-on-one' },
  // 2. Peer Interaction
  { category: 'Peer Interaction', behavior: 'Playing/working with other students' },
  { category: 'Peer Interaction', behavior: 'Appropriately talking with other students' },
  // 3. Work on School Subjects
  { category: 'Work on School Subjects', behavior: 'Doing seat work' },
  { category: 'Work on School Subjects', behavior: 'Working at a computer or workstation' },
  // 4. Transition Movement
  { category: 'Transition Movement', behavior: 'Moving around room (appropriately)' },
  { category: 'Transition Movement', behavior: 'Preparing materials for beginning/end of lesson' },
  // 5. Inappropriate Interactions
  { category: 'Inappropriate Interactions', behavior: 'Preventing others from working' },
  { category: 'Inappropriate Interactions', behavior: 'Ignoring appropriate requests from others' },
  { category: 'Inappropriate Interactions', behavior: 'Intruding into others\' personal space' },
  { category: 'Inappropriate Interactions', behavior: 'Touching (nonsexual)' },
  { category: 'Inappropriate Interactions', behavior: 'Talking with other students (distracting)' },
  { category: 'Inappropriate Interactions', behavior: 'Making noises' },
  { category: 'Inappropriate Interactions', behavior: 'Moving around (distracting)' },
  // 6. Inappropriate Movement
  { category: 'Inappropriate Movement', behavior: 'Fidgeting in seat' },
  { category: 'Inappropriate Movement', behavior: 'Walking around classroom' },
  { category: 'Inappropriate Movement', behavior: 'Using electronic device at inappropriate time' },
  { category: 'Inappropriate Movement', behavior: 'Being removed from the classroom' },
  { category: 'Inappropriate Movement', behavior: 'Using work materials inappropriately' },
  { category: 'Inappropriate Movement', behavior: 'Passing notes' },
  { category: 'Inappropriate Movement', behavior: 'Copying answers' },
  { category: 'Inappropriate Movement', behavior: 'Jumping out of seat' },
  { category: 'Inappropriate Movement', behavior: 'Running around classroom' },
  { category: 'Inappropriate Movement', behavior: 'Sitting/standing on desk' },
  { category: 'Inappropriate Movement', behavior: 'Clinging to teacher' },
  // 7. Inattention
  { category: 'Inattention', behavior: 'Staring blankly/daydreaming' },
  { category: 'Inattention', behavior: 'Doodling' },
  { category: 'Inattention', behavior: 'Looking around' },
  { category: 'Inattention', behavior: 'Looking at hands' },
  { category: 'Inattention', behavior: 'Fiddling with objects/fingers' },
  // 8. Inappropriate Vocalization
  { category: 'Inappropriate Vocalization', behavior: 'Laughing inappropriately' },
  { category: 'Inappropriate Vocalization', behavior: 'Tattling' },
  { category: 'Inappropriate Vocalization', behavior: 'Teasing' },
  { category: 'Inappropriate Vocalization', behavior: 'Making disruptive noises' },
  { category: 'Inappropriate Vocalization', behavior: 'Arguing/talking back to teacher' },
  { category: 'Inappropriate Vocalization', behavior: 'Arguing with student' },
  { category: 'Inappropriate Vocalization', behavior: 'Talking out' },
  { category: 'Inappropriate Vocalization', behavior: 'Crying' },
  // 9. Somatization
  { category: 'Somatization', behavior: 'Sleeping/head down' },
  { category: 'Somatization', behavior: 'Complaining of not feeling well' },
  // 10. Repetitive Motor Movements
  { category: 'Repetitive Motor Movements', behavior: 'Finger/pencil tapping' },
  { category: 'Repetitive Motor Movements', behavior: 'Foot tapping/swinging' },
  { category: 'Repetitive Motor Movements', behavior: 'Spinning an object' },
  { category: 'Repetitive Motor Movements', behavior: 'Rocking' },
  { category: 'Repetitive Motor Movements', behavior: 'Hand flapping/waving' },
  { category: 'Repetitive Motor Movements', behavior: 'Pacing' },
  { category: 'Repetitive Motor Movements', behavior: 'Talking/humming/singing to self' },
  { category: 'Repetitive Motor Movements', behavior: 'Other self-stimulatory behavior' },
  // 11. Aggression
  { category: 'Aggression', behavior: 'Kicking others' },
  { category: 'Aggression', behavior: 'Hitting others with hand' },
  { category: 'Aggression', behavior: 'Throwing object(s) at others' },
  { category: 'Aggression', behavior: 'Destroying property' },
  { category: 'Aggression', behavior: 'Pushing others' },
  { category: 'Aggression', behavior: 'Stealing' },
  // 12. Self-injurious Behavior
  { category: 'Self-injurious Behavior', behavior: 'Pulling own hair' },
  { category: 'Self-injurious Behavior', behavior: 'Hitting self' },
  { category: 'Self-injurious Behavior', behavior: 'Head-banging' },
  { category: 'Self-injurious Behavior', behavior: 'Eye-gouging' },
  { category: 'Self-injurious Behavior', behavior: 'Biting self' },
  { category: 'Self-injurious Behavior', behavior: 'Eating/chewing nonfood items (pica)' },
  { category: 'Self-injurious Behavior', behavior: 'Other self-injurious behavior' },
];

const RATING_OPTIONS: { value: FrequencyRating; label: string; color: string }[] = [
  { value: 'not_observed', label: 'Not Observed', color: 'bg-muted text-muted-foreground' },
  { value: 'sometimes', label: 'Sometimes', color: 'bg-warning/20 text-warning-foreground' },
  { value: 'frequently', label: 'Frequently', color: 'bg-destructive/20 text-destructive' },
];

export function StructuredObservationForm({
  studentId,
  studentName,
  onSave,
}: StructuredObservationFormProps) {
  const { toast } = useToast();
  
  const [observer, setObserver] = useState('');
  const [teacherClass, setTeacherClass] = useState('');
  const [teacherPosition, setTeacherPosition] = useState('');
  const [teacherTechniques, setTeacherTechniques] = useState('');
  const [additionalObservations, setAdditionalObservations] = useState('');
  const [notes, setNotes] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
  // Initialize checklist with default items
  const [behaviorChecklist, setBehaviorChecklist] = useState<BehaviorChecklistItem[]>(
    DEFAULT_BEHAVIOR_CHECKLIST.map((item, index) => ({
      ...item,
      id: `checklist-${index}`,
      rating: 'not_observed' as FrequencyRating,
    }))
  );

  // Group behaviors by category
  const groupedBehaviors = behaviorChecklist.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, BehaviorChecklistItem[]>);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const updateRating = (itemId: string, rating: FrequencyRating) => {
    setBehaviorChecklist(prev => 
      prev.map(item => item.id === itemId ? { ...item, rating } : item)
    );
  };

  const getCategoryStats = (items: BehaviorChecklistItem[]) => {
    const sometimes = items.filter(i => i.rating === 'sometimes').length;
    const frequently = items.filter(i => i.rating === 'frequently').length;
    return { sometimes, frequently, total: items.length };
  };

  const handleSave = () => {
    if (!observer.trim()) {
      toast({
        title: 'Observer name required',
        description: 'Please enter the observer name.',
        variant: 'destructive',
      });
      return;
    }

    const data: StructuredObservationData = {
      id: crypto.randomUUID(),
      studentId,
      observationDate: new Date(),
      observer: observer.trim(),
      teacherClass: teacherClass.trim(),
      teacherPosition,
      teacherTechniques,
      additionalObservations,
      behaviorChecklist: behaviorChecklist.filter(i => i.rating !== 'not_observed'),
      notes,
    };

    onSave(data);
    toast({
      title: 'Observation saved',
      description: 'Structured observation form has been saved.',
    });
  };

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Structured Observation Form
          </CardTitle>
          <CardDescription>FBA Structured/Guided Student Observation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Student Name</Label>
              <Input value={studentName} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Observer *</Label>
              <Input 
                placeholder="Observer name..."
                value={observer}
                onChange={(e) => setObserver(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Teacher/Class</Label>
            <Input 
              placeholder="Teacher name and class..."
              value={teacherClass}
              onChange={(e) => setTeacherClass(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Part 1: Narrative Observations */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Part 1: Narrative Observations</CardTitle>
          <CardDescription className="text-xs">
            Provide detailed information about the observation context
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Teacher Position During Observation</Label>
            <Textarea
              placeholder="Note the teacher's position in relation to the target student throughout the observation period (e.g., whether the teacher is working with the student, at the front of the room, at their desk, or out of the room)..."
              value={teacherPosition}
              onChange={(e) => setTeacherPosition(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Teacher Techniques to Change Student Behavior</Label>
            <Textarea
              placeholder="Note the teacher's attempts to change the target student's behavior. Include types of reinforcement used, praise or reprimands (verbal or physical), and for specific disruptive behaviors, note antecedents, behavior, and consequences..."
              value={teacherTechniques}
              onChange={(e) => setTeacherTechniques(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Additional Observations</Label>
            <Textarea
              placeholder="Include any additional observations not recorded earlier, as well as any needed elaboration on previous observations..."
              value={additionalObservations}
              onChange={(e) => setAdditionalObservations(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Part 2: Behavior Checklist */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Part 2: Behavior Checklist</CardTitle>
          <CardDescription className="text-xs">
            Mark the frequency of each behavior observed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[400px] overflow-y-auto">
            <div className="space-y-2">
              {Object.entries(groupedBehaviors).map(([category, items]) => {
                const stats = getCategoryStats(items);
                const isExpanded = expandedCategories.has(category);
                
                return (
                  <Collapsible
                    key={category}
                    open={isExpanded}
                    onOpenChange={() => toggleCategory(category)}
                  >
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted/80">
                        <span className="font-medium text-sm">{category}</span>
                        <div className="flex items-center gap-2">
                          {stats.sometimes > 0 && (
                            <Badge variant="outline" className="text-[10px] bg-warning/20">
                              {stats.sometimes} sometimes
                            </Badge>
                          )}
                          {stats.frequently > 0 && (
                            <Badge variant="outline" className="text-[10px] bg-destructive/20">
                              {stats.frequently} frequent
                            </Badge>
                          )}
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="py-2 space-y-1">
                        {items.map((item) => (
                          <div 
                            key={item.id}
                            className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/30"
                          >
                            <span className="text-xs flex-1">{item.behavior}</span>
                            <Select
                              value={item.rating}
                              onValueChange={(v) => updateRating(item.id, v as FrequencyRating)}
                            >
                              <SelectTrigger className="w-[130px] h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {RATING_OPTIONS.map(opt => (
                                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overall Notes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Overall Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Additional notes about this observation session..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[100px]"
          />
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button className="w-full gap-2" onClick={handleSave}>
        <Save className="w-4 h-4" />
        Save Structured Observation
      </Button>
    </div>
  );
}
