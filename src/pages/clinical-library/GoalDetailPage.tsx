import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Tag, ListChecks, Target as TargetIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useGoalDetail, type CrosswalkTag } from '@/hooks/useClinicalGoals';

export default function GoalDetailPage() {
  const { goalId } = useParams<{ goalId: string }>();
  const navigate = useNavigate();
  const { data: goal, isLoading, error } = useGoalDetail(goalId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !goal) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Goal not found</p>
      </div>
    );
  }

  // Group crosswalk tags by system
  const tagsBySystem = new Map<string, CrosswalkTag[]>();
  goal.crosswalkTags.forEach(tag => {
    if (!tagsBySystem.has(tag.system_name)) tagsBySystem.set(tag.system_name, []);
    tagsBySystem.get(tag.system_name)!.push(tag);
  });

  const handleTagClick = (tagId: string) => {
    navigate(`/clinical-library/clinical-collections/goal-banks?crosswalkTag=${tagId}`);
  };

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold">{goal.title}</h2>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <Badge variant="outline">{goal.domain}</Badge>
          {goal.subdomain && <Badge variant="secondary">{goal.subdomain}</Badge>}
          {goal.phase && <Badge variant="secondary">{goal.phase}</Badge>}
          {goal.goal_category && <Badge variant="outline">{goal.goal_category}</Badge>}
          {goal.program_name && (
            <span className="text-xs text-muted-foreground">Program: {goal.program_name}</span>
          )}
        </div>
      </div>

      {/* Description */}
      {goal.description && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{goal.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Objective */}
      {goal.objective && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Objective</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{goal.objective}</p>
          </CardContent>
        </Card>
      )}

      {/* Benchmarks */}
      {goal.benchmarks.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ListChecks className="w-4 h-4" />
              Benchmarks
              <Badge variant="secondary" className="text-[10px]">{goal.benchmarks.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2">
              {goal.benchmarks.map((b, i) => (
                <li key={b.id} className="flex gap-3 text-sm">
                  <span className="text-muted-foreground font-mono text-xs shrink-0 w-6 text-right">
                    {b.benchmark_order ?? i + 1}.
                  </span>
                  <span>{b.benchmark_text}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Targets */}
      {goal.targets.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TargetIcon className="w-4 h-4" />
              Targets
              <Badge variant="secondary" className="text-[10px]">{goal.targets.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {goal.targets.map(t => (
                <li key={t.id} className="text-sm flex gap-2">
                  <span className="text-muted-foreground text-xs shrink-0 w-6 text-right font-mono">
                    {t.target_order}.
                  </span>
                  <span>{t.target_text}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Crosswalk Tags */}
      {goal.crosswalkTags.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Crosswalk Tags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from(tagsBySystem.entries()).map(([system, tags]) => (
                <div key={system}>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">{system}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map(tag => (
                      <Badge
                        key={tag.id}
                        variant="outline"
                        className="text-[11px] cursor-pointer hover:bg-primary/10 hover:border-primary/40 transition-colors"
                        onClick={() => handleTagClick(tag.id)}
                      >
                        {tag.tag_name}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
