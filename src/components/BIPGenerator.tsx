import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { 
  FileText, Download, Printer, Shield, Plus, Trash2, 
  CheckCircle2, AlertTriangle, Target, Lightbulb, Users,
  Calendar, Clock, Save, ChevronDown, ChevronUp, Brain,
  ArrowRight, Sparkles, BookOpen, Heart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useDataStore } from '@/store/dataStore';
import { 
  Student, 
  BehaviorFunction, 
  FUNCTION_OPTIONS,
  BIPData,
} from '@/types/behavior';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';

interface BIPGeneratorProps {
  student?: Student;
}

// Function-based intervention templates
const INTERVENTION_TEMPLATES: Record<string, {
  preventative: string[];
  teaching: string[];
  reinforcement: string[];
  reactive: string[];
  replacement: { name: string; definition: string }[];
}> = {
  attention: {
    preventative: [
      'Provide frequent positive attention for appropriate behaviors (every 2-5 minutes)',
      'Schedule regular 1:1 check-ins throughout the day',
      'Assign classroom jobs that provide appropriate attention',
      'Use proximity and nonverbal acknowledgment during instruction',
      'Establish a signal for requesting attention appropriately',
    ],
    teaching: [
      'Teach appropriate attention-seeking behaviors (raising hand, using name)',
      'Practice waiting for attention using visual supports',
      'Role-play appropriate ways to join conversations',
      'Teach self-monitoring for attention-seeking behaviors',
      'Use social stories about getting attention appropriately',
    ],
    reinforcement: [
      'Provide immediate verbal praise for appropriate behavior',
      'Use token economy with attention-based rewards',
      'Schedule earned 1:1 time with preferred adults',
      'Implement peer attention systems (buddy programs)',
      'Use public recognition for meeting goals',
    ],
    reactive: [
      'Minimize attention when problem behavior occurs',
      'Use planned ignoring with safety monitoring',
      'Redirect to appropriate attention-seeking behavior',
      'Provide brief, neutral response if attention required',
      'Avoid lectures or extended verbal interaction during behavior',
    ],
    replacement: [
      { name: 'Appropriate Attention Request', definition: 'Student raises hand, uses name, or uses designated signal to request attention from adults or peers' },
      { name: 'Waiting Appropriately', definition: 'Student remains in designated area, engages in independent activity, while waiting for adult attention' },
    ],
  },
  escape: {
    preventative: [
      'Modify task difficulty to match current skill level',
      'Break tasks into smaller, manageable steps',
      'Provide choice in task order or materials',
      'Use visual schedules showing work and break times',
      'Pre-teach difficult concepts before independent work',
    ],
    teaching: [
      'Teach appropriate break request (verbal, card, sign)',
      'Practice asking for help when frustrated',
      'Teach self-calming strategies before task avoidance',
      'Use graduated exposure to challenging tasks',
      'Teach task completion with increasing demands',
    ],
    reinforcement: [
      'Provide breaks contingent on work completion',
      'Use first-then boards with preferred activities',
      'Implement token system for task persistence',
      'Offer choice of reinforcer after work completion',
      'Fade break frequency as tolerance increases',
    ],
    reactive: [
      'Do not remove demands following problem behavior',
      'Use escape extinction with prompting through task',
      'Provide brief break, then return to modified task',
      'Reduce task difficulty temporarily if needed for safety',
      'Follow through with minimal demands to maintain expectation',
    ],
    replacement: [
      { name: 'Appropriate Break Request', definition: 'Student uses designated method (card, verbal, sign) to request a brief break from non-preferred tasks' },
      { name: 'Help Request', definition: 'Student asks for assistance using appropriate words or gestures when task is difficult' },
    ],
  },
  tangible: {
    preventative: [
      'Provide visual schedule showing when preferred items are available',
      'Establish clear expectations for earning access',
      'Offer choices between available options',
      'Use timers to show when items become available',
      'Limit visibility of unavailable preferred items',
    ],
    teaching: [
      'Teach appropriate requesting skills',
      'Practice waiting and delayed gratification',
      'Teach trading and turn-taking skills',
      'Use social stories about waiting for wants',
      'Practice accepting "no" with appropriate coping',
    ],
    reinforcement: [
      'Provide access to preferred items for appropriate behavior',
      'Use token systems to earn preferred items/activities',
      'Implement choice boards for selecting reinforcers',
      'Schedule access to high-preference items',
      'Use Premack principle (first work, then preferred activity)',
    ],
    reactive: [
      'Do not provide item following problem behavior',
      'Block access to item during/after behavior',
      'Redirect to appropriate request',
      'Remove item if obtained through problem behavior',
      'Wait for calm before re-offering opportunity to request',
    ],
    replacement: [
      { name: 'Appropriate Request', definition: 'Student uses words, pictures, or gestures to request desired items or activities' },
      { name: 'Accepting No', definition: 'Student accepts being told "no" without engaging in problem behavior, may express disappointment appropriately' },
    ],
  },
  sensory: {
    preventative: [
      'Implement sensory diet throughout the day',
      'Provide access to appropriate sensory tools',
      'Create calm-down area with sensory supports',
      'Schedule movement breaks into daily routine',
      'Modify sensory environment (lighting, noise, etc.)',
    ],
    teaching: [
      'Teach identification of sensory needs',
      'Teach appropriate ways to meet sensory needs',
      'Practice using sensory tools appropriately',
      'Teach self-regulation strategies',
      'Use zones of regulation curriculum',
    ],
    reinforcement: [
      'Provide access to sensory activities for appropriate behavior',
      'Use sensory-based reinforcers matched to preferences',
      'Reinforce use of replacement sensory behaviors',
      'Schedule sensory breaks as earned rewards',
      'Praise appropriate use of sensory tools',
    ],
    reactive: [
      'Redirect to appropriate sensory alternative',
      'Guide to calm-down area if needed',
      'Use response blocking if behavior is harmful',
      'Provide competing sensory input',
      'Wait for regulation before returning to task',
    ],
    replacement: [
      { name: 'Appropriate Sensory Input', definition: 'Student uses designated sensory tools or activities to meet sensory needs appropriately' },
      { name: 'Self-Regulation Request', definition: 'Student requests break to calm-down area or uses self-calming strategies' },
    ],
  },
  automatic: {
    preventative: [
      'Provide alternative stimulation that meets same need',
      'Enrich environment with engaging activities',
      'Reduce alone time with structured activities',
      'Modify physical environment to reduce triggers',
      'Increase engagement in preferred activities',
    ],
    teaching: [
      'Teach competing/alternative responses',
      'Implement habit reversal training',
      'Practice awareness training',
      'Teach appropriate replacement behaviors',
      'Use differential reinforcement of alternative behavior',
    ],
    reinforcement: [
      'Reinforce absence of behavior or use of replacement',
      'Provide access to engaging activities',
      'Use DRI/DRA schedules',
      'Reinforce competing behaviors',
      'Provide sensory alternatives as reinforcement',
    ],
    reactive: [
      'Interrupt and redirect to replacement behavior',
      'Block response if harmful',
      'Guide to alternative activity',
      'Minimize attention to behavior',
      'Provide immediate alternative stimulation',
    ],
    replacement: [
      { name: 'Alternative Stimulation', definition: 'Student engages in designated alternative behavior that provides similar sensory input safely' },
      { name: 'Engagement in Activity', definition: 'Student participates in structured activity or uses fidget tools appropriately' },
    ],
  },
  unknown: {
    preventative: [
      'Maintain predictable routines and schedules',
      'Provide clear expectations and visual supports',
      'Ensure basic needs are met (hunger, fatigue, etc.)',
      'Monitor for environmental triggers',
      'Continue data collection to identify function',
    ],
    teaching: [
      'Teach general communication skills',
      'Teach self-regulation strategies',
      'Practice following routines',
      'Teach requesting help and breaks',
      'Implement social skills instruction',
    ],
    reinforcement: [
      'Reinforce general appropriate behavior',
      'Use varied reinforcement strategies',
      'Provide frequent positive feedback',
      'Implement token economy for multiple behaviors',
      'Praise specific positive behaviors',
    ],
    reactive: [
      'Ensure safety of student and others',
      'Remain calm and neutral',
      'Collect data on antecedents and consequences',
      'Avoid inadvertently reinforcing behavior',
      'Debrief after incident to identify patterns',
    ],
    replacement: [
      { name: 'General Communication', definition: 'Student uses words or gestures to express needs and wants appropriately' },
      { name: 'Self-Regulation', definition: 'Student uses calming strategies when upset or frustrated' },
    ],
  },
};

