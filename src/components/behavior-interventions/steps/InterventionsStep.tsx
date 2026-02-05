 import { useState, useEffect, useMemo } from 'react';
 import { Input } from '@/components/ui/input';
 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import { Checkbox } from '@/components/ui/checkbox';
 import { Label } from '@/components/ui/label';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { cn } from '@/lib/utils';
 import { Plus, Zap, Clock, Lightbulb, CheckCircle2, Target, Loader2, AlertTriangle } from 'lucide-react';
 import { useObjectiveStrategies } from '@/hooks/useBehaviorInterventions';
 import type { BxPresentingProblem, BxStrategy, StrategyPhase } from '@/types/behaviorIntervention';
 import type { BxSkillProgramReplacementGoal, BxSkillProgramObjective, BxSkillProgramIntervention } from '@/types/behavior';
 
 interface InterventionsStepProps {
   selectedProblem: BxPresentingProblem | null;
   selectedReplacementGoal: BxSkillProgramReplacementGoal | null;
   supportingObjectives: BxSkillProgramObjective[];
   selectedInterventions: BxSkillProgramIntervention[];
   onInterventionsChange: (interventions: BxSkillProgramIntervention[]) => void;
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
 }: InterventionsStepProps) {
   // Get strategies linked to the replacement goal
   const { strategies, loading } = useObjectiveStrategies(selectedReplacementGoal?.goalId);
   const [customIntervention, setCustomIntervention] = useState('');
   const [customPhase, setCustomPhase] = useState<StrategyPhase>('teaching');
 
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
       <div>
         <h3 className="text-lg font-semibold mb-1">Step 4: Select Interventions</h3>
         <p className="text-sm text-muted-foreground">
           Choose strategies linked to the replacement goal. All interventions attach to the{' '}
           <strong>Replacement Goal</strong>.
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