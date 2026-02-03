import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ABASItem,
  ABASResponse,
  ABAS3_FREQ_0_3,
  calcABASProgress,
  canSubmitABAS,
  validateABASBeforeSubmit,
  createDefaultABASResponse,
} from './ABASItem';

// Domain full names and order (matches ABAS-3 standard)
const DOMAIN_INFO: Record<string, { name: string; order: number }> = {
  COM: { name: 'Communication', order: 1 },
  CU: { name: 'Community Use', order: 2 },
  FA: { name: 'Functional Academics', order: 3 },
  HL: { name: 'Home Living', order: 4 },
  SL: { name: 'School Living', order: 4 },
  HS: { name: 'Health and Safety', order: 5 },
  LE: { name: 'Leisure', order: 6 },
  SC: { name: 'Self-Care', order: 7 },
  SD: { name: 'Self-Direction', order: 8 },
  SO: { name: 'Social', order: 9 },
  MO: { name: 'Motor', order: 10 },
  WK: { name: 'Work', order: 11 },
};

export interface ABAS3Question {
  id: string;
  text: string;
  domain: string;
  number: number;
}

interface ABAS3FormRendererProps {
  questions: ABAS3Question[];
  responses: Record<string, ABASResponse>;
  onResponseChange: (questionId: string, response: ABASResponse) => void;
  isReadOnly?: boolean;
  showValidation?: boolean;
  className?: string;
}

export function ABAS3FormRenderer({
  questions,
  responses,
  onResponseChange,
  isReadOnly = false,
  showValidation = false,
  className,
}: ABAS3FormRendererProps) {
  const [expandedDomains, setExpandedDomains] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    questions.forEach((q) => {
      initial[q.domain] = true;
    });
    return initial;
  });

  // Create items array for validation utilities
  const items = useMemo(
    () => questions.map((q) => ({ id: q.id, required: true })),
    [questions]
  );

  // Group questions by domain
  const domains = useMemo(() => {
    const domainMap: Record<string, ABAS3Question[]> = {};

    questions.forEach((q) => {
      const domain = q.domain || 'OTHER';
      if (!domainMap[domain]) {
        domainMap[domain] = [];
      }
      domainMap[domain].push(q);
    });

    Object.keys(domainMap).forEach((domain) => {
      domainMap[domain].sort((a, b) => a.number - b.number);
    });

    return Object.entries(domainMap)
      .map(([code, qs]) => ({
        code,
        name: DOMAIN_INFO[code]?.name || code,
        questions: qs,
        order: DOMAIN_INFO[code]?.order || 99,
      }))
      .sort((a, b) => a.order - b.order);
  }, [questions]);

  // Calculate progress using utility function
  const progress = useMemo(() => calcABASProgress(items, responses), [items, responses]);

  // Domain-level progress
  const domainProgress = useMemo(() => {
    const progressMap: Record<string, { answered: number; total: number }> = {};

    domains.forEach((domain) => {
      const answered = domain.questions.filter(
        (q) => responses[q.id]?.score !== null && responses[q.id]?.score !== undefined
      ).length;
      progressMap[domain.code] = { answered, total: domain.questions.length };
    });

    return progressMap;
  }, [domains, responses]);

  const toggleDomain = useCallback((code: string) => {
    setExpandedDomains((prev) => ({
      ...prev,
      [code]: !prev[code],
    }));
  }, []);

  const handleResponseChange = useCallback(
    (questionId: string, response: ABASResponse) => {
      onResponseChange(questionId, response);
    },
    [onResponseChange]
  );

  // Get response for a question, defaulting to empty
  const getResponse = useCallback(
    (questionId: string): ABASResponse => {
      return responses[questionId] || createDefaultABASResponse();
    },
    [responses]
  );

  return (
    <div className={cn('space-y-4', className)}>
      {/* Overall Progress */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium">Overall Progress</span>
            <span className="text-muted-foreground">
              {progress.answered} of {progress.total} items ({progress.pct}%)
            </span>
          </div>
          <Progress value={progress.pct} className="h-2" />
          {showValidation && progress.answered < progress.total && (
            <div className="flex items-center gap-2 mt-2 text-destructive text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>Please answer all {progress.total - progress.answered} remaining items.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Response Scale Legend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">ABAS-3 Response Scale</CardTitle>
          <CardDescription className="text-xs">
            Rate how often the individual performs each skill when needed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {ABAS3_FREQ_0_3.options.map((option) => (
              <div
                key={option.value}
                className="flex flex-col p-2 rounded-md bg-muted/50 text-xs"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="min-w-[24px] justify-center font-bold">
                    {option.value}
                  </Badge>
                  <span className="font-medium">{option.label.split(' — ')[1]}</span>
                </div>
                <span className="text-muted-foreground pl-8">{option.description}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Domain Sections */}
      {domains.map((domain) => {
        const domainProg = domainProgress[domain.code];
        const isComplete = domainProg.answered === domainProg.total;
        const isExpanded = expandedDomains[domain.code];
        const domainPct = domainProg.total > 0 ? (domainProg.answered / domainProg.total) * 100 : 0;

        return (
          <Card
            key={domain.code}
            className={cn(isComplete && 'border-primary/30 bg-primary/5')}
          >
            <CardHeader
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => toggleDomain(domain.code)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant={isComplete ? 'default' : 'secondary'}>
                    {domain.code}
                  </Badge>
                  <CardTitle className="text-base">{domain.name}</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {domainProg.answered}/{domainProg.total}
                  </span>
                  <Progress value={domainPct} className="h-2 w-24" />
                  <span className="text-lg">{isExpanded ? '−' : '+'}</span>
                </div>
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="pt-0">
                <Separator className="mb-4" />
                <div className="space-y-3">
                  {domain.questions.map((question) => (
                    <ABASItem
                      key={question.id}
                      itemId={question.id}
                      itemNumber={question.number}
                      prompt={question.text}
                      response={getResponse(question.id)}
                      onChange={(next) => handleResponseChange(question.id, next)}
                      required={true}
                      showValidation={showValidation}
                      disabled={isReadOnly}
                    />
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// Re-export utilities for use by parent components
export type { ABASResponse } from './ABASItem';
export {
  ABAS3_FREQ_0_3,
  calcABASProgress,
  canSubmitABAS,
  validateABASBeforeSubmit,
  createDefaultABASResponse,
} from './ABASItem';
