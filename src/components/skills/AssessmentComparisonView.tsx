import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { TrendingUp, TrendingDown, Minus, Calendar, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { StudentAssessment, CurriculumItem, MilestoneScore } from '@/types/curriculum';

interface AssessmentComparisonViewProps {
  assessments: StudentAssessment[];
  items: CurriculumItem[];
  onClose: () => void;
}

export function AssessmentComparisonView({
  assessments,
  items,
  onClose,
}: AssessmentComparisonViewProps) {
  const [selectedAssessmentIds, setSelectedAssessmentIds] = useState<string[]>(
    assessments.slice(0, 2).map(a => a.id)
  );

  const selectedAssessments = assessments.filter(a => 
    selectedAssessmentIds.includes(a.id)
  );

  // Group items by domain
  const itemsByDomain = useMemo(() => {
    const grouped = new Map<string, CurriculumItem[]>();
    items.forEach(item => {
      const domainName = item.domain?.name || 'Other';
      if (!grouped.has(domainName)) {
        grouped.set(domainName, []);
      }
      grouped.get(domainName)!.push(item);
    });
    return grouped;
  }, [items]);

  // Calculate domain score differences
  const domainComparison = useMemo(() => {
    const comparison: Record<string, { scores: number[]; change: number }> = {};
    
    Array.from(itemsByDomain.keys()).forEach(domainName => {
      const domainItems = itemsByDomain.get(domainName) || [];
      
      const scores = selectedAssessments.map(assessment => {
        const results = assessment.results_json as Record<string, MilestoneScore>;
        let total = 0;
        domainItems.forEach(item => {
          const score = results[item.id]?.score;
          if (score !== undefined) total += score;
        });
        return total;
      });

      const change = scores.length >= 2 ? scores[0] - scores[scores.length - 1] : 0;
      comparison[domainName] = { scores, change };
    });

    return comparison;
  }, [selectedAssessments, itemsByDomain]);

  const toggleAssessment = (id: string) => {
    setSelectedAssessmentIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(aid => aid !== id);
      }
      return [...prev, id].slice(-3); // Max 3 for comparison
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">Assessment Comparison</h3>
          <p className="text-sm text-muted-foreground">
            Compare scores across multiple assessment dates
          </p>
        </div>
        <Button variant="outline" onClick={onClose}>
          Close Comparison
        </Button>
      </div>

      {/* Assessment Date Selector */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Select Assessments to Compare (up to 3)</CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          <div className="flex flex-wrap gap-2">
            {assessments.map(assessment => (
              <Button
                key={assessment.id}
                variant={selectedAssessmentIds.includes(assessment.id) ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleAssessment(assessment.id)}
              >
                <Calendar className="w-3 h-3 mr-1" />
                {format(new Date(assessment.date_administered), 'MMM d, yyyy')}
                {assessment.status === 'draft' && (
                  <Badge variant="secondary" className="ml-2 text-xs">Draft</Badge>
                )}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedAssessments.length >= 2 && (
        <>
          {/* Domain Score Comparison */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Domain Score Changes</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Domain</TableHead>
                    {selectedAssessments.map(a => (
                      <TableHead key={a.id} className="text-center">
                        {format(new Date(a.date_administered), 'MMM d')}
                      </TableHead>
                    ))}
                    <TableHead className="text-center">Change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(domainComparison).map(([domain, { scores, change }]) => (
                    <TableRow key={domain}>
                      <TableCell className="font-medium">{domain}</TableCell>
                      {scores.map((score, idx) => (
                        <TableCell key={idx} className="text-center">
                          {score.toFixed(1)}
                        </TableCell>
                      ))}
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {change > 0 ? (
                            <>
                              <TrendingUp className="w-4 h-4 text-green-600" />
                              <span className="text-green-600 font-medium">+{change.toFixed(1)}</span>
                            </>
                          ) : change < 0 ? (
                            <>
                              <TrendingDown className="w-4 h-4 text-red-600" />
                              <span className="text-red-600 font-medium">{change.toFixed(1)}</span>
                            </>
                          ) : (
                            <>
                              <Minus className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">0</span>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Skill-Level Changes */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Skills Mastered Between Assessments</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const oldest = selectedAssessments[selectedAssessments.length - 1];
                const newest = selectedAssessments[0];
                const oldResults = oldest.results_json as Record<string, MilestoneScore>;
                const newResults = newest.results_json as Record<string, MilestoneScore>;

                const newlyMastered = items.filter(item => {
                  const oldScore = oldResults[item.id]?.score;
                  const newScore = newResults[item.id]?.score;
                  return (oldScore === undefined || oldScore < 1) && newScore === 1;
                });

                if (newlyMastered.length === 0) {
                  return (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No new skills mastered between selected dates.
                    </p>
                  );
                }

                return (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {newlyMastered.slice(0, 20).map(item => (
                      <div 
                        key={item.id}
                        className="flex items-center gap-2 p-2 bg-green-50 rounded-lg"
                      >
                        <Badge variant="outline" className="text-xs shrink-0">
                          {item.code}
                        </Badge>
                        <span className="text-sm">{item.title}</span>
                        <Badge className="ml-auto bg-green-600">Mastered</Badge>
                      </div>
                    ))}
                    {newlyMastered.length > 20 && (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        +{newlyMastered.length - 20} more skills mastered
                      </p>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
