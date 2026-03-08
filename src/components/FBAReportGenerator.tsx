import { useState, useMemo, useRef, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import { 
  FileText, Download, Printer, FileCheck, FileDown, 
  Brain, Target, AlertTriangle, CheckCircle2, Users,
  Calendar, Clock, ClipboardList, Lightbulb, BookOpen, 
  Shield, Sparkles, ChevronDown, ChevronUp, Eye, Save, Plus, Trash2,
  Building2, School, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
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
import { Switch } from '@/components/ui/switch';
import { useDataStore } from '@/store/dataStore';
import { 
  Student, 
  ABCEntry, 
  BehaviorFunction, 
  FUNCTION_OPTIONS,
  BxSkillProgram,
} from '@/types/behavior';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { SuggestedStrategiesPanel } from '@/components/behavior-strategies/SuggestedStrategiesPanel';
import { StrategyNarrativeBuilder } from '@/components/behavior-strategies/StrategyNarrativeBuilder';
import { MappedNarrativeSections, type SectionTarget } from '@/components/behavior-strategies/MappedNarrativeSections';
import { StrategyContentPreview, type StrategyExportPayload } from '@/components/behavior-strategies/StrategyContentPreview';
import { buildStrategyExportParagraphs } from '@/lib/strategyExportSections';
import { generateInsuranceReport } from '@/lib/insuranceReportExport';
import { generateSchoolFBAReport, type SchoolFBAData } from '@/lib/schoolFBAExport';
import { renderFunctionBarChart, renderFrequencyBarChart, renderIndirectAssessmentChart } from '@/lib/fbaChartRenderer';
import type { PayerReportTemplate, TemplateSection } from '@/types/reportTemplates';

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
  const { students, abcEntries, frequencyEntries, sessions, behaviorGoals, updateStudentProfile } = useDataStore();
  const [selectedStudentId, setSelectedStudentId] = useState<string>(propStudent?.id || '');
  const [reportType, setReportType] = useState<'comprehensive' | 'simplified'>('comprehensive');
  const [reportFormat, setReportFormat] = useState<'school' | 'insurance' | null>(null);
  const [ageRange, setAgeRange] = useState<string>('elementary');
  const [assessorName, setAssessorName] = useState('');
  const [assessorTitle, setAssessorTitle] = useState('');
  const [assessmentDates, setAssessmentDates] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [allowPartialExport, setAllowPartialExport] = useState(true);
  const [showDraftIndicators, setShowDraftIndicators] = useState(true);

  // School FBA editable fields
  const [schoolFields, setSchoolFields] = useState({
    reasonForReferral: '',
    sourcesOfInformation: '',
    dataCollectionTools: '',
    indirectAssessment: '',
    directObservationNarrative: '',
    attentionNarrative: '',
    escapeNarrative: '',
    tangibleNarrative: '',
    automaticNarrative: '',
    recommendedStrategies: '',
    recommendationsText: '',
    school: '',
    teacher: '',
    caseManager: '',
    ssid: '',
    fbaCompletedBy: '',
    backgroundInfo: '',
    studentInterview: '',
    teacherInterview: '',
    parentInterview: '',
    summaryOfFindings: '',
    hypothesisNarrative: '',
    observationPeopleInvolved: '',
    observationTimeOfDay: '',
    sourcesChecklist: {
      parentInterview: false,
      teacherInterview: true,
      studentInterview: false,
      medicalRecords: false,
      schoolRecords: false,
      psychologicalEvaluation: false,
      slpOtAssessment: false,
      educationalTesting: false,
      iepIfsp: false,
      incidentReports: false,
      directObservation: true,
      anecdotalReports: false,
      otherSource: false,
      otherSourceText: '',
    },
    dataToolsChecklist: {
      abcRecording: true,
      intervalData: false,
      structuredInterviews: false,
      scatterplot: false,
      recordReview: false,
      otherTool: false,
      otherToolText: '',
    },
    observationSetting: {
      home: false,
      school: true,
      community: false,
      noObservation: false,
      other: false,
      otherText: '',
    },
    hypothesizedFunctions: {
      attention: false,
      escape: false,
      tangible: false,
      automatic: false,
    },
    recommendationChecklist: {
      noIntervention: false,
      environmentalMods: false,
      bipNecessary: false,
      insufficientData: false,
    },
    observationDetails: [] as Array<{ date: string; activitiesObserved: string; dataCollectionMethods: string }>,
    behaviorDetails: [] as Array<{ antecedents: string; consequences: string; hypothesizedFunction: string }>,
  });

  // Insurance template state
  const [insuranceTemplates, setInsuranceTemplates] = useState<PayerReportTemplate[]>([]);
  const [selectedInsuranceTemplateId, setSelectedInsuranceTemplateId] = useState('');
  const [insuranceReportType, setInsuranceReportType] = useState<'initial_assessment' | 'progress_report'>('initial_assessment');
  const [insuranceDateFrom, setInsuranceDateFrom] = useState(format(subDays(new Date(), 90), 'yyyy-MM-dd'));
  const [insuranceDateTo, setInsuranceDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [insuranceEnabledSections, setInsuranceEnabledSections] = useState<string[]>([]);
  const [insuranceFieldValues, setInsuranceFieldValues] = useState<Record<string, string>>({});
  const [insuranceLoading, setInsuranceLoading] = useState(false);
  const [insuranceGenerating, setInsuranceGenerating] = useState(false);

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
    replacementPlan: true,
  });
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['preview']));
  const reportRef = useRef<HTMLDivElement>(null);

  // Manual section overrides (for external data)
  const [manualOverrides, setManualOverrides] = useState<Record<string, { complete: boolean; note?: string }>>({});
  
  // Custom sections with narratives
  const [customSections, setCustomSections] = useState<Array<{
    id: string;
    title: string;
    content: string;
    position: 'beginning' | 'middle' | 'end';
  }>>([]);

  const activeStudents = useMemo(() => 
    students.filter(s => !s.isArchived), 
    [students]
  );

  const selectedStudent = useMemo(() => 
    students.find(s => s.id === selectedStudentId),
    [students, selectedStudentId]
  );

  // Get skill programs for replacement plan section
  const skillPrograms = useMemo(() => {
    if (!selectedStudent) return [];
    return ((selectedStudent as any).bxSkillPrograms || []) as BxSkillProgram[];
  }, [selectedStudent]);

  // Analyze ABC data
  const analysisData = useMemo(() => {
    if (!selectedStudent) return null;

    const studentABC = abcEntries.filter(e => e.studentId === selectedStudentId);
    const studentFrequency = frequencyEntries.filter(e => e.studentId === selectedStudentId);
    const studentSessions = sessions.filter(s => s.studentIds?.includes(selectedStudentId));

    // Calculate total observation time and rate
    const totalFrequency = studentFrequency.reduce((sum, e) => sum + e.count, 0);
    const totalObservationMinutes = studentFrequency.reduce((sum, e) => {
      return sum + ((e as any).observationDurationMinutes || 30); // Default 30 min
    }, 0);
    const averageRatePerHour = totalObservationMinutes > 0 
      ? (totalFrequency / (totalObservationMinutes / 60)) 
      : 0;

    // Historical entries with rates
    const entriesWithRates = studentFrequency
      .filter(e => (e as any).observationDurationMinutes)
      .map(e => {
        const behavior = selectedStudent?.behaviors.find(b => b.id === e.behaviorId);
        return {
          ...e,
          behaviorName: behavior?.name || 'Unknown',
          ratePerHour: e.count / (((e as any).observationDurationMinutes || 30) / 60)
        };
      });

    if (studentABC.length === 0) {
      return {
        abcCount: 0,
        sessionCount: studentSessions.length,
        frequencyTotal: totalFrequency,
        totalObservationMinutes,
        averageRatePerHour,
        entriesWithRates,
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
      // Only include entries with explicitly tagged functions — don't default to 'unknown'
      if (!entry.functions || entry.functions.length === 0) return;
      const functions = entry.functions;
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
      frequencyTotal: totalFrequency,
      totalObservationMinutes,
      averageRatePerHour,
      entriesWithRates,
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

  // Section completion status
  const sectionStatus = useMemo(() => {
    if (!selectedStudent) return {};
    
    const hasBehaviors = selectedStudent.behaviors.length > 0;
    const hasDefinitions = selectedStudent.behaviors.some(b => b.operationalDefinition);
    const hasABCData = analysisData?.abcCount ? analysisData.abcCount > 0 : false;
    const hasPatterns = analysisData?.topAntecedents && analysisData.topAntecedents.length > 0;
    const hasHypothesis = !!analysisData?.hypothesisStatement;
    const hasIndirectAssessments = (selectedStudent.indirectAssessments || []).length > 0;
    const hasRecommendations = recommendations.length > 0;

    // Helper to check manual override
    const isOverridden = (key: string) => manualOverrides[key]?.complete === true;
    const getOverrideNote = (key: string) => manualOverrides[key]?.note;

    return {
      targetBehaviors: { 
        complete: (hasBehaviors && hasDefinitions) || isOverridden('targetBehaviors'), 
        partial: hasBehaviors && !hasDefinitions && !isOverridden('targetBehaviors'),
        message: isOverridden('targetBehaviors') 
          ? `✓ External${getOverrideNote('targetBehaviors') ? `: ${getOverrideNote('targetBehaviors')}` : ''}`
          : (hasBehaviors ? (hasDefinitions ? 'Complete' : 'Missing definitions') : 'No behaviors defined'),
        overridden: isOverridden('targetBehaviors'),
      },
      directResults: { 
        complete: hasABCData || isOverridden('directResults'), 
        partial: false,
        message: isOverridden('directResults')
          ? `✓ External${getOverrideNote('directResults') ? `: ${getOverrideNote('directResults')}` : ''}`
          : (hasABCData ? `${analysisData?.abcCount} entries` : 'No ABC data collected'),
        overridden: isOverridden('directResults'),
      },
      indirectResults: { 
        complete: hasIndirectAssessments || isOverridden('indirectResults'), 
        partial: false,
        message: isOverridden('indirectResults')
          ? `✓ External${getOverrideNote('indirectResults') ? `: ${getOverrideNote('indirectResults')}` : ''}`
          : (hasIndirectAssessments ? `${selectedStudent.indirectAssessments?.length} assessments` : 'No indirect assessments'),
        overridden: isOverridden('indirectResults'),
      },
      patterns: { 
        complete: hasPatterns || isOverridden('patterns'), 
        partial: false,
        message: isOverridden('patterns')
          ? `✓ External${getOverrideNote('patterns') ? `: ${getOverrideNote('patterns')}` : ''}`
          : (hasPatterns ? 'Patterns identified' : 'Insufficient data'),
        overridden: isOverridden('patterns'),
      },
      hypothesis: { 
        complete: hasHypothesis || isOverridden('hypothesis'), 
        partial: hasABCData && !hasHypothesis && !isOverridden('hypothesis'),
        message: isOverridden('hypothesis')
          ? `✓ External${getOverrideNote('hypothesis') ? `: ${getOverrideNote('hypothesis')}` : ''}`
          : (hasHypothesis ? 'Generated' : (hasABCData ? 'Pending analysis' : 'Needs ABC data')),
        overridden: isOverridden('hypothesis'),
      },
      recommendations: { 
        complete: (hasRecommendations && hasHypothesis) || isOverridden('recommendations'), 
        partial: hasRecommendations && !hasHypothesis && !isOverridden('recommendations'),
        message: isOverridden('recommendations')
          ? `✓ External${getOverrideNote('recommendations') ? `: ${getOverrideNote('recommendations')}` : ''}`
          : (hasRecommendations ? `${recommendations.length} recommendations` : 'Select function to generate'),
        overridden: isOverridden('recommendations'),
      },
    };
  }, [selectedStudent, analysisData, recommendations, manualOverrides]);

  const completionPercentage = useMemo(() => {
    const statuses = Object.values(sectionStatus);
    if (statuses.length === 0) return 0;
    const complete = statuses.filter(s => s.complete).length;
    return Math.round((complete / statuses.length) * 100);
  }, [sectionStatus]);

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

  // Save FBA findings to student profile
  const saveFBAFindings = () => {
    if (!selectedStudent || !analysisData) return;

    const findings = {
      id: selectedStudent.fbaFindings?.id || crypto.randomUUID(),
      studentId: selectedStudentId,
      createdAt: selectedStudent.fbaFindings?.createdAt || new Date(),
      updatedAt: new Date(),
      status: completionPercentage === 100 ? 'complete' as const : 'draft' as const,
      primaryFunction: analysisData.primaryFunction?.function,
      secondaryFunctions: analysisData.functionStrengths
        .slice(1)
        .map(fs => fs.function),
      functionStrengths: analysisData.functionStrengths.map(fs => ({
        function: fs.function,
        percentage: fs.percentage,
      })),
      topAntecedents: analysisData.topAntecedents,
      topConsequences: analysisData.topConsequences,
      hypothesisStatements: analysisData.hypothesisStatement 
        ? [analysisData.hypothesisStatement] 
        : [],
      abcEntriesCount: analysisData.abcCount,
      sessionsCount: analysisData.sessionCount,
      frequencyTotal: analysisData.frequencyTotal,
      dateRangeStart: new Date(),
      dateRangeEnd: new Date(),
      recommendations,
      ageRange,
      assessorName,
      assessorTitle,
      notes: additionalNotes,
    };

    updateStudentProfile(selectedStudentId, { fbaFindings: findings });
    toast.success('FBA findings saved to student profile');
  };

  // Auto-save FBA findings when analysis data changes
  useEffect(() => {
    if (!selectedStudent || !analysisData || analysisData.abcCount === 0) return;
    
    // Debounce auto-save
    const timeout = setTimeout(() => {
      const findings = {
        id: selectedStudent.fbaFindings?.id || crypto.randomUUID(),
        studentId: selectedStudentId,
        createdAt: selectedStudent.fbaFindings?.createdAt || new Date(),
        updatedAt: new Date(),
        status: completionPercentage === 100 ? 'complete' as const : 'draft' as const,
        primaryFunction: analysisData.primaryFunction?.function,
        secondaryFunctions: analysisData.functionStrengths
          .slice(1)
          .map(fs => fs.function),
        functionStrengths: analysisData.functionStrengths.map(fs => ({
          function: fs.function,
          percentage: fs.percentage,
        })),
        topAntecedents: analysisData.topAntecedents,
        topConsequences: analysisData.topConsequences,
        hypothesisStatements: analysisData.hypothesisStatement 
          ? [analysisData.hypothesisStatement] 
          : [],
        abcEntriesCount: analysisData.abcCount,
        sessionsCount: analysisData.sessionCount,
        frequencyTotal: analysisData.frequencyTotal,
        dateRangeStart: new Date(),
        dateRangeEnd: new Date(),
        recommendations,
        ageRange,
        assessorName: assessorName || selectedStudent.fbaFindings?.assessorName,
        assessorTitle: assessorTitle || selectedStudent.fbaFindings?.assessorTitle,
        notes: additionalNotes || selectedStudent.fbaFindings?.notes,
      };

      updateStudentProfile(selectedStudentId, { fbaFindings: findings });
    }, 2000); // 2 second debounce

    return () => clearTimeout(timeout);
  }, [selectedStudentId, analysisData, recommendations, ageRange, completionPercentage]);

  // Auto-populate school FBA fields from student data
  useEffect(() => {
    if (!selectedStudent || !analysisData) return;
    setSchoolFields(prev => ({
      ...prev,
      reasonForReferral: prev.reasonForReferral || selectedStudent.backgroundInfo?.referralReason || '',
      school: prev.school || (selectedStudent as any).school || '',
      backgroundInfo: prev.backgroundInfo || selectedStudent.backgroundInfo?.educationalHistory || '',
      sourcesOfInformation: prev.sourcesOfInformation || 'Teacher interview, direct observation, ABC data collection, record review',
      dataCollectionTools: prev.dataCollectionTools || 'ABC (Antecedent-Behavior-Consequence) recording, frequency count, duration recording',
      indirectAssessment: prev.indirectAssessment || (selectedStudent.indirectAssessments?.length
        ? `Indirect assessments completed: ${selectedStudent.indirectAssessments.map(a => `${a.type} (${a.targetBehavior})`).join(', ')}`
        : ''),
      attentionNarrative: prev.attentionNarrative || (analysisData.functionStrengths.some(f => f.function === 'attention')
        ? `Attention-maintained behavior was identified at ${analysisData.functionStrengths.find(f => f.function === 'attention')?.percentage || 0}% of observed occurrences.`
        : ''),
      escapeNarrative: prev.escapeNarrative || (analysisData.functionStrengths.some(f => f.function === 'escape')
        ? `Escape-maintained behavior was identified at ${analysisData.functionStrengths.find(f => f.function === 'escape')?.percentage || 0}% of observed occurrences.`
        : ''),
      tangibleNarrative: prev.tangibleNarrative || (analysisData.functionStrengths.some(f => f.function === 'tangible')
        ? `Tangible-maintained behavior was identified at ${analysisData.functionStrengths.find(f => f.function === 'tangible')?.percentage || 0}% of observed occurrences.`
        : ''),
      automaticNarrative: prev.automaticNarrative || (analysisData.functionStrengths.some(f => f.function === 'automatic' || f.function === 'sensory')
        ? `Automatically reinforced behavior was identified at ${(analysisData.functionStrengths.find(f => f.function === 'automatic' || f.function === 'sensory')?.percentage || 0)}% of observed occurrences.`
        : ''),
      recommendedStrategies: prev.recommendedStrategies || recommendations.join('\n'),
      // Auto-set hypothesized function checkboxes from analysis
      hypothesizedFunctions: {
        attention: prev.hypothesizedFunctions.attention || analysisData.functionStrengths.some(f => f.function === 'attention'),
        escape: prev.hypothesizedFunctions.escape || analysisData.functionStrengths.some(f => f.function === 'escape'),
        tangible: prev.hypothesizedFunctions.tangible || analysisData.functionStrengths.some(f => f.function === 'tangible'),
        automatic: prev.hypothesizedFunctions.automatic || analysisData.functionStrengths.some(f => f.function === 'automatic' || f.function === 'sensory'),
      },
    }));
  }, [selectedStudent, analysisData, recommendations]);

  // Load insurance templates when format is insurance
  useEffect(() => {
    if (reportFormat !== 'insurance') return;
    (async () => {
      setInsuranceLoading(true);
      const { data, error } = await supabase
        .from('payer_report_templates')
        .select('*')
        .order('is_default', { ascending: false });
      if (!error && data) {
        const parsed = data.map(d => ({
          ...d,
          sections: (d.sections as unknown as TemplateSection[]) || [],
        })) as PayerReportTemplate[];
        setInsuranceTemplates(parsed);
      }
      setInsuranceLoading(false);
    })();
  }, [reportFormat]);

  const filteredInsuranceTemplates = useMemo(
    () => insuranceTemplates.filter(t => t.report_type === insuranceReportType),
    [insuranceTemplates, insuranceReportType]
  );

  useEffect(() => {
    const defaultTpl = filteredInsuranceTemplates.find(t => t.is_default) || filteredInsuranceTemplates[0];
    if (defaultTpl) {
      setSelectedInsuranceTemplateId(defaultTpl.id);
      setInsuranceEnabledSections(defaultTpl.sections.filter(s => s.enabled).map(s => s.key));
    }
  }, [filteredInsuranceTemplates]);

  const selectedInsuranceTemplate = useMemo(
    () => filteredInsuranceTemplates.find(t => t.id === selectedInsuranceTemplateId),
    [filteredInsuranceTemplates, selectedInsuranceTemplateId]
  );

  // School FBA export
  const generateSchoolFBA = async () => {
    if (!selectedStudent || !analysisData) return;

    const studentABC = abcEntries.filter(e => e.studentId === selectedStudentId);
    const abcSummary: SchoolFBAData['abcSummary'] = [];
    const abcCombos = new Map<string, { antecedent: string; behavior: string; consequence: string; count: number }>();
    studentABC.forEach(e => {
      const key = `${e.antecedent || 'Unknown'}|${e.behavior || 'Unknown'}|${e.consequence || 'Unknown'}`;
      const existing = abcCombos.get(key);
      if (existing) existing.count++;
      else abcCombos.set(key, { antecedent: e.antecedent || 'Unknown', behavior: e.behavior || 'Unknown', consequence: e.consequence || 'Unknown', count: 1 });
    });
    abcCombos.forEach(v => abcSummary.push(v));
    abcSummary.sort((a, b) => b.count - a.count);

    const freqByBehavior = new Map<string, { count: number; totalMinutes: number }>();
    frequencyEntries.filter(e => e.studentId === selectedStudentId).forEach(e => {
      const beh = selectedStudent.behaviors.find(b => b.id === e.behaviorId);
      const name = beh?.name || 'Unknown';
      const existing = freqByBehavior.get(name) || { count: 0, totalMinutes: 0 };
      existing.count += e.count;
      existing.totalMinutes += (e as any).observationDurationMinutes || 0;
      freqByBehavior.set(name, existing);
    });
    const frequencyData: SchoolFBAData['frequencyData'] = [];
    freqByBehavior.forEach((data, behavior) => {
      frequencyData.push({ behavior, count: data.count, ratePerHour: data.totalMinutes > 0 ? data.count / (data.totalMinutes / 60) : undefined });
    });

    // Calculate age from DOB
    let ageStr = '';
    if ((selectedStudent as any).dateOfBirth) {
      try {
        const dob = new Date((selectedStudent as any).dateOfBirth);
        const now = new Date();
        const years = now.getFullYear() - dob.getFullYear();
        const months = now.getMonth() - dob.getMonth();
        const adjMonths = months < 0 ? months + 12 : months;
        const adjYears = months < 0 ? years - 1 : years;
        ageStr = `${adjYears} years ${adjMonths} months`;
      } catch { /* ignore */ }
    }

    // Generate chart images
    const chartImages: SchoolFBAData['chartImages'] = [];

    // Function analysis chart
    if (analysisData.functionStrengths.length > 0) {
      try {
        const fnChart = await renderFunctionBarChart(
          analysisData.functionStrengths.map(fs => ({
            label: fs.label,
            value: fs.count,
            percentage: fs.percentage,
          })),
          'Hypothesized Function Analysis'
        );
        chartImages.push({ ...fnChart, title: 'Function Analysis' });
      } catch { /* skip chart on error */ }
    }

    // Antecedent frequency chart
    if (analysisData.topAntecedents.length > 0) {
      try {
        const antChart = await renderFrequencyBarChart(
          analysisData.topAntecedents.map(a => ({ label: a.value, count: a.count, percentage: a.percentage })),
          'Top Antecedents'
        );
        chartImages.push({ ...antChart, title: 'Antecedent Frequency' });
      } catch { /* skip */ }
    }

    // Consequence frequency chart
    if (analysisData.topConsequences.length > 0) {
      try {
        const conChart = await renderFrequencyBarChart(
          analysisData.topConsequences.map(c => ({ label: c.value, count: c.count, percentage: c.percentage })),
          'Top Consequences'
        );
        chartImages.push({ ...conChart, title: 'Consequence Frequency' });
      } catch { /* skip */ }
    }

    // Indirect assessment charts (FAST, MAS, QABF)
    const savedAssessments = selectedStudent.indirectAssessments || [];
    for (const assessment of savedAssessments) {
      try {
        const iaChart = await renderIndirectAssessmentChart(
          assessment.scores,
          assessment.type,
          assessment.targetBehavior
        );
        chartImages.push({ ...iaChart, title: `${assessment.type} – ${assessment.targetBehavior}` });
      } catch { /* skip */ }
    }

    const schoolData: SchoolFBAData = {
      studentName: selectedStudent.name,
      dateOfBirth: (selectedStudent as any).dateOfBirth,
      age: ageStr,
      ssid: schoolFields.ssid,
      grade: selectedStudent.grade,
      school: schoolFields.school,
      teacher: schoolFields.teacher,
      caseManager: schoolFields.caseManager,
      fbaCompletedBy: schoolFields.fbaCompletedBy || assessorName,
      reasonForReferral: schoolFields.reasonForReferral,
      targetBehaviors: selectedStudent.behaviors.map((b, i) => ({
        name: b.name,
        operationalDefinition: b.operationalDefinition || '',
        antecedents: schoolFields.behaviorDetails[i]?.antecedents || '',
        consequences: schoolFields.behaviorDetails[i]?.consequences || '',
        hypothesizedFunction: schoolFields.behaviorDetails[i]?.hypothesizedFunction || '',
      })),
      sourcesChecklist: schoolFields.sourcesChecklist,
      backgroundInfo: schoolFields.backgroundInfo,
      dataToolsChecklist: schoolFields.dataToolsChecklist,
      studentInterview: schoolFields.studentInterview,
      teacherInterview: schoolFields.teacherInterview,
      parentInterview: schoolFields.parentInterview,
      observationSetting: schoolFields.observationSetting,
      observationPeopleInvolved: schoolFields.observationPeopleInvolved,
      observationTimeOfDay: schoolFields.observationTimeOfDay,
      observationDetails: schoolFields.observationDetails,
      directObservationNarrative: schoolFields.directObservationNarrative,
      abcSummary,
      frequencyData,
      chartImages,
      indirectAssessmentResults: savedAssessments.map(a => ({
        type: a.type,
        targetBehavior: a.targetBehavior,
        scores: a.scores,
      })),
      summaryOfFindings: schoolFields.summaryOfFindings,
      hypothesizedFunctions: schoolFields.hypothesizedFunctions,
      hypothesisNarrative: schoolFields.hypothesisNarrative,
      recommendedStrategies: schoolFields.recommendedStrategies,
      recommendationChecklist: schoolFields.recommendationChecklist,
      // Legacy fields
      sourcesOfInformation: schoolFields.sourcesOfInformation,
      dataCollectionTools: schoolFields.dataCollectionTools,
      indirectAssessment: schoolFields.indirectAssessment,
      directObservation: {
        setting: 'School',
        dates: assessmentDates,
        totalSessions: analysisData.sessionCount,
        totalObservationMinutes: analysisData.totalObservationMinutes,
        narrative: schoolFields.directObservationNarrative,
      },
      functionAnalysis: {
        primaryFunction: analysisData.primaryFunction?.function || 'unknown',
        primaryPercentage: analysisData.primaryFunction?.percentage || 0,
        secondaryFunctions: analysisData.functionStrengths.slice(1).map(fs => ({ function: fs.function, percentage: fs.percentage })),
        topAntecedents: analysisData.topAntecedents,
        topConsequences: analysisData.topConsequences,
      },
      hypothesisStatement: analysisData.hypothesisStatement || '',
      attentionNarrative: schoolFields.attentionNarrative,
      escapeNarrative: schoolFields.escapeNarrative,
      tangibleNarrative: schoolFields.tangibleNarrative,
      automaticNarrative: schoolFields.automaticNarrative,
      recommendations: schoolFields.recommendationsText,
      analystName: assessorName,
      analystCredentials: assessorTitle,
      reportDate: format(new Date(), 'MMMM dd, yyyy'),
    };

    try {
      await generateSchoolFBAReport(schoolData);
      toast.success('School FBA report downloaded');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate school FBA report');
    }
  };

  const handleInsuranceGenerate = async () => {
    if (!selectedInsuranceTemplate || !selectedStudent) return;
    setInsuranceGenerating(true);
    try {
      await generateInsuranceReport({
        template: selectedInsuranceTemplate,
        data: {
          studentName: selectedStudent.name,
          dateRangeStart: insuranceDateFrom,
          dateRangeEnd: insuranceDateTo,
          fieldValues: insuranceFieldValues,
          enabledSections: insuranceEnabledSections,
        },
      });
      toast.success('Insurance report downloaded');
    } catch (err) {
      toast.error('Failed to generate insurance report');
    }
    setInsuranceGenerating(false);
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
          // Background Information from student profile
          includeSections.background && selectedStudent.backgroundInfo && new Paragraph({
            text: 'BACKGROUND INFORMATION',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          // Referral Info
          includeSections.background && selectedStudent.backgroundInfo?.referralReason && new Paragraph({
            children: [
              new TextRun({ text: 'Referral Information', bold: true }),
            ],
            spacing: { after: 100 },
          }),
          includeSections.background && selectedStudent.backgroundInfo?.referralSource && new Paragraph({
            text: `Referral Source: ${selectedStudent.backgroundInfo.referralSource}`,
            spacing: { after: 50 },
          }),
          includeSections.background && selectedStudent.backgroundInfo?.referralReason && new Paragraph({
            text: `Reason for Referral: ${selectedStudent.backgroundInfo.referralReason}`,
            spacing: { after: 50 },
          }),
          includeSections.background && selectedStudent.backgroundInfo?.presentingConcerns && new Paragraph({
            text: `Presenting Concerns: ${selectedStudent.backgroundInfo.presentingConcerns}`,
            spacing: { after: 100 },
          }),
          // Student History
          includeSections.background && (selectedStudent.backgroundInfo?.educationalHistory || selectedStudent.backgroundInfo?.diagnoses) && new Paragraph({
            children: [
              new TextRun({ text: 'Student History', bold: true }),
            ],
            spacing: { before: 100, after: 100 },
          }),
          includeSections.background && selectedStudent.backgroundInfo?.educationalHistory && new Paragraph({
            text: `Educational History: ${selectedStudent.backgroundInfo.educationalHistory}`,
            spacing: { after: 50 },
          }),
          includeSections.background && selectedStudent.backgroundInfo?.diagnoses && new Paragraph({
            text: `Diagnoses: ${selectedStudent.backgroundInfo.diagnoses}`,
            spacing: { after: 50 },
          }),
          includeSections.background && selectedStudent.backgroundInfo?.medicalInfo && new Paragraph({
            text: `Medical Information: ${selectedStudent.backgroundInfo.medicalInfo}`,
            spacing: { after: 100 },
          }),
          // Previous Interventions
          includeSections.background && (selectedStudent.backgroundInfo?.previousBIPs || selectedStudent.backgroundInfo?.strategiesTried) && new Paragraph({
            children: [
              new TextRun({ text: 'Previous Interventions', bold: true }),
            ],
            spacing: { before: 100, after: 100 },
          }),
          includeSections.background && selectedStudent.backgroundInfo?.previousBIPs && new Paragraph({
            text: `Previous BIPs: ${selectedStudent.backgroundInfo.previousBIPs}`,
            spacing: { after: 50 },
          }),
          includeSections.background && selectedStudent.backgroundInfo?.strategiesTried && new Paragraph({
            text: `Strategies Tried: ${selectedStudent.backgroundInfo.strategiesTried}`,
            spacing: { after: 50 },
          }),
          includeSections.background && selectedStudent.backgroundInfo?.whatWorked && new Paragraph({
            text: `What Has Worked: ${selectedStudent.backgroundInfo.whatWorked}`,
            spacing: { after: 50 },
          }),
          includeSections.background && selectedStudent.backgroundInfo?.whatDidntWork && new Paragraph({
            text: `What Hasn't Worked: ${selectedStudent.backgroundInfo.whatDidntWork}`,
            spacing: { after: 100 },
          }),
          // Behaviors of Concern Summary
          includeSections.background && selectedStudent.backgroundInfo?.behaviorsOfConcernSummary && new Paragraph({
            children: [
              new TextRun({ text: 'Behaviors of Concern', bold: true }),
            ],
            spacing: { before: 100, after: 100 },
          }),
          includeSections.background && selectedStudent.backgroundInfo?.behaviorsOfConcernSummary && new Paragraph({
            text: selectedStudent.backgroundInfo.behaviorsOfConcernSummary,
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
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Total Frequency Count')] }),
                  new TableCell({ children: [new Paragraph(String(analysisData.frequencyTotal))] }),
                ],
              }),
              ...(analysisData.totalObservationMinutes > 0 ? [
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph('Total Observation Time')] }),
                    new TableCell({ children: [new Paragraph(`${Math.round(analysisData.totalObservationMinutes)} minutes`)] }),
                  ],
                }),
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Average Rate per Hour', bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${analysisData.averageRatePerHour.toFixed(2)} behaviors/hr`, bold: true })] })] }),
                  ],
                }),
              ] : []),
            ],
          }),
          // Rate breakdown table if historical data with rates exists
          includeSections.directResults && analysisData.entriesWithRates && analysisData.entriesWithRates.length > 0 && new Paragraph({
            children: [new TextRun({ text: 'Rate Data by Observation:', bold: true })],
            spacing: { before: 200, after: 100 },
          }),
          includeSections.directResults && analysisData.entriesWithRates && analysisData.entriesWithRates.length > 0 && new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Date')], shading: { fill: 'f5f5f5' } }),
                  new TableCell({ children: [new Paragraph('Behavior')], shading: { fill: 'f5f5f5' } }),
                  new TableCell({ children: [new Paragraph('Count')], shading: { fill: 'f5f5f5' } }),
                  new TableCell({ children: [new Paragraph('Duration')], shading: { fill: 'f5f5f5' } }),
                  new TableCell({ children: [new Paragraph('Rate/hr')], shading: { fill: 'f5f5f5' } }),
                ],
              }),
              ...analysisData.entriesWithRates.map((entry: any) => 
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph(format(new Date(entry.timestamp), 'MM/dd/yyyy'))] }),
                    new TableCell({ children: [new Paragraph(entry.behaviorName || 'Unknown')] }),
                    new TableCell({ children: [new Paragraph(String(entry.count))] }),
                    new TableCell({ children: [new Paragraph(`${entry.observationDurationMinutes}m`)] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: entry.ratePerHour.toFixed(2), bold: true })] })] }),
                  ],
                })
              ),
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
            {/* Report Format Selector */}
            <Card className="border-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Report Format</CardTitle>
                <CardDescription className="text-xs">Choose the output format for your FBA report</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setReportFormat('school')}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                      reportFormat === 'school' ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/30'
                    }`}
                  >
                    <School className="w-5 h-5 text-primary flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sm">School FBA</p>
                      <p className="text-xs text-muted-foreground">District-formatted report with tables</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setReportFormat('insurance')}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                      reportFormat === 'insurance' ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/30'
                    }`}
                  >
                    <Building2 className="w-5 h-5 text-primary flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sm">Insurance Report</p>
                      <p className="text-xs text-muted-foreground">Payer-specific template</p>
                    </div>
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Insurance-specific settings */}
            {reportFormat === 'insurance' && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Insurance Template Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Report Type</Label>
                      <Select value={insuranceReportType} onValueChange={(v: any) => setInsuranceReportType(v)}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="initial_assessment">Initial Assessment</SelectItem>
                          <SelectItem value="progress_report">Progress Report</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Template</Label>
                      {insuranceLoading ? (
                        <div className="flex items-center gap-2 text-muted-foreground text-xs h-8">
                          <Loader2 className="w-3 h-3 animate-spin" /> Loading...
                        </div>
                      ) : (
                        <Select value={selectedInsuranceTemplateId} onValueChange={setSelectedInsuranceTemplateId}>
                          <SelectTrigger className="h-8"><SelectValue placeholder="Select template" /></SelectTrigger>
                          <SelectContent>
                            {filteredInsuranceTemplates.map(t => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.name} {t.is_default && '(Default)'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">From</Label>
                      <Input type="date" className="h-8" value={insuranceDateFrom} onChange={e => setInsuranceDateFrom(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">To</Label>
                      <Input type="date" className="h-8" value={insuranceDateTo} onChange={e => setInsuranceDateTo(e.target.value)} />
                    </div>
                  </div>
                  {selectedInsuranceTemplate && (
                    <div className="space-y-2 border-t pt-3">
                      <Label className="text-xs font-medium">Sections</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedInsuranceTemplate.sections.map(section => (
                          <div key={section.key} className="flex items-center gap-2">
                            <Checkbox
                              id={`ins-${section.key}`}
                              checked={insuranceEnabledSections.includes(section.key)}
                              onCheckedChange={() => {
                                setInsuranceEnabledSections(prev =>
                                  prev.includes(section.key) ? prev.filter(k => k !== section.key) : [...prev, section.key]
                                );
                              }}
                            />
                            <Label htmlFor={`ins-${section.key}`} className="text-xs cursor-pointer">{section.title}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedInsuranceTemplate && (
                    <div className="flex flex-wrap gap-1 pt-2">
                      {selectedInsuranceTemplate.payer_names.map((name, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{name}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* School FBA specific fields */}
            {reportFormat === 'school' && selectedStudent && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <School className="w-4 h-4" />
                    School FBA Details
                  </CardTitle>
                  <CardDescription className="text-xs">All fields are pre-filled from collected data and editable</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Student Info Row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">School</Label>
                      <Input className="h-8 text-sm" value={schoolFields.school} onChange={e => setSchoolFields(p => ({ ...p, school: e.target.value }))} placeholder="School name" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Student ID (SSID)</Label>
                      <Input className="h-8 text-sm" value={schoolFields.ssid} onChange={e => setSchoolFields(p => ({ ...p, ssid: e.target.value }))} placeholder="SSID" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Teacher</Label>
                      <Input className="h-8 text-sm" value={schoolFields.teacher} onChange={e => setSchoolFields(p => ({ ...p, teacher: e.target.value }))} placeholder="Teacher name" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Case Manager</Label>
                      <Input className="h-8 text-sm" value={schoolFields.caseManager} onChange={e => setSchoolFields(p => ({ ...p, caseManager: e.target.value }))} placeholder="Case manager name" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">FBA Completed By</Label>
                      <Input className="h-8 text-sm" value={schoolFields.fbaCompletedBy} onChange={e => setSchoolFields(p => ({ ...p, fbaCompletedBy: e.target.value }))} placeholder="Name, credentials" />
                    </div>
                  </div>

                  <Separator />

                  {/* 1. Reason for Referral */}
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">1. Reason for Referral</Label>
                    <Textarea className="text-sm" rows={3} value={schoolFields.reasonForReferral} onChange={e => setSchoolFields(p => ({ ...p, reasonForReferral: e.target.value }))} />
                  </div>

                  {/* 2. Sources of Information - Checkbox Grid */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">2. Sources of Information</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {([
                        ['parentInterview', 'Parent Interview'],
                        ['teacherInterview', 'Teacher Interview'],
                        ['studentInterview', 'Student Interview'],
                        ['medicalRecords', 'Medical Records'],
                        ['schoolRecords', 'School Records'],
                        ['psychologicalEvaluation', 'Psychological Evaluation'],
                        ['slpOtAssessment', 'SLP/OT Assessment'],
                        ['educationalTesting', 'Educational Testing'],
                        ['iepIfsp', 'IEP/IFSP'],
                        ['incidentReports', 'Incident Reports'],
                        ['directObservation', 'Direct Observation'],
                        ['anecdotalReports', 'Anecdotal Reports'],
                      ] as const).map(([key, label]) => (
                        <div key={key} className="flex items-center gap-2">
                          <Checkbox
                            id={`src-${key}`}
                            checked={schoolFields.sourcesChecklist[key]}
                            onCheckedChange={(checked) => setSchoolFields(p => ({
                              ...p,
                              sourcesChecklist: { ...p.sourcesChecklist, [key]: !!checked },
                            }))}
                          />
                          <Label htmlFor={`src-${key}`} className="text-xs cursor-pointer">{label}</Label>
                        </div>
                      ))}
                      <div className="flex items-center gap-2 col-span-2 md:col-span-3">
                        <Checkbox
                          id="src-other"
                          checked={schoolFields.sourcesChecklist.otherSource}
                          onCheckedChange={(checked) => setSchoolFields(p => ({
                            ...p,
                            sourcesChecklist: { ...p.sourcesChecklist, otherSource: !!checked },
                          }))}
                        />
                        <Label htmlFor="src-other" className="text-xs cursor-pointer">Other:</Label>
                        <Input className="h-6 text-xs flex-1" value={schoolFields.sourcesChecklist.otherSourceText} onChange={e => setSchoolFields(p => ({ ...p, sourcesChecklist: { ...p.sourcesChecklist, otherSourceText: e.target.value } }))} />
                      </div>
                    </div>
                  </div>

                  {/* 3. Background Information */}
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">3. Relevant Background Information</Label>
                    <Textarea className="text-sm" rows={3} value={schoolFields.backgroundInfo} onChange={e => setSchoolFields(p => ({ ...p, backgroundInfo: e.target.value }))} />
                  </div>

                  {/* 4. Data Collection Tools - Checkbox Grid */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">4. Data Collection Tools</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {([
                        ['abcRecording', 'ABC Recording'],
                        ['intervalData', 'Interval Data Recording'],
                        ['structuredInterviews', 'Structured Interviews'],
                        ['scatterplot', 'Scatterplot'],
                        ['recordReview', 'Record Review'],
                      ] as const).map(([key, label]) => (
                        <div key={key} className="flex items-center gap-2">
                          <Checkbox
                            id={`tool-${key}`}
                            checked={schoolFields.dataToolsChecklist[key]}
                            onCheckedChange={(checked) => setSchoolFields(p => ({
                              ...p,
                              dataToolsChecklist: { ...p.dataToolsChecklist, [key]: !!checked },
                            }))}
                          />
                          <Label htmlFor={`tool-${key}`} className="text-xs cursor-pointer">{label}</Label>
                        </div>
                      ))}
                      <div className="flex items-center gap-2 col-span-2 md:col-span-3">
                        <Checkbox
                          id="tool-other"
                          checked={schoolFields.dataToolsChecklist.otherTool}
                          onCheckedChange={(checked) => setSchoolFields(p => ({
                            ...p,
                            dataToolsChecklist: { ...p.dataToolsChecklist, otherTool: !!checked },
                          }))}
                        />
                        <Label htmlFor="tool-other" className="text-xs cursor-pointer">Other:</Label>
                        <Input className="h-6 text-xs flex-1" value={schoolFields.dataToolsChecklist.otherToolText} onChange={e => setSchoolFields(p => ({ ...p, dataToolsChecklist: { ...p.dataToolsChecklist, otherToolText: e.target.value } }))} />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* 5. Indirect Assessment - Split Interviews */}
                  <Label className="text-xs font-medium">5. Indirect Assessment</Label>
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Student Interview</Label>
                      <Textarea className="text-sm" rows={3} value={schoolFields.studentInterview} onChange={e => setSchoolFields(p => ({ ...p, studentInterview: e.target.value }))} placeholder="Assessment of behavior from student perspective..." />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Teacher Interview</Label>
                      <Textarea className="text-sm" rows={3} value={schoolFields.teacherInterview} onChange={e => setSchoolFields(p => ({ ...p, teacherInterview: e.target.value }))} placeholder="Teacher observations and insights..." />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Parent/Caregiver Interview</Label>
                      <Textarea className="text-sm" rows={3} value={schoolFields.parentInterview} onChange={e => setSchoolFields(p => ({ ...p, parentInterview: e.target.value }))} placeholder="Parent/caregiver input..." />
                    </div>
                  </div>

                  <Separator />

                  {/* 6. Direct Assessment - Observation Setting */}
                  <Label className="text-xs font-medium">6. Direct Assessment - Observation Setting</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      ['home', 'Home'],
                      ['school', 'School'],
                      ['community', 'Community'],
                      ['noObservation', 'No Observation'],
                    ] as const).map(([key, label]) => (
                      <div key={key} className="flex items-center gap-2">
                        <Checkbox
                          id={`obs-${key}`}
                          checked={schoolFields.observationSetting[key]}
                          onCheckedChange={(checked) => setSchoolFields(p => ({
                            ...p,
                            observationSetting: { ...p.observationSetting, [key]: !!checked },
                          }))}
                        />
                        <Label htmlFor={`obs-${key}`} className="text-xs cursor-pointer">{label}</Label>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 col-span-2">
                      <Checkbox
                        id="obs-other"
                        checked={schoolFields.observationSetting.other}
                        onCheckedChange={(checked) => setSchoolFields(p => ({
                          ...p,
                          observationSetting: { ...p.observationSetting, other: !!checked },
                        }))}
                      />
                      <Label htmlFor="obs-other" className="text-xs cursor-pointer">Other:</Label>
                      <Input className="h-6 text-xs flex-1" value={schoolFields.observationSetting.otherText} onChange={e => setSchoolFields(p => ({ ...p, observationSetting: { ...p.observationSetting, otherText: e.target.value } }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">People Involved</Label>
                      <Input className="h-8 text-sm" value={schoolFields.observationPeopleInvolved} onChange={e => setSchoolFields(p => ({ ...p, observationPeopleInvolved: e.target.value }))} placeholder="BCBA, Teacher, Aide..." />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Time of Day</Label>
                      <Input className="h-8 text-sm" value={schoolFields.observationTimeOfDay} onChange={e => setSchoolFields(p => ({ ...p, observationTimeOfDay: e.target.value }))} placeholder="Morning, Throughout school day..." />
                    </div>
                  </div>

                  {/* Observation Details Table */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Observation Details</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => setSchoolFields(p => ({
                          ...p,
                          observationDetails: [...p.observationDetails, { date: '', activitiesObserved: '', dataCollectionMethods: '' }],
                        }))}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Row
                      </Button>
                    </div>
                    {schoolFields.observationDetails.map((od, idx) => (
                      <div key={idx} className="grid grid-cols-[100px_1fr_1fr_30px] gap-2 items-start">
                        <Input className="h-7 text-xs" value={od.date} onChange={e => {
                          const updated = [...schoolFields.observationDetails];
                          updated[idx] = { ...updated[idx], date: e.target.value };
                          setSchoolFields(p => ({ ...p, observationDetails: updated }));
                        }} placeholder="Date" />
                        <Input className="h-7 text-xs" value={od.activitiesObserved} onChange={e => {
                          const updated = [...schoolFields.observationDetails];
                          updated[idx] = { ...updated[idx], activitiesObserved: e.target.value };
                          setSchoolFields(p => ({ ...p, observationDetails: updated }));
                        }} placeholder="Activities observed" />
                        <Input className="h-7 text-xs" value={od.dataCollectionMethods} onChange={e => {
                          const updated = [...schoolFields.observationDetails];
                          updated[idx] = { ...updated[idx], dataCollectionMethods: e.target.value };
                          setSchoolFields(p => ({ ...p, observationDetails: updated }));
                        }} placeholder="Data collection methods" />
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                          setSchoolFields(p => ({ ...p, observationDetails: p.observationDetails.filter((_, i) => i !== idx) }));
                        }}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Summary of Direct Observation</Label>
                    <Textarea className="text-sm" rows={3} value={schoolFields.directObservationNarrative} onChange={e => setSchoolFields(p => ({ ...p, directObservationNarrative: e.target.value }))} placeholder="Describe observation context and findings..." />
                  </div>

                  <Separator />

                  {/* Per-behavior details */}
                  {selectedStudent.behaviors.length > 0 && (
                    <div className="space-y-3">
                      <Label className="text-xs font-medium">Target Behavior Details</Label>
                      {selectedStudent.behaviors.map((beh, idx) => (
                        <Collapsible key={beh.id}>
                          <CollapsibleTrigger className="flex items-center gap-2 text-xs font-medium w-full text-left p-2 rounded border hover:bg-muted/50">
                            <Target className="w-3 h-3" />
                            {beh.name}
                            <ChevronDown className="w-3 h-3 ml-auto" />
                          </CollapsibleTrigger>
                          <CollapsibleContent className="space-y-2 pt-2 pl-4">
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Possible Antecedents</Label>
                              <Textarea className="text-sm" rows={2} value={schoolFields.behaviorDetails[idx]?.antecedents || ''} onChange={e => {
                                const updated = [...schoolFields.behaviorDetails];
                                while (updated.length <= idx) updated.push({ antecedents: '', consequences: '', hypothesizedFunction: '' });
                                updated[idx] = { ...updated[idx], antecedents: e.target.value };
                                setSchoolFields(p => ({ ...p, behaviorDetails: updated }));
                              }} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Possible Consequences</Label>
                              <Textarea className="text-sm" rows={2} value={schoolFields.behaviorDetails[idx]?.consequences || ''} onChange={e => {
                                const updated = [...schoolFields.behaviorDetails];
                                while (updated.length <= idx) updated.push({ antecedents: '', consequences: '', hypothesizedFunction: '' });
                                updated[idx] = { ...updated[idx], consequences: e.target.value };
                                setSchoolFields(p => ({ ...p, behaviorDetails: updated }));
                              }} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Hypothesized Function</Label>
                              <Input className="h-7 text-xs" value={schoolFields.behaviorDetails[idx]?.hypothesizedFunction || ''} onChange={e => {
                                const updated = [...schoolFields.behaviorDetails];
                                while (updated.length <= idx) updated.push({ antecedents: '', consequences: '', hypothesizedFunction: '' });
                                updated[idx] = { ...updated[idx], hypothesizedFunction: e.target.value };
                                setSchoolFields(p => ({ ...p, behaviorDetails: updated }));
                              }} />
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      ))}
                    </div>
                  )}

                  <Separator />

                  {/* Summary of Findings */}
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Summary of Findings</Label>
                    <Textarea className="text-sm" rows={4} value={schoolFields.summaryOfFindings} onChange={e => setSchoolFields(p => ({ ...p, summaryOfFindings: e.target.value }))} placeholder="Overall summary of assessment findings..." />
                  </div>

                  {/* Hypothesized Function Checkboxes */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Hypothesized Function</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        ['attention', 'Attention'],
                        ['escape', 'Escape'],
                        ['tangible', 'Access to Tangibles'],
                        ['automatic', 'Automatic Reinforcement'],
                      ] as const).map(([key, label]) => (
                        <div key={key} className="flex items-center gap-2">
                          <Checkbox
                            id={`fn-${key}`}
                            checked={schoolFields.hypothesizedFunctions[key]}
                            onCheckedChange={(checked) => setSchoolFields(p => ({
                              ...p,
                              hypothesizedFunctions: { ...p.hypothesizedFunctions, [key]: !!checked },
                            }))}
                          />
                          <Label htmlFor={`fn-${key}`} className="text-xs cursor-pointer">{label}</Label>
                        </div>
                      ))}
                    </div>
                    <Textarea className="text-sm" rows={3} value={schoolFields.hypothesisNarrative} onChange={e => setSchoolFields(p => ({ ...p, hypothesisNarrative: e.target.value }))} placeholder="Narrative explaining the hypothesized functions..." />
                  </div>

                  <Separator />

                  {/* Recommended Strategies */}
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Recommended Strategies</Label>
                    <Textarea className="text-sm" rows={4} value={schoolFields.recommendedStrategies} onChange={e => setSchoolFields(p => ({ ...p, recommendedStrategies: e.target.value }))} placeholder="Enter numbered strategies, one per line..." />
                  </div>

                  {/* Recommendation Checkboxes */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Recommendations</Label>
                    <div className="space-y-2">
                      {([
                        ['noIntervention', "The student's behaviors do not require further intervention."],
                        ['environmentalMods', "The student's behaviors suggest the need for environmental modifications/accommodations only."],
                        ['bipNecessary', "The student's behaviors suggest a Behavior Intervention Plan is necessary."],
                        ['insufficientData', 'Existing data is insufficient for a complete functional behavior assessment.'],
                      ] as const).map(([key, label]) => (
                        <div key={key} className="flex items-center gap-2">
                          <Checkbox
                            id={`rec-${key}`}
                            checked={schoolFields.recommendationChecklist[key]}
                            onCheckedChange={(checked) => setSchoolFields(p => ({
                              ...p,
                              recommendationChecklist: { ...p.recommendationChecklist, [key]: !!checked },
                            }))}
                          />
                          <Label htmlFor={`rec-${key}`} className="text-xs cursor-pointer">{label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
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

            {/* Export Options */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Export Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="allow-partial"
                    checked={allowPartialExport}
                    onCheckedChange={(checked) => setAllowPartialExport(!!checked)}
                  />
                  <Label htmlFor="allow-partial" className="text-sm cursor-pointer">
                    Allow export with incomplete sections
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="show-draft"
                    checked={showDraftIndicators}
                    onCheckedChange={(checked) => setShowDraftIndicators(!!checked)}
                  />
                  <Label htmlFor="show-draft" className="text-sm cursor-pointer">
                    Show draft/pending indicators in export
                  </Label>
                </div>
              </CardContent>
            </Card>

            {/* Section Completion Status with Manual Overrides */}
            {selectedStudent && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>Section Completion Status</span>
                    <Badge variant={completionPercentage === 100 ? 'default' : 'secondary'}>
                      {completionPercentage}% Complete
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Click toggle to manually mark sections complete (for external data)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(sectionStatus).map(([key, status]) => (
                      <div key={key} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            {status.complete ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            ) : status.partial ? (
                              <AlertTriangle className="w-4 h-4 text-amber-500" />
                            ) : (
                              <Clock className="w-4 h-4 text-muted-foreground" />
                            )}
                            <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                            {(status as any).overridden && (
                              <Badge variant="outline" className="text-xs h-5">External</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs ${status.complete ? 'text-green-600' : status.partial ? 'text-amber-600' : 'text-muted-foreground'}`}>
                              {status.message}
                            </span>
                            <Switch
                              checked={manualOverrides[key]?.complete || false}
                              onCheckedChange={(checked) => {
                                setManualOverrides(prev => ({
                                  ...prev,
                                  [key]: { ...prev[key], complete: checked }
                                }));
                              }}
                              className="scale-75"
                            />
                          </div>
                        </div>
                        {manualOverrides[key]?.complete && (
                          <Input
                            placeholder="Add note about external data source..."
                            value={manualOverrides[key]?.note || ''}
                            onChange={(e) => {
                              setManualOverrides(prev => ({
                                ...prev,
                                [key]: { ...prev[key], note: e.target.value }
                              }));
                            }}
                            className="text-xs h-7 ml-6"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  <Progress value={completionPercentage} className="mt-3 h-2" />
                </CardContent>
              </Card>
            )}

            {/* Custom Sections */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm">Custom Sections</CardTitle>
                    <CardDescription className="text-xs">
                      Add narrative sections for context, observations, or summaries
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCustomSections(prev => [...prev, {
                        id: crypto.randomUUID(),
                        title: '',
                        content: '',
                        position: 'end'
                      }]);
                    }}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Section
                  </Button>
                </div>
              </CardHeader>
              {customSections.length > 0 && (
                <CardContent className="space-y-4">
                  {customSections.map((section, index) => (
                    <div key={section.id} className="border rounded-lg p-3 space-y-3">
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Section title..."
                          value={section.title}
                          onChange={(e) => {
                            setCustomSections(prev => prev.map(s => 
                              s.id === section.id ? { ...s, title: e.target.value } : s
                            ));
                          }}
                          className="flex-1 text-sm"
                        />
                        <Select
                          value={section.position}
                          onValueChange={(v) => {
                            setCustomSections(prev => prev.map(s => 
                              s.id === section.id ? { ...s, position: v as 'beginning' | 'middle' | 'end' } : s
                            ));
                          }}
                        >
                          <SelectTrigger className="w-28 text-xs h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="beginning">Beginning</SelectItem>
                            <SelectItem value="middle">Middle</SelectItem>
                            <SelectItem value="end">End</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setCustomSections(prev => prev.filter(s => s.id !== section.id));
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <Textarea
                        placeholder="Write your narrative, summary, or observations here..."
                        value={section.content}
                        onChange={(e) => {
                          setCustomSections(prev => prev.map(s => 
                            s.id === section.id ? { ...s, content: e.target.value } : s
                          ));
                        }}
                        rows={4}
                        className="text-sm"
                      />
                    </div>
                  ))}
                </CardContent>
              )}
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

            {/* Suggested Strategies from Library */}
            <SuggestedStrategiesPanel
              detectedFunction={analysisData?.primaryFunction?.function}
              studentId={selectedStudentId || undefined}
              onAddToDraft={(content) => {
                // Append to recommendedStrategies text field
                setSchoolFields(prev => ({
                  ...prev,
                  recommendedStrategies: prev.recommendedStrategies
                    ? `${prev.recommendedStrategies}\n• ${content.strategyName}: ${content.teacherQuickVersion || content.description}`
                    : `• ${content.strategyName}: ${content.teacherQuickVersion || content.description}`,
                }));
              }}
            />

            {/* Strategy Narrative Builder */}
            {selectedStudentId && (
              <StrategyNarrativeBuilder
                reportId={`fba-${selectedStudentId}`}
                reportType="fba"
                studentId={selectedStudentId}
                onInsertClinical={(text) => {
                  setSchoolFields(prev => ({
                    ...prev,
                    recommendedStrategies: prev.recommendedStrategies
                      ? `${prev.recommendedStrategies}\n\n${text}`
                      : text,
                  }));
                }}
                onInsertTeacher={(text) => {
                  setSchoolFields(prev => ({
                    ...prev,
                    recommendedStrategies: prev.recommendedStrategies
                      ? `${prev.recommendedStrategies}\n\n--- Teacher Summary ---\n${text}`
                      : `--- Teacher Summary ---\n${text}`,
                  }));
                }}
                onInsertCaregiver={(text) => {
                  setSchoolFields(prev => ({
                    ...prev,
                    recommendedStrategies: prev.recommendedStrategies
                      ? `${prev.recommendedStrategies}\n\n--- Caregiver Summary ---\n${text}`
                      : `--- Caregiver Summary ---\n${text}`,
                  }));
                }}
              />
            )}
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
                    {/* Draft Indicator Banner */}
                    {showDraftIndicators && completionPercentage < 100 && (
                      <div className="draft-banner bg-amber-50 border border-amber-200 rounded-lg p-3 text-center print:block">
                        <p className="text-amber-800 text-sm font-medium">
                          ⚠️ DRAFT - {completionPercentage}% Complete - Some sections pending data collection
                        </p>
                      </div>
                    )}

                    {/* Report Header */}
                    <div className="report-header text-center border-b-2 border-gray-800 pb-4">
                      <h1 className="text-2xl font-bold mb-1">
                        {reportType === 'comprehensive' 
                          ? 'FUNCTIONAL BEHAVIOR ASSESSMENT REPORT' 
                          : 'FBA SUMMARY REPORT'}
                        {showDraftIndicators && completionPercentage < 100 && (
                          <span className="text-amber-600 text-base ml-2">(DRAFT)</span>
                        )}
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

                    {/* Custom Sections - Beginning */}
                    {customSections.filter(s => s.position === 'beginning' && s.title && s.content).map(section => (
                      <div key={section.id} className="section">
                        <h2 className="section-title text-lg font-bold border-b pb-2 mb-3">
                          {section.title.toUpperCase()}
                        </h2>
                        <div className="whitespace-pre-wrap text-sm">{section.content}</div>
                      </div>
                    ))}

                    {/* Background Information (from student profile) */}
                    {includeSections.background && selectedStudent.backgroundInfo && (
                      Object.values(selectedStudent.backgroundInfo).some(v => v && typeof v === 'string' && v.trim())
                    ) && (
                      <div className="section">
                        <h2 className="section-title text-lg font-bold border-b pb-2 mb-3">
                          BACKGROUND INFORMATION
                        </h2>
                        <div className="space-y-4 text-sm">
                          {/* Referral Information */}
                          {(selectedStudent.backgroundInfo.referralReason || 
                            selectedStudent.backgroundInfo.referralSource || 
                            selectedStudent.backgroundInfo.presentingConcerns) && (
                            <div>
                              <h3 className="font-semibold mb-2">Referral Information</h3>
                              {selectedStudent.backgroundInfo.referralSource && (
                                <p><strong>Referral Source:</strong> {selectedStudent.backgroundInfo.referralSource}</p>
                              )}
                              {selectedStudent.backgroundInfo.referralDate && (
                                <p><strong>Referral Date:</strong> {format(new Date(selectedStudent.backgroundInfo.referralDate), 'MMMM d, yyyy')}</p>
                              )}
                              {selectedStudent.backgroundInfo.referralReason && (
                                <p><strong>Reason for Referral:</strong> {selectedStudent.backgroundInfo.referralReason}</p>
                              )}
                              {selectedStudent.backgroundInfo.presentingConcerns && (
                                <p><strong>Presenting Concerns:</strong> {selectedStudent.backgroundInfo.presentingConcerns}</p>
                              )}
                            </div>
                          )}

                          {/* Student History */}
                          {(selectedStudent.backgroundInfo.educationalHistory || 
                            selectedStudent.backgroundInfo.diagnoses || 
                            selectedStudent.backgroundInfo.medicalInfo) && (
                            <div>
                              <h3 className="font-semibold mb-2">Student History</h3>
                              {selectedStudent.backgroundInfo.educationalHistory && (
                                <p><strong>Educational History:</strong> {selectedStudent.backgroundInfo.educationalHistory}</p>
                              )}
                              {selectedStudent.backgroundInfo.previousPlacements && (
                                <p><strong>Previous Placements:</strong> {selectedStudent.backgroundInfo.previousPlacements}</p>
                              )}
                              {selectedStudent.backgroundInfo.diagnoses && (
                                <p><strong>Diagnoses:</strong> {selectedStudent.backgroundInfo.diagnoses}</p>
                              )}
                              {selectedStudent.backgroundInfo.medicalInfo && (
                                <p><strong>Medical Information:</strong> {selectedStudent.backgroundInfo.medicalInfo}</p>
                              )}
                            </div>
                          )}

                          {/* Previous Interventions */}
                          {(selectedStudent.backgroundInfo.previousBIPs || 
                            selectedStudent.backgroundInfo.strategiesTried) && (
                            <div>
                              <h3 className="font-semibold mb-2">Previous Interventions</h3>
                              {selectedStudent.backgroundInfo.previousBIPs && (
                                <p><strong>Previous BIPs:</strong> {selectedStudent.backgroundInfo.previousBIPs}</p>
                              )}
                              {selectedStudent.backgroundInfo.strategiesTried && (
                                <p><strong>Strategies Tried:</strong> {selectedStudent.backgroundInfo.strategiesTried}</p>
                              )}
                              {selectedStudent.backgroundInfo.whatWorked && (
                                <p><strong>What Has Worked:</strong> {selectedStudent.backgroundInfo.whatWorked}</p>
                              )}
                              {selectedStudent.backgroundInfo.whatDidntWork && (
                                <p><strong>What Hasn't Worked:</strong> {selectedStudent.backgroundInfo.whatDidntWork}</p>
                              )}
                            </div>
                          )}

                          {/* Family/Home Context */}
                          {(selectedStudent.backgroundInfo.homeEnvironment || 
                            selectedStudent.backgroundInfo.familyStructure || 
                            selectedStudent.backgroundInfo.culturalConsiderations) && (
                            <div>
                              <h3 className="font-semibold mb-2">Family/Home Context</h3>
                              {selectedStudent.backgroundInfo.homeEnvironment && (
                                <p><strong>Home Environment:</strong> {selectedStudent.backgroundInfo.homeEnvironment}</p>
                              )}
                              {selectedStudent.backgroundInfo.familyStructure && (
                                <p><strong>Family Structure:</strong> {selectedStudent.backgroundInfo.familyStructure}</p>
                              )}
                              {selectedStudent.backgroundInfo.culturalConsiderations && (
                                <p><strong>Cultural Considerations:</strong> {selectedStudent.backgroundInfo.culturalConsiderations}</p>
                              )}
                            </div>
                          )}

                          {/* Behaviors of Concern Summary */}
                          {selectedStudent.backgroundInfo.behaviorsOfConcernSummary && (
                            <div>
                              <h3 className="font-semibold mb-2">Behaviors of Concern</h3>
                              <p>{selectedStudent.backgroundInfo.behaviorsOfConcernSummary}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* No background info warning */}
                    {includeSections.background && !selectedStudent.backgroundInfo && showDraftIndicators && (
                      <div className="section">
                        <h2 className="section-title text-lg font-bold border-b pb-2 mb-3">
                          BACKGROUND INFORMATION
                        </h2>
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-800 text-sm">
                          <span className="font-medium">[PENDING] </span>
                          No background information entered. Add background details in the student's Profile tab.
                        </div>
                      </div>
                    )}

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
                              {!b.operationalDefinition && showDraftIndicators && (
                                <p className="text-sm text-amber-600 italic">
                                  [Definition pending]
                                </p>
                              )}
                            </div>
                          ))}
                          {selectedStudent.behaviors.length === 0 && (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-800 text-sm">
                              {showDraftIndicators && <span className="font-medium">[PENDING] </span>}
                              No behaviors defined - add target behaviors to complete this section
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Direct Observation Data */}
                    {includeSections.directResults && analysisData && (
                      <div className="section">
                        <h2 className="section-title text-lg font-bold border-b pb-2 mb-3 flex items-center gap-2">
                          DIRECT OBSERVATION DATA
                          {showDraftIndicators && !sectionStatus.directResults?.complete && (
                            <span className="text-amber-600 text-sm font-normal">(Pending)</span>
                          )}
                        </h2>
                        {analysisData.abcCount > 0 ? (
                          <div>
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
                                {analysisData.totalObservationMinutes > 0 && (
                                  <>
                                    <tr>
                                      <td className="border p-2">Total Observation Time</td>
                                      <td className="border p-2">{Math.round(analysisData.totalObservationMinutes)} minutes</td>
                                    </tr>
                                    <tr>
                                      <td className="border p-2 font-medium">Average Rate per Hour</td>
                                      <td className="border p-2 font-medium">{analysisData.averageRatePerHour.toFixed(2)} behaviors/hr</td>
                                    </tr>
                                  </>
                                )}
                              </tbody>
                            </table>
                            {analysisData.entriesWithRates && analysisData.entriesWithRates.length > 0 && (
                              <div className="mt-4">
                                <h3 className="font-medium text-sm mb-2">Rate Data by Observation</h3>
                                <table className="data-table w-full border-collapse text-sm">
                                  <thead>
                                    <tr>
                                      <th className="border p-1 bg-gray-100">Date</th>
                                      <th className="border p-1 bg-gray-100">Behavior</th>
                                      <th className="border p-1 bg-gray-100">Count</th>
                                      <th className="border p-1 bg-gray-100">Duration</th>
                                      <th className="border p-1 bg-gray-100">Rate/hr</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {analysisData.entriesWithRates.slice(0, 5).map((entry: any) => (
                                      <tr key={entry.id}>
                                        <td className="border p-1">{format(new Date(entry.timestamp), 'MM/dd/yy')}</td>
                                        <td className="border p-1">{entry.behaviorName || 'Unknown'}</td>
                                        <td className="border p-1 text-center">{entry.count}</td>
                                        <td className="border p-1 text-center">{entry.observationDurationMinutes}m</td>
                                        <td className="border p-1 text-center font-medium">{entry.ratePerHour.toFixed(2)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-800 text-sm">
                            {showDraftIndicators && <span className="font-medium">[PENDING] </span>}
                            No direct observation data collected yet. Collect ABC data to populate this section.
                          </div>
                        )}
                      </div>
                    )}

                    {/* Pattern Analysis */}
                    {includeSections.patterns && analysisData && (
                      <div className="section">
                        <h2 className="section-title text-lg font-bold border-b pb-2 mb-3 flex items-center gap-2">
                          PATTERN ANALYSIS
                          {showDraftIndicators && !sectionStatus.patterns?.complete && (
                            <span className="text-amber-600 text-sm font-normal">(Pending)</span>
                          )}
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

                    {/* Custom Sections - Middle */}
                    {customSections.filter(s => s.position === 'middle' && s.title && s.content).map(section => (
                      <div key={section.id} className="section">
                        <h2 className="section-title text-lg font-bold border-b pb-2 mb-3">
                          {section.title.toUpperCase()}
                        </h2>
                        <div className="whitespace-pre-wrap text-sm">{section.content}</div>
                      </div>
                    ))}

                    {/* Function Analysis */}
                    {includeSections.hypothesis && analysisData && (
                      <div className="section">
                        <h2 className="section-title text-lg font-bold border-b pb-2 mb-3 flex items-center gap-2">
                          FUNCTION ANALYSIS
                          {showDraftIndicators && !sectionStatus.hypothesis?.complete && (
                            <span className="text-amber-600 text-sm font-normal">(Pending)</span>
                          )}
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
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-800 text-sm">
                            {showDraftIndicators && <span className="font-medium">[PENDING] </span>}
                            Insufficient data for function analysis. Collect more ABC data with function tags.
                          </div>
                        )}
                      </div>
                    )}

                    {/* Hypothesis Statement */}
                    {includeSections.hypothesis && (
                      <div className="section">
                        <h2 className="section-title text-lg font-bold border-b pb-2 mb-3 flex items-center gap-2">
                          HYPOTHESIS STATEMENT
                          {showDraftIndicators && !analysisData?.hypothesisStatement && (
                            <span className="text-amber-600 text-sm font-normal">(Pending)</span>
                          )}
                        </h2>
                        {analysisData?.hypothesisStatement ? (
                          <div className="hypothesis-box bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                            <p className="italic">{analysisData.hypothesisStatement}</p>
                          </div>
                        ) : (
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-800 text-sm">
                            {showDraftIndicators && <span className="font-medium">[PENDING] </span>}
                            Hypothesis will be auto-generated after collecting sufficient ABC data.
                          </div>
                        )}
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
                    {/* Additional Notes */}
                    {additionalNotes && (
                      <div className="section">
                        <h2 className="section-title text-lg font-bold border-b pb-2 mb-3">
                          ADDITIONAL NOTES
                        </h2>
                        <p className="whitespace-pre-wrap">{additionalNotes}</p>
                      </div>
                    )}

                    {/* Custom Sections - End */}
                    {customSections.filter(s => s.position === 'end' && s.title && s.content).map(section => (
                      <div key={section.id} className="section">
                        <h2 className="section-title text-lg font-bold border-b pb-2 mb-3">
                          {section.title.toUpperCase()}
                        </h2>
                        <div className="whitespace-pre-wrap text-sm">{section.content}</div>
                      </div>
                    ))}

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
            {/* Completion Status Banner */}
            {selectedStudent && (
              <Card className={`mb-4 ${completionPercentage === 100 ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {completionPercentage === 100 ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                      )}
                      <div>
                        <p className={`font-medium ${completionPercentage === 100 ? 'text-green-800' : 'text-amber-800'}`}>
                          {completionPercentage === 100 
                            ? 'Report Complete - Ready to Export' 
                            : `Draft Report - ${completionPercentage}% Complete`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {completionPercentage < 100 
                            ? 'You can still export with pending sections marked as drafts' 
                            : 'All sections have data'}
                        </p>
                      </div>
                    </div>
                    <Badge variant={completionPercentage === 100 ? 'default' : 'secondary'}>
                      {completionPercentage}%
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Format-specific export */}
            {reportFormat === 'school' && (
              <Card className="cursor-pointer hover:border-primary/50 transition-colors mb-4" onClick={generateSchoolFBA}>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <School className="w-4 h-4" />
                    Download School FBA (.docx)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    District-formatted FBA with tables, function narratives, and ABC data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" disabled={!selectedStudent}>
                    <Download className="w-4 h-4 mr-2" />
                    Download School FBA Report
                  </Button>
                </CardContent>
              </Card>
            )}

            {reportFormat === 'insurance' && (
              <Card className="cursor-pointer hover:border-primary/50 transition-colors mb-4" onClick={handleInsuranceGenerate}>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Download Insurance Report (.docx)
                    {selectedInsuranceTemplate && (
                      <Badge variant="secondary" className="text-xs">{selectedInsuranceTemplate.name}</Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Payer-specific formatted report
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" disabled={!selectedStudent || !selectedInsuranceTemplate || insuranceGenerating}>
                    {insuranceGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                    Download Insurance Report
                  </Button>
                </CardContent>
              </Card>
            )}

            {!reportFormat && (
              <Card className="mb-4 border-dashed">
                <CardContent className="py-6 text-center text-muted-foreground">
                  <p className="text-sm">Select a report format (School FBA or Insurance) in the Settings tab to enable format-specific exports.</p>
                </CardContent>
              </Card>
            )}

            <div className="grid md:grid-cols-3 gap-4">
              {/* Save to Profile */}
              <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={saveFBAFindings}>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    Save to Profile
                    {selectedStudent?.fbaFindings && (
                      <Badge variant="outline" className="text-xs">Update</Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Save findings to student profile
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full" disabled={!selectedStudent}>
                    <Save className="w-4 h-4 mr-2" />
                    {selectedStudent?.fbaFindings ? 'Update Profile' : 'Save to Profile'}
                  </Button>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={handlePrint}>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Printer className="w-4 h-4" />
                    Print / PDF
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Print preview or save as PDF
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
                    Generic .docx
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Standard format (no template)
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

            {/* Data Summary */}
            {selectedStudent && analysisData && (
              <Card className="mt-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Report Data Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className={`p-3 rounded-lg ${analysisData.abcCount > 0 ? 'bg-green-50' : 'bg-amber-50'}`}>
                      <p className="text-2xl font-bold">{analysisData.abcCount}</p>
                      <p className="text-xs text-muted-foreground">ABC Entries</p>
                      {analysisData.abcCount === 0 && (
                        <Badge variant="outline" className="text-xs mt-1">Pending</Badge>
                      )}
                    </div>
                    <div className={`p-3 rounded-lg ${analysisData.sessionCount > 0 ? 'bg-green-50' : 'bg-amber-50'}`}>
                      <p className="text-2xl font-bold">{analysisData.sessionCount}</p>
                      <p className="text-xs text-muted-foreground">Sessions</p>
                      {analysisData.sessionCount === 0 && (
                        <Badge variant="outline" className="text-xs mt-1">Pending</Badge>
                      )}
                    </div>
                    <div className={`p-3 rounded-lg ${analysisData.functionStrengths.length > 0 ? 'bg-green-50' : 'bg-amber-50'}`}>
                      <p className="text-2xl font-bold">{analysisData.functionStrengths.length}</p>
                      <p className="text-xs text-muted-foreground">Functions Identified</p>
                      {analysisData.functionStrengths.length === 0 && (
                        <Badge variant="outline" className="text-xs mt-1">Pending</Badge>
                      )}
                    </div>
                    <div className={`p-3 rounded-lg ${recommendations.length > 0 ? 'bg-green-50' : 'bg-amber-50'}`}>
                      <p className="text-2xl font-bold">{recommendations.length}</p>
                      <p className="text-xs text-muted-foreground">Recommendations</p>
                      {recommendations.length === 0 && (
                        <Badge variant="outline" className="text-xs mt-1">Pending</Badge>
                      )}
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
