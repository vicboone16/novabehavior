 import { useState, useMemo, useEffect } from 'react';
 import { Input } from '@/components/ui/input';
 import { Badge } from '@/components/ui/badge';
 import { cn } from '@/lib/utils';
import { Search, BookOpen, Loader2, Sparkles } from 'lucide-react';
 import { usePresentingProblems } from '@/hooks/useBehaviorInterventions';
 import type { BxPresentingProblem } from '@/types/behaviorIntervention';
 import { BX_DOMAINS } from '@/types/behaviorIntervention';
 
 interface ProblemStepProps {
   selectedProblem: BxPresentingProblem | null;
   onProblemSelect: (problem: BxPresentingProblem) => void;
   initialProblemId?: string;
 }
 
 export function ProblemStep({
   selectedProblem,
   onProblemSelect,
   initialProblemId,
 }: ProblemStepProps) {
   const [searchQuery, setSearchQuery] = useState('');
   const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
 
   const { problems, loading } = usePresentingProblems(selectedDomain || undefined);
 
  // Scoring weights for loose search (based on schema)
  const SEARCH_WEIGHTS = {
    exactTitleMatch: 10,
    aliasMatch: 7,
    tokenOverlap: 5,
    domainMatch: 4,
    tagMatch: 3,
    exampleMatch: 2,
  };

  // Token-based search scoring
  const getTokenOverlapScore = (query: string, text: string): number => {
    const queryTokens = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    const textTokens = text.toLowerCase().split(/\s+/);
    let matches = 0;
    for (const qt of queryTokens) {
      if (textTokens.some(tt => tt.includes(qt))) matches++;
    }
    return queryTokens.length > 0 ? matches / queryTokens.length : 0;
  };

  // Score a problem against search query (loose/fuzzy search)
  const scoreProblem = (problem: BxPresentingProblem, query: string): number => {
    if (!query.trim()) return 0;
    const q = query.toLowerCase();
    let score = 0;

    // Exact title match (highest priority)
    if (problem.title.toLowerCase().includes(q)) {
      score += SEARCH_WEIGHTS.exactTitleMatch;
    }

    // Alias/example match (examples serve as aliases)
    if (problem.examples?.some(ex => ex.toLowerCase().includes(q))) {
      score += SEARCH_WEIGHTS.aliasMatch;
    }

    // Token overlap on title and definition
    const titleOverlap = getTokenOverlapScore(q, problem.title);
    const defOverlap = problem.definition ? getTokenOverlapScore(q, problem.definition) : 0;
    score += Math.max(titleOverlap, defOverlap) * SEARCH_WEIGHTS.tokenOverlap;

    // Domain match
    if (problem.domain.toLowerCase().includes(q)) {
      score += SEARCH_WEIGHTS.domainMatch;
    }

    // Tag matches (topics, triggers, functions)
    const allTags = [
      ...(problem.topics || []),
      ...(problem.trigger_tags || []),
      ...(problem.function_tags || []),
    ];
    if (allTags.some(tag => tag.toLowerCase().includes(q))) {
      score += SEARCH_WEIGHTS.tagMatch;
    }

    // Problem code match
    if (problem.problem_code.toLowerCase().includes(q)) {
      score += SEARCH_WEIGHTS.exampleMatch;
    }

    return score;
  };

   // Initialize with problem if provided
   useEffect(() => {
     if (initialProblemId && problems.length > 0 && !selectedProblem) {
       const problem = problems.find((p) => p.id === initialProblemId);
       if (problem) {
         onProblemSelect(problem);
       }
     }
   }, [initialProblemId, problems, selectedProblem, onProblemSelect]);
 
  // Loose search with scoring
  const scoredProblems = useMemo(() => {
    if (!searchQuery.trim()) {
      return problems.map(p => ({ problem: p, score: 0 }));
    }
    return problems
      .map(problem => ({
        problem,
        score: scoreProblem(problem, searchQuery),
      }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score);
  }, [problems, searchQuery]);

  const filteredProblems = useMemo(() => {
    return scoredProblems.map(({ problem }) => problem);
  }, [scoredProblems]);
 
   // Group by domain
   const groupedProblems = useMemo(() => {
     return filteredProblems.reduce((acc, p) => {
       if (!acc[p.domain]) acc[p.domain] = [];
       acc[p.domain].push(p);
       return acc;
     }, {} as Record<string, BxPresentingProblem[]>);
   }, [filteredProblems]);
 
   const getDomainLabel = (domain: string) => {
     const d = BX_DOMAINS.find((bd) => bd.domain === domain);
     return d?.labels.join(' / ') || domain;
   };
 
   return (
     <div className="space-y-4">
       <div>
         <h3 className="text-lg font-semibold mb-1">Step 1: Select Presenting Problem</h3>
         <p className="text-sm text-muted-foreground">
          Search using keywords, phrases, or descriptions — loose matching is supported
         </p>
       </div>
 
       {/* Search */}
       <div className="relative">
         <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
         <Input
          placeholder="Search loose: 'help', 'won't ask', 'routine', 'group work'..."
           value={searchQuery}
           onChange={(e) => setSearchQuery(e.target.value)}
           className="pl-9"
           autoFocus
         />
       </div>
 
      {/* Search results indicator */}
      {searchQuery.trim() && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="w-3 h-3" />
          <span>
            {filteredProblems.length} match{filteredProblems.length !== 1 ? 'es' : ''} found
            {scoredProblems.length > 0 && scoredProblems[0].score >= 10 && (
              <span className="text-primary ml-1">(high confidence)</span>
            )}
          </span>
        </div>
      )}

       {/* Domain filter */}
       <div className="flex flex-wrap gap-1">
         <Badge
           variant={selectedDomain === null ? 'default' : 'outline'}
           className="cursor-pointer text-xs"
           onClick={() => setSelectedDomain(null)}
         >
           All Domains
         </Badge>
         {BX_DOMAINS.map((d) => (
           <Badge
             key={d.domain}
             variant={selectedDomain === d.domain ? 'default' : 'outline'}
             className="cursor-pointer text-xs"
             onClick={() => setSelectedDomain(selectedDomain === d.domain ? null : d.domain)}
           >
             {d.labels[0]}
           </Badge>
         ))}
       </div>
 
       {/* Problem list */}
       {loading ? (
         <div className="flex items-center justify-center py-12">
           <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
         </div>
       ) : filteredProblems.length === 0 ? (
         <div className="text-center py-12 text-muted-foreground">
           <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-50" />
           <p className="font-medium">No problems found</p>
           <p className="text-sm mt-1">Try adjusting your search or domain filter</p>
         </div>
       ) : (
         <div className="space-y-4">
           {Object.entries(groupedProblems).map(([domain, probs]) => (
             <div key={domain}>
               <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                 {getDomainLabel(domain)} ({probs.length})
               </h4>
               <div className="space-y-2">
                 {probs.map((problem) => (
                   <div
                     key={problem.id}
                     className={cn(
                       'p-3 rounded-lg cursor-pointer transition-all border',
                       selectedProblem?.id === problem.id
                         ? 'bg-primary/10 border-primary ring-1 ring-primary'
                         : 'bg-card border-border hover:bg-muted/50 hover:border-muted-foreground/30'
                     )}
                     onClick={() => onProblemSelect(problem)}
                   >
                     <div className="flex items-center gap-2 flex-wrap">
                       <Badge variant="outline" className="text-xs font-mono">
                         {problem.problem_code}
                       </Badge>
                       <span className="font-medium text-sm">{problem.title}</span>
                       <Badge
                         variant="secondary"
                         className={cn(
                           'text-xs ml-auto capitalize',
                           problem.risk_level === 'crisis' && 'bg-destructive/10 text-destructive',
                           problem.risk_level === 'high' && 'bg-destructive/10 text-destructive'
                         )}
                       >
                         {problem.risk_level}
                       </Badge>
                     </div>
                     {problem.definition && (
                       <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                         {problem.definition}
                       </p>
                     )}
                     {problem.function_tags && problem.function_tags.length > 0 && (
                       <div className="flex gap-1 mt-2 flex-wrap">
                         {problem.function_tags.map((tag) => (
                           <Badge key={tag} variant="outline" className="text-xs capitalize">
                             {tag}
                           </Badge>
                         ))}
                       </div>
                     )}
                   </div>
                 ))}
               </div>
             </div>
           ))}
         </div>
       )}
     </div>
   );
 }