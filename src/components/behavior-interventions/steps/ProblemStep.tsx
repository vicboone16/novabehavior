 import { useState, useMemo, useEffect } from 'react';
 import { Input } from '@/components/ui/input';
 import { Badge } from '@/components/ui/badge';
 import { ScrollArea } from '@/components/ui/scroll-area';
 import { cn } from '@/lib/utils';
 import { Search, BookOpen, Loader2 } from 'lucide-react';
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
 
   // Initialize with problem if provided
   useEffect(() => {
     if (initialProblemId && problems.length > 0 && !selectedProblem) {
       const problem = problems.find((p) => p.id === initialProblemId);
       if (problem) {
         onProblemSelect(problem);
       }
     }
   }, [initialProblemId, problems, selectedProblem, onProblemSelect]);
 
   // Fuzzy search implementation
   const filteredProblems = useMemo(() => {
     if (!searchQuery.trim()) return problems;
     const q = searchQuery.toLowerCase();
     return problems.filter(
       (p) =>
         p.title.toLowerCase().includes(q) ||
         p.problem_code.toLowerCase().includes(q) ||
         p.definition?.toLowerCase().includes(q) ||
         p.domain.toLowerCase().includes(q) ||
         p.examples?.some((ex) => ex.toLowerCase().includes(q)) ||
         p.trigger_tags?.some((tag) => tag.toLowerCase().includes(q)) ||
         p.function_tags?.some((tag) => tag.toLowerCase().includes(q))
     );
   }, [problems, searchQuery]);
 
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
           Search for and select the target behavior or presenting problem
         </p>
       </div>
 
       {/* Search */}
       <div className="relative">
         <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
         <Input
           placeholder="Search by problem name, code, triggers, functions..."
           value={searchQuery}
           onChange={(e) => setSearchQuery(e.target.value)}
           className="pl-9"
           autoFocus
         />
       </div>
 
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