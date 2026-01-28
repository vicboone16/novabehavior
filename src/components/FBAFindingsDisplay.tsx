import { useState } from 'react';
import { format } from 'date-fns';
import { 
  Brain, Target, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp,
  FileText, Lightbulb, TrendingUp, Clock, Trash2, Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { Student, FBAFindings, FUNCTION_OPTIONS, BehaviorFunction } from '@/types/behavior';
import { useDataStore } from '@/store/dataStore';
import { toast } from 'sonner';

interface FBAFindingsDisplayProps {
  student: Student;
}

export function FBAFindingsDisplay({ student }: FBAFindingsDisplayProps) {
  const { updateStudentProfile } = useDataStore();
  const [isExpanded, setIsExpanded] = useState(true);
  const findings = student.fbaFindings;

  if (!findings) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-6 text-center">
          <Brain className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm text-muted-foreground">No FBA findings saved yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Use the FBA Report Generator to analyze and save findings
          </p>
        </CardContent>
      </Card>
    );
  }

  const getFunctionLabel = (fn?: BehaviorFunction) => {
    return FUNCTION_OPTIONS.find(f => f.value === fn)?.label || 'Unknown';
  };

  const getFunctionColor = (fn?: BehaviorFunction) => {
    const colors: Record<string, string> = {
      attention: 'bg-blue-100 text-blue-800',
      escape: 'bg-orange-100 text-orange-800',
      tangible: 'bg-green-100 text-green-800',
      sensory: 'bg-purple-100 text-purple-800',
      automatic: 'bg-pink-100 text-pink-800',
      unknown: 'bg-muted text-muted-foreground',
    };
    return colors[fn || 'unknown'] || colors.unknown;
  };

  const clearFindings = () => {
    updateStudentProfile(student.id, { fbaFindings: undefined });
    toast.success('FBA findings cleared');
  };

  return (
    <Card>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="w-4 h-4" />
              FBA Findings
              <Badge variant={findings.status === 'complete' ? 'default' : 'secondary'}>
                {findings.status === 'complete' ? 'Complete' : 'Draft'}
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={clearFindings}>
                <Trash2 className="w-3 h-3" />
              </Button>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
          <CardDescription className="text-xs">
            Last updated: {format(new Date(findings.updatedAt), 'MMM dd, yyyy h:mm a')}
            {findings.assessorName && ` by ${findings.assessorName}`}
          </CardDescription>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Primary Function */}
            {findings.primaryFunction && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Primary Function</p>
                <div className="flex items-center gap-2">
                  <Badge className={getFunctionColor(findings.primaryFunction)}>
                    {getFunctionLabel(findings.primaryFunction)}
                  </Badge>
                  {findings.functionStrengths?.find(fs => fs.function === findings.primaryFunction) && (
                    <span className="text-sm font-medium">
                      ({findings.functionStrengths.find(fs => fs.function === findings.primaryFunction)?.percentage}%)
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Function Strengths */}
            {findings.functionStrengths && findings.functionStrengths.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Function Analysis</p>
                <div className="space-y-2">
                  {findings.functionStrengths.map(fs => (
                    <div key={fs.function} className="flex items-center gap-2">
                      <span className="text-xs w-20">{getFunctionLabel(fs.function)}</span>
                      <Progress value={fs.percentage} className="flex-1 h-2" />
                      <span className="text-xs w-10 text-right">{fs.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Patterns */}
            <div className="grid md:grid-cols-2 gap-4">
              {findings.topAntecedents && findings.topAntecedents.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Top Antecedents</p>
                  <div className="space-y-1">
                    {findings.topAntecedents.slice(0, 3).map(a => (
                      <div key={a.value} className="flex justify-between text-sm">
                        <span>{a.value}</span>
                        <span className="text-muted-foreground">{a.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {findings.topConsequences && findings.topConsequences.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Top Consequences</p>
                  <div className="space-y-1">
                    {findings.topConsequences.slice(0, 3).map(c => (
                      <div key={c.value} className="flex justify-between text-sm">
                        <span>{c.value}</span>
                        <span className="text-muted-foreground">{c.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Hypothesis */}
            {findings.hypothesisStatements && findings.hypothesisStatements.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Hypothesis Statement</p>
                <div className="p-3 bg-primary/5 border-l-4 border-primary rounded-r-lg">
                  <p className="text-sm italic">{findings.hypothesisStatements[0]}</p>
                </div>
              </div>
            )}

            {/* Data Summary */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-muted rounded">
                <p className="text-lg font-bold">{findings.abcEntriesCount || 0}</p>
                <p className="text-xs text-muted-foreground">ABC Entries</p>
              </div>
              <div className="p-2 bg-muted rounded">
                <p className="text-lg font-bold">{findings.sessionsCount || 0}</p>
                <p className="text-xs text-muted-foreground">Sessions</p>
              </div>
              <div className="p-2 bg-muted rounded">
                <p className="text-lg font-bold">{findings.recommendations?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Recommendations</p>
              </div>
            </div>

            {/* Recommendations Preview */}
            {findings.recommendations && findings.recommendations.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">
                  Recommendations ({findings.ageRange})
                </p>
                <ul className="space-y-1">
                  {findings.recommendations.slice(0, 3).map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                  {findings.recommendations.length > 3 && (
                    <li className="text-xs text-muted-foreground">
                      +{findings.recommendations.length - 3} more recommendations
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Notes */}
            {findings.notes && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Notes</p>
                <p className="text-sm">{findings.notes}</p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
