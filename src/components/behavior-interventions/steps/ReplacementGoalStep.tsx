 import { useState, useEffect } from 'react';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Badge } from '@/components/ui/badge';
 import { Card, CardContent } from '@/components/ui/card';
 import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
 import { Alert, AlertDescription } from '@/components/ui/alert';
 import { cn } from '@/lib/utils';
 import { Target, Lightbulb, Edit3, Info } from 'lucide-react';
 import { useProblemObjectives } from '@/hooks/useBehaviorInterventions';
 import type { BxPresentingProblem, BxObjective } from '@/types/behaviorIntervention';
 import type { BxSkillProgramReplacementGoal } from '@/types/behavior';
 
 interface ReplacementGoalStepProps {
   selectedProblem: BxPresentingProblem | null;
   selectedReplacementGoal: BxSkillProgramReplacementGoal | null;
   onReplacementGoalChange: (goal: BxSkillProgramReplacementGoal | null) => void;
 }
 
 export function ReplacementGoalStep({
   selectedProblem,
   selectedReplacementGoal,
   onReplacementGoalChange,
 }: ReplacementGoalStepProps) {
   const { objectives, loading } = useProblemObjectives(selectedProblem?.id);
   const [customGoal, setCustomGoal] = useState('');
   const [selectionMode, setSelectionMode] = useState<'library' | 'custom'>('library');
 
   // Auto-select first objective as default replacement goal
   useEffect(() => {
     if (objectives.length > 0 && !selectedReplacementGoal && selectionMode === 'library') {
       const firstObj = objectives[0];
       onReplacementGoalChange({
         goalId: firstObj.id,
         value: firstObj.objective_title,
         isCustom: false,
         sourceLibraryGoal: firstObj.objective_title,
       });
     }
   }, [objectives, selectedReplacementGoal, selectionMode, onReplacementGoalChange]);
 
   // Update custom goal
   useEffect(() => {
     if (selectionMode === 'custom' && customGoal.trim()) {
       onReplacementGoalChange({
         value: customGoal.trim(),
         isCustom: true,
       });
     }
   }, [customGoal, selectionMode, onReplacementGoalChange]);
 
   const handleLibraryGoalSelect = (objective: BxObjective) => {
     setSelectionMode('library');
     onReplacementGoalChange({
       goalId: objective.id,
       value: objective.objective_title,
       isCustom: false,
       sourceLibraryGoal: objective.objective_title,
     });
   };
 
   const handleCustomMode = () => {
     setSelectionMode('custom');
     if (customGoal.trim()) {
       onReplacementGoalChange({
         value: customGoal.trim(),
         isCustom: true,
       });
     } else {
       onReplacementGoalChange(null);
     }
   };
 
   return (
     <div className="space-y-4">
       <div>
         <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
           <Target className="w-5 h-5 text-primary" />
           Step 3: Replacement Goal
           <Badge variant="default" className="text-xs">Primary Target</Badge>
         </h3>
         <p className="text-sm text-muted-foreground">
           This is the <strong>primary intervention target</strong> that will be saved and linked to interventions.
         </p>
       </div>
 
       {/* Important notice */}
       <Alert>
         <Lightbulb className="h-4 w-4" />
         <AlertDescription className="text-sm">
           The replacement goal you select here becomes an <strong>editable copy</strong> on the student's profile.
           You can customize it later without affecting the library.
         </AlertDescription>
       </Alert>
 
       {/* Selected problem reference */}
       {selectedProblem && (
         <Card className="bg-muted/50">
           <CardContent className="p-3">
             <div className="flex items-center gap-2">
               <Badge variant="outline" className="text-xs font-mono">
                 {selectedProblem.problem_code}
               </Badge>
               <span className="font-medium text-sm">{selectedProblem.title}</span>
             </div>
           </CardContent>
         </Card>
       )}
 
       {/* Goal selection */}
       <div className="space-y-3">
         {/* Library goals */}
         {objectives.length > 0 && (
           <div className="space-y-2">
             <h4 className="text-sm font-medium">Select from Library</h4>
             <RadioGroup
               value={selectionMode === 'library' ? selectedReplacementGoal?.goalId || '' : ''}
               onValueChange={(val) => {
                 const obj = objectives.find((o) => o.id === val);
                 if (obj) handleLibraryGoalSelect(obj);
               }}
             >
               {objectives.map((obj) => (
                 <div
                   key={obj.id}
                   className={cn(
                     'p-3 rounded-lg border transition-colors',
                     selectionMode === 'library' && selectedReplacementGoal?.goalId === obj.id
                       ? 'bg-primary/10 border-primary ring-1 ring-primary'
                       : 'bg-card border-border hover:bg-muted/50'
                   )}
                 >
                   <div className="flex items-start gap-3">
                     <RadioGroupItem value={obj.id} id={obj.id} className="mt-1" />
                     <div className="flex-1">
                       <Label htmlFor={obj.id} className="text-sm font-medium cursor-pointer">
                         {obj.objective_title}
                       </Label>
                       {obj.operational_definition && (
                         <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                           {obj.operational_definition}
                         </p>
                       )}
                     </div>
                   </div>
                 </div>
               ))}
             </RadioGroup>
           </div>
         )}
 
         {objectives.length === 0 && !loading && (
           <Card className="bg-muted/30 border-dashed">
             <CardContent className="p-4 text-center text-muted-foreground">
               <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
               <p className="text-sm">No library goals linked to this problem.</p>
               <p className="text-xs mt-1">Enter a custom replacement goal below.</p>
             </CardContent>
           </Card>
         )}
 
         {/* Custom goal input */}
         <div className="space-y-2 pt-3 border-t">
           <div className="flex items-center gap-2">
             <Edit3 className="w-4 h-4 text-muted-foreground" />
             <h4 className="text-sm font-medium">Or enter a custom replacement goal</h4>
           </div>
           <Input
             placeholder="Type your custom replacement goal..."
             value={customGoal}
             onChange={(e) => {
               setCustomGoal(e.target.value);
               if (e.target.value.trim()) {
                 handleCustomMode();
               }
             }}
             onFocus={() => {
               if (customGoal.trim()) {
                 handleCustomMode();
               }
             }}
             className={cn(
               selectionMode === 'custom' && customGoal.trim() && 'ring-1 ring-primary border-primary'
             )}
           />
           {selectionMode === 'custom' && customGoal.trim() && (
             <p className="text-xs text-muted-foreground flex items-center gap-1">
               <Info className="w-3 h-3" />
               Custom goal will be saved to the student's profile
             </p>
           )}
         </div>
       </div>
 
       {/* Current selection summary */}
       {selectedReplacementGoal && (
         <Card className="bg-primary/5 border-primary">
           <CardContent className="p-3">
             <div className="flex items-center justify-between">
               <div>
                 <p className="text-xs text-muted-foreground mb-1">Selected Replacement Goal:</p>
                 <p className="font-medium text-sm">{selectedReplacementGoal.value}</p>
               </div>
               <Badge variant={selectedReplacementGoal.isCustom ? 'secondary' : 'default'}>
                 {selectedReplacementGoal.isCustom ? 'Custom' : 'From Library'}
               </Badge>
             </div>
           </CardContent>
         </Card>
       )}
     </div>
   );
 }