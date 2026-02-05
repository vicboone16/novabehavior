 import { Badge } from '@/components/ui/badge';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Separator } from '@/components/ui/separator';
 import { cn } from '@/lib/utils';
 import { Target, Lightbulb, CheckCircle, AlertCircle } from 'lucide-react';
 import type { TunnelState } from './GuidedInterventionTracker';
 
 interface TunnelSummaryPanelProps {
   tunnelState: TunnelState;
 }
 
 export function TunnelSummaryPanel({ tunnelState }: TunnelSummaryPanelProps) {
   const {
     selectedProblem,
     supportingObjectives,
     selectedReplacementGoal,
     selectedInterventions,
   } = tunnelState;
 
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
           <p className="text-xs text-muted-foreground mb-1">1. Problem</p>
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
 
         {/* Supporting Objectives */}
         <div>
           <p className="text-xs text-muted-foreground mb-1">
             2. Supporting Objectives ({supportingObjectives.length})
           </p>
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
 
         {/* Replacement Goal - PRIMARY */}
         <div className="bg-primary/5 rounded-lg p-2 -mx-2">
           <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
             <Target className="w-3 h-3" />
             3. Replacement Goal
             <Badge variant="default" className="text-[10px] py-0 px-1 ml-1">
               Primary
             </Badge>
           </p>
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