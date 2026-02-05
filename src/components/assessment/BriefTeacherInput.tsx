import { useState } from 'react';
import { 
  ClipboardList, Save, RotateCcw, CheckCircle2, Users, 
  AlertTriangle, FileText, Trash2, CircleAlert, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Student } from '@/types/behavior';

interface BriefTeacherInputProps {
  student: Student;
  onSave?: (data: BriefTeacherInputData) => void;
}

export interface BriefTeacherInputData {
  id: string;
  studentId: string;
  respondentName: string;
  date: Date;
  // Student Strengths
  strengths: string[];
  // Problem Behaviors
  problemBehaviors: string[];
  otherBehavior?: string;
  behaviorDescription: string;
  frequency: string;
  duration: string;
  intensity: string;
  // Antecedents/Triggers
  triggers: string[];
  otherTrigger?: string;
  // Consequences - Things Obtained
  thingsObtained: string[];
  otherObtained?: string;
  // Consequences - Things Avoided
  thingsAvoided: string[];
  otherAvoided?: string;
  // Notes
  additionalNotes: string;
  // Inferred functions based on checkboxes
  inferredFunctions: string[];
}

const PROBLEM_BEHAVIORS = [
  'Destruction of property',
  'Physical aggression',
  'Disruptive',
  'Work refusal',
  'Unresponsive',
  'Inappropriate language',
  'Insubordinate',
  'Withdrawn',
  'Verbally inappropriate',
  'Verbal harassment',
  'Self-injury',
];

const TRIGGERS = [
  'Academic tasks',
  'Unstructured time',
  'Isolated, no one around',
  'Transitions',
  'Reprimands',
  'Non-academic activities',
];

const THINGS_OBTAINED = [
  'Adult attention',
  'Peer attention',
  'Activity',
  'Preferred objects',
];

const THINGS_AVOIDED = [
  'Hard tasks',
  'Physical effort',
  'Reprimands',
  'Peer negatives',
  'Adult attention',
];