export function BIPGenerator({ student: propStudent }: BIPGeneratorProps) {
  const { students, abcEntries, updateStudentProfile } = useDataStore();
  const [selectedStudentId, setSelectedStudentId] = useState<string>(propStudent?.id || '');
  const [activeTab, setActiveTab] = useState('import');
  
  // BIP Form State
  const [targetBehaviors, setTargetBehaviors] = useState<{ name: string; definition: string }[]>([]);
  const [hypothesisStatements, setHypothesisStatements] = useState<string[]>([]);
  const [primaryFunction, setPrimaryFunction] = useState<BehaviorFunction>('unknown');
  const [replacementBehaviors, setReplacementBehaviors] = useState<{ name: string; definition: string; teachingPlan?: string }[]>([]);
  const [preventativeStrategies, setPreventativeStrategies] = useState<string[]>([]);
  const [teachingStrategies, setTeachingStrategies] = useState<string[]>([]);
  const [reinforcementStrategies, setReinforcementStrategies] = useState<string[]>([]);
  const [reactiveStrategies, setReactiveStrategies] = useState<string[]>([]);
  const [crisisPlan, setCrisisPlan] = useState('');
  const [monitoringPlan, setMonitoringPlan] = useState('');
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const [newTeamMember, setNewTeamMember] = useState('');

  const activeStudents = useMemo(() => 
    students.filter(s => !s.isArchived), 
    [students]
  );

  const selectedStudent = useMemo(() => 
    students.find(s => s.id === selectedStudentId),
    [students, selectedStudentId]
  );

  // Analyze FBA data for auto-population
  const fbaAnalysis = useMemo(() => {
    if (!selectedStudent) return null;

    const studentABC = abcEntries.filter(e => e.studentId === selectedStudentId);
    
    if (studentABC.length === 0) return null;

    // Count functions
    const functionCounts = new Map<BehaviorFunction, number>();
    studentABC.forEach(entry => {
      const functions = entry.functions || ['unknown' as BehaviorFunction];
      functions.forEach(fn => {
        functionCounts.set(fn, (functionCounts.get(fn) || 0) + 1);
      });
    });

    const sortedFunctions = Array.from(functionCounts.entries())
      .sort((a, b) => b[1] - a[1]);
    
    const detectedFunction = sortedFunctions[0]?.[0] || 'unknown';

    // Get antecedents and consequences
    const antecedentCounts = new Map<string, number>();
    const consequenceCounts = new Map<string, number>();
    
    studentABC.forEach(entry => {
      const antecedents = entry.antecedents || [entry.antecedent];
      antecedents.forEach(a => antecedentCounts.set(a, (antecedentCounts.get(a) || 0) + 1));
      
      const consequences = entry.consequences || [entry.consequence];
      consequences.forEach(c => consequenceCounts.set(c, (consequenceCounts.get(c) || 0) + 1));
    });

    const topAntecedent = Array.from(antecedentCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || '';
    const topConsequence = Array.from(consequenceCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || '';

    // Generate hypothesis
    const behaviorNames = selectedStudent.behaviors.map(b => b.name).join(', ');
    const functionLabel = FUNCTION_OPTIONS.find(f => f.value === detectedFunction)?.label || 'unknown';
    
    const hypothesis = topAntecedent && topConsequence
      ? `When ${topAntecedent.toLowerCase()}, ${selectedStudent.name} engages in ${behaviorNames || 'the target behavior(s)'} in order to obtain ${functionLabel.toLowerCase()}. The behavior is maintained by ${topConsequence.toLowerCase()}.`
      : null;

    return {
      primaryFunction: detectedFunction,
      hypothesis,
      behaviors: selectedStudent.behaviors,
      indirectAssessments: selectedStudent.indirectAssessments || [],
    };
  }, [selectedStudent, selectedStudentId, abcEntries]);

  const importFromFBA = () => {
    if (!fbaAnalysis || !selectedStudent) return;

    // Import behaviors
    setTargetBehaviors(selectedStudent.behaviors.map(b => ({
      name: b.name,
      definition: b.operationalDefinition || '',
    })));

    // Import function and hypothesis
    setPrimaryFunction(fbaAnalysis.primaryFunction);
    if (fbaAnalysis.hypothesis) {
      setHypothesisStatements([fbaAnalysis.hypothesis]);
    }

    // Get function-based templates
    const templates = INTERVENTION_TEMPLATES[fbaAnalysis.primaryFunction] || INTERVENTION_TEMPLATES.unknown;
    
    // Auto-populate with first 3 of each strategy
    setPreventativeStrategies(templates.preventative.slice(0, 3));
    setTeachingStrategies(templates.teaching.slice(0, 3));
    setReinforcementStrategies(templates.reinforcement.slice(0, 3));
    setReactiveStrategies(templates.reactive.slice(0, 3));
    setReplacementBehaviors(templates.replacement);

    toast.success('FBA data imported successfully');
    setActiveTab('behaviors');
  };

  const addStrategy = (type: 'preventative' | 'teaching' | 'reinforcement' | 'reactive', strategy: string) => {
    switch (type) {
      case 'preventative':
        if (!preventativeStrategies.includes(strategy)) {
          setPreventativeStrategies([...preventativeStrategies, strategy]);
        }
        break;
      case 'teaching':
        if (!teachingStrategies.includes(strategy)) {
          setTeachingStrategies([...teachingStrategies, strategy]);
        }
        break;
      case 'reinforcement':
        if (!reinforcementStrategies.includes(strategy)) {
          setReinforcementStrategies([...reinforcementStrategies, strategy]);
        }
        break;
      case 'reactive':
        if (!reactiveStrategies.includes(strategy)) {
          setReactiveStrategies([...reactiveStrategies, strategy]);
        }
        break;
    }
  };

  const removeStrategy = (type: 'preventative' | 'teaching' | 'reinforcement' | 'reactive', index: number) => {
    switch (type) {
      case 'preventative':
        setPreventativeStrategies(prev => prev.filter((_, i) => i !== index));
        break;
      case 'teaching':
        setTeachingStrategies(prev => prev.filter((_, i) => i !== index));
        break;
      case 'reinforcement':
        setReinforcementStrategies(prev => prev.filter((_, i) => i !== index));
        break;
      case 'reactive':
        setReactiveStrategies(prev => prev.filter((_, i) => i !== index));
        break;
    }
  };

  const saveBIP = () => {
    if (!selectedStudent) return;

    const bipData: BIPData = {
      id: selectedStudent.bipData?.id || crypto.randomUUID(),
      studentId: selectedStudentId,
      createdAt: selectedStudent.bipData?.createdAt || new Date(),
      updatedAt: new Date(),
      targetBehaviors,
      hypothesisStatements,
      primaryFunction,
      replacementBehaviors,
      preventativeStrategies,
      teachingStrategies,
      reinforcementStrategies,
      reactiveStrategies,
      crisisPlan,
      monitoringPlan,
      teamMembers,
      status: 'draft',
    };

    updateStudentProfile(selectedStudentId, { bipData });
    toast.success('BIP saved to student profile');
  };

  const generateWordDocument = async () => {
    if (!selectedStudent) return;

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: 'BEHAVIOR INTERVENTION PLAN',
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [new TextRun({ text: selectedStudent.name, bold: true, size: 28 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new Paragraph({ text: `Date: ${format(new Date(), 'MMMM dd, yyyy')}`, spacing: { after: 200 } }),
          
          // Student Background (from profile)
          ...(selectedStudent.backgroundInfo ? [
            new Paragraph({
              text: 'STUDENT BACKGROUND',
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 400, after: 200 },
            }),
            ...(selectedStudent.backgroundInfo.diagnoses ? [
              new Paragraph({ children: [new TextRun({ text: 'Diagnoses: ', bold: true }), new TextRun(selectedStudent.backgroundInfo.diagnoses)], spacing: { after: 100 } }),
            ] : []),
            ...(selectedStudent.backgroundInfo.medicalInfo ? [
              new Paragraph({ children: [new TextRun({ text: 'Medical Information: ', bold: true }), new TextRun(selectedStudent.backgroundInfo.medicalInfo)], spacing: { after: 100 } }),
            ] : []),
            ...(selectedStudent.backgroundInfo.previousBIPs ? [
              new Paragraph({ children: [new TextRun({ text: 'Previous BIPs: ', bold: true }), new TextRun(selectedStudent.backgroundInfo.previousBIPs)], spacing: { after: 100 } }),
            ] : []),
            ...(selectedStudent.backgroundInfo.whatWorked ? [
              new Paragraph({ children: [new TextRun({ text: 'Previous Strategies That Worked: ', bold: true }), new TextRun(selectedStudent.backgroundInfo.whatWorked)], spacing: { after: 100 } }),
            ] : []),
            ...(selectedStudent.backgroundInfo.whatDidntWork ? [
              new Paragraph({ children: [new TextRun({ text: 'Previous Strategies That Did Not Work: ', bold: true }), new TextRun(selectedStudent.backgroundInfo.whatDidntWork)], spacing: { after: 200 } }),
            ] : []),
          ] : []),
          
          // Target Behaviors
          new Paragraph({
            text: 'TARGET BEHAVIORS',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          ...targetBehaviors.flatMap(b => [
            new Paragraph({ children: [new TextRun({ text: b.name, bold: true })] }),
            new Paragraph({ text: b.definition, spacing: { after: 150 } }),
          ]),

          // Hypothesis
          new Paragraph({
            text: 'HYPOTHESIS STATEMENT',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          ...hypothesisStatements.map(h => new Paragraph({ text: h, spacing: { after: 150 } })),

          // Replacement Behaviors
          new Paragraph({
            text: 'REPLACEMENT BEHAVIORS',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          ...replacementBehaviors.flatMap(b => [
            new Paragraph({ children: [new TextRun({ text: b.name, bold: true })] }),
            new Paragraph({ text: b.definition, spacing: { after: 100 } }),
            b.teachingPlan && new Paragraph({ text: `Teaching Plan: ${b.teachingPlan}`, spacing: { after: 150 } }),
          ].filter(Boolean)),

          // Preventative Strategies
          new Paragraph({
            text: 'PREVENTATIVE STRATEGIES',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          ...preventativeStrategies.map(s => new Paragraph({ text: `• ${s}`, spacing: { after: 100 } })),

          // Teaching Strategies
          new Paragraph({
            text: 'TEACHING STRATEGIES',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          ...teachingStrategies.map(s => new Paragraph({ text: `• ${s}`, spacing: { after: 100 } })),

          // Reinforcement Strategies
          new Paragraph({
            text: 'REINFORCEMENT STRATEGIES',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          ...reinforcementStrategies.map(s => new Paragraph({ text: `• ${s}`, spacing: { after: 100 } })),

          // Reactive Strategies
          new Paragraph({
            text: 'REACTIVE STRATEGIES',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          ...reactiveStrategies.map(s => new Paragraph({ text: `• ${s}`, spacing: { after: 100 } })),

          // Crisis Plan
          crisisPlan && new Paragraph({
            text: 'CRISIS PLAN',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          crisisPlan && new Paragraph({ text: crisisPlan, spacing: { after: 200 } }),

          // Monitoring Plan
          monitoringPlan && new Paragraph({
            text: 'PROGRESS MONITORING',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          monitoringPlan && new Paragraph({ text: monitoringPlan, spacing: { after: 200 } }),

          // Team Members
          teamMembers.length > 0 && new Paragraph({
            text: 'BIP TEAM MEMBERS',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          ...teamMembers.map(m => new Paragraph({ text: `• ${m}`, spacing: { after: 100 } })),
        ].filter(Boolean) as Paragraph[],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `BIP_${selectedStudent.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.docx`);
    toast.success('BIP downloaded successfully');
  };

  const templates = INTERVENTION_TEMPLATES[primaryFunction] || INTERVENTION_TEMPLATES.unknown;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Shield className="w-4 h-4" />
          Generate BIP
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Behavior Intervention Plan Generator
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-4 mb-4">
          <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Select student..." />
            </SelectTrigger>
            <SelectContent>
              {activeStudents.map(s => (
                <SelectItem key={s.id} value={s.id}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedStudent && (
            <Badge variant="outline" className="gap-1">
              <Brain className="w-3 h-3" />
              {FUNCTION_OPTIONS.find(f => f.value === primaryFunction)?.label || 'Unknown Function'}
            </Badge>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="import" className="text-xs">Import FBA</TabsTrigger>
            <TabsTrigger value="behaviors" className="text-xs">Behaviors</TabsTrigger>
            <TabsTrigger value="strategies" className="text-xs">Strategies</TabsTrigger>
            <TabsTrigger value="plans" className="text-xs">Plans</TabsTrigger>
            <TabsTrigger value="export" className="text-xs">Export</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            {/* Import Tab */}
            <TabsContent value="import" className="space-y-4 p-4">
              {!selectedStudent ? (
                <Card className="py-12">
                  <CardContent className="text-center">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Select a student to generate BIP</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        Import from FBA
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Auto-populate BIP based on FBA findings and function
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {fbaAnalysis ? (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-muted rounded-lg">
                              <p className="text-xs text-muted-foreground">Primary Function</p>
                              <p className="font-medium">
                                {FUNCTION_OPTIONS.find(f => f.value === fbaAnalysis.primaryFunction)?.label}
                              </p>
                            </div>
                            <div className="p-3 bg-muted rounded-lg">
                              <p className="text-xs text-muted-foreground">Target Behaviors</p>
                              <p className="font-medium">{fbaAnalysis.behaviors.length}</p>
                            </div>
                          </div>

                          {fbaAnalysis.hypothesis && (
                            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                              <p className="text-xs text-muted-foreground mb-1">Hypothesis Statement</p>
                              <p className="text-sm italic">{fbaAnalysis.hypothesis}</p>
                            </div>
                          )}

                          {fbaAnalysis.indirectAssessments.length > 0 && (
                            <div className="p-3 bg-muted rounded-lg">
                              <p className="text-xs text-muted-foreground mb-2">Indirect Assessments</p>
                              <div className="flex gap-2 flex-wrap">
                                {fbaAnalysis.indirectAssessments.map(a => (
                                  <Badge key={a.id} variant="secondary">
                                    {a.type} - {FUNCTION_OPTIONS.find(f => f.value === a.primaryFunction)?.label}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          <Button onClick={importFromFBA} className="w-full">
                            <ArrowRight className="w-4 h-4 mr-2" />
                            Import FBA Data & Generate Template
                          </Button>
                        </>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <AlertTriangle className="w-10 h-10 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No FBA data available for this student</p>
                          <p className="text-xs">Collect ABC data first or manually enter BIP information</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Manual Entry</CardTitle>
                      <CardDescription className="text-xs">
                        Select primary function to get intervention templates
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Select value={primaryFunction} onValueChange={(v) => setPrimaryFunction(v as BehaviorFunction)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select function..." />
                        </SelectTrigger>
                        <SelectContent>
                          {FUNCTION_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            {/* Behaviors Tab */}
            <TabsContent value="behaviors" className="space-y-4 p-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Target Behaviors</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {targetBehaviors.map((b, i) => (
                    <div key={i} className="p-3 border rounded-lg space-y-2">
                      <div className="flex justify-between items-start">
                        <Input
                          value={b.name}
                          onChange={(e) => {
                            const updated = [...targetBehaviors];
                            updated[i].name = e.target.value;
                            setTargetBehaviors(updated);
                          }}
                          placeholder="Behavior name"
                          className="font-medium"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setTargetBehaviors(prev => prev.filter((_, idx) => idx !== i))}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <Textarea
                        value={b.definition}
                        onChange={(e) => {
                          const updated = [...targetBehaviors];
                          updated[i].definition = e.target.value;
                          setTargetBehaviors(updated);
                        }}
                        placeholder="Operational definition"
                        rows={2}
                      />
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    onClick={() => setTargetBehaviors([...targetBehaviors, { name: '', definition: '' }])}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Target Behavior
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Hypothesis Statements</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {hypothesisStatements.map((h, i) => (
                    <div key={i} className="flex gap-2">
                      <Textarea
                        value={h}
                        onChange={(e) => {
                          const updated = [...hypothesisStatements];
                          updated[i] = e.target.value;
                          setHypothesisStatements(updated);
                        }}
                        rows={2}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setHypothesisStatements(prev => prev.filter((_, idx) => idx !== i))}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    onClick={() => setHypothesisStatements([...hypothesisStatements, ''])}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Hypothesis
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Replacement Behaviors</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {replacementBehaviors.map((b, i) => (
                    <div key={i} className="p-3 border rounded-lg space-y-2">
                      <div className="flex justify-between items-start">
                        <Input
                          value={b.name}
                          onChange={(e) => {
                            const updated = [...replacementBehaviors];
                            updated[i].name = e.target.value;
                            setReplacementBehaviors(updated);
                          }}
                          placeholder="Replacement behavior name"
                          className="font-medium"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setReplacementBehaviors(prev => prev.filter((_, idx) => idx !== i))}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <Textarea
                        value={b.definition}
                        onChange={(e) => {
                          const updated = [...replacementBehaviors];
                          updated[i].definition = e.target.value;
                          setReplacementBehaviors(updated);
                        }}
                        placeholder="Definition"
                        rows={2}
                      />
                      <Textarea
                        value={b.teachingPlan || ''}
                        onChange={(e) => {
                          const updated = [...replacementBehaviors];
                          updated[i].teachingPlan = e.target.value;
                          setReplacementBehaviors(updated);
                        }}
                        placeholder="Teaching plan (optional)"
                        rows={2}
                      />
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    onClick={() => setReplacementBehaviors([...replacementBehaviors, { name: '', definition: '' }])}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Replacement Behavior
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Strategies Tab */}
            <TabsContent value="strategies" className="space-y-4 p-4">
              {(['preventative', 'teaching', 'reinforcement', 'reactive'] as const).map(type => (
                <Card key={type}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm capitalize flex items-center gap-2">
                      {type === 'preventative' && <Shield className="w-4 h-4" />}
                      {type === 'teaching' && <BookOpen className="w-4 h-4" />}
                      {type === 'reinforcement' && <Heart className="w-4 h-4" />}
                      {type === 'reactive' && <AlertTriangle className="w-4 h-4" />}
                      {type} Strategies
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Current strategies */}
                    <div className="space-y-2">
                      {(type === 'preventative' ? preventativeStrategies :
                        type === 'teaching' ? teachingStrategies :
                        type === 'reinforcement' ? reinforcementStrategies :
                        reactiveStrategies).map((s, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 bg-muted rounded">
                          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <span className="text-sm flex-1">{s}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => removeStrategy(type, i)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    {/* Suggestions based on function */}
                    <Collapsible>
                      <CollapsibleTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full gap-1">
                          <Lightbulb className="w-3 h-3" />
                          View Suggestions for {FUNCTION_OPTIONS.find(f => f.value === primaryFunction)?.label}
                          <ChevronDown className="w-3 h-3 ml-auto" />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2 space-y-1">
                        {templates[type].map((s, i) => (
                          <div 
                            key={i} 
                            className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-muted"
                            onClick={() => addStrategy(type, s)}
                          >
                            <Plus className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{s}</span>
                          </div>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Plans Tab */}
            <TabsContent value="plans" className="space-y-4 p-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Crisis Plan</CardTitle>
                  <CardDescription className="text-xs">
                    Steps to follow if behavior escalates to crisis level
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={crisisPlan}
                    onChange={(e) => setCrisisPlan(e.target.value)}
                    placeholder="Describe crisis procedures, emergency contacts, de-escalation steps..."
                    rows={4}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Progress Monitoring Plan</CardTitle>
                  <CardDescription className="text-xs">
                    How and when progress will be measured
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={monitoringPlan}
                    onChange={(e) => setMonitoringPlan(e.target.value)}
                    placeholder="Data collection methods, frequency, who is responsible, decision rules..."
                    rows={4}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">BIP Team Members</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {teamMembers.map((m, i) => (
                      <Badge key={i} variant="secondary" className="gap-1">
                        {m}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 ml-1"
                          onClick={() => setTeamMembers(prev => prev.filter((_, idx) => idx !== i))}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newTeamMember}
                      onChange={(e) => setNewTeamMember(e.target.value)}
                      placeholder="Add team member (name/role)"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newTeamMember.trim()) {
                          setTeamMembers([...teamMembers, newTeamMember.trim()]);
                          setNewTeamMember('');
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (newTeamMember.trim()) {
                          setTeamMembers([...teamMembers, newTeamMember.trim()]);
                          setNewTeamMember('');
                        }
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Export Tab */}
            <TabsContent value="export" className="space-y-4 p-4">
              <div className="grid md:grid-cols-2 gap-4">
                <Card className="cursor-pointer hover:border-primary/50" onClick={saveBIP}>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Save className="w-4 h-4" />
                      Save to Profile
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Save BIP to student's profile for future reference
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full" disabled={!selectedStudent}>
                      <Save className="w-4 h-4 mr-2" />
                      Save BIP
                    </Button>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:border-primary/50" onClick={generateWordDocument}>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      Download Document
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Export as editable Word document
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full" disabled={!selectedStudent}>
                      <Download className="w-4 h-4 mr-2" />
                      Download .docx
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Summary */}
              {selectedStudent && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">BIP Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xl font-bold">{targetBehaviors.length}</p>
                        <p className="text-xs text-muted-foreground">Target Behaviors</p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xl font-bold">{replacementBehaviors.length}</p>
                        <p className="text-xs text-muted-foreground">Replacements</p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xl font-bold">
                          {preventativeStrategies.length + teachingStrategies.length + 
                           reinforcementStrategies.length + reactiveStrategies.length}
                        </p>
                        <p className="text-xs text-muted-foreground">Strategies</p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xl font-bold">{teamMembers.length}</p>
                        <p className="text-xs text-muted-foreground">Team Members</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
