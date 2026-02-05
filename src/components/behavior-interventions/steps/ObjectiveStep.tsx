 import { useState, useEffect } from 'react';
 import { Input } from '@/components/ui/input';
 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import { Checkbox } from '@/components/ui/checkbox';
 import { Label } from '@/components/ui/label';
 import { Card, CardContent } from '@/components/ui/card';
 import { cn } from '@/lib/utils';
 import { Plus, Target, Info, Loader2 } from 'lucide-react';
import { useGoalObjectives } from '@/hooks/useBehaviorInterventions';
 import type { BxPresentingProblem, BxObjective } from '@/types/behaviorIntervention';
import type { BxSkillProgramObjective, BxSkillProgramReplacementGoal } from '@/types/behavior';
 
 interface ObjectiveStepProps {
   selectedProblem: BxPresentingProblem | null;
  selectedReplacementGoal: BxSkillProgramReplacementGoal | null;
   supportingObjectives: BxSkillProgramObjective[];
   onObjectivesChange: (objectives: BxSkillProgramObjective[]) => void;
 }
 
 export function ObjectiveStep({
   selectedProblem,
  selectedReplacementGoal,
   supportingObjectives,
   onObjectivesChange,
 }: ObjectiveStepProps) {
  // Objectives are now filtered by the selected replacement goal
  const { objectives, loading } = useGoalObjectives(selectedReplacementGoal?.goalId);
   const [customObjective, setCustomObjective] = useState('');
 
   const isObjectiveSelected = (objectiveId: string) => {
     return supportingObjectives.some((o) => o.objectiveId === objectiveId);
   };
 
   const toggleObjective = (objective: BxObjective) => {
     if (isObjectiveSelected(objective.id)) {
       onObjectivesChange(
         supportingObjectives.filter((o) => o.objectiveId !== objective.id)
       );
     } else {
       onObjectivesChange([
         ...supportingObjectives,
         {
           objectiveId: objective.id,
           title: objective.objective_title,
           isCustom: false,
         },
       ]);
     }
   };
 
   const addCustomObjective = () => {
     if (!customObjective.trim()) return;
 
     onObjectivesChange([
       ...supportingObjectives,
       {
         title: customObjective.trim(),
         isCustom: true,
       },
     ]);
     setCustomObjective('');
   };
 
   const removeCustomObjective = (title: string) => {
     onObjectivesChange(
       supportingObjectives.filter((o) => !(o.isCustom && o.title === title))
     );
   };
 
   return (
     <div className="space-y-4">
       <div>
        <h3 className="text-lg font-semibold mb-1">Step 3: Objectives / Data Targets (Optional)</h3>
         <p className="text-sm text-muted-foreground">
          Select measurable replacement behaviors/data targets linked to the goal. These are the
          specific skills you will track data on.
         </p>
       </div>
 
       {/* Info callout */}
       <Card className="bg-muted/50 border-muted">
         <CardContent className="p-3 flex items-start gap-2">
           <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
           <p className="text-xs text-muted-foreground">
            Objectives are children of the selected Replacement Goal. They represent measurable
            behaviors you will collect data on. The goal remains the primary intervention target.
           </p>
         </CardContent>
       </Card>
 
      {/* Selected goal reference */}
      {selectedReplacementGoal && (
         <Card>
           <CardContent className="p-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Objectives for:</p>
              <p className="font-medium text-sm">{selectedReplacementGoal.value}</p>
              <Badge variant={selectedReplacementGoal.isCustom ? 'secondary' : 'outline'} className="text-xs">
                {selectedReplacementGoal.isCustom ? 'Custom Goal' : 'From Library'}
               </Badge>
             </div>
           </CardContent>
         </Card>
       )}
 
       {/* Objectives from library */}
       {loading ? (
         <div className="flex items-center justify-center py-8">
           <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
         </div>
       ) : objectives.length === 0 ? (
         <div className="text-center py-8 text-muted-foreground">
           <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
           <p>No linked objectives found for this problem.</p>
           <p className="text-xs mt-1">You can add custom objectives below or skip this step.</p>
         </div>
       ) : (
         <div className="space-y-2">
           <h4 className="text-sm font-medium">Linked Objectives ({objectives.length})</h4>
           {objectives.map((obj) => (
             <div
               key={obj.id}
               className={cn(
                 'p-3 rounded-lg border transition-colors',
                 isObjectiveSelected(obj.id)
                   ? 'bg-primary/5 border-primary'
                   : 'bg-card border-border'
               )}
             >
               <div className="flex items-start gap-3">
                 <Checkbox
                   id={obj.id}
                   checked={isObjectiveSelected(obj.id)}
                   onCheckedChange={() => toggleObjective(obj)}
                 />
                 <div className="flex-1 min-w-0">
                   <Label
                     htmlFor={obj.id}
                     className="text-sm font-medium cursor-pointer flex items-center gap-2"
                   >
                     <Badge variant="outline" className="text-xs font-mono">
                       {obj.objective_code}
                     </Badge>
                     {obj.objective_title}
                   </Label>
                   {obj.operational_definition && (
                     <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                       {obj.operational_definition}
                     </p>
                   )}
                   {obj.mastery_criteria && (
                     <p className="text-xs mt-1">
                       <span className="font-medium">Mastery:</span>{' '}
                       <span className="text-muted-foreground">{obj.mastery_criteria}</span>
                     </p>
                   )}
                 </div>
               </div>
             </div>
           ))}
         </div>
       )}
 
       {/* Custom objective input */}
       <div className="space-y-2 pt-2">
         <h4 className="text-sm font-medium">Add Custom Objective</h4>
         <div className="flex gap-2">
           <Input
             placeholder="Enter a custom objective..."
             value={customObjective}
             onChange={(e) => setCustomObjective(e.target.value)}
             onKeyDown={(e) => e.key === 'Enter' && addCustomObjective()}
           />
           <Button
             variant="outline"
             size="icon"
             onClick={addCustomObjective}
             disabled={!customObjective.trim()}
           >
             <Plus className="w-4 h-4" />
           </Button>
         </div>
       </div>
 
       {/* Selected objectives summary */}
       {supportingObjectives.length > 0 && (
         <div className="space-y-2 pt-2">
           <h4 className="text-sm font-medium">
             Selected ({supportingObjectives.length})
           </h4>
           <div className="flex flex-wrap gap-2">
             {supportingObjectives.map((obj, idx) => (
               <Badge
                 key={obj.objectiveId || `custom-${idx}`}
                 variant={obj.isCustom ? 'secondary' : 'default'}
                 className="flex items-center gap-1"
               >
                 {obj.isCustom && <span className="text-xs opacity-70">(Custom)</span>}
                 <span className="max-w-[200px] truncate">{obj.title}</span>
                 <button
                   className="ml-1 hover:text-destructive"
                   onClick={() => {
                     if (obj.isCustom) {
                       removeCustomObjective(obj.title);
                     } else if (obj.objectiveId) {
                       const fullObj = objectives.find((o) => o.id === obj.objectiveId);
                       if (fullObj) toggleObjective(fullObj);
                     }
                   }}
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