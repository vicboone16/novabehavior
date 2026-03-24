import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, Loader2 } from 'lucide-react';
import { useStudentBopsPrograms } from '@/hooks/useBopsData';

interface BopsProgramsSectionProps {
  studentId: string;
}

const STATE_COLORS: Record<string, string> = {
  red: 'bg-destructive/15 text-destructive border-destructive/30',
  yellow: 'bg-yellow-500/15 text-yellow-700 border-yellow-300',
  green: 'bg-emerald-500/15 text-emerald-700 border-emerald-300',
};

export function BopsProgramsSection({ studentId }: BopsProgramsSectionProps) {
  const { data: programs, isLoading } = useStudentBopsPrograms(studentId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!programs || programs.length === 0) return null;

  const grouped = programs.reduce((acc, p) => {
    const state = (p as any).day_state || 'green';
    if (!acc[state]) acc[state] = [];
    acc[state].push(p);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          BOPS Programs
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-3">
            {['red', 'yellow', 'green'].map(state => {
              const items = grouped[state];
              if (!items?.length) return null;
              return (
                <div key={state}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${
                      state === 'red' ? 'bg-destructive' : state === 'yellow' ? 'bg-yellow-500' : 'bg-emerald-500'
                    }`} />
                    <span className="text-xs font-medium capitalize">{state} Day</span>
                    <Badge variant="outline" className="text-[10px]">{items.length}</Badge>
                  </div>
                  <div className="grid gap-1.5 ml-4">
                    {items.map((p: any) => (
                      <div key={p.id} className="p-2 rounded border text-xs">
                        <div className="font-medium">{p.program_name}</div>
                        {p.teacher_friendly_summary && (
                          <p className="text-muted-foreground mt-0.5 line-clamp-2">{p.teacher_friendly_summary}</p>
                        )}
                        {p.problem_area && (
                          <Badge variant="outline" className="text-[10px] mt-1">{p.problem_area}</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
