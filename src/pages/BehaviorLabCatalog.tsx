import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Clock, Zap, Filter, ChevronRight, Info, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useBehaviorLab } from '@/hooks/useBehaviorLab';
import { DIFFICULTY_COLORS, STAGE_LABELS, SKILL_TAG_OPTIONS } from '@/types/behaviorLab';

const SKILL_TAG_LABELS: Record<string, string> = {
  function_identification: 'Function ID',
  reinforcement_concepts: 'Reinforcement',
  replacement_skills: 'Replacement Skills',
  consequence_analysis: 'Consequences',
  antecedent_strategies: 'Antecedents',
  data_interpretation: 'Data Reading',
};

export default function BehaviorLabCatalog() {
  const navigate = useNavigate();
  const { games, loading, recentAttempts, getWeakAreas } = useBehaviorLab();

  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');

  const weakAreas = useMemo(() => getWeakAreas(), [getWeakAreas]);

  const recommended = useMemo(() => {
    if (weakAreas.length === 0) return games.slice(0, 6);
    const weakTags = weakAreas.slice(0, 3).map(w => w.tag);
    const matched = games.filter(g => g.skill_tags.some(t => weakTags.includes(t)));
    return matched.length > 0 ? matched.slice(0, 6) : games.slice(0, 6);
  }, [games, weakAreas]);

  const filtered = useMemo(() => {
    return games.filter(g => {
      if (search && !g.title.toLowerCase().includes(search.toLowerCase()) && !g.description?.toLowerCase().includes(search.toLowerCase())) return false;
      if (difficultyFilter !== 'all' && g.difficulty !== difficultyFilter) return false;
      if (stageFilter !== 'all' && g.stage !== stageFilter) return false;
      if (tagFilter !== 'all' && !g.skill_tags.includes(tagFilter)) return false;
      return true;
    });
  }, [games, search, difficultyFilter, stageFilter, tagFilter]);

  const completedIds = new Set(recentAttempts.filter(a => a.completed_at).map(a => a.game_id));

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading Behavior Lab…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-20">
        <div className="container py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/lms')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-display font-bold text-foreground">Behavior Lab™</h1>
              <p className="text-sm text-muted-foreground">Practice activities to build clinical reasoning</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-8">
        {/* Recommended Next */}
        {recommended.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-secondary" />
              <h2 className="font-display font-semibold text-foreground">Recommended Next</h2>
              {weakAreas.length > 0 && (
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3.5 h-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>Based on your recent practice patterns</TooltipContent>
                </Tooltip>
              )}
            </div>
            <ScrollArea className="w-full">
              <div className="flex gap-3 pb-3">
                {recommended.map(game => (
                  <GameCard
                    key={game.game_id}
                    game={game}
                    completed={completedIds.has(game.game_id)}
                    onClick={() => navigate(`/academy/lab/${game.game_id}`)}
                    compact
                  />
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </section>
        )}

        {/* Filters */}
        <section>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search activities…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                <SelectItem value="identify">Identify</SelectItem>
                <SelectItem value="apply">Apply</SelectItem>
                <SelectItem value="analyze">Analyze</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Skill Area" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Skills</SelectItem>
                {SKILL_TAG_OPTIONS.map(tag => (
                  <SelectItem key={tag} value={tag}>{SKILL_TAG_LABELS[tag] || tag}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Game Grid */}
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Zap className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-display">No activities match your filters</p>
              <p className="text-sm mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(game => (
                <GameCard
                  key={game.game_id}
                  game={game}
                  completed={completedIds.has(game.game_id)}
                  onClick={() => navigate(`/academy/lab/${game.game_id}`)}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function GameCard({
  game,
  completed,
  onClick,
  compact,
}: {
  game: any;
  completed: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  const questionCount = (game.content as any)?.questions?.length || 0;

  return (
    <Card
      className={`cursor-pointer group hover:shadow-md transition-all duration-200 border-border hover:border-primary/30 ${compact ? 'min-w-[260px] max-w-[280px] flex-shrink-0' : ''}`}
      onClick={onClick}
    >
      <CardContent className={compact ? 'p-4' : 'p-5'}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className={`font-display font-semibold text-foreground leading-snug ${compact ? 'text-sm' : 'text-base'}`}>
            {game.title}
          </h3>
          {completed && (
            <Badge variant="outline" className="text-primary border-primary/30 shrink-0 text-[10px]">
              Done
            </Badge>
          )}
        </div>

        {game.description && !compact && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{game.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${DIFFICULTY_COLORS[game.difficulty] || ''}`}>
            {game.difficulty}
          </span>
          <Badge variant="outline" className="text-[10px] h-5">
            {STAGE_LABELS[game.stage] || game.stage}
          </Badge>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {Math.ceil(game.est_seconds / 60)}m
            </span>
            {questionCount > 0 && (
              <span>{questionCount} Q{questionCount !== 1 ? 's' : ''}</span>
            )}
          </div>
          <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
        </div>

        {!compact && game.skill_tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {game.skill_tags.slice(0, 3).map((tag: string) => (
              <span key={tag} className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                {SKILL_TAG_LABELS[tag] || tag}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