export function BriefTeacherInput({ student, onSave }: BriefTeacherInputProps) {
  const [respondentName, setRespondentName] = useState('');
  const [strengths, setStrengths] = useState<string[]>(['', '']);
  const [problemBehaviors, setProblemBehaviors] = useState<string[]>([]);
  const [otherBehavior, setOtherBehavior] = useState('');
  const [behaviorDescription, setBehaviorDescription] = useState('');
  const [frequency, setFrequency] = useState('');
  const [duration, setDuration] = useState('');
  const [intensity, setIntensity] = useState('');
  const [triggers, setTriggers] = useState<string[]>([]);
  const [otherTrigger, setOtherTrigger] = useState('');
  const [thingsObtained, setThingsObtained] = useState<string[]>([]);
  const [otherObtained, setOtherObtained] = useState('');
  const [thingsAvoided, setThingsAvoided] = useState<string[]>([]);
  const [otherAvoided, setOtherAvoided] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Calculate section completion counts
  const behaviorCount = problemBehaviors.length + (otherBehavior.trim() ? 1 : 0);
  const triggerCount = triggers.length + (otherTrigger.trim() ? 1 : 0);
  const obtainedCount = thingsObtained.length + (otherObtained.trim() ? 1 : 0);
  const avoidedCount = thingsAvoided.length + (otherAvoided.trim() ? 1 : 0);
  const consequenceCount = obtainedCount + avoidedCount;

  // Section completion helper
  const SectionIndicator = ({ count, label, required = false }: { count: number; label: string; required?: boolean }) => {
    if (count > 0) {
      return (
        <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
          <Check className="w-3 h-3 mr-1" />
          {count} {label}
        </Badge>
      );
    }
    if (required) {
      return (
        <Badge variant="secondary" className="bg-destructive/10 text-destructive text-xs">
          Required
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-muted-foreground text-xs">
        <CircleAlert className="w-3 h-3 mr-1" />
        None selected
      </Badge>
    );
  };

  const handleReset = () => {
    setRespondentName('');
    setStrengths(['', '']);
    setProblemBehaviors([]);
    setOtherBehavior('');
    setBehaviorDescription('');
    setFrequency('');
    setDuration('');
    setIntensity('');
    setTriggers([]);
    setOtherTrigger('');
    setThingsObtained([]);
    setOtherObtained('');
    setThingsAvoided([]);
    setOtherAvoided('');
    setAdditionalNotes('');
  };

  const toggleCheckbox = (
    value: string, 
    currentList: string[], 
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (currentList.includes(value)) {
      setter(currentList.filter(v => v !== value));
    } else {
      setter([...currentList, value]);
    }
  };

  // Infer functions from selected consequences
  const inferFunctions = (): string[] => {
    const functions: string[] = [];
    
    if (thingsObtained.some(t => t.includes('attention'))) {
      functions.push('attention');
    }
    if (thingsObtained.includes('Activity') || thingsObtained.includes('Preferred objects')) {
      functions.push('tangible');
    }
    if (thingsAvoided.some(t => t.includes('tasks') || t.includes('effort'))) {
      functions.push('escape');
    }
    if (triggers.includes('Isolated, no one around') && thingsObtained.length === 0) {
      functions.push('sensory');
    }
    
    return [...new Set(functions)];
  };

  const handleSave = () => {
    try {
      if (!respondentName.trim()) {
        toast.error('Please enter the respondent name');
        return;
      }

      if (problemBehaviors.length === 0 && !otherBehavior.trim()) {
        toast.error('Please select at least one problem behavior');
        return;
      }

      // Build summary counts for toast
      const summaryParts: string[] = [];
      if (behaviorCount > 0) summaryParts.push(`${behaviorCount} behavior${behaviorCount > 1 ? 's' : ''}`);
      if (triggerCount > 0) summaryParts.push(`${triggerCount} trigger${triggerCount > 1 ? 's' : ''}`);
      if (consequenceCount > 0) summaryParts.push(`${consequenceCount} consequence${consequenceCount > 1 ? 's' : ''}`);

      const data: BriefTeacherInputData = {
        id: crypto.randomUUID(),
        studentId: student.id,
        respondentName: respondentName.trim(),
        date: new Date(),
        strengths: strengths.filter(s => s.trim()),
        problemBehaviors: [...problemBehaviors, ...(otherBehavior ? [otherBehavior] : [])],
        otherBehavior: otherBehavior || undefined,
        behaviorDescription: behaviorDescription.trim(),
        frequency: frequency.trim(),
        duration: duration.trim(),
        intensity: intensity.trim(),
        triggers: [...triggers, ...(otherTrigger ? [otherTrigger] : [])],
        otherTrigger: otherTrigger || undefined,
        thingsObtained: [...thingsObtained, ...(otherObtained ? [otherObtained] : [])],
        otherObtained: otherObtained || undefined,
        thingsAvoided: [...thingsAvoided, ...(otherAvoided ? [otherAvoided] : [])],
        otherAvoided: otherAvoided || undefined,
        additionalNotes: additionalNotes.trim(),
        inferredFunctions: inferFunctions(),
      };

      onSave?.(data);
      toast.success(
        `Saved: ${summaryParts.length > 0 ? summaryParts.join(', ') : 'Response saved'}`,
        { description: `for ${student.displayName || student.name}` }
      );
      handleReset();
    } catch (error) {
      console.error('Error saving Brief Teacher Input:', error);
      toast.error('Failed to save. Please try again.');
    }
  };

  const inferredFunctions = inferFunctions();

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="w-4 h-4" />
                Brief FBA Teacher/Staff Interview
              </CardTitle>
              <CardDescription className="text-xs">
                Structured interview form for gathering teacher input on problem behaviors
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="w-3 h-3 mr-1" />
                Reset
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Save className="w-3 h-3 mr-1" />
                Save
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Student</Label>
              <Input value={student.displayName || student.name} disabled className="text-sm bg-muted" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Respondent Name *</Label>
              <Input
                placeholder="Teacher/Staff name"
                value={respondentName}
                onChange={(e) => setRespondentName(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Date: {format(new Date(), 'MMMM d, yyyy')}
          </div>
        </CardContent>
      </Card>

      <ScrollArea className="h-[500px]">
        <div className="space-y-4 pr-4">
          {/* Student Strengths */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Student Strengths
              </CardTitle>
              <CardDescription className="text-xs">
                Please identify at least two strengths or contributions the student brings to school
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {strengths.map((strength, idx) => (
                <div key={idx} className="flex gap-2">
                  <span className="text-sm text-muted-foreground w-4">{idx + 1}.</span>
                  <Input
                    value={strength}
                    onChange={(e) => {
                      const newStrengths = [...strengths];
                      newStrengths[idx] = e.target.value;
                      setStrengths(newStrengths);
                    }}
                    placeholder="Enter a strength..."
                    className="text-sm"
                  />
                </div>
              ))}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setStrengths([...strengths, ''])}
              >
                + Add another strength
              </Button>
            </CardContent>
          </Card>

          {/* Problem Behavior */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  Problem Behavior
                </CardTitle>
                <SectionIndicator count={behaviorCount} label="selected" required />
              </div>
              <CardDescription className="text-xs">
                Select the most concerning problem behaviors
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {PROBLEM_BEHAVIORS.map(behavior => (
                  <div key={behavior} className="flex items-center space-x-2">
                    <Checkbox
                      id={`pb-${behavior}`}
                      checked={problemBehaviors.includes(behavior)}
                      onCheckedChange={() => toggleCheckbox(behavior, problemBehaviors, setProblemBehaviors)}
                    />
                    <label htmlFor={`pb-${behavior}`} className="text-xs cursor-pointer">
                      {behavior}
                    </label>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="pb-other"
                  checked={!!otherBehavior}
                  onCheckedChange={(checked) => !checked && setOtherBehavior('')}
                />
                <label htmlFor="pb-other" className="text-xs">Other:</label>
                <Input
                  value={otherBehavior}
                  onChange={(e) => setOtherBehavior(e.target.value)}
                  placeholder="Specify other behavior"
                  className="text-sm flex-1"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">What does the problem behavior look like?</Label>
                <Textarea
                  value={behaviorDescription}
                  onChange={(e) => setBehaviorDescription(e.target.value)}
                  placeholder="Describe the behavior..."
                  rows={2}
                />
              </div>

              <div className="grid md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">How often does it occur?</Label>
                  <Input
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    placeholder="e.g., 3-4 times per day"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">How long does it last?</Label>
                  <Input
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="e.g., 5-10 minutes"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Intensity/Level of danger?</Label>
                  <Input
                    value={intensity}
                    onChange={(e) => setIntensity(e.target.value)}
                    placeholder="e.g., Moderate"
                    className="text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Antecedents/Triggers */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Antecedents (Triggers)</CardTitle>
                <SectionIndicator count={triggerCount} label="selected" />
              </div>
              <CardDescription className="text-xs">
                What events predict when the problem behavior will occur?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {TRIGGERS.map(trigger => (
                  <div key={trigger} className="flex items-center space-x-2">
                    <Checkbox
                      id={`tr-${trigger}`}
                      checked={triggers.includes(trigger)}
                      onCheckedChange={() => toggleCheckbox(trigger, triggers, setTriggers)}
                    />
                    <label htmlFor={`tr-${trigger}`} className="text-xs cursor-pointer">
                      {trigger}
                    </label>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="tr-other"
                  checked={!!otherTrigger}
                  onCheckedChange={(checked) => !checked && setOtherTrigger('')}
                />
                <label htmlFor="tr-other" className="text-xs">Other:</label>
                <Input
                  value={otherTrigger}
                  onChange={(e) => setOtherTrigger(e.target.value)}
                  placeholder="Specify other trigger"
                  className="text-sm flex-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Consequences */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Consequences</CardTitle>
                <SectionIndicator count={consequenceCount} label="selected" />
              </div>
              <CardDescription className="text-xs">
                What consequences appear to maintain the problem behavior?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Things Obtained */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Things that are obtained:</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {THINGS_OBTAINED.map(item => (
                    <div key={item} className="flex items-center space-x-2">
                      <Checkbox
                        id={`obt-${item}`}
                        checked={thingsObtained.includes(item)}
                        onCheckedChange={() => toggleCheckbox(item, thingsObtained, setThingsObtained)}
                      />
                      <label htmlFor={`obt-${item}`} className="text-xs cursor-pointer">
                        {item}
                      </label>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="obt-other"
                    checked={!!otherObtained}
                    onCheckedChange={(checked) => !checked && setOtherObtained('')}
                  />
                  <label htmlFor="obt-other" className="text-xs">Other:</label>
                  <Input
                    value={otherObtained}
                    onChange={(e) => setOtherObtained(e.target.value)}
                    placeholder="Specify"
                    className="text-sm flex-1"
                  />
                </div>
              </div>

              {/* Things Avoided */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Things avoided or escaped:</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {THINGS_AVOIDED.map(item => (
                    <div key={item} className="flex items-center space-x-2">
                      <Checkbox
                        id={`avd-${item}`}
                        checked={thingsAvoided.includes(item)}
                        onCheckedChange={() => toggleCheckbox(item, thingsAvoided, setThingsAvoided)}
                      />
                      <label htmlFor={`avd-${item}`} className="text-xs cursor-pointer">
                        {item}
                      </label>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="avd-other"
                    checked={!!otherAvoided}
                    onCheckedChange={(checked) => !checked && setOtherAvoided('')}
                  />
                  <label htmlFor="avd-other" className="text-xs">Other:</label>
                  <Input
                    value={otherAvoided}
                    onChange={(e) => setOtherAvoided(e.target.value)}
                    placeholder="Specify"
                    className="text-sm flex-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Inferred Functions */}
          {inferredFunctions.length > 0 && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  Inferred Function(s)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {inferredFunctions.map(fn => (
                    <Badge key={fn} variant="default" className="capitalize">
                      {fn}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Based on selected triggers and consequences
                </p>
              </CardContent>
            </Card>
          )}

          {/* Additional Notes */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Other Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Add any additional notes, observations, or context..."
                rows={4}
              />
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
