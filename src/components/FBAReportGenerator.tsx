import { useState, useMemo, useRef } from 'react';
import { format } from 'date-fns';
import { 
  FileText, Download, Printer, FileCheck, FileDown, 
  Brain, Target, AlertTriangle, CheckCircle2, Users,
  Calendar, Clock, ClipboardList, Lightbulb, BookOpen, 
  Shield, Sparkles, ChevronDown, ChevronUp, Eye
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
import { Progress } from '@/components/ui/progress';
import { useDataStore } from '@/store/dataStore';
import { 
  Student, 
  ABCEntry, 
  BehaviorFunction, 
  FUNCTION_OPTIONS,
} from '@/types/behavior';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';

interface FBAReportGeneratorProps {
  student?: Student;
  onClose?: () => void;
}

interface FunctionAnalysis {
  function: BehaviorFunction;
  label: string;
  count: number;
  percentage: number;
  antecedents: { value: string; count: number }[];
  consequences: { value: string; count: number }[];
}

// Age-appropriate recommendations by function and age range
const RECOMMENDATIONS_DATABASE: Record<string, Record<string, string[]>> = {
  attention: {
    'early-childhood': [
      'Provide frequent positive attention for appropriate behaviors (every 2-3 minutes initially)',
      'Use visual schedules with attention-based rewards',
      'Teach simple attention-seeking phrases ("Look at me!", "Watch this!")',
      'Implement brief attention-based reinforcement (high-fives, verbal praise)',
      'Use social stories about appropriate ways to get attention',
    ],
    'elementary': [
      'Provide scheduled positive attention breaks (every 5-10 minutes)',
      'Teach appropriate attention-seeking skills (raising hand, using name)',
      'Use peer buddy systems for positive social attention',
      'Implement token systems with attention-based rewards',
      'Create classroom jobs that provide appropriate attention opportunities',
    ],
    'middle-school': [
      'Schedule regular check-ins with preferred adults',
      'Teach self-advocacy skills for appropriate attention',
      'Use peer mentoring programs',
      'Provide leadership opportunities in structured settings',
      'Implement self-monitoring with periodic teacher feedback',
    ],
    'high-school': [
      'Develop peer support networks',
      'Teach appropriate professional communication skills',
      'Create mentorship opportunities',
      'Use self-monitoring and self-reinforcement strategies',
      'Provide opportunities for positive recognition in preferred areas',
    ],
  },
  escape: {
    'early-childhood': [
      'Break tasks into smaller, manageable steps',
      'Use visual timers to show when breaks will occur',
      'Provide frequent breaks with brief work intervals (2-3 minutes)',
      'Use first-then boards (first work, then preferred activity)',
      'Teach simple request for break ("break please")',
    ],
    'elementary': [
      'Teach appropriate help-seeking behaviors',
      'Use task cards to show step completion',
      'Implement choice boards for task order',
      'Provide scheduled breaks before frustration',
      'Use errorless learning techniques for challenging tasks',
    ],
    'middle-school': [
      'Teach self-advocacy for academic support',
      'Implement break cards for self-regulation',
      'Provide organizational tools and study skills instruction',
      'Use assignment chunking with clear checkpoints',
      'Develop coping strategies for academic frustration',
    ],
    'high-school': [
      'Teach self-accommodation strategies',
      'Develop study and organization systems',
      'Implement self-monitoring for task persistence',
      'Provide flexible assignment options when appropriate',
      'Create study groups or peer tutoring opportunities',
    ],
  },
  tangible: {
    'early-childhood': [
      'Use visual waiting cards with timers',
      'Teach simple requesting skills ("I want ___")',
      'Implement first-then schedules for preferred items',
      'Use choice boards between available options',
      'Provide frequent access to preferred items contingent on appropriate behavior',
    ],
    'elementary': [
      'Teach patience and waiting skills with visual supports',
      'Implement token economies for earning preferred items/activities',
      'Use choice-making instruction',
      'Teach negotiation and trading skills',
      'Create schedules showing when preferred items are available',
    ],
    'middle-school': [
      'Teach delayed gratification strategies',
      'Implement goal-setting for earning privileges',
      'Use behavior contracts with tangible rewards',
      'Teach appropriate requesting and negotiation',
      'Develop budgeting and planning skills for preferred items',
    ],
    'high-school': [
      'Teach financial planning for desired items',
      'Implement self-management goal systems',
      'Use behavior contracts with privilege-based reinforcement',
      'Teach workplace-appropriate requesting',
      'Develop long-term goal planning skills',
    ],
  },
  sensory: {
    'early-childhood': [
      'Provide sensory breaks throughout the day',
      'Create a calm-down corner with sensory tools',
      'Use sensory diet recommendations from OT',
      'Teach replacement behaviors that meet sensory needs',
      'Implement heavy work activities before challenging times',
    ],
    'elementary': [
      'Develop a sensory toolkit for the classroom',
      'Teach self-identification of sensory needs',
      'Implement movement breaks into daily schedule',
      'Use fidget tools appropriately during instruction',
      'Create sensory regulation plans with student input',
    ],
    'middle-school': [
      'Teach self-advocacy for sensory needs',
      'Develop portable sensory strategies',
      'Create class-appropriate sensory accommodations',
      'Implement self-monitoring for sensory regulation',
      'Use technology-based sensory supports when appropriate',
    ],
    'high-school': [
      'Develop workplace-appropriate sensory strategies',
      'Teach self-accommodation planning',
      'Create discreet sensory tools',
      'Implement self-regulation apps and technology',
      'Develop transition plans that include sensory needs',
    ],
  },
  automatic: {
    'early-childhood': [
      'Provide alternative stimulation that meets the same need',
      'Interrupt and redirect to appropriate activities',
      'Enrich environment with engaging materials',
      'Consult with OT for sensory-based interventions',
      'Use response blocking with redirection when safe',
    ],
    'elementary': [
      'Teach replacement behaviors that provide similar stimulation',
      'Use habit reversal training techniques',
      'Implement competing response training',
      'Provide scheduled access to replacement activities',
      'Consult with specialists for function-based interventions',
    ],
    'middle-school': [
      'Implement self-monitoring for automatic behaviors',
      'Teach competing response strategies',
      'Use habit reversal with self-management',
      'Develop awareness training techniques',
      'Create self-regulation plans',
    ],
    'high-school': [
      'Develop self-management programs',
      'Teach cognitive-behavioral strategies',
      'Implement habit reversal independently',
      'Create self-monitoring systems',
      'Develop coping and alternative response plans',
    ],
  },
  unknown: {
    'early-childhood': [
      'Continue data collection to identify function',
      'Conduct additional observations across settings',
      'Complete indirect assessments with caregivers',
      'Consider functional analysis if safe and appropriate',
      'Implement general positive behavior supports while assessing',
    ],
    'elementary': [
      'Extend data collection period',
      'Conduct structured observations',
      'Complete multiple indirect assessments',
      'Interview teachers and parents across settings',
      'Implement universal supports while determining function',
    ],
    'middle-school': [
      'Use student interview and self-report measures',
      'Conduct observations across multiple settings',
      'Complete functional analysis if appropriate',
      'Gather data from multiple informants',
      'Implement Tier 2 supports while assessing',
    ],
    'high-school': [
      'Include student in hypothesis development',
      'Gather comprehensive observational data',
      'Use self-report assessments',
      'Consider multiple maintaining variables',
      'Implement self-monitoring during assessment',
    ],
  },
};

const AGE_RANGE_OPTIONS = [
  { value: 'early-childhood', label: 'Early Childhood (3-5)', grades: ['Pre-K', 'K'] },
  { value: 'elementary', label: 'Elementary (6-10)', grades: ['1', '2', '3', '4', '5'] },
  { value: 'middle-school', label: 'Middle School (11-13)', grades: ['6', '7', '8'] },
  { value: 'high-school', label: 'High School (14-18+)', grades: ['9', '10', '11', '12'] },
];

export function FBAReportGenerator({ student: propStudent, onClose }: FBAReportGeneratorProps) {
  const { students, abcEntries, frequencyEntries, sessions, behaviorGoals } = useDataStore();
  const [selectedStudentId, setSelectedStudentId] = useState<string>(propStudent?.id || '');
  const [reportType, setReportType] = useState<'comprehensive' | 'simplified'>('comprehensive');
  const [ageRange, setAgeRange] = useState<string>('elementary');
  const [assessorName, setAssessorName] = useState('');
  const [assessorTitle, setAssessorTitle] = useState('');
  const [assessmentDates, setAssessmentDates] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [includeSections, setIncludeSections] = useState({
    background: true,
    procedures: true,
    targetBehaviors: true,
    indirectResults: true,
    directResults: true,
    patterns: true,
    hypothesis: true,
    recommendations: true,
    summary: true,
  });
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['preview']));
  const reportRef = useRef<HTMLDivElement>(null);

  const activeStudents = useMemo(() => 
    students.filter(s => !s.isArchived), 
    [students]
  );

  const selectedStudent = useMemo(() => 
    students.find(s => s.id === selectedStudentId),
    [students, selectedStudentId]
  );

  // Analyze ABC data
  const analysisData = useMemo(() => {
    if (!selectedStudent) return null;

    const studentABC = abcEntries.filter(e => e.studentId === selectedStudentId);
    const studentFrequency = frequencyEntries.filter(e => e.studentId === selectedStudentId);
    const studentSessions = sessions.filter(s => s.studentIds?.includes(selectedStudentId));

    if (studentABC.length === 0) {
      return {
        abcCount: 0,
        sessionCount: studentSessions.length,
        frequencyTotal: studentFrequency.reduce((sum, e) => sum + e.count, 0),
        topAntecedents: [],
        topConsequences: [],
        functionStrengths: [],
        primaryFunction: null,
        hypothesisStatement: null,
      };
    }

    // Count antecedents
    const antecedentCounts = new Map<string, number>();
    studentABC.forEach(entry => {
      const antecedents = entry.antecedents || [entry.antecedent];
      antecedents.forEach(a => {
        antecedentCounts.set(a, (antecedentCounts.get(a) || 0) + 1);
      });
    });

    // Count consequences
    const consequenceCounts = new Map<string, number>();
    studentABC.forEach(entry => {
      const consequences = entry.consequences || [entry.consequence];
      consequences.forEach(c => {
        consequenceCounts.set(c, (consequenceCounts.get(c) || 0) + 1);
      });
    });

    // Count functions
    const functionData = new Map<BehaviorFunction, {
      count: number;
      antecedents: Map<string, number>;
      consequences: Map<string, number>;
    }>();

    studentABC.forEach(entry => {
      const functions = entry.functions || ['unknown' as BehaviorFunction];
      const antecedents = entry.antecedents || [entry.antecedent];
      const consequences = entry.consequences || [entry.consequence];

      functions.forEach(fn => {
        const current = functionData.get(fn) || {
          count: 0,
          antecedents: new Map<string, number>(),
          consequences: new Map<string, number>(),
        };
        current.count++;
        antecedents.forEach(a => {
          current.antecedents.set(a, (current.antecedents.get(a) || 0) + 1);
        });
        consequences.forEach(c => {
          current.consequences.set(c, (current.consequences.get(c) || 0) + 1);
        });
        functionData.set(fn, current);
      });
    });

    const totalFunctionCount = Array.from(functionData.values()).reduce((sum, d) => sum + d.count, 0);

    const functionStrengths: FunctionAnalysis[] = FUNCTION_OPTIONS
      .map(fo => {
        const data = functionData.get(fo.value);
        if (!data) return null;
        
        return {
          function: fo.value,
          label: fo.label,
          count: data.count,
          percentage: Math.round((data.count / totalFunctionCount) * 100),
          antecedents: Array.from(data.antecedents.entries())
            .map(([value, count]) => ({ value, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 3),
          consequences: Array.from(data.consequences.entries())
            .map(([value, count]) => ({ value, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 3),
        };
      })
      .filter((fs): fs is FunctionAnalysis => fs !== null && fs.count > 0)
      .sort((a, b) => b.count - a.count);

    const primaryFunction = functionStrengths.length > 0 ? functionStrengths[0] : null;

    const topAntecedents = Array.from(antecedentCounts.entries())
      .map(([value, count]) => ({
        value,
        count,
        percentage: Math.round((count / studentABC.length) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const topConsequences = Array.from(consequenceCounts.entries())
      .map(([value, count]) => ({
        value,
        count,
        percentage: Math.round((count / studentABC.length) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Generate hypothesis statement
    const behaviorNames = selectedStudent.behaviors.map(b => b.name).join(', ');
    const topAntecedent = topAntecedents[0]?.value || 'unidentified antecedent';
    const topConsequence = topConsequences[0]?.value || 'unidentified consequence';
    const functionLabel = primaryFunction?.label || 'unknown';

    const hypothesisStatement = primaryFunction
      ? `When ${topAntecedent.toLowerCase()}, ${selectedStudent.name} engages in ${behaviorNames || 'the target behavior(s)'} in order to obtain ${functionLabel.toLowerCase()}. The behavior is maintained by ${topConsequence.toLowerCase()}.`
      : null;

    return {
      abcCount: studentABC.length,
      sessionCount: studentSessions.length,
      frequencyTotal: studentFrequency.reduce((sum, e) => sum + e.count, 0),
      topAntecedents,
      topConsequences,
      functionStrengths,
      primaryFunction,
      hypothesisStatement,
    };
  }, [selectedStudent, selectedStudentId, abcEntries, frequencyEntries, sessions]);

  // Get recommendations based on function and age
  const recommendations = useMemo(() => {
    if (!analysisData?.primaryFunction) return [];
    const fnKey = analysisData.primaryFunction.function;
    return RECOMMENDATIONS_DATABASE[fnKey]?.[ageRange] || RECOMMENDATIONS_DATABASE.unknown[ageRange];
  }, [analysisData, ageRange]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const getFunctionColor = (fn: BehaviorFunction) => {
    const colors: Record<BehaviorFunction, string> = {
      attention: 'bg-blue-500',
      escape: 'bg-orange-500',
      tangible: 'bg-green-500',
      sensory: 'bg-purple-500',
      automatic: 'bg-pink-500',
      unknown: 'bg-muted',
    };
    return colors[fn] || 'bg-muted';
  };

  const handlePrint = () => {
    const printContent = reportRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>FBA Report - ${selectedStudent?.name || 'Report'}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          .report-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .report-header h1 { margin: 0 0 10px 0; font-size: 24px; }
          .report-header .subtitle { color: #666; }
          .section { margin-bottom: 25px; page-break-inside: avoid; }
          .section-title { font-size: 16px; font-weight: bold; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid #ddd; }
          .subsection { margin-left: 15px; margin-bottom: 15px; }
          .data-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          .data-table th, .data-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          .data-table th { background: #f5f5f5; }
          .hypothesis-box { background: #f0f9ff; border-left: 4px solid #0284c7; padding: 15px; margin: 15px 0; }
          .recommendation-list { list-style-type: none; padding: 0; }
          .recommendation-list li { padding: 8px 0 8px 24px; position: relative; }
          .recommendation-list li:before { content: "✓"; position: absolute; left: 0; color: #22c55e; font-weight: bold; }
          .function-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 500; }
          .function-attention { background: #dbeafe; color: #1d4ed8; }
          .function-escape { background: #ffedd5; color: #c2410c; }
          .function-tangible { background: #dcfce7; color: #15803d; }
          .function-sensory { background: #f3e8ff; color: #7c3aed; }
          .pattern-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          .pattern-item { background: #f8fafc; padding: 10px; border-radius: 5px; }
          .progress-bar { height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; }
          .progress-fill { height: 100%; background: #3b82f6; }
          .meta-info { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px; }
          .meta-item { font-size: 13px; }
          .meta-label { color: #666; }
          .signature-line { border-top: 1px solid #333; width: 250px; margin-top: 40px; padding-top: 5px; }
          @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const generateWordDocument = async () => {
    if (!selectedStudent || !analysisData) return;

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Title
          new Paragraph({
            text: reportType === 'comprehensive' 
              ? 'FUNCTIONAL BEHAVIOR ASSESSMENT REPORT' 
              : 'FBA SUMMARY REPORT',
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: selectedStudent.name, bold: true, size: 28 }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          // Meta info
          new Paragraph({
            text: `Date: ${format(new Date(), 'MMMM dd, yyyy')}`,
            spacing: { after: 100 },
          }),
          assessorName && new Paragraph({
            text: `Assessor: ${assessorName}${assessorTitle ? `, ${assessorTitle}` : ''}`,
            spacing: { after: 100 },
          }),
          assessmentDates && new Paragraph({
            text: `Assessment Dates: ${assessmentDates}`,
            spacing: { after: 200 },
          }),
          // Target Behaviors
          includeSections.targetBehaviors && new Paragraph({
            text: 'TARGET BEHAVIORS',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          includeSections.targetBehaviors && new Paragraph({
            text: selectedStudent.behaviors.map(b => 
              `• ${b.name}${b.operationalDefinition ? `: ${b.operationalDefinition}` : ''}`
            ).join('\n'),
            spacing: { after: 300 },
          }),
          // Data Summary
          includeSections.directResults && new Paragraph({
            text: 'DIRECT OBSERVATION DATA',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          includeSections.directResults && new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Metric')], shading: { fill: 'f5f5f5' } }),
                  new TableCell({ children: [new Paragraph('Value')], shading: { fill: 'f5f5f5' } }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Total ABC Entries')] }),
                  new TableCell({ children: [new Paragraph(String(analysisData.abcCount))] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Observation Sessions')] }),
                  new TableCell({ children: [new Paragraph(String(analysisData.sessionCount))] }),
                ],
              }),
            ],
          }),
          // Patterns
          includeSections.patterns && new Paragraph({
            text: 'PATTERN ANALYSIS',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          includeSections.patterns && new Paragraph({
            children: [new TextRun({ text: 'Most Common Antecedents:', bold: true })],
            spacing: { after: 100 },
          }),
          includeSections.patterns && new Paragraph({
            text: analysisData.topAntecedents.map(a => `• ${a.value} (${a.percentage}%)`).join('\n'),
            spacing: { after: 200 },
          }),
          includeSections.patterns && new Paragraph({
            children: [new TextRun({ text: 'Most Common Consequences:', bold: true })],
            spacing: { after: 100 },
          }),
          includeSections.patterns && new Paragraph({
            text: analysisData.topConsequences.map(c => `• ${c.value} (${c.percentage}%)`).join('\n'),
            spacing: { after: 300 },
          }),
          // Function Analysis
          includeSections.hypothesis && new Paragraph({
            text: 'FUNCTION ANALYSIS',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          includeSections.hypothesis && new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Function')], shading: { fill: 'f5f5f5' } }),
                  new TableCell({ children: [new Paragraph('Strength')], shading: { fill: 'f5f5f5' } }),
                ],
              }),
              ...analysisData.functionStrengths.map(fs => 
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph(fs.label)] }),
                    new TableCell({ children: [new Paragraph(`${fs.percentage}%`)] }),
                  ],
                })
              ),
            ],
          }),
          // Hypothesis
          includeSections.hypothesis && analysisData.hypothesisStatement && new Paragraph({
            text: 'HYPOTHESIS STATEMENT',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          includeSections.hypothesis && analysisData.hypothesisStatement && new Paragraph({
            text: analysisData.hypothesisStatement,
            spacing: { after: 300 },
            border: {
              left: { style: BorderStyle.SINGLE, size: 24, color: '0284c7' },
            },
            indent: { left: 200 },
          }),
          // Recommendations
          includeSections.recommendations && new Paragraph({
            text: 'RECOMMENDATIONS',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          includeSections.recommendations && new Paragraph({
            text: recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n'),
            spacing: { after: 300 },
          }),
          // Notes
          additionalNotes && new Paragraph({
            text: 'ADDITIONAL NOTES',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          additionalNotes && new Paragraph({
            text: additionalNotes,
            spacing: { after: 300 },
          }),
          // Signature
          new Paragraph({
            text: '',
            spacing: { before: 600 },
          }),
          new Paragraph({
            text: '________________________________',
            spacing: { after: 50 },
          }),
          new Paragraph({
            text: `${assessorName || 'Assessor Name'}${assessorTitle ? `, ${assessorTitle}` : ''}`,
          }),
          new Paragraph({
            text: format(new Date(), 'MMMM dd, yyyy'),
          }),
        ].filter(Boolean) as Paragraph[],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `FBA_Report_${selectedStudent.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.docx`);
    toast.success('Report downloaded successfully');
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <FileText className="w-4 h-4" />
          Generate FBA Report
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-primary" />
            FBA Report Generator
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="settings" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="settings" className="gap-1 text-xs">
              <ClipboardList className="w-3 h-3" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-1 text-xs">
              <Eye className="w-3 h-3" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="export" className="gap-1 text-xs">
              <Download className="w-3 h-3" />
              Export
            </TabsTrigger>
          </TabsList>

          {/* Settings Tab */}
          <TabsContent value="settings" className="flex-1 overflow-auto space-y-4 py-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Student Selection */}
              <div className="space-y-2">
                <Label>Student</Label>
                <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                  <SelectTrigger>
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
              </div>

              {/* Report Type */}
              <div className="space-y-2">
                <Label>Report Type</Label>
                <Select value={reportType} onValueChange={(v) => setReportType(v as 'comprehensive' | 'simplified')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="comprehensive">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Comprehensive FBA Report
                      </div>
                    </SelectItem>
                    <SelectItem value="simplified">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        Simplified Summary Template
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Age Range */}
              <div className="space-y-2">
                <Label>Age Range (for recommendations)</Label>
                <Select value={ageRange} onValueChange={setAgeRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AGE_RANGE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Assessor Name */}
              <div className="space-y-2">
                <Label>Assessor Name</Label>
                <Input 
                  placeholder="Enter name..." 
                  value={assessorName}
                  onChange={(e) => setAssessorName(e.target.value)}
                />
              </div>

              {/* Assessor Title */}
              <div className="space-y-2">
                <Label>Title/Credentials</Label>
                <Input 
                  placeholder="BCBA, School Psychologist, etc." 
                  value={assessorTitle}
                  onChange={(e) => setAssessorTitle(e.target.value)}
                />
              </div>

              {/* Assessment Dates */}
              <div className="space-y-2">
                <Label>Assessment Dates</Label>
                <Input 
                  placeholder="e.g., January 15-30, 2025" 
                  value={assessmentDates}
                  onChange={(e) => setAssessmentDates(e.target.value)}
                />
              </div>
            </div>

            {/* Sections to Include */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Sections to Include</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(includeSections).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <Checkbox
                        id={`section-${key}`}
                        checked={value}
                        onCheckedChange={(checked) => 
                          setIncludeSections(prev => ({ ...prev, [key]: !!checked }))
                        }
                      />
                      <Label htmlFor={`section-${key}`} className="text-sm capitalize cursor-pointer">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Additional Notes */}
            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <Textarea
                placeholder="Add any additional notes, observations, or context..."
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                rows={4}
              />
            </div>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="flex-1 overflow-hidden">
            <ScrollArea className="h-[60vh]">
              <div ref={reportRef} className="p-6 bg-white text-black">
                {!selectedStudent ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Select a student to preview the report</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Report Header */}
                    <div className="report-header text-center border-b-2 border-gray-800 pb-4">
                      <h1 className="text-2xl font-bold mb-1">
                        {reportType === 'comprehensive' 
                          ? 'FUNCTIONAL BEHAVIOR ASSESSMENT REPORT' 
                          : 'FBA SUMMARY REPORT'}
                      </h1>
                      <p className="text-lg font-semibold">{selectedStudent.name}</p>
                      <p className="text-sm text-gray-600 subtitle">
                        Generated: {format(new Date(), 'MMMM dd, yyyy')}
                      </p>
                    </div>

                    {/* Meta Info */}
                    <div className="meta-info grid grid-cols-2 gap-4 text-sm">
                      {assessorName && (
                        <div className="meta-item">
                          <span className="meta-label text-gray-600">Assessor:</span>{' '}
                          {assessorName}{assessorTitle && `, ${assessorTitle}`}
                        </div>
                      )}
                      {assessmentDates && (
                        <div className="meta-item">
                          <span className="meta-label text-gray-600">Assessment Period:</span>{' '}
                          {assessmentDates}
                        </div>
                      )}
                      <div className="meta-item">
                        <span className="meta-label text-gray-600">Age Range:</span>{' '}
                        {AGE_RANGE_OPTIONS.find(o => o.value === ageRange)?.label}
                      </div>
                      {selectedStudent.grade && (
                        <div className="meta-item">
                          <span className="meta-label text-gray-600">Grade:</span>{' '}
                          {selectedStudent.grade}
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Target Behaviors */}
                    {includeSections.targetBehaviors && (
                      <div className="section">
                        <h2 className="section-title text-lg font-bold border-b pb-2 mb-3">
                          TARGET BEHAVIORS
                        </h2>
                        <div className="space-y-3">
                          {selectedStudent.behaviors.map(b => (
                            <div key={b.id} className="subsection ml-4">
                              <p className="font-medium">{b.name}</p>
                              {b.operationalDefinition && (
                                <p className="text-sm text-gray-700">
                                  <strong>Definition:</strong> {b.operationalDefinition}
                                </p>
                              )}
                            </div>
                          ))}
                          {selectedStudent.behaviors.length === 0 && (
                            <p className="text-gray-500 italic">No behaviors defined</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Direct Observation Data */}
                    {includeSections.directResults && analysisData && (
                      <div className="section">
                        <h2 className="section-title text-lg font-bold border-b pb-2 mb-3">
                          DIRECT OBSERVATION DATA
                        </h2>
                        <table className="data-table w-full border-collapse">
                          <thead>
                            <tr>
                              <th className="border p-2 bg-gray-100">Metric</th>
                              <th className="border p-2 bg-gray-100">Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="border p-2">Total ABC Entries</td>
                              <td className="border p-2">{analysisData.abcCount}</td>
                            </tr>
                            <tr>
                              <td className="border p-2">Observation Sessions</td>
                              <td className="border p-2">{analysisData.sessionCount}</td>
                            </tr>
                            <tr>
                              <td className="border p-2">Total Frequency Count</td>
                              <td className="border p-2">{analysisData.frequencyTotal}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Pattern Analysis */}
                    {includeSections.patterns && analysisData && (
                      <div className="section">
                        <h2 className="section-title text-lg font-bold border-b pb-2 mb-3">
                          PATTERN ANALYSIS
                        </h2>
                        <div className="pattern-grid grid md:grid-cols-2 gap-6">
                          <div className="pattern-item bg-gray-50 p-4 rounded">
                            <h3 className="font-medium mb-2">Most Common Antecedents</h3>
                            {analysisData.topAntecedents.length > 0 ? (
                              <div className="space-y-2">
                                {analysisData.topAntecedents.map(a => (
                                  <div key={a.value}>
                                    <div className="flex justify-between text-sm mb-1">
                                      <span>{a.value}</span>
                                      <span>{a.percentage}%</span>
                                    </div>
                                    <div className="progress-bar h-2 bg-gray-200 rounded">
                                      <div 
                                        className="progress-fill h-full bg-blue-500 rounded" 
                                        style={{ width: `${a.percentage}%` }}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-500 text-sm italic">No data available</p>
                            )}
                          </div>
                          <div className="pattern-item bg-gray-50 p-4 rounded">
                            <h3 className="font-medium mb-2">Most Common Consequences</h3>
                            {analysisData.topConsequences.length > 0 ? (
                              <div className="space-y-2">
                                {analysisData.topConsequences.map(c => (
                                  <div key={c.value}>
                                    <div className="flex justify-between text-sm mb-1">
                                      <span>{c.value}</span>
                                      <span>{c.percentage}%</span>
                                    </div>
                                    <div className="progress-bar h-2 bg-gray-200 rounded">
                                      <div 
                                        className="progress-fill h-full bg-green-500 rounded" 
                                        style={{ width: `${c.percentage}%` }}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-500 text-sm italic">No data available</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Function Analysis */}
                    {includeSections.hypothesis && analysisData && (
                      <div className="section">
                        <h2 className="section-title text-lg font-bold border-b pb-2 mb-3">
                          FUNCTION ANALYSIS
                        </h2>
                        {analysisData.functionStrengths.length > 0 ? (
                          <>
                            <table className="data-table w-full border-collapse mb-4">
                              <thead>
                                <tr>
                                  <th className="border p-2 bg-gray-100">Function</th>
                                  <th className="border p-2 bg-gray-100">Strength</th>
                                  <th className="border p-2 bg-gray-100">Count</th>
                                </tr>
                              </thead>
                              <tbody>
                                {analysisData.functionStrengths.map(fs => (
                                  <tr key={fs.function}>
                                    <td className="border p-2">
                                      <span className={`function-badge function-${fs.function}`}>
                                        {fs.label}
                                      </span>
                                    </td>
                                    <td className="border p-2">{fs.percentage}%</td>
                                    <td className="border p-2">{fs.count} occurrences</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>

                            {analysisData.primaryFunction && (
                              <div className="p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
                                <p className="text-sm">
                                  <strong>Primary Function:</strong> {analysisData.primaryFunction.label} ({analysisData.primaryFunction.percentage}%)
                                </p>
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="text-gray-500 italic">Insufficient data for function analysis</p>
                        )}
                      </div>
                    )}

                    {/* Hypothesis Statement */}
                    {includeSections.hypothesis && analysisData?.hypothesisStatement && (
                      <div className="section">
                        <h2 className="section-title text-lg font-bold border-b pb-2 mb-3">
                          HYPOTHESIS STATEMENT
                        </h2>
                        <div className="hypothesis-box bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                          <p className="italic">{analysisData.hypothesisStatement}</p>
                        </div>
                      </div>
                    )}

                    {/* Recommendations */}
                    {includeSections.recommendations && recommendations.length > 0 && (
                      <div className="section">
                        <h2 className="section-title text-lg font-bold border-b pb-2 mb-3">
                          RECOMMENDATIONS
                        </h2>
                        <p className="text-sm text-gray-600 mb-3">
                          Based on {analysisData?.primaryFunction?.label || 'the identified'} function 
                          and {AGE_RANGE_OPTIONS.find(o => o.value === ageRange)?.label} age range:
                        </p>
                        <ul className="recommendation-list space-y-2">
                          {recommendations.map((rec, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Additional Notes */}
                    {additionalNotes && (
                      <div className="section">
                        <h2 className="section-title text-lg font-bold border-b pb-2 mb-3">
                          ADDITIONAL NOTES
                        </h2>
                        <p className="whitespace-pre-wrap">{additionalNotes}</p>
                      </div>
                    )}

                    {/* Signature */}
                    <div className="signature-line border-t border-gray-800 pt-2 mt-10">
                      <p className="font-medium">
                        {assessorName || '________________________________'}
                        {assessorTitle && `, ${assessorTitle}`}
                      </p>
                      <p className="text-sm text-gray-600">{format(new Date(), 'MMMM dd, yyyy')}</p>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Export Tab */}
          <TabsContent value="export" className="flex-1 overflow-auto py-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={handlePrint}>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Printer className="w-4 h-4" />
                    Print / PDF
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Print directly or save as PDF using print dialog
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full" disabled={!selectedStudent}>
                    <Printer className="w-4 h-4 mr-2" />
                    Print Report
                  </Button>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={generateWordDocument}>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileDown className="w-4 h-4" />
                    Word Document
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Download as editable .docx file
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full" disabled={!selectedStudent || !analysisData}>
                    <Download className="w-4 h-4 mr-2" />
                    Download .docx
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Data Summary */}
            {selectedStudent && analysisData && (
              <Card className="mt-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Report Data Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-2xl font-bold">{analysisData.abcCount}</p>
                      <p className="text-xs text-muted-foreground">ABC Entries</p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-2xl font-bold">{analysisData.sessionCount}</p>
                      <p className="text-xs text-muted-foreground">Sessions</p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-2xl font-bold">{analysisData.functionStrengths.length}</p>
                      <p className="text-xs text-muted-foreground">Functions Identified</p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-2xl font-bold">{recommendations.length}</p>
                      <p className="text-xs text-muted-foreground">Recommendations</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
