import { useState } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Brain, Calculator, Save, X, Loader2, CalendarIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useInsertManualBopsScores } from '@/hooks/useBopsReports';

const DOMAINS = [
  { key: 'emotion', label: 'Emotion' },
  { key: 'authority', label: 'Authority' },
  { key: 'autonomy', label: 'Autonomy' },
  { key: 'impulse', label: 'Impulse' },
  { key: 'threat', label: 'Threat' },
  { key: 'withdrawal', label: 'Withdrawal' },
  { key: 'sensory', label: 'Sensory' },
  { key: 'rigidity', label: 'Rigidity' },
  { key: 'social', label: 'Social' },
  { key: 'context', label: 'Context' },
  { key: 'navigator', label: 'Navigator' },
] as const;

interface Props {
  studentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManualBopsScoreEntry({ studentId, open, onOpenChange }: Props) {
  const insertScores = useInsertManualBopsScores();

  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries(DOMAINS.map(d => [d.key, 0.5]))
  );
  const [assessmentDate, setAssessmentDate] = useState<Date>(new Date());
  const [sourceNote, setSourceNote] = useState('');
  const [overwrite, setOverwrite] = useState(false);

  const updateScore = (key: string, val: string) => {
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0 && num <= 1) {
      setScores(prev => ({ ...prev, [key]: num }));
    }
  };

  const handleSave = () => {
    insertScores.mutate(
      {
        studentId,
        assessmentDate: format(assessmentDate, 'yyyy-MM-dd'),
        scores,
        sourceNote: sourceNote || undefined,
        overwriteExistingManual: overwrite,
      },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  const allValid = DOMAINS.every(d => {
    const v = scores[d.key];
    return v >= 0 && v <= 1;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Manual BOPS Score Entry
          </DialogTitle>
          <DialogDescription>
            Enter domain scores directly. This creates a dated BOPS record and runs full profile calculation.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 pr-2">
          <div className="space-y-4">
            {/* Assessment Date */}
            <div className="space-y-2">
              <Label className="font-semibold">Assessment Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn('w-full justify-start text-left font-normal', !assessmentDate && 'text-muted-foreground')}
                  >
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {assessmentDate ? format(assessmentDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={assessmentDate}
                    onSelect={d => d && setAssessmentDate(d)}
                    disabled={d => d > new Date()}
                    initialFocus
                    className={cn('p-3 pointer-events-auto')}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Domain Score Grid */}
            <div className="space-y-2">
              <Label className="font-semibold">Domain Scores (0.0 – 1.0)</Label>
              <div className="grid grid-cols-2 gap-3">
                {DOMAINS.map(d => (
                  <div key={d.key} className="flex items-center gap-2">
                    <Label className="w-24 text-xs font-medium">{d.label}</Label>
                    <Input
                      type="number"
                      min="0"
                      max="1"
                      step="0.01"
                      value={scores[d.key]}
                      onChange={e => updateScore(d.key, e.target.value)}
                      className="h-8 text-sm w-20"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Source Note */}
            <div className="space-y-2">
              <Label className="font-semibold">Source Note (optional)</Label>
              <Textarea
                value={sourceNote}
                onChange={e => setSourceNote(e.target.value)}
                placeholder="e.g., scored offline from school packet"
                rows={2}
              />
            </div>

            {/* Overwrite Toggle */}
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
              <Switch checked={overwrite} onCheckedChange={setOverwrite} />
              <div>
                <p className="text-sm font-medium">Overwrite matching manual entry</p>
                <p className="text-xs text-muted-foreground">
                  Only replaces a manual entry for the same date. Full assessments are never overwritten.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
              <p className="text-xs text-muted-foreground">
                Manual entries create a new dated BOPS record by default. The system will calculate archetypes, constellation, indices, and activate the profile.
              </p>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={insertScores.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!allValid || insertScores.isPending}>
            {insertScores.isPending ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Calculator className="w-4 h-4 mr-1" />
            )}
            Save & Calculate Profile
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}