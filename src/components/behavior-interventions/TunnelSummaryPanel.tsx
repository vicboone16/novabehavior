 import { Badge } from '@/components/ui/badge';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
 import { cn } from '@/lib/utils';
import { Target, Lightbulb, CheckCircle, AlertCircle, Pencil } from 'lucide-react';
 import type { TunnelState } from './GuidedInterventionTracker';
import type { TunnelStep } from './GuidedInterventionTracker';
 
 interface TunnelSummaryPanelProps {
   tunnelState: TunnelState;
  currentStep?: TunnelStep;
  onEditStep?: (step: TunnelStep) => void;
 }
 
export function TunnelSummaryPanel({ tunnelState, currentStep, onEditStep }: TunnelSummaryPanelProps) {
   const {
     selectedProblem,
     supportingObjectives,
     selectedReplacementGoal,
     selectedInterventions,
   } = tunnelState;
 
  const showEditButtons = currentStep === 4 && onEditStep;

   return (
     <Card className="h-full">
       <CardHeader className="pb-2">
         <CardTitle className="text-sm flex items-center gap-2">
           <Target className="w-4 h-4" />
           Program Summary
         </CardTitle>
       </CardHeader>
       <CardContent className="space-y-4 text-sm">
         {/* Problem */}
         <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-muted-foreground">1. Problem</p>
            {showEditButtons && selectedProblem && (
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-1 text-xs"
                onClick={() => onEditStep(1)}
              >
                <Pencil className="w-3 h-3 mr-1" />
                Edit
              </Button>
            )}
          </div>
           {selectedProblem ? (
             <div className="flex items-center gap-1 text-primary">
               <CheckCircle className="w-3 h-3" />
               <span className="font-medium truncate">{selectedProblem.title}</span>
             </div>
           ) : (
             <div className="flex items-center gap-1 text-muted-foreground">
               <AlertCircle className="w-3 h-3" />
               <span>Not selected</span>
             </div>
           )}
         </div>
 
         <Separator />
 
        {/* Replacement Goal - PRIMARY */}
        <div className="bg-primary/5 rounded-lg p-2 -mx-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-muted-foreground">
            <Target className="w-3 h-3 inline mr-1" />
            2. Replacement Goal
            <Badge variant="default" className="text-[10px] py-0 px-1 ml-1">
              Primary
            </Badge>
            </p>
            {showEditButtons && selectedReplacementGoal && (
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-1 text-xs"
                onClick={() => onEditStep(2)}
              >
                <Pencil className="w-3 h-3 mr-1" />
                Edit
              </Button>
            )}
          </div>
          {selectedReplacementGoal ? (
            <div className="flex items-center gap-1 text-primary">
              <CheckCircle className="w-3 h-3 shrink-0" />
              <span className="font-medium text-xs">{selectedReplacementGoal.value}</span>
             </div>
           ) : (
            <div className="flex items-center gap-1 text-muted-foreground">
              <AlertCircle className="w-3 h-3" />
              <span className="text-xs">Required - not selected</span>
            </div>
          )}
          {selectedReplacementGoal?.isCustom && (
            <Badge variant="secondary" className="text-[10px] mt-1">
              Custom
            </Badge>
           )}
         </div>
 
         <Separator />
 
        {/* Supporting Objectives */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-muted-foreground">
            3. Objectives / Data Targets ({supportingObjectives.length})
            </p>
            {showEditButtons && supportingObjectives.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-1 text-xs"
                onClick={() => onEditStep(3)}
              >
                <Pencil className="w-3 h-3 mr-1" />
                Edit
              </Button>
            )}
          </div>
          {supportingObjectives.length > 0 ? (
            <div className="space-y-1">
              {supportingObjectives.slice(0, 3).map((obj, idx) => (
                <p key={idx} className="text-xs truncate flex items-center gap-1">
                  <Lightbulb className="w-3 h-3 text-muted-foreground shrink-0" />
                  {obj.title}
                </p>
              ))}
              {supportingObjectives.length > 3 && (
                <p className="text-xs text-muted-foreground">
                  +{supportingObjectives.length - 3} more
                </p>
              )}
             </div>
           ) : (
            <p className="text-xs text-muted-foreground italic">Optional - none selected</p>
           )}
         </div>
 
         <Separator />
 
         {/* Interventions */}
         <div>
           <p className="text-xs text-muted-foreground mb-1">
             4. Interventions ({selectedInterventions.length})
           </p>
           {selectedInterventions.length > 0 ? (
             <div className="space-y-1">
               {selectedInterventions.slice(0, 4).map((intervention, idx) => (
                 <p key={idx} className="text-xs truncate flex items-center gap-1">
                   <span className="w-3 h-3 rounded bg-muted flex items-center justify-center text-[8px] shrink-0">
                     {intervention.phase?.[0]?.toUpperCase() || 'I'}
                   </span>
                   {intervention.name}
                 </p>
               ))}
               {selectedInterventions.length > 4 && (
                 <p className="text-xs text-muted-foreground">
                   +{selectedInterventions.length - 4} more
                 </p>
               )}
             </div>
           ) : (
             <p className="text-xs text-muted-foreground italic">Optional - none selected</p>
           )}
         </div>
       </CardContent>
     </Card>
   );
 }