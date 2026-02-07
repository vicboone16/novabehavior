import { CheckCircle2, Clock, Target, BookOpen, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ProtocolTemplate, DEFAULT_PROMPT_HIERARCHY } from '@/types/protocol';

interface ProtocolViewerProps {
  protocol: ProtocolTemplate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProtocolViewer({ protocol, open, onOpenChange }: ProtocolViewerProps) {
  const promptHierarchy = protocol.prompt_hierarchy?.length > 0 ? protocol.prompt_hierarchy : DEFAULT_PROMPT_HIERARCHY;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            {protocol.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Meta Info */}
          <div className="flex flex-wrap gap-2">
            {protocol.curriculum_system && <Badge>{protocol.curriculum_system}</Badge>}
            {protocol.domain && <Badge variant="outline">{protocol.domain}</Badge>}
            {protocol.level && <Badge variant="secondary">{protocol.level}</Badge>}
            <Badge variant="secondary" className="gap-1">
              <Target className="w-3 h-3" /> {protocol.data_collection_method.toUpperCase()}
            </Badge>
            {protocol.estimated_duration_minutes && (
              <Badge variant="secondary" className="gap-1">
                <Clock className="w-3 h-3" /> {protocol.estimated_duration_minutes} min
              </Badge>
            )}
          </div>

          {protocol.description && <p className="text-sm text-muted-foreground">{protocol.description}</p>}

          <Separator />

          {/* Teaching Steps */}
          <div>
            <h3 className="font-semibold mb-2">Teaching Steps</h3>
            <div className="space-y-2">
              {protocol.steps.map((step) => (
                <Card key={step.id}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start gap-3">
                      <span className="text-lg font-bold text-primary">{step.order}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{step.instruction}</p>
                        {step.materials && <p className="text-xs text-muted-foreground mt-1">Materials: {step.materials}</p>}
                        {step.promptLevel && <Badge variant="outline" className="text-xs mt-1">{step.promptLevel}</Badge>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Separator />

          {/* Prompt Hierarchy */}
          <div>
            <h3 className="font-semibold mb-2">Prompt Hierarchy</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {promptHierarchy.map((p) => (
                <div key={p.level} className="flex items-center gap-2 text-sm p-2 bg-muted rounded-md">
                  <Badge variant="outline" className="text-xs font-mono">{p.abbreviation}</Badge>
                  <span>{p.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Mastery Criteria */}
          <div>
            <h3 className="font-semibold mb-2">Mastery Criteria</h3>
            <div className="flex flex-wrap gap-3 text-sm">
              {protocol.mastery_criteria.percentCorrect && (
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  {protocol.mastery_criteria.percentCorrect}% correct
                </div>
              )}
              {protocol.mastery_criteria.consecutiveSessions && (
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  {protocol.mastery_criteria.consecutiveSessions} consecutive sessions
                </div>
              )}
              {protocol.mastery_criteria.acrossStaff && (
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Across {protocol.mastery_criteria.acrossStaff} staff
                </div>
              )}
            </div>
          </div>

          {/* Error Correction */}
          {protocol.error_correction_procedure && (
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Error Correction
              </h3>
              <p className="text-sm bg-amber-50 dark:bg-amber-950/30 p-3 rounded-md">{protocol.error_correction_procedure}</p>
            </div>
          )}

          {/* Generalization */}
          {protocol.generalization_guidelines && (
            <div>
              <h3 className="font-semibold mb-2">Generalization Guidelines</h3>
              <p className="text-sm text-muted-foreground">{protocol.generalization_guidelines}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
