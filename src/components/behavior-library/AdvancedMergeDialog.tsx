import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Merge, Users, ArrowRight, AlertTriangle, ChevronRight, ChevronLeft } from 'lucide-react';
import { BehaviorDefinition } from '@/types/behavior';

interface BehaviorWithStudents extends BehaviorDefinition {
  studentNames: string[];
  studentCount: number;
  dataEntries?: {
    frequency: number;
    duration: number;
    interval: number;
    abc: number;
  };
}

interface AdvancedMergeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  allBehaviors: BehaviorWithStudents[];
  onMerge: (sourceId: string, targetId: string, useSourceName: boolean) => void;
}

type MergeStep = 'select-source' | 'select-target' | 'choose-name' | 'preview';

export function AdvancedMergeDialog({
  isOpen,
  onClose,
  allBehaviors,
  onMerge,
}: AdvancedMergeDialogProps) {
  const [step, setStep] = useState<MergeStep>('select-source');
  const [sourceId, setSourceId] = useState<string>('');
  const [targetId, setTargetId] = useState<string>('');
  const [useSourceName, setUseSourceName] = useState(false);

  const sourceBehavior = allBehaviors.find(b => b.id === sourceId);
  const targetBehavior = allBehaviors.find(b => b.id === targetId);

  const availableTargets = useMemo(() => {
    return allBehaviors.filter(b => b.id !== sourceId);
  }, [allBehaviors, sourceId]);

  const handleClose = () => {
    setStep('select-source');
    setSourceId('');
    setTargetId('');
    setUseSourceName(false);
    onClose();
  };

  const handleNext = () => {
    switch (step) {
      case 'select-source':
        setStep('select-target');
        break;
      case 'select-target':
        setStep('choose-name');
        break;
      case 'choose-name':
        setStep('preview');
        break;
    }
  };

  const handleBack = () => {
    switch (step) {
      case 'select-target':
        setStep('select-source');
        break;
      case 'choose-name':
        setStep('select-target');
        break;
      case 'preview':
        setStep('choose-name');
        break;
    }
  };

  const handleMerge = () => {
    if (sourceId && targetId) {
      onMerge(sourceId, targetId, useSourceName);
      handleClose();
    }
  };

  const canProceed = () => {
    switch (step) {
      case 'select-source':
        return !!sourceId;
      case 'select-target':
        return !!targetId;
      case 'choose-name':
        return true;
      case 'preview':
        return true;
      default:
        return false;
    }
  };

  const renderStepIndicator = () => {
    const steps = [
      { key: 'select-source', label: 'Source' },
      { key: 'select-target', label: 'Target' },
      { key: 'choose-name', label: 'Name' },
      { key: 'preview', label: 'Preview' },
    ];
    const currentIndex = steps.findIndex(s => s.key === step);

    return (
      <div className="flex items-center justify-center gap-1 mb-4">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
              i <= currentIndex ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              {i + 1}
            </div>
            {i < steps.length - 1 && (
              <div className={`w-8 h-0.5 ${i < currentIndex ? 'bg-primary' : 'bg-muted'}`} />
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderContent = () => {
    switch (step) {
      case 'select-source':
        return (
          <div className="space-y-4">
            <Label>Select the behavior to merge FROM (will be removed)</Label>
            <Select value={sourceId} onValueChange={setSourceId}>
              <SelectTrigger>
                <SelectValue placeholder="Select source behavior..." />
              </SelectTrigger>
              <SelectContent>
                <ScrollArea className="h-[200px]">
                  {allBehaviors.map(behavior => (
                    <SelectItem key={behavior.id} value={behavior.id}>
                      <div className="flex items-center gap-2">
                        <span>{behavior.name}</span>
                        {behavior.studentCount > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {behavior.studentCount} student{behavior.studentCount > 1 ? 's' : ''}
                          </Badge>
                        )}
                        {behavior.isGlobal && <Badge variant="outline" className="text-xs">Built-in</Badge>}
                      </div>
                    </SelectItem>
                  ))}
                </ScrollArea>
              </SelectContent>
            </Select>
            {sourceBehavior && (
              <div className="p-3 bg-secondary/50 rounded-lg">
                <p className="text-sm font-medium">{sourceBehavior.name}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {sourceBehavior.operationalDefinition}
                </p>
              </div>
            )}
          </div>
        );

      case 'select-target':
        return (
          <div className="space-y-4">
            <Label>Select the behavior to merge INTO (will be kept)</Label>
            <Select value={targetId} onValueChange={setTargetId}>
              <SelectTrigger>
                <SelectValue placeholder="Select target behavior..." />
              </SelectTrigger>
              <SelectContent>
                <ScrollArea className="h-[200px]">
                  {availableTargets.map(behavior => (
                    <SelectItem key={behavior.id} value={behavior.id}>
                      <div className="flex items-center gap-2">
                        <span>{behavior.name}</span>
                        {behavior.studentCount > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {behavior.studentCount} student{behavior.studentCount > 1 ? 's' : ''}
                          </Badge>
                        )}
                        {behavior.isGlobal && <Badge variant="outline" className="text-xs">Built-in</Badge>}
                      </div>
                    </SelectItem>
                  ))}
                </ScrollArea>
              </SelectContent>
            </Select>
            {sourceBehavior && targetBehavior && (
              <div className="flex items-center gap-2 p-3 bg-secondary/30 rounded-lg">
                <div className="flex-1 text-center">
                  <p className="text-sm font-medium truncate">{sourceBehavior.name}</p>
                  <p className="text-xs text-muted-foreground">Source</p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 text-center">
                  <p className="text-sm font-medium truncate">{targetBehavior.name}</p>
                  <p className="text-xs text-muted-foreground">Target</p>
                </div>
              </div>
            )}
          </div>
        );

      case 'choose-name':
        return (
          <div className="space-y-4">
            <Label>Which name should appear on student graphs and data?</Label>
            <RadioGroup
              value={useSourceName ? 'source' : 'target'}
              onValueChange={(v) => setUseSourceName(v === 'source')}
            >
              <div className={`flex items-center space-x-3 p-3 rounded-lg border ${!useSourceName ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <RadioGroupItem value="target" id="target-name" />
                <Label htmlFor="target-name" className="flex-1 cursor-pointer">
                  <span className="font-medium">{targetBehavior?.name}</span>
                  <span className="text-xs text-muted-foreground block">
                    Keep the target behavior's name (recommended)
                  </span>
                </Label>
              </div>
              <div className={`flex items-center space-x-3 p-3 rounded-lg border ${useSourceName ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <RadioGroupItem value="source" id="source-name" />
                <Label htmlFor="source-name" className="flex-1 cursor-pointer">
                  <span className="font-medium">{sourceBehavior?.name}</span>
                  <span className="text-xs text-muted-foreground block">
                    Use the source behavior's name instead
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>
        );

      case 'preview':
        const totalStudents = new Set([
          ...(sourceBehavior?.studentNames || []),
          ...(targetBehavior?.studentNames || [])
        ]).size;

        const finalName = useSourceName ? sourceBehavior?.name : targetBehavior?.name;

        return (
          <div className="space-y-4">
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-destructive">This action cannot be undone</p>
                <p className="text-muted-foreground">All data will be preserved, but the merge is permanent.</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-secondary/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Final behavior name:</p>
                <p className="font-semibold text-lg">{finalName}</p>
              </div>

              <div className="p-3 bg-secondary/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Affected students:</p>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span className="font-medium">{totalStudents}</span>
                </div>
                {totalStudents > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {[...new Set([...(sourceBehavior?.studentNames || []), ...(targetBehavior?.studentNames || [])])].join(', ')}
                  </p>
                )}
              </div>

              <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                <p className="text-sm font-medium text-primary mb-1">What happens:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• "{sourceBehavior?.name}" will be merged into "{targetBehavior?.name}"</li>
                  <li>• All historical data (frequency, duration, ABC) is preserved</li>
                  <li>• Student-specific definitions remain unchanged</li>
                  {useSourceName && <li>• Target behavior will be renamed to "{sourceBehavior?.name}"</li>}
                </ul>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="w-5 h-5" />
            Advanced Merge
          </DialogTitle>
          <DialogDescription>
            Combine two behaviors while preserving all data.
          </DialogDescription>
        </DialogHeader>

        {renderStepIndicator()}
        {renderContent()}

        <DialogFooter className="flex-row justify-between">
          <div>
            {step !== 'select-source' && (
              <Button variant="outline" onClick={handleBack}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            {step === 'preview' ? (
              <Button onClick={handleMerge} variant="destructive">
                <Merge className="w-4 h-4 mr-2" />
                Merge Behaviors
              </Button>
            ) : (
              <Button onClick={handleNext} disabled={!canProceed()}>
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
