import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

// ABAS-3 uses a 4-point Likert scale: 0-3
const ABAS3_SCALE = [
  { value: '0', label: 'Is Not Able', description: 'Cannot perform skill' },
  { value: '1', label: 'Never (or Almost Never) When Needed', description: 'Rarely/never performs' },
  { value: '2', label: 'Sometimes When Needed', description: 'Sometimes performs' },
  { value: '3', label: 'Always (or Almost Always) When Needed', description: 'Consistently performs' },
];

// Domain full names and order (matches ABAS-3 standard)
const DOMAIN_INFO: Record<string, { name: string; order: number }> = {
  COM: { name: 'Communication', order: 1 },
  CU: { name: 'Community Use', order: 2 },
  FA: { name: 'Functional Academics', order: 3 },
  HL: { name: 'Home Living', order: 4 },
  SL: { name: 'School Living', order: 4 }, // Alternative to HL for teacher forms
  HS: { name: 'Health and Safety', order: 5 },
  LE: { name: 'Leisure', order: 6 },
  SC: { name: 'Self-Care', order: 7 },
  SD: { name: 'Self-Direction', order: 8 },
  SO: { name: 'Social', order: 9 },
  MO: { name: 'Motor', order: 10 },
  WK: { name: 'Work', order: 11 },
};

interface ABAS3Question {
  id: string;
  text: string;
  domain: string;
  number: number;
}

interface Domain {
  code: string;
  name: string;
  questions: ABAS3Question[];
}

interface ABAS3FormRendererProps {
  questions: ABAS3Question[];
  responses: Record<string, string>;
  onResponseChange: (questionId: string, value: string) => void;
  isReadOnly?: boolean;
  className?: string;
}

export function ABAS3FormRenderer({
  questions,
  responses,
  onResponseChange,
  isReadOnly = false,
  className,
}: ABAS3FormRendererProps) {
  const [expandedDomains, setExpandedDomains] = useState<Record<string, boolean>>(() => {
    // All domains expanded by default
    const initial: Record<string, boolean> = {};
    questions.forEach(q => {
      initial[q.domain] = true;
    });
    return initial;
  });

  // Group questions by domain
  const domains = useMemo(() => {
    const domainMap: Record<string, ABAS3Question[]> = {};
    
    questions.forEach(q => {
      const domain = q.domain || 'OTHER';
      if (!domainMap[domain]) {
        domainMap[domain] = [];
      }
      domainMap[domain].push(q);
    });

    // Sort questions within each domain by number
    Object.keys(domainMap).forEach(domain => {
      domainMap[domain].sort((a, b) => a.number - b.number);
    });

    // Convert to array and sort by domain order
    return Object.entries(domainMap)
      .map(([code, qs]) => ({
        code,
        name: DOMAIN_INFO[code]?.name || code,
        questions: qs,
        order: DOMAIN_INFO[code]?.order || 99,
      }))
      .sort((a, b) => a.order - b.order);
  }, [questions]);

  // Calculate progress per domain and overall
  const domainProgress = useMemo(() => {
    const progress: Record<string, { answered: number; total: number }> = {};
    
    domains.forEach(domain => {
      const answered = domain.questions.filter(q => responses[q.id] !== undefined).length;
      progress[domain.code] = { answered, total: domain.questions.length };
    });

    return progress;
  }, [domains, responses]);

  const totalAnswered = Object.values(domainProgress).reduce((sum, p) => sum + p.answered, 0);
  const totalQuestions = Object.values(domainProgress).reduce((sum, p) => sum + p.total, 0);
  const overallProgress = totalQuestions > 0 ? (totalAnswered / totalQuestions) * 100 : 0;

  const toggleDomain = (code: string) => {
    setExpandedDomains(prev => ({
      ...prev,
      [code]: !prev[code],
    }));
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Overall Progress */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium">Overall Progress</span>
            <span className="text-muted-foreground">
              {totalAnswered} of {totalQuestions} questions ({Math.round(overallProgress)}%)
            </span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </CardContent>
      </Card>

      {/* Response Scale Legend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Response Scale</CardTitle>
          <CardDescription className="text-xs">
            Rate how often the individual performs each skill when needed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {ABAS3_SCALE.map(item => (
              <div
                key={item.value}
                className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-xs"
              >
                <Badge variant="outline" className="min-w-[20px] justify-center">
                  {item.value}
                </Badge>
                <span className="font-medium truncate">{item.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Domain Sections */}
      {domains.map(domain => {
        const progress = domainProgress[domain.code];
        const isComplete = progress.answered === progress.total;
        const isExpanded = expandedDomains[domain.code];

        return (
          <Card key={domain.code} className={cn(isComplete && 'border-primary/30 bg-primary/5')}>
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
                    {progress.answered}/{progress.total}
                  </span>
                  <Progress value={(progress.answered / progress.total) * 100} className="h-2 w-24" />
                  <span className="text-lg">{isExpanded ? '−' : '+'}</span>
                </div>
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="pt-0">
                <Separator className="mb-4" />
                <div className="space-y-3">
                  {domain.questions.map(question => {
                    const currentValue = responses[question.id];
                    
                    return (
                      <div
                        key={question.id}
                        className={cn(
                          'p-3 rounded-lg border transition-colors',
                          currentValue !== undefined 
                            ? 'bg-muted/30 border-primary/20' 
                            : 'bg-background border-border'
                        )}
                      >
                        <div className="flex gap-2 mb-3">
                          <Badge variant="outline" className="text-xs min-w-[28px] justify-center">
                            {question.number}
                          </Badge>
                          <p className="text-sm flex-1">{question.text}</p>
                        </div>
                        
                        {/* Response buttons */}
                        <div className="flex gap-1.5 flex-wrap">
                          {ABAS3_SCALE.map(option => (
                            <Button
                              key={option.value}
                              type="button"
                              variant={currentValue === option.value ? 'default' : 'outline'}
                              size="sm"
                              className={cn(
                                'flex-1 min-w-[60px] h-auto py-1.5 px-2 text-xs',
                                currentValue === option.value && 'ring-2 ring-primary ring-offset-1'
                              )}
                              onClick={() => !isReadOnly && onResponseChange(question.id, option.value)}
                              disabled={isReadOnly}
                              title={option.description}
                            >
                              <span className="font-bold mr-1">{option.value}</span>
                              <span className="hidden sm:inline truncate">{option.label.split(' ')[0]}</span>
                            </Button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
