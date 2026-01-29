import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Building2, Users, CheckCircle } from 'lucide-react';
import { BehaviorDefinition } from '@/types/behavior';

interface PromoteToStandardDialogProps {
  behavior: (BehaviorDefinition & { studentNames?: string[] }) | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (behavior: BehaviorDefinition) => void;
}

export function PromoteToStandardDialog({
  behavior,
  isOpen,
  onClose,
  onConfirm,
}: PromoteToStandardDialogProps) {
  if (!behavior) return null;

  const studentCount = behavior.studentNames?.length || 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Make Standard Behavior
          </DialogTitle>
          <DialogDescription>
            Promote this custom behavior to the organization library.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-secondary/50 rounded-lg">
            <h4 className="font-semibold">{behavior.name}</h4>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-3">
              {behavior.operationalDefinition}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline">{behavior.category}</Badge>
              {studentCount > 0 && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {studentCount} student{studentCount > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>

          <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <p className="text-sm font-medium text-primary mb-2">What happens:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Behavior becomes available in the standard library</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span>All staff can add this behavior to new students</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Existing student-specific definitions are preserved</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Shows as "Organization" instead of "Custom"</span>
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onConfirm(behavior)}>
            <Building2 className="w-4 h-4 mr-2" />
            Make Standard
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
