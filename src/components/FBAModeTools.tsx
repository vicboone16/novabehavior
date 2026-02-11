import { useState, useMemo } from 'react';
import { 
  ClipboardList, BarChart3, TrendingUp, AlertTriangle, FileText,
  CheckCircle2, Target, Activity, ChevronDown, ChevronUp, Brain, Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useDataStore } from '@/store/dataStore';
import { 
  Student, 
  ABCEntry, 
  BehaviorFunction, 
  FUNCTION_OPTIONS, 
  ANTECEDENT_OPTIONS, 
  CONSEQUENCE_OPTIONS 
} from '@/types/behavior';

interface FBAModeToolsProps {
  student: Student;
}

interface FunctionStrength {
  function: BehaviorFunction;
  label: string;
  count: number;
  percentage: number;
  antecedents: { value: string; count: number }[];
  consequences: { value: string; count: number }[];
}

interface PatternAnalysis {
  topAntecedents: { value: string; count: number; percentage: number }[];
  topConsequences: { value: string; count: number; percentage: number }[];
  functionStrengths: FunctionStrength[];
  primaryFunction: BehaviorFunction | null;
  settingEvents: string[];
}

export function FBAModeTools({ student }: FBAModeToolsProps) {
  const { abcEntries, frequencyEntries, sessions } = useDataStore();
  const [observationNotes, setObservationNotes] = useState('');
  const [showReportDialog, setShowReportDialog] = useState(false);

  // Get student's ABC data
  const studentABCData = useMemo(() => {
    return abcEntries.filter(e => e.studentId === student.id);
  }, [abcEntries, student.id]);

  // Pattern Analysis
  const patternAnalysis = useMemo((): PatternAnalysis => {
    const totalEntries = studentABCData.length;
    if (totalEntries === 0) {
      return {
        topAntecedents: [],
        topConsequences: [],
        functionStrengths: [],
        primaryFunction: null,
        settingEvents: [],
      };
    }

    // Count antecedents
    const antecedentCounts = new Map<string, number>();
    studentABCData.forEach(entry => {
      const antecedents = entry.antecedents || [entry.antecedent];
      antecedents.forEach(a => {
        antecedentCounts.set(a, (antecedentCounts.get(a) || 0) + 1);
      });
    });

    // Count consequences
    const consequenceCounts = new Map<string, number>();
    studentABCData.forEach(entry => {
      const consequences = entry.consequences || [entry.consequence];
      consequences.forEach(c => {
        consequenceCounts.set(c, (consequenceCounts.get(c) || 0) + 1);
      });
    });

    // Infer function from antecedent/consequence patterns when not explicitly tagged
    const inferFunctions = (antecedents: string[], consequences: string[]): BehaviorFunction[] => {
      const inferred = new Set<BehaviorFunction>();
      const allText = [...antecedents, ...consequences].map(t => t.toLowerCase());
      
      // Attention indicators
      const attentionAntecedents = ['no attention', 'attention removed', 'ignored', 'alone', 'not attending', 'low attention', 'diverted attention'];
      const attentionConsequences = ['attention given', 'attention', 'verbal reprimand', 'eye contact', 'physical contact', 'social interaction'];
      if (antecedents.some(a => attentionAntecedents.some(k => a.toLowerCase().includes(k))) ||
          consequences.some(c => attentionConsequences.some(k => c.toLowerCase().includes(k)))) {
        inferred.add('attention');
      }
      
      // Escape indicators
      const escapeAntecedents = ['demand', 'task', 'instruction', 'transition', 'difficult', 'non-preferred', 'work'];
      const escapeConsequences = ['demand removed', 'task removed', 'escape', 'avoidance', 'break', 'left alone'];
      if (antecedents.some(a => escapeAntecedents.some(k => a.toLowerCase().includes(k))) ||
          consequences.some(c => escapeConsequences.some(k => c.toLowerCase().includes(k)))) {
        inferred.add('escape');
      }
      
      // Tangible indicators
      const tangibleAntecedents = ['denied', 'removed', 'item taken', 'desired item', 'desired activity', 'absence of desired', 'told no', 'access denied'];
      const tangibleConsequences = ['access given', 'item given', 'item provided', 'tangible', 'desired item', 'activity provided', 'desired item/activity not provided'];
      if (antecedents.some(a => tangibleAntecedents.some(k => a.toLowerCase().includes(k))) ||
          consequences.some(c => tangibleConsequences.some(k => c.toLowerCase().includes(k)))) {
        inferred.add('tangible');
      }
      
      // Sensory/Automatic indicators
      const sensoryAntecedents = ['sensory', 'alone', 'unstructured', 'idle', 'bored', 'no stimulation'];
      const sensoryConsequences = ['sensory', 'automatic', 'self-stimulation', 'no social consequence', 'ignored'];
      if (antecedents.some(a => sensoryAntecedents.some(k => a.toLowerCase().includes(k))) ||
          consequences.some(c => sensoryConsequences.some(k => c.toLowerCase().includes(k)))) {
        inferred.add('sensory');
      }
      
      return inferred.size > 0 ? Array.from(inferred) : [];
    };

    // Count functions (use explicit tags when available, infer when missing)
    const functionData = new Map<BehaviorFunction, {
      count: number;
      antecedents: Map<string, number>;
      consequences: Map<string, number>;
    }>();

    studentABCData.forEach(entry => {
      const antecedents = entry.antecedents || (entry.antecedent ? [entry.antecedent] : []);
      const consequences = entry.consequences || (entry.consequence ? [entry.consequence] : []);
      
      // Use explicit functions if available, otherwise infer from A-C patterns
      let functions: BehaviorFunction[] = [];
      if (entry.functions && entry.functions.length > 0) {
        functions = entry.functions.filter(f => f !== 'unknown');
      }
      if (functions.length === 0) {
        functions = inferFunctions(antecedents, consequences);
      }
      if (functions.length === 0) return; // Skip only if we truly can't determine

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

    // Calculate percentages and sort
    const topAntecedents = Array.from(antecedentCounts.entries())
      .map(([value, count]) => ({
        value,
        count,
        percentage: Math.round((count / totalEntries) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const topConsequences = Array.from(consequenceCounts.entries())
      .map(([value, count]) => ({
        value,
        count,
        percentage: Math.round((count / totalEntries) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const totalFunctionCount = Array.from(functionData.values()).reduce((sum, d) => sum + d.count, 0);
    
    const functionStrengths: FunctionStrength[] = FUNCTION_OPTIONS
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
      .filter((fs): fs is FunctionStrength => fs !== null && fs.count > 0)
      .sort((a, b) => b.count - a.count);

    const primaryFunction = functionStrengths.length > 0 ? functionStrengths[0].function : null;

    return {
      topAntecedents,
      topConsequences,
      functionStrengths,
      primaryFunction,
      settingEvents: [], // Would come from additional data collection
    };
  }, [studentABCData]);

  // Generate hypothesis statement
  const hypothesisStatement = useMemo(() => {
    if (!patternAnalysis.primaryFunction || patternAnalysis.topAntecedents.length === 0) {
      return null;
    }

    const functionLabel = FUNCTION_OPTIONS.find(f => f.value === patternAnalysis.primaryFunction)?.label || 'unknown';
    const topAntecedent = patternAnalysis.topAntecedents[0]?.value || 'unidentified antecedent';
    const topConsequence = patternAnalysis.topConsequences[0]?.value || 'unidentified consequence';
    
    const behaviorNames = student.behaviors.map(b => b.name).join(', ');

    return `When ${topAntecedent.toLowerCase()}, ${student.name} engages in ${behaviorNames || 'target behavior(s)'} in order to obtain ${functionLabel.toLowerCase()}. The behavior is maintained by ${topConsequence.toLowerCase()}.`;
  }, [patternAnalysis, student]);

  // Function color coding
  const getFunctionColor = (fn: BehaviorFunction) => {
    const colors: Record<BehaviorFunction, string> = {
      attention: 'bg-blue-500',
      escape: 'bg-orange-500',
      tangible: 'bg-green-500',
      sensory: 'bg-purple-500',
      automatic: 'bg-pink-500',
      unknown: 'bg-gray-500',
    };
    return colors[fn] || 'bg-gray-500';
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="patterns" className="w-full">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="patterns" className="gap-1 text-xs">
            <BarChart3 className="w-3 h-3" />
            Patterns
          </TabsTrigger>
          <TabsTrigger value="functions" className="gap-1 text-xs">
            <Brain className="w-3 h-3" />
            Functions
          </TabsTrigger>
          <TabsTrigger value="observations" className="gap-1 text-xs">
            <Eye className="w-3 h-3" />
            Observations
          </TabsTrigger>
          <TabsTrigger value="hypothesis" className="gap-1 text-xs">
            <FileText className="w-3 h-3" />
            Hypothesis
          </TabsTrigger>
        </TabsList>

        {/* Pattern Detection Tab */}
        <TabsContent value="patterns" className="space-y-4 mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Top Antecedents */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  Most Common Antecedents
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patternAnalysis.topAntecedents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No ABC data collected yet</p>
                ) : (
                  <div className="space-y-2">
                    {patternAnalysis.topAntecedents.map((a, i) => (
                      <div key={a.value} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="truncate">{a.value}</span>
                          <span className="text-muted-foreground">{a.percentage}%</span>
                        </div>
                        <Progress value={a.percentage} className="h-2" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Consequences */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Most Common Consequences
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patternAnalysis.topConsequences.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No ABC data collected yet</p>
                ) : (
                  <div className="space-y-2">
                    {patternAnalysis.topConsequences.map((c, i) => (
                      <div key={c.value} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="truncate">{c.value}</span>
                          <span className="text-muted-foreground">{c.percentage}%</span>
                        </div>
                        <Progress value={c.percentage} className="h-2" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Data Summary */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex justify-around text-center">
                <div>
                  <p className="text-2xl font-bold">{studentABCData.length}</p>
                  <p className="text-xs text-muted-foreground">ABC Entries</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{patternAnalysis.topAntecedents.length}</p>
                  <p className="text-xs text-muted-foreground">Unique Antecedents</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{patternAnalysis.functionStrengths.length}</p>
                  <p className="text-xs text-muted-foreground">Functions Identified</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Function Strength Tab */}
        <TabsContent value="functions" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Function Strength Meter</CardTitle>
              <CardDescription className="text-xs">
                Visual representation of hypothesized behavior functions based on ABC data
              </CardDescription>
            </CardHeader>
            <CardContent>
              {patternAnalysis.functionStrengths.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Brain className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Collect more ABC data with function tagging</p>
                  <p className="text-xs">to see function strength analysis</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {patternAnalysis.functionStrengths.map((fs) => (
                    <Collapsible key={fs.function}>
                      <CollapsibleTrigger asChild>
                        <div className="cursor-pointer space-y-2">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${getFunctionColor(fs.function)}`} />
                              <span className="text-sm font-medium">{fs.label}</span>
                              {fs.function === patternAnalysis.primaryFunction && (
                                <Badge variant="secondary" className="text-xs">Primary</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{fs.percentage}%</span>
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            </div>
                          </div>
                          <Progress value={fs.percentage} className="h-3" />
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-2 pl-5 space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <p className="font-medium text-muted-foreground mb-1">Common Antecedents</p>
                            {fs.antecedents.map(a => (
                              <Badge key={a.value} variant="outline" className="mr-1 mb-1 text-xs">
                                {a.value} ({a.count})
                              </Badge>
                            ))}
                          </div>
                          <div>
                            <p className="font-medium text-muted-foreground mb-1">Common Consequences</p>
                            {fs.consequences.map(c => (
                              <Badge key={c.value} variant="outline" className="mr-1 mb-1 text-xs">
                                {c.value} ({c.count})
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Observations Tab */}
        <TabsContent value="observations" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Observation Log</CardTitle>
              <CardDescription className="text-xs">
                Record direct observation notes for the FBA
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Add Observation Notes</Label>
                <Textarea
                  placeholder="Record observations about setting events, environmental factors, timing patterns, etc."
                  value={observationNotes}
                  onChange={(e) => setObservationNotes(e.target.value)}
                  rows={4}
                />
              </div>
              <Button size="sm" disabled={!observationNotes.trim()}>
                <ClipboardList className="w-3 h-3 mr-1" />
                Save Observation
              </Button>
            </CardContent>
          </Card>

          {/* Indirect Assessment Checklist */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Assessment Tools Used</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {['FAST', 'QABF', 'MAS', 'FAI', 'FACTS', 'Other'].map(tool => (
                  <Badge key={tool} variant="outline" className="justify-center py-2 cursor-pointer hover:bg-primary/10">
                    {tool}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hypothesis Tab */}
        <TabsContent value="hypothesis" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="w-4 h-4" />
                Auto-Generated Hypothesis Statement
              </CardTitle>
              <CardDescription className="text-xs">
                Based on collected ABC data and function analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hypothesisStatement ? (
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <p className="text-sm italic">{hypothesisStatement}</p>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <p className="text-sm">Insufficient data to generate hypothesis</p>
                  <p className="text-xs">Collect more ABC data with function tagging</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Report Sections Preview */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">FBA Report Sections</CardTitle>
              <CardDescription className="text-xs">
                Auto-generated sections for FBA report
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {['Background', 'Assessment Procedures', 'Results Summary', 'Hypothesis Statement', 'Initial Recommendations'].map((section, i) => (
                <Collapsible key={section}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-between">
                      <span className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-primary/20 text-xs flex items-center justify-center">
                          {i + 1}
                        </span>
                        {section}
                      </span>
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-4 py-2 text-xs text-muted-foreground bg-muted/30 rounded">
                    {section === 'Hypothesis Statement' && hypothesisStatement ? (
                      <p>{hypothesisStatement}</p>
                    ) : (
                      <p>Content will be auto-generated based on collected data...</p>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </CardContent>
          </Card>

          <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
            <DialogTrigger asChild>
              <Button className="w-full">
                <FileText className="w-4 h-4 mr-2" />
                Generate FBA Report
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>FBA Report Generation</DialogTitle>
              </DialogHeader>
              <div className="py-4 text-center text-muted-foreground">
                <p>FBA report generation coming soon!</p>
                <p className="text-sm">This will compile all FBA data into a formatted report.</p>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
