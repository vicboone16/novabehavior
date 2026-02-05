 import { useState, useEffect, useMemo } from 'react';
 import { Input } from '@/components/ui/input';
 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import { Checkbox } from '@/components/ui/checkbox';
 import { Label } from '@/components/ui/label';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
 import { cn } from '@/lib/utils';
import { Plus, Zap, Clock, Lightbulb, CheckCircle2, Target, Loader2, AlertTriangle, ChevronDown, Pencil } from 'lucide-react';
 import { useObjectiveStrategies } from '@/hooks/useBehaviorInterventions';
 import type { BxPresentingProblem, BxStrategy, StrategyPhase } from '@/types/behaviorIntervention';
 import type { BxSkillProgramReplacementGoal, BxSkillProgramObjective, BxSkillProgramIntervention } from '@/types/behavior';
import type { TunnelState, TunnelStep } from '../GuidedInterventionTracker';
 
 interface InterventionsStepProps {
   selectedProblem: BxPresentingProblem | null;
   selectedReplacementGoal: BxSkillProgramReplacementGoal | null;
   supportingObjectives: BxSkillProgramObjective[];
   selectedInterventions: BxSkillProgramIntervention[];
   onInterventionsChange: (interventions: BxSkillProgramIntervention[]) => void;
  tunnelState?: TunnelState;
  onEditStep?: (step: TunnelStep) => void;
 }
 
 const PHASE_CONFIG: Record<StrategyPhase, { label: string; icon: React.ReactNode; color: string }> = {
   prevention: { label: 'Prevention', icon: <Clock className="w-3 h-3" />, color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
   teaching: { label: 'Teaching', icon: <Lightbulb className="w-3 h-3" />, color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' },
   reinforcement: { label: 'Reinforcement', icon: <CheckCircle2 className="w-3 h-3" />, color: 'bg-green-500/10 text-green-600 dark:text-green-400' },
   maintenance: { label: 'Maintenance', icon: <Target className="w-3 h-3" />, color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
   crisis: { label: 'Crisis', icon: <Zap className="w-3 h-3" />, color: 'bg-red-500/10 text-red-600 dark:text-red-400' },
 };
 
 export function InterventionsStep({
   selectedProblem,
   selectedReplacementGoal,
   supportingObjectives,
   selectedInterventions,
   onInterventionsChange,
  tunnelState,
  onEditStep,
 }: InterventionsStepProps) {
   // Get strategies linked to the replacement goal
   const { strategies, loading } = useObjectiveStrategies(selectedReplacementGoal?.goalId);
   const [customIntervention, setCustomIntervention] = useState('');
   const [customPhase, setCustomPhase] = useState<StrategyPhase>('teaching');
  const [summaryOpen, setSummaryOpen] = useState(false);
 
   // Group strategies by phase
   const strategiesByPhase = useMemo(() => {
     return strategies.reduce((acc, s) => {
       const phase = (s.phase as StrategyPhase) || 'teaching';
       if (!acc[phase]) acc[phase] = [];
       acc[phase].push(s);
       return acc;
     }, {} as Record<StrategyPhase, typeof strategies>);
   }, [strategies]);
 
   const isInterventionSelected = (strategyId: string) => {
     return selectedInterventions.some((i) => i.strategyId === strategyId);
   };
 
   const toggleIntervention = (strategy: BxStrategy & { phase: string }) => {
     if (isInterventionSelected(strategy.id)) {
       onInterventionsChange(
         selectedInterventions.filter((i) => i.strategyId !== strategy.id)
       );
     } else {
       onInterventionsChange([
         ...selectedInterventions,
         {
           strategyId: strategy.id,
           name: strategy.strategy_name,
           phase: strategy.phase as BxSkillProgramIntervention['phase'],
           isCustom: false,
         },
       ]);
     }
   };
 
   const addCustomIntervention = () => {
     if (!customIntervention.trim()) return;
 
     onInterventionsChange([
       ...selectedInterventions,
       {
         name: customIntervention.trim(),
         phase: customPhase,
         isCustom: true,
       },
     ]);
     setCustomIntervention('');
   };
 
   const removeIntervention = (name: string, isCustom: boolean) => {
     onInterventionsChange(
       selectedInterventions.filter((i) => !(i.isCustom === isCustom && i.name === name))
     );
   };
 
   return (
     <div className="space-y-4">
      {/* Mobile Summary - Only visible on mobile since sidebar is hidden */}
      <div className="lg:hidden">
        <Collapsible open={summaryOpen} onOpenChange={setSummaryOpen}>
          <Card className="border-primary/30">
            <CollapsibleTrigger className="w-full">
              <CardHeader className="py-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  Review Selections
                </CardTitle>
                <ChevronDown className={cn(
                  "w-4 h-4 transition-transform",
                  summaryOpen && "rotate-180"
                )} />
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-3">
                {/* Problem */}
                <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Problem</p>
                    <p className="text-sm font-medium truncate">{selectedProblem?.title || 'Not selected'}</p>
                  </div>
                  {onEditStep && selectedProblem && (
                    <Button variant="ghost" size="sm" className="h-7" onClick={() => onEditStep(1)}>
                      <Pencil className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>
                
                {/* Replacement Goal */}
                <div className="flex items-center justify-between p-2 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      Replacement Goal
                      <Badge variant="default" className="text-[10px] py-0 px-1">Primary</Badge>
                    </p>
                    <p className="text-sm font-medium">{selectedReplacementGoal?.value || 'Not selected'}</p>
                  </div>
                  {onEditStep && selectedReplacementGoal && (
                    <Button variant="ghost" size="sm" className="h-7" onClick={() => onEditStep(2)}>
                      <Pencil className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>
                
                {/* Objectives */}
                <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Objectives ({supportingObjectives.length})</p>
                    {supportingObjectives.length > 0 ? (
                      <p className="text-sm truncate">{supportingObjectives[0].title}{supportingObjectives.length > 1 ? ` +${supportingObjectives.length - 1} more` : ''}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">None selected</p>
                    )}
                  </div>
                  {onEditStep && (
                    <Button variant="ghost" size="sm" className="h-7" onClick={() => onEditStep(3)}>
                      <Pencil className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>

       <div>
        <h3 className="text-lg font-semibold mb-1">Step 4: Intervention Strategies</h3>
         <p className="text-sm text-muted-foreground">
          Select intervention strategies to support the replacement goal. All interventions are
          linked to the primary <strong>Replacement Goal</strong>.
         </p>
       </div>
 
       {/* Current goal reference */}
       {selectedReplacementGoal && (
         <Card className="bg-primary/5 border-primary">
           <CardContent className="p-3">
             <p className="text-xs text-muted-foreground mb-1">Interventions for:</p>
             <p className="font-medium text-sm">{selectedReplacementGoal.value}</p>
           </CardContent>
         </Card>
       )}
 
       {/* Library strategies by phase */}
       {loading ? (
         <div className="flex items-center justify-center py-8">
           <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
         </div>
       ) : strategies.length === 0 ? (
         <Card className="bg-muted/30 border-dashed">
           <CardContent className="p-4 text-center text-muted-foreground">
             <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
             <p className="text-sm">No linked strategies found.</p>
             <p className="text-xs mt-1">Add custom interventions below.</p>
           </CardContent>
         </Card>
       ) : (
         <div className="space-y-4">
           {(Object.entries(PHASE_CONFIG) as [StrategyPhase, typeof PHASE_CONFIG[StrategyPhase]][]).map(
             ([phase, config]) => {
               const phaseStrategies = strategiesByPhase[phase] || [];
               if (phaseStrategies.length === 0) return null;
 
               return (
                 <Card key={phase}>
                   <CardHeader className="pb-2">
                     <CardTitle className="text-sm flex items-center gap-2">
                       <div className={cn('p-1 rounded', config.color)}>
                         {config.icon}
                       </div>
                       {config.label} ({phaseStrategies.length})
                     </CardTitle>
                   </CardHeader>
                   <CardContent className="space-y-2">
                     {phaseStrategies.map((strategy) => (
                       <div
                         key={strategy.id}
                         className={cn(
                           'p-3 rounded-lg border transition-colors',
                           isInterventionSelected(strategy.id)
                             ? 'bg-primary/5 border-primary'
                             : 'bg-card border-border'
                         )}
                       >
                         <div className="flex items-start gap-3">
                           <Checkbox
                             id={strategy.id}
                             checked={isInterventionSelected(strategy.id)}
                             onCheckedChange={() => toggleIntervention(strategy)}
                           />
                           <div className="flex-1 min-w-0">
                             <Label htmlFor={strategy.id} className="text-sm font-medium cursor-pointer">
                               {strategy.strategy_name}
                             </Label>
                             {strategy.staff_script && (
                               <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                 {strategy.staff_script}
                               </p>
                             )}
                             {strategy.requires_bcba && (
                               <Badge variant="outline" className="text-xs mt-1">
                                 Requires BCBA
                               </Badge>
                             )}
                           </div>
                         </div>
                       </div>
                     ))}
                   </CardContent>
                 </Card>
               );
             }
           )}
         </div>
       )}
 
       {/* Custom intervention input */}
       <div className="space-y-2 pt-3 border-t">
         <h4 className="text-sm font-medium">Add Custom Intervention</h4>
         <div className="flex gap-2">
           <Input
             placeholder="Enter custom intervention..."
             value={customIntervention}
             onChange={(e) => setCustomIntervention(e.target.value)}
             onKeyDown={(e) => e.key === 'Enter' && addCustomIntervention()}
             className="flex-1"
           />
           <select
             value={customPhase}
             onChange={(e) => setCustomPhase(e.target.value as StrategyPhase)}
             className="px-3 py-2 rounded-md border bg-background text-sm"
           >
             {Object.entries(PHASE_CONFIG).map(([phase, config]) => (
               <option key={phase} value={phase}>
                 {config.label}
               </option>
             ))}
           </select>
           <Button
             variant="outline"
             size="icon"
             onClick={addCustomIntervention}
             disabled={!customIntervention.trim()}
           >
             <Plus className="w-4 h-4" />
           </Button>
         </div>
       </div>
 
       {/* Selected interventions summary */}
       {selectedInterventions.length > 0 && (
         <div className="space-y-2 pt-2">
           <h4 className="text-sm font-medium">Selected ({selectedInterventions.length})</h4>
           <div className="flex flex-wrap gap-2">
             {selectedInterventions.map((intervention, idx) => (
               <Badge
                 key={intervention.strategyId || `custom-${idx}`}
                 variant={intervention.isCustom ? 'secondary' : 'default'}
                 className="flex items-center gap-1"
               >
                 {intervention.phase && (
                   <span className="text-xs opacity-70 capitalize">[{intervention.phase}]</span>
                 )}
                 <span className="max-w-[200px] truncate">{intervention.name}</span>
                 <button
                   className="ml-1 hover:text-destructive"
                   onClick={() => removeIntervention(intervention.name, intervention.isCustom)}
                 >
                   ×
                 </button>
               </Badge>
             ))}
           </div>
         </div>
       )}
     </div>
   );
 }