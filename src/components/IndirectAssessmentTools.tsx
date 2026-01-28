import { useState, useMemo } from 'react';
import { 
  ClipboardList, Save, RotateCcw, ChevronDown, ChevronUp, 
  CheckCircle2, AlertCircle, Brain, TrendingUp, Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { Student, BehaviorFunction } from '@/types/behavior';

interface IndirectAssessmentToolsProps {
  student: Student;
  onSaveAssessment?: (assessment: AssessmentResult) => void;
}

interface AssessmentResult {
  type: 'FAST' | 'MAS' | 'QABF';
  studentId: string;
  completedBy: string;
  completedAt: Date;
  targetBehavior: string;
  responses: Record<string, number>;
  scores: FunctionScores;
  primaryFunction: BehaviorFunction;
  notes?: string;
}

interface FunctionScores {
  attention: number;
  escape: number;
  tangible: number;
  sensory: number;
}

// FAST - Functional Assessment Screening Tool (simplified 16-item version)
const FAST_ITEMS = [
  // Social Attention (1-4)
  { id: 'fast_1', text: 'Engages in behavior to get attention from others', function: 'attention' },
  { id: 'fast_2', text: 'Behavior occurs when caregiver attention is directed elsewhere', function: 'attention' },
  { id: 'fast_3', text: 'Behavior stops when attention is provided', function: 'attention' },
  { id: 'fast_4', text: 'Seems to enjoy reactions from others when engaging in behavior', function: 'attention' },
  // Escape (5-8)
  { id: 'fast_5', text: 'Behavior occurs during difficult or disliked tasks', function: 'escape' },
  { id: 'fast_6', text: 'Behavior occurs when asked to do something', function: 'escape' },
  { id: 'fast_7', text: 'Behavior stops when demands are removed', function: 'escape' },
  { id: 'fast_8', text: 'Behavior seems designed to get out of work or activities', function: 'escape' },
  // Tangible (9-12)
  { id: 'fast_9', text: 'Behavior occurs when preferred item is removed', function: 'tangible' },
  { id: 'fast_10', text: 'Behavior occurs when told "no" to a request', function: 'tangible' },
  { id: 'fast_11', text: 'Behavior stops when given access to preferred item', function: 'tangible' },
  { id: 'fast_12', text: 'Behavior seems designed to get access to things', function: 'tangible' },
  // Sensory (13-16)
  { id: 'fast_13', text: 'Behavior occurs when alone', function: 'sensory' },
  { id: 'fast_14', text: 'Behavior occurs regardless of what is happening around them', function: 'sensory' },
  { id: 'fast_15', text: 'Behavior seems to provide sensory stimulation', function: 'sensory' },
  { id: 'fast_16', text: 'Behavior occurs even when no one is around', function: 'sensory' },
];

// MAS - Motivation Assessment Scale (16 items)
const MAS_ITEMS = [
  // Sensory (1, 5, 9, 13)
  { id: 'mas_1', text: 'Would the behavior occur continuously if left alone for long periods?', function: 'sensory' },
  { id: 'mas_5', text: 'Does the behavior occur following a request to perform a difficult task?', function: 'escape' },
  { id: 'mas_9', text: 'Does the behavior seem to occur when the person has been told they cannot have something?', function: 'tangible' },
  { id: 'mas_13', text: 'When the behavior occurs, do you provide comfort to the person?', function: 'attention' },
  // Escape (2, 6, 10, 14)
  { id: 'mas_2', text: 'Does the behavior occur following a command or request?', function: 'escape' },
  { id: 'mas_6', text: 'Does the behavior occur when any request is made?', function: 'escape' },
  { id: 'mas_10', text: 'Does the behavior stop when you give the person a task to do?', function: 'escape' },
  { id: 'mas_14', text: 'Does the behavior occur when you stop attending to the person?', function: 'attention' },
  // Tangible (3, 7, 11, 15)
  { id: 'mas_3', text: 'Does the behavior seem to occur to get a toy, food, or activity?', function: 'tangible' },
  { id: 'mas_7', text: 'Does the behavior occur when a favorite item is taken away?', function: 'tangible' },
  { id: 'mas_11', text: 'Does the behavior seem to occur when the person wants something?', function: 'tangible' },
  { id: 'mas_15', text: 'Does the behavior seem to provide internal stimulation?', function: 'sensory' },
  // Attention (4, 8, 12, 16)
  { id: 'mas_4', text: 'Does the behavior occur when no one is paying attention?', function: 'attention' },
  { id: 'mas_8', text: 'Does the behavior occur when the person is alone?', function: 'sensory' },
  { id: 'mas_12', text: 'Does the person seem calm during the behavior?', function: 'sensory' },
  { id: 'mas_16', text: 'Does the behavior occur to get your attention?', function: 'attention' },
];

// QABF - Questions About Behavioral Function (25 items, 5 per function)
const QABF_ITEMS = [
  // Attention
  { id: 'qabf_1', text: 'Engages in behavior to get attention', function: 'attention' },
  { id: 'qabf_6', text: 'Engages in behavior when not receiving attention', function: 'attention' },
  { id: 'qabf_11', text: 'Engages in behavior to get a reaction from others', function: 'attention' },
  { id: 'qabf_16', text: 'Engages in behavior when others are not interacting', function: 'attention' },
  { id: 'qabf_21', text: 'Engages in behavior when people are talking and not attending', function: 'attention' },
  // Escape
  { id: 'qabf_2', text: 'Engages in behavior to escape work/learning', function: 'escape' },
  { id: 'qabf_7', text: 'Engages in behavior when asked to do something', function: 'escape' },
  { id: 'qabf_12', text: 'Engages in behavior during difficult tasks', function: 'escape' },
  { id: 'qabf_17', text: 'Engages in behavior when work is too hard', function: 'escape' },
  { id: 'qabf_22', text: 'Engages in behavior to avoid activities', function: 'escape' },
  // Non-social (Sensory)
  { id: 'qabf_3', text: 'Engages in behavior when alone', function: 'sensory' },
  { id: 'qabf_8', text: 'Engages in behavior regardless of what is happening around', function: 'sensory' },
  { id: 'qabf_13', text: 'Engages in behavior that provides sensory stimulation', function: 'sensory' },
  { id: 'qabf_18', text: 'Engages in behavior repeatedly in the same way', function: 'sensory' },
  { id: 'qabf_23', text: 'Engages in behavior even when no one is around', function: 'sensory' },
  // Physical (Tangible)
  { id: 'qabf_4', text: 'Engages in behavior to get preferred items', function: 'tangible' },
  { id: 'qabf_9', text: 'Engages in behavior when preferred item is taken', function: 'tangible' },
  { id: 'qabf_14', text: 'Engages in behavior when cannot have something wanted', function: 'tangible' },
  { id: 'qabf_19', text: 'Engages in behavior to get food/drink', function: 'tangible' },
  { id: 'qabf_24', text: 'Engages in behavior to access activities', function: 'tangible' },
  // Tangible items (additional)
  { id: 'qabf_5', text: 'Engages in behavior when a favorite thing is out of reach', function: 'tangible' },
  { id: 'qabf_10', text: 'Engages in behavior when denied access to something', function: 'tangible' },
  { id: 'qabf_15', text: 'Engages in behavior to get something to eat/drink', function: 'tangible' },
  { id: 'qabf_20', text: 'Engages in behavior when waiting for something', function: 'tangible' },
  { id: 'qabf_25', text: 'Engages in behavior when told no', function: 'tangible' },
];

const RATING_OPTIONS = [
  { value: 0, label: 'Never', color: 'bg-green-500' },
  { value: 1, label: 'Almost Never', color: 'bg-green-400' },
  { value: 2, label: 'Sometimes', color: 'bg-yellow-500' },
  { value: 3, label: 'Almost Always', color: 'bg-orange-500' },
  { value: 4, label: 'Always', color: 'bg-red-500' },
];

export function IndirectAssessmentTools({ student, onSaveAssessment }: IndirectAssessmentToolsProps) {
  const [activeAssessment, setActiveAssessment] = useState<'FAST' | 'MAS' | 'QABF'>('FAST');
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [targetBehavior, setTargetBehavior] = useState('');
  const [completedBy, setCompletedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const currentItems = useMemo(() => {
    switch (activeAssessment) {
      case 'FAST': return FAST_ITEMS;
      case 'MAS': return MAS_ITEMS;
      case 'QABF': return QABF_ITEMS;
    }
  }, [activeAssessment]);

  const progress = useMemo(() => {
    const answered = Object.keys(responses).filter(k => 
      currentItems.some(i => i.id === k)
    ).length;
    return (answered / currentItems.length) * 100;
  }, [responses, currentItems]);

  const scores = useMemo((): FunctionScores => {
    const functionScores: FunctionScores = {
      attention: 0,
      escape: 0,
      tangible: 0,
      sensory: 0,
    };

    currentItems.forEach(item => {
      const response = responses[item.id];
      if (response !== undefined) {
        functionScores[item.function as keyof FunctionScores] += response;
      }
    });

    return functionScores;
  }, [responses, currentItems]);

  const maxPossibleScore = useMemo((): FunctionScores => {
    const counts: FunctionScores = { attention: 0, escape: 0, tangible: 0, sensory: 0 };
    currentItems.forEach(item => {
      counts[item.function as keyof FunctionScores]++;
    });
    return {
      attention: counts.attention * 4,
      escape: counts.escape * 4,
      tangible: counts.tangible * 4,
      sensory: counts.sensory * 4,
    };
  }, [currentItems]);

  const primaryFunction = useMemo((): BehaviorFunction => {
    const entries = Object.entries(scores) as [keyof FunctionScores, number][];
    const sorted = entries.sort((a, b) => b[1] - a[1]);
    return sorted[0][0] as BehaviorFunction;
  }, [scores]);

  const handleResponse = (itemId: string, value: number) => {
    setResponses(prev => ({ ...prev, [itemId]: value }));
  };

  const handleReset = () => {
    setResponses({});
    setShowResults(false);
    setNotes('');
  };

  const handleSave = () => {
    if (!targetBehavior.trim()) {
      toast.error('Please enter a target behavior');
      return;
    }
    if (progress < 100) {
      toast.error('Please complete all items before saving');
      return;
    }

    const result: AssessmentResult = {
      type: activeAssessment,
      studentId: student.id,
      completedBy: completedBy || 'Unknown',
      completedAt: new Date(),
      targetBehavior,
      responses,
      scores,
      primaryFunction,
      notes,
    };

    onSaveAssessment?.(result);
    toast.success(`${activeAssessment} assessment saved`);
    setShowResults(true);
  };

  const getFunctionColor = (fn: string) => {
    const colors: Record<string, string> = {
      attention: 'bg-blue-500',
      escape: 'bg-orange-500',
      tangible: 'bg-green-500',
      sensory: 'bg-purple-500',
    };
    return colors[fn] || 'bg-muted';
  };

  const getFunctionLabel = (fn: string) => {
    const labels: Record<string, string> = {
      attention: 'Social Attention',
      escape: 'Escape/Avoidance',
      tangible: 'Tangible/Access',
      sensory: 'Sensory/Automatic',
    };
    return labels[fn] || fn;
  };

  return (
    <div className="space-y-4">
      {/* Assessment Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <ClipboardList className="w-4 h-4" />
                Indirect Assessment Tools
              </CardTitle>
              <CardDescription className="text-xs">
                Rating scales to help identify behavior functions
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="w-3 h-3 mr-1" />
                Reset
              </Button>
              <Button size="sm" onClick={handleSave} disabled={progress < 100}>
                <Save className="w-3 h-3 mr-1" />
                Save
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Assessment Selection */}
          <Tabs value={activeAssessment} onValueChange={(v) => {
            setActiveAssessment(v as 'FAST' | 'MAS' | 'QABF');
            setResponses({});
            setShowResults(false);
          }}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="FAST" className="text-xs">
                FAST
                <Badge variant="secondary" className="ml-1 text-xs">{FAST_ITEMS.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="MAS" className="text-xs">
                MAS
                <Badge variant="secondary" className="ml-1 text-xs">{MAS_ITEMS.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="QABF" className="text-xs">
                QABF
                <Badge variant="secondary" className="ml-1 text-xs">{QABF_ITEMS.length}</Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Assessment Info */}
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Target Behavior</Label>
              <Input
                placeholder="Enter the behavior being assessed"
                value={targetBehavior}
                onChange={(e) => setTargetBehavior(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Completed By</Label>
              <Input
                placeholder="Informant name/role"
                value={completedBy}
                onChange={(e) => setCompletedBy(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Progress</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Results Card (shown when complete) */}
      {showResults && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="w-4 h-4" />
              {activeAssessment} Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(scores).map(([fn, score]) => (
                <div key={fn} className="text-center p-3 bg-background rounded-lg border">
                  <div className={`w-8 h-8 mx-auto mb-2 rounded-full ${getFunctionColor(fn)} flex items-center justify-center text-white text-sm font-bold`}>
                    {score}
                  </div>
                  <p className="text-xs font-medium">{getFunctionLabel(fn)}</p>
                  <p className="text-xs text-muted-foreground">
                    {Math.round((score / maxPossibleScore[fn as keyof FunctionScores]) * 100)}%
                  </p>
                </div>
              ))}
            </div>

            <div className="p-3 bg-background rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium">Primary Function Indicated</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${getFunctionColor(primaryFunction)}`} />
                <span className="font-medium">{getFunctionLabel(primaryFunction)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assessment Items */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            {activeAssessment} Items
          </CardTitle>
          <CardDescription className="text-xs">
            Rate how often each statement applies to the target behavior
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {currentItems.map((item, index) => (
                <div 
                  key={item.id}
                  className={`p-3 border rounded-lg transition-colors ${
                    responses[item.id] !== undefined 
                      ? 'bg-muted/30 border-muted-foreground/20' 
                      : 'hover:bg-muted/10'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1 space-y-2">
                      <p className="text-sm">{item.text}</p>
                      <div className="flex flex-wrap gap-2">
                        {RATING_OPTIONS.map(option => (
                          <button
                            key={option.value}
                            onClick={() => handleResponse(item.id, option.value)}
                            className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                              responses[item.id] === option.value
                                ? `${option.color} text-white border-transparent`
                                : 'bg-background hover:bg-muted border-border'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getFunctionColor(item.function)} text-white border-0`}
                    >
                      {item.function.charAt(0).toUpperCase()}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Assessment Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Add any additional notes or observations about this assessment..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </CardContent>
      </Card>
    </div>
  );
}
