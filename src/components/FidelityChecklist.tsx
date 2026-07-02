import { useState, useMemo } from 'react';
import { ClipboardCheck, Plus, Trash2, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useDataStore } from '@/store/dataStore';
import { FidelityCheck } from '@/types/behavior';
import { format } from 'date-fns';
import { useAgencyDataCollectionSettings } from '@/hooks/useAgencyDataCollectionSettings';

interface FidelityChecklistProps {
  studentId: string;
  skillTargetId?: string;
  skillTargetName?: string;
  defaultItems?: string[];
  studentColor?: string;
}

const DEFAULT_DTT_ITEMS = [
  'SD was delivered clearly and consistently',
  'Appropriate prompt level was used',
  'Correct response was reinforced within 3 seconds',
  'Error correction was applied correctly',
  'Inter-trial interval was maintained (1-5 sec)',
  'Data was recorded after each trial',
  'Reinforcer was appropriate and delivered contingently',
];

export function FidelityChecklist({
  studentId,
  skillTargetId,
  skillTargetName,
  defaultItems = DEFAULT_DTT_ITEMS,
  studentColor,
}: FidelityChecklistProps) {
  const { addFidelityCheck, getFidelityChecks, deleteFidelityCheck } = useDataStore() as any;
  const { settings } = useAgencyDataCollectionSettings();
  const FIDELITY_THRESHOLD = settings.fidelityThresholdPercent;
  const [showDialog, setShowDialog] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const [observerName, setObserverName] = useState('');
  const [notes, setNotes] = useState('');
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(defaultItems.map((item) => [item, false]))
  );
  const [customItem, setCustomItem] = useState('');
  const [items, setItems] = useState<string[]>(defaultItems);

  const existingChecks: FidelityCheck[] = useMemo(
    () => getFidelityChecks(studentId, skillTargetId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [studentId, skillTargetId, showDialog]
  );

  const implementedCount = Object.values(checkedItems).filter(Boolean).length;
  const totalCount = items.length;
  const currentPercentage = totalCount > 0 ? Math.round((implementedCount / totalCount) * 100) : 0;

  const avgFidelity = existingChecks.length > 0
    ? Math.round(existingChecks.reduce((s, c) => s + c.overallPercentage, 0) / existingChecks.length)
    : null;

  const addCustomItem = () => {
    const trimmed = customItem.trim();
    if (!trimmed || items.includes(trimmed)) return;
    setItems((prev) => [...prev, trimmed]);
    setCheckedItems((prev) => ({ ...prev, [trimmed]: false }));
    setCustomItem('');
  };

  const handleSave = () => {
    addFidelityCheck({
      studentId,
      skillTargetId,
      date: new Date(),
      observerName: observerName.trim() || undefined,
      items: items.map((label) => ({
        itemId: label,
        label,
        implemented: checkedItems[label] ?? false,
      })),
      overallPercentage: currentPercentage,
      notes: notes.trim() || undefined,
    });
    // Reset form
    setCheckedItems(Object.fromEntries(items.map((item) => [item, false])));
    setObserverName('');
    setNotes('');
    setShowDialog(false);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs"
        style={{ borderColor: studentColor }}
        onClick={() => setShowDialog(true)}
      >
        <ClipboardCheck className="w-3.5 h-3.5" />
        Fidelity
        {avgFidelity !== null && (
          <Badge
            variant="secondary"
            className={`text-[10px] ml-1 ${avgFidelity >= FIDELITY_THRESHOLD ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}
          >
            {avgFidelity}%
          </Badge>
        )}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4" />
              Fidelity Checklist
              {skillTargetName && <span className="text-muted-foreground text-sm font-normal">— {skillTargetName}</span>}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Observer */}
            <div className="space-y-1">
              <Label className="text-xs">Observer Name (optional)</Label>
              <Input
                className="h-8 text-sm"
                placeholder="Who is completing this checklist?"
                value={observerName}
                onChange={(e) => setObserverName(e.target.value)}
              />
            </div>

            {/* Checklist items */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Implementation Checklist</Label>
              {items.map((item) => (
                <div key={item} className="flex items-start gap-3 py-1.5 border-b last:border-0">
                  <Checkbox
                    id={item}
                    checked={checkedItems[item] ?? false}
                    onCheckedChange={(checked) =>
                      setCheckedItems((prev) => ({ ...prev, [item]: !!checked }))
                    }
                    className="mt-0.5"
                  />
                  <Label htmlFor={item} className="text-sm font-normal leading-snug cursor-pointer">
                    {item}
                  </Label>
                </div>
              ))}

              {/* Add custom item */}
              <div className="flex gap-2 pt-1">
                <Input
                  className="h-8 text-sm"
                  placeholder="Add custom checklist item…"
                  value={customItem}
                  onChange={(e) => setCustomItem(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomItem(); } }}
                />
                <Button type="button" size="sm" variant="outline" onClick={addCustomItem}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Progress */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Implementation fidelity</span>
                <span className={`font-bold text-sm ${currentPercentage >= FIDELITY_THRESHOLD ? 'text-green-600' : 'text-amber-600'}`}>
                  {implementedCount}/{totalCount} ({currentPercentage}%)
                </span>
              </div>
              <Progress value={currentPercentage} className="h-2" />
              {currentPercentage < FIDELITY_THRESHOLD && totalCount > 0 && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Below {FIDELITY_THRESHOLD}% — sessions with low fidelity should not count toward mastery
                </p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <Label className="text-xs">Notes (optional)</Label>
              <Textarea
                className="text-sm min-h-[60px]"
                placeholder="Observations, context, follow-up actions…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <Button
              className="w-full"
              onClick={handleSave}
              style={{ backgroundColor: studentColor }}
            >
              Save Fidelity Check
            </Button>

            {/* History */}
            {existingChecks.length > 0 && (
              <div className="space-y-2">
                <button
                  type="button"
                  className="flex items-center gap-2 text-sm font-semibold hover:text-primary transition-colors"
                  onClick={() => setShowHistory((p) => !p)}
                >
                  History ({existingChecks.length})
                  {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {avgFidelity !== null && (
                    <Badge
                      className={avgFidelity >= FIDELITY_THRESHOLD ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}
                    >
                      Avg {avgFidelity}%
                    </Badge>
                  )}
                </button>
                {showHistory && existingChecks
                  .slice()
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((check) => (
                    <Card key={check.id} className="text-sm">
                      <CardContent className="py-3 px-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {check.overallPercentage >= FIDELITY_THRESHOLD ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-amber-500" />
                            )}
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(check.date), 'MMM d, yyyy')}
                              {check.observerName && ` · ${check.observerName}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${check.overallPercentage >= FIDELITY_THRESHOLD ? 'text-green-600' : 'text-amber-600'}`}>
                              {check.overallPercentage}%
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => deleteFidelityCheck(check.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        {check.notes && (
                          <p className="text-xs text-muted-foreground">{check.notes}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
