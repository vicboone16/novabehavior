import { useState, useMemo } from 'react';
import { Lightbulb, Plus, TrendingUp, AlertCircle, CheckCircle2, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  useCurriculumItems, 
  useStudentTargets, 
  useStudentAssessments, 
  useDomains,
  useTargetActions,
  useCurriculumSystems
} from '@/hooks/useCurriculum';
import type { CurriculumItem, RecommendedTarget, MilestoneScore } from '@/types/curriculum';

interface RecommendationsSubTabProps {
  studentId: string;
  studentName: string;
}

export function RecommendationsSubTab({ studentId, studentName }: RecommendationsSubTabProps) {
  const { systems } = useCurriculumSystems();
  const { domains } = useDomains();
  const { targets, refetch } = useStudentTargets(studentId);
  const { assessments } = useStudentAssessments(studentId);
  const { addTarget } = useTargetActions(studentId, refetch);

  const [domainFilter, setDomainFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');

  // Get VB-MAPP system for items
  const vbmappSystem = systems.find(s => s.name.toLowerCase().includes('vb-mapp'));
  const { items: curriculumItems } = useCurriculumItems(vbmappSystem?.id);

  // Get the latest assessment results
  const latestAssessment = assessments[0];
  const assessmentResults = (latestAssessment?.results_json || {}) as Record<string, MilestoneScore>;

  // Generate recommendations based on assessment gaps
  const recommendations = useMemo((): RecommendedTarget[] => {
    if (!curriculumItems.length) return [];

    const activeTargetSourceIds = new Set(
      targets.filter(t => t.status === 'active' && t.source_id).map(t => t.source_id)
    );
    const masteredTargetSourceIds = new Set(
      targets.filter(t => t.status === 'mastered' && t.source_id).map(t => t.source_id)
    );

    const recommended: RecommendedTarget[] = [];

    // Group items by domain for gap analysis
    const domainItems = new Map<string, CurriculumItem[]>();
    curriculumItems.forEach(item => {
      if (!item.domain_id) return;
      const existing = domainItems.get(item.domain_id) || [];
      existing.push(item);
      domainItems.set(item.domain_id, existing);
    });

    curriculumItems.forEach(item => {
      // Skip if already active or mastered
      if (activeTargetSourceIds.has(item.id) || masteredTargetSourceIds.has(item.id)) return;

      // Check assessment score
      const score = assessmentResults[item.id];
      const itemScore = score?.score ?? -1;

      // Recommend if:
      // 1. Not scored or scored < 1 (not mastered)
      // 2. Has assessment data showing gaps
      if (itemScore >= 1) return; // Already mastered in assessment

      // Calculate priority score
      let priorityScore = 0;
      const reasons: string[] = [];

      // Check if prerequisites are mastered
      const prereqsMastered = item.prerequisites.every(prereqId => 
        masteredTargetSourceIds.has(prereqId) || 
        (assessmentResults[prereqId]?.score ?? 0) >= 1
      );

      if (prereqsMastered && item.prerequisites.length > 0) {
        priorityScore += 30;
        reasons.push('All prerequisites mastered');
      }

      // Check domain gaps
      const domainItemsList = domainItems.get(item.domain_id || '') || [];
      const domainGaps = domainItemsList.filter(di => {
        const s = assessmentResults[di.id]?.score ?? -1;
        return s < 1 && !activeTargetSourceIds.has(di.id);
      }).length;

      if (domainGaps >= 3) {
        priorityScore += 20;
        reasons.push(`Domain has ${domainGaps} gaps`);
      }

      // Prioritize lower levels
      if (item.level === 'Level 1') {
        priorityScore += 15;
      } else if (item.level === 'Level 2') {
        priorityScore += 10;
      }

      // Add score-based priority
      if (itemScore === 0.5) {
        priorityScore += 25;
        reasons.push('Partially scored in assessment');
      } else if (itemScore === 0) {
        priorityScore += 10;
        reasons.push('Not yet demonstrated in assessment');
      } else if (itemScore < 0) {
        priorityScore += 5;
        reasons.push('Not yet assessed');
      }

      // Only include if we have reasons
      if (reasons.length > 0 && priorityScore > 0) {
        recommended.push({
          curriculum_item: item,
          reason: reasons.join(' • '),
          priority_score: priorityScore,
          domain_gap_count: domainGaps,
          related_mastered: item.prerequisites.filter(p => masteredTargetSourceIds.has(p)),
        });
      }
    });

    // Sort by priority score
    return recommended.sort((a, b) => b.priority_score - a.priority_score);
  }, [curriculumItems, targets, assessmentResults]);

  // Filter recommendations
  const filteredRecommendations = useMemo(() => {
    return recommendations.filter(r => {
      if (domainFilter !== 'all' && r.curriculum_item.domain_id !== domainFilter) return false;
      if (levelFilter !== 'all' && r.curriculum_item.level !== levelFilter) return false;
      return true;
    });
  }, [recommendations, domainFilter, levelFilter]);

  // Group by domain for display
  const groupedRecommendations = useMemo(() => {
    const groups = new Map<string, RecommendedTarget[]>();
    
    filteredRecommendations.forEach(rec => {
      const domainName = rec.curriculum_item.domain?.name || 'Other';
      const existing = groups.get(domainName) || [];
      existing.push(rec);
      groups.set(domainName, existing);
    });

    return Array.from(groups.entries()).sort((a, b) => 
      b[1].reduce((s, r) => s + r.priority_score, 0) - a[1].reduce((s, r) => s + r.priority_score, 0)
    );
  }, [filteredRecommendations]);

  const handleAddAsTarget = async (item: CurriculumItem) => {
    await addTarget({
      title: item.title,
      description: item.description,
      mastery_criteria: item.mastery_criteria,
      domain_id: item.domain_id,
      source_type: 'curriculum',
      source_id: item.id,
      linked_prerequisite_ids: item.prerequisites,
    });
  };

  const uniqueLevels = [...new Set(curriculumItems.map(i => i.level).filter(Boolean))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            Target Recommendations
          </h3>
          <p className="text-sm text-muted-foreground">
            Data-driven suggestions based on assessment results and skill gaps
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          {recommendations.length} suggestions
        </Badge>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={domainFilter} onValueChange={setDomainFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Domains" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Domains</SelectItem>
            {domains.map(d => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Levels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            {uniqueLevels.map(level => (
              <SelectItem key={level} value={level!}>{level}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* No assessment warning */}
      {!latestAssessment && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800">No Assessment Data</h4>
                <p className="text-sm text-yellow-700">
                  Complete a VB-MAPP or other curriculum assessment to receive personalized target recommendations.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations by Domain */}
      {groupedRecommendations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto text-green-500/30 mb-4" />
            <h3 className="font-medium text-lg mb-2">No recommendations at this time</h3>
            <p className="text-sm text-muted-foreground">
              {latestAssessment 
                ? 'All suitable targets have been added or mastered. Great progress!'
                : 'Complete a curriculum assessment to generate recommendations.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groupedRecommendations.map(([domainName, recs]) => (
            <div key={domainName} className="space-y-3">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">{domainName}</h4>
                <Badge variant="outline">{recs.length} suggestions</Badge>
              </div>

              <div className="space-y-2">
                {recs.slice(0, 5).map(rec => {
                  const item = rec.curriculum_item;
                  return (
                    <Card key={item.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <Badge variant="outline" className="text-xs">
                                {item.code}
                              </Badge>
                              <h4 className="font-medium text-sm">{item.title}</h4>
                              <Badge variant="secondary" className="text-xs">
                                {item.level}
                              </Badge>
                            </div>

                            {item.description && (
                              <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                                {item.description}
                              </p>
                            )}

                            <div className="flex items-center gap-2 text-xs">
                              <TrendingUp className="w-3 h-3 text-primary" />
                              <span className="text-muted-foreground">{rec.reason}</span>
                            </div>
                          </div>

                          <Button 
                            size="sm" 
                            onClick={() => handleAddAsTarget(item)}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add Target
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                {recs.length > 5 && (
                  <Button variant="ghost" className="w-full text-xs">
                    Show {recs.length - 5} more in {domainName}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
