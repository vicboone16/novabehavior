import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';

// ABAS-3 Frequency Response Scale (0-3)
export const ABAS3_FREQ_0_3 = {
  id: 'ABAS3_FREQ_0_3',
  name: 'ABAS-3 Frequency 0-3',
  type: 'single_select',
  options: [
    { value: 0, label: '0 — Is not able', description: 'Cannot perform skill' },
    { value: 1, label: '1 — Never (or almost never) when needed', description: 'Rarely/never performs when needed' },
    { value: 2, label: '2 — Sometimes when needed', description: 'Sometimes performs when needed' },
    { value: 3, label: '3 — Always (or almost always) when needed', description: 'Consistently performs when needed' },
  ],
  extras: [
    {
      key: 'guessed',
      type: 'boolean',
      label: 'Check if you guessed',
      default: false,
    },
  ],
} as const;

export type ABASScore = 0 | 1 | 2 | 3 | null;

export interface ABASResponse {
  score: ABASScore;
  guessed: boolean;
}

export interface ABASItemProps {
  itemId: string;
  itemNumber: number;
  prompt: string;
  response: ABASResponse;
  onChange: (next: ABASResponse) => void;
  required?: boolean;
  showValidation?: boolean;
  disabled?: boolean;
}

export function ABASItem({
  itemId,
  itemNumber,
  prompt,
  response,
  onChange,
  required = true,
  showValidation = false,
  disabled = false,
}: ABASItemProps) {
  const isMissing = required && response.score === null;
  const hasError = showValidation && isMissing;

  return (
    <Card
      id={`abas-item-${itemId}`}
      className={cn(
        'transition-all',
        response.score !== null && 'border-primary/30 bg-primary/5',
        hasError && 'border-destructive bg-destructive/5 ring-1 ring-destructive/50'
      )}
    >
      <CardContent className="p-4">
        {/* Item Header */}
        <div className="flex gap-3 mb-4">
          <Badge
            variant={response.score !== null ? 'default' : 'outline'}
            className="min-w-[32px] h-7 justify-center text-sm shrink-0"
          >
            {itemNumber}
          </Badge>
          <p className="text-sm flex-1 leading-relaxed">
            {prompt}
            {required && <span className="text-destructive ml-1">*</span>}
          </p>
        </div>

        {/* Response Options - 0-3 Scale */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {ABAS3_FREQ_0_3.options.map((option) => {
            const isSelected = response.score === option.value;
            return (
              <button
                key={option.value}
                type="button"
                disabled={disabled}
                onClick={() => onChange({ ...response, score: option.value as ABASScore })}
                className={cn(
                  'flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all text-center min-h-[70px]',
                  'hover:border-primary/50 hover:bg-primary/5',
                  'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                  isSelected
                    ? 'border-primary bg-primary/10 ring-2 ring-primary ring-offset-1'
                    : 'border-border bg-background',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
                aria-pressed={isSelected}
                title={option.description}
              >
                <span className="text-lg font-bold mb-1">{option.value}</span>
                <span className="text-xs text-muted-foreground leading-tight">
                  {option.value === 0 && 'Not able'}
                  {option.value === 1 && 'Never'}
                  {option.value === 2 && 'Sometimes'}
                  {option.value === 3 && 'Always'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Guessed Checkbox */}
        <div className="flex items-center space-x-2 pt-2 border-t">
          <Checkbox
            id={`guessed-${itemId}`}
            checked={response.guessed}
            onCheckedChange={(checked) =>
              onChange({ ...response, guessed: checked === true })
            }
            disabled={disabled}
          />
          <Label
            htmlFor={`guessed-${itemId}`}
            className="text-sm text-muted-foreground cursor-pointer"
          >
            Check if you guessed
          </Label>
        </div>

        {/* Validation Error */}
        {hasError && (
          <div className="flex items-center gap-2 mt-3 text-destructive text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>This item is required.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Utility functions for ABAS form validation and progress
export function calcABASProgress(
  items: { id: string }[],
  responses: Record<string, ABASResponse>
): { total: number; answered: number; pct: number } {
  const total = items.length;
  const answered = items.filter(
    (i) => responses[i.id]?.score !== null && responses[i.id]?.score !== undefined
  ).length;
  return {
    total,
    answered,
    pct: total === 0 ? 0 : Math.round((answered / total) * 100),
  };
}

export function canSubmitABAS(
  items: { id: string; required?: boolean }[],
  responses: Record<string, ABASResponse>
): boolean {
  return items.every(
    (i) =>
      i.required === false ||
      (responses[i.id] && responses[i.id].score !== null && responses[i.id].score !== undefined)
  );
}

export function validateABASBeforeSubmit(
  items: { id: string; required?: boolean }[],
  responses: Record<string, ABASResponse>
): { ok: boolean; missingIds: string[] } {
  const missing = items.filter(
    (i) =>
      i.required !== false &&
      (!responses[i.id] || responses[i.id].score === null || responses[i.id].score === undefined)
  );
  return { ok: missing.length === 0, missingIds: missing.map((m) => m.id) };
}

// Default response factory
export function createDefaultABASResponse(): ABASResponse {
  return { score: null, guessed: false };
}
