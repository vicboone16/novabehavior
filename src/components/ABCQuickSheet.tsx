import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDataStore } from '@/store/dataStore';
import { Behavior, ANTECEDENT_OPTIONS, CONSEQUENCE_OPTIONS } from '@/types/behavior';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface ABCQuickSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  behavior: Behavior;
  studentColor: string;
}

export function ABCQuickSheet({
  open,
  onOpenChange,
  studentId,
  behavior,
  studentColor,
}: ABCQuickSheetProps) {
  const { addEnhancedABCEntry, getStudentAntecedents, getStudentConsequences } = useDataStore();
  const [antecedents, setAntecedents] = useState<string[]>([]);
  const [consequences, setConsequences] = useState<string[]>([]);

  const customA = getStudentAntecedents(studentId);
  const customC = getStudentConsequences(studentId);
  const allA = [...ANTECEDENT_OPTIONS, ...customA.filter(a => !ANTECEDENT_OPTIONS.includes(a))];
  const allC = [...CONSEQUENCE_OPTIONS, ...customC.filter(c => !CONSEQUENCE_OPTIONS.includes(c))];

  const toggle = (
    val: string,
    list: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => setter(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);

  const handleRecord = () => {
    if (antecedents.length === 0 || consequences.length === 0) return;
    addEnhancedABCEntry({
      studentId,
      behaviorId: behavior.id,
      antecedents,
      antecedent: antecedents.join(', '),
      behavior: behavior.name,
      consequences,
      consequence: consequences.join(', '),
      frequencyCount: 1,
      functions: [],
    });
    setAntecedents([]);
    setConsequences([]);
    onOpenChange(false);
    if (navigator.vibrate) navigator.vibrate(40);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="pb-2">
          <SheetTitle className="flex items-center gap-2 text-base">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: studentColor }}
            />
            ABC — {behavior.name}
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto h-7 w-7"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 py-2">
          {/* Antecedent */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              A — Antecedent
            </p>
            <div className="flex flex-wrap gap-2">
              {allA.map(a => (
                <Badge
                  key={a}
                  variant={antecedents.includes(a) ? 'default' : 'outline'}
                  className="cursor-pointer select-none py-1.5 px-3 text-sm"
                  style={antecedents.includes(a) ? { backgroundColor: studentColor, color: 'white' } : {}}
                  onClick={() => toggle(a, antecedents, setAntecedents)}
                >
                  {a}
                </Badge>
              ))}
            </div>
          </div>

          {/* Consequence */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              C — Consequence
            </p>
            <div className="flex flex-wrap gap-2">
              {allC.map(c => (
                <Badge
                  key={c}
                  variant={consequences.includes(c) ? 'default' : 'outline'}
                  className="cursor-pointer select-none py-1.5 px-3 text-sm"
                  style={consequences.includes(c) ? { backgroundColor: studentColor, color: 'white' } : {}}
                  onClick={() => toggle(c, consequences, setConsequences)}
                >
                  {c}
                </Badge>
              ))}
            </div>
          </div>

          <Button
            className="w-full gap-2 h-12 text-base"
            style={{ backgroundColor: studentColor, color: 'white' }}
            disabled={antecedents.length === 0 || consequences.length === 0}
            onClick={handleRecord}
          >
            <Check className="w-5 h-5" />
            Record ABC
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
