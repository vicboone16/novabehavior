 import { useState, useEffect, useMemo } from 'react';
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import { Card, CardContent } from '@/components/ui/card';
 import { ScrollArea } from '@/components/ui/scroll-area';
 import { Separator } from '@/components/ui/separator';
 import { cn } from '@/lib/utils';
 import { toast } from 'sonner';
 import {
   ChevronRight,
   ChevronLeft,
   Target,
   Lock,
   Check,
   Loader2,
   Save,
 } from 'lucide-react';
import { ProblemStep } from './steps/ProblemStep';
import { ReplacementGoalStep } from './steps/ReplacementGoalStep';
import { ObjectiveStep } from './steps/ObjectiveStep';
import { InterventionsStep } from './steps/InterventionsStep';
 import { TunnelSummaryPanel } from './TunnelSummaryPanel';
 import type {
   BxPresentingProblem,
   BxObjective,
   BxStrategy,
 } from '@/types/behaviorIntervention';
 import type {
   BxSkillProgram,
   BxSkillProgramObjective,
   BxSkillProgramReplacementGoal,
   BxSkillProgramIntervention,
 } from '@/types/behavior';
 import { useDataStore } from '@/store/dataStore';
 
 interface GuidedInterventionTrackerProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   studentId: string;
   studentName: string;
   initialProblemId?: string;
 }
 
 export type TunnelStep = 1 | 2 | 3 | 4;
 
 export interface TunnelState {
   currentStep: TunnelStep;
   completedSteps: TunnelStep[];
   selectedProblem: BxPresentingProblem | null;
   supportingObjectives: BxSkillProgramObjective[];
   selectedReplacementGoal: BxSkillProgramReplacementGoal | null;
   selectedInterventions: BxSkillProgramIntervention[];
 }
 
 const STEP_LABELS: Record<TunnelStep, string> = {
   1: 'Problem',
  2: 'Replacement Goal',
  3: 'Objectives',
   4: 'Interventions',
 };
 
 export function GuidedInterventionTracker({
   open,
   onOpenChange,
   studentId,
   studentName,
   initialProblemId,
 }: GuidedInterventionTrackerProps) {
   const updateStudentProfile = useDataStore((state) => state.updateStudentProfile);
   const students = useDataStore((state) => state.students);
   const student = students.find((s) => s.id === studentId);
 
   const [tunnelState, setTunnelState] = useState<TunnelState>({
     currentStep: 1,
     completedSteps: [],
     selectedProblem: null,
     supportingObjectives: [],
     selectedReplacementGoal: null,
     selectedInterventions: [],
   });
 
   const [isSaving, setIsSaving] = useState(false);
 
   // Reset when dialog closes
   useEffect(() => {
     if (!open) {
       setTunnelState({
         currentStep: 1,
         completedSteps: [],
         selectedProblem: null,
         supportingObjectives: [],
         selectedReplacementGoal: null,
         selectedInterventions: [],
       });
     }
   }, [open]);
 
   const handleContinue = () => {
     const { currentStep } = tunnelState;
     
     // Validate current step before proceeding
     if (currentStep === 1 && !tunnelState.selectedProblem) {
       toast.error('Please select a presenting problem');
       return;
     }
     
    if (currentStep === 2 && !tunnelState.selectedReplacementGoal) {
       toast.error('Please select or enter a replacement goal');
       return;
     }
 
     if (currentStep < 4) {
       setTunnelState((prev) => ({
         ...prev,
         currentStep: (prev.currentStep + 1) as TunnelStep,
         completedSteps: prev.completedSteps.includes(currentStep)
           ? prev.completedSteps
           : [...prev.completedSteps, currentStep],
       }));
     }
   };
 
   const handleBack = () => {
     if (tunnelState.currentStep > 1) {
       setTunnelState((prev) => ({
         ...prev,
         currentStep: (prev.currentStep - 1) as TunnelStep,
       }));
     }
   };
 
   const isStepLocked = (step: TunnelStep): boolean => {
     if (step === 1) return false;
     return !tunnelState.completedSteps.includes((step - 1) as TunnelStep);
   };
 
   const isStepComplete = (step: TunnelStep): boolean => {
     return tunnelState.completedSteps.includes(step);
   };
 
   const handleProblemSelect = (problem: BxPresentingProblem) => {
     setTunnelState((prev) => ({
       ...prev,
       selectedProblem: problem,
     }));
   };
 
   const handleObjectivesChange = (objectives: BxSkillProgramObjective[]) => {
     setTunnelState((prev) => ({
       ...prev,
       supportingObjectives: objectives,
     }));
   };
 
   const handleReplacementGoalChange = (goal: BxSkillProgramReplacementGoal | null) => {
     setTunnelState((prev) => ({
       ...prev,
       selectedReplacementGoal: goal,
     }));
   };
 
   const handleInterventionsChange = (interventions: BxSkillProgramIntervention[]) => {
     setTunnelState((prev) => ({
       ...prev,
       selectedInterventions: interventions,
     }));
   };
 
   const handleSave = async () => {
     if (!tunnelState.selectedProblem || !tunnelState.selectedReplacementGoal) {
       toast.error('Missing required information');
       return;
     }
 
     setIsSaving(true);
     try {
       // Create the skill program record
       const skillProgram: BxSkillProgram = {
         id: crypto.randomUUID(),
         studentId,
         problemId: tunnelState.selectedProblem.id,
         problemTitle: tunnelState.selectedProblem.title,
         problemCode: tunnelState.selectedProblem.problem_code,
         replacementGoal: tunnelState.selectedReplacementGoal,
         supportingObjectives: tunnelState.supportingObjectives,
         interventions: tunnelState.selectedInterventions,
         status: 'active',
         createdAt: new Date(),
         updatedAt: new Date(),
       };
 
       // Get existing skill programs or initialize empty array
       const existingPrograms = (student as any)?.bxSkillPrograms || [];
 
       // Update student profile with new skill program
       updateStudentProfile(studentId, {
         bxSkillPrograms: [...existingPrograms, skillProgram],
       } as any);
 
       toast.success('Skill program saved successfully');
       onOpenChange(false);
     } catch (error) {
       console.error('Error saving skill program:', error);
       toast.error('Failed to save skill program');
     } finally {
       setIsSaving(false);
     }
   };
 
   const canSave = tunnelState.selectedProblem && tunnelState.selectedReplacementGoal;
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
         <DialogHeader>
           <DialogTitle className="flex items-center gap-2">
             <Target className="w-5 h-5 text-primary" />
             Create Skill Program for {studentName}
           </DialogTitle>
           <DialogDescription>
             Follow the guided steps to create a behavior intervention skill program
           </DialogDescription>
         </DialogHeader>
 
         {/* Step Progress Indicator */}
         <div className="flex items-center justify-between py-3 px-1">
           {([1, 2, 3, 4] as TunnelStep[]).map((step) => (
             <div key={step} className="flex items-center flex-1">
               <div
                 className={cn(
                   'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all',
                   tunnelState.currentStep === step
                     ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2'
                     : isStepComplete(step)
                     ? 'bg-primary/80 text-primary-foreground'
                     : isStepLocked(step)
                     ? 'bg-muted text-muted-foreground'
                     : 'bg-muted text-foreground'
                 )}
               >
                 {isStepComplete(step) ? (
                   <Check className="w-4 h-4" />
                 ) : isStepLocked(step) ? (
                   <Lock className="w-3 h-3" />
                 ) : (
                   step
                 )}
               </div>
               <div className="ml-2 hidden sm:block">
                 <p
                   className={cn(
                     'text-xs font-medium',
                     tunnelState.currentStep === step
                       ? 'text-primary'
                       : isStepLocked(step)
                       ? 'text-muted-foreground'
                       : 'text-foreground'
                   )}
                 >
                   {STEP_LABELS[step]}
                 </p>
               </div>
               {step < 4 && (
                 <div
                   className={cn(
                     'flex-1 h-0.5 mx-3',
                     isStepComplete(step) ? 'bg-primary' : 'bg-muted'
                   )}
                 />
               )}
             </div>
           ))}
         </div>
 
         <Separator />
 
         {/* Main Content Area */}
         <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
           {/* Left: Step Content */}
           <div className="flex-1 min-w-0 overflow-hidden">
             <ScrollArea className="h-full">
               <div className="pr-4 pb-4">
                 {tunnelState.currentStep === 1 && (
                   <ProblemStep
                     selectedProblem={tunnelState.selectedProblem}
                     onProblemSelect={handleProblemSelect}
                     initialProblemId={initialProblemId}
                   />
                 )}
 
                 {tunnelState.currentStep === 2 && (
                   <ReplacementGoalStep
                     selectedProblem={tunnelState.selectedProblem}
                     selectedReplacementGoal={tunnelState.selectedReplacementGoal}
                     onReplacementGoalChange={handleReplacementGoalChange}
                   />
                 )}
 
                {tunnelState.currentStep === 3 && (
                  <ObjectiveStep
                    selectedProblem={tunnelState.selectedProblem}
                    selectedReplacementGoal={tunnelState.selectedReplacementGoal}
                    supportingObjectives={tunnelState.supportingObjectives}
                    onObjectivesChange={handleObjectivesChange}
                  />
                )}

                 {tunnelState.currentStep === 4 && (
                   <InterventionsStep
                     selectedProblem={tunnelState.selectedProblem}
                     selectedReplacementGoal={tunnelState.selectedReplacementGoal}
                     supportingObjectives={tunnelState.supportingObjectives}
                     selectedInterventions={tunnelState.selectedInterventions}
                     onInterventionsChange={handleInterventionsChange}
                   />
                 )}
               </div>
             </ScrollArea>
           </div>
 
           {/* Right: Summary Panel */}
           <div className="w-64 shrink-0 hidden lg:block">
             <TunnelSummaryPanel tunnelState={tunnelState} />
           </div>
         </div>
 
         <Separator />
 
         {/* Footer Navigation */}
         <div className="flex items-center justify-between pt-2">
           <Button
             variant="outline"
             onClick={handleBack}
             disabled={tunnelState.currentStep === 1}
           >
             <ChevronLeft className="w-4 h-4 mr-1" />
             Back
           </Button>
 
           <div className="flex gap-2">
             {tunnelState.currentStep < 4 ? (
               <Button onClick={handleContinue}>
                 Continue
                 <ChevronRight className="w-4 h-4 ml-1" />
               </Button>
             ) : (
               <Button onClick={handleSave} disabled={!canSave || isSaving}>
                 {isSaving ? (
                   <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                 ) : (
                   <Save className="w-4 h-4 mr-2" />
                 )}
                 Save Program
               </Button>
             )}
           </div>
         </div>
       </DialogContent>
     </Dialog>
   );
 }