import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useBopsQuestions, useSaveBopsResponses, useStudentBopsProfile } from '@/hooks/useBopsData';
import { Loader2, Save, CheckCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const SCALE = [
  { value: 0, label: 'Never' },
  { value: 1, label: 'Rarely' },
  { value: 2, label: 'Sometimes' },
  { value: 3, label: 'Often' },
  { value: 4, label: 'Almost Always' },
];

export function BopsAssessment({ studentId }: { studentId: string }) {
  const { data: questions, isLoading: qLoading } = useBopsQuestions();
  const { data: profile } = useStudentBopsProfile(studentId);
  const saveMut = useSaveBopsResponses();

  const [assessmentId] = useState(() => uuidv4());
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [page, setPage] = useState(0);
  const pageSize = 10;

  if (qLoading) return <Loader2 className="animate-spin mx-auto mt-8" />;
  if (!questions?.length) return <p className="text-center text-muted-foreground py-8">No questions in bank.</p>;

  const totalPages = Math.ceil(questions.length / pageSize);
  const pageQuestions = questions.slice(page * pageSize, (page + 1) * pageSize);
  const answered = Object.keys(responses).length;
  const progress = Math.round((answered / questions.length) * 100);

  const handleSave = () => {
    const data = Object.entries(responses).map(([itemId, value]) => {
      const q = questions.find(qq => qq.id === itemId);
      return { itemId, itemNumber: q?.item_number || 0, domain: q?.linked_domain || '', value };
    });
    saveMut.mutate({ studentId, assessmentId, responses: data });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">BOPS Assessment</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">104-item behavioral profile questionnaire</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{answered}/{questions.length}</Badge>
            {profile?.bops_assessment_status === 'completed' && (
              <Badge className="gap-1"><CheckCircle className="w-3 h-3" />Completed</Badge>
            )}
          </div>
        </div>
        <Progress value={progress} className="mt-2" />
      </CardHeader>
      <CardContent className="space-y-4">
        <ScrollArea className="h-[500px]">
          <div className="space-y-6">
            {pageQuestions.map(q => (
              <div key={q.id} className="p-3 rounded-lg border">
                <div className="flex items-start gap-2 mb-2">
                  <span className="font-mono text-xs text-muted-foreground shrink-0 mt-0.5">Q{q.item_number}</span>
                  <p className="text-sm font-medium">{q.item_text}</p>
                  <Badge variant="outline" className="text-xs shrink-0 ml-auto">{q.linked_domain}</Badge>
                </div>
                <RadioGroup
                  value={responses[q.id]?.toString()}
                  onValueChange={v => setResponses(prev => ({ ...prev, [q.id]: parseInt(v) }))}
                  className="flex gap-4"
                >
                  {SCALE.map(s => (
                    <div key={s.value} className="flex items-center gap-1">
                      <RadioGroupItem value={s.value.toString()} id={`${q.id}-${s.value}`} />
                      <Label htmlFor={`${q.id}-${s.value}`} className="text-xs cursor-pointer">{s.label}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              Next
            </Button>
          </div>
          <span className="text-xs text-muted-foreground">Page {page + 1} of {totalPages}</span>
          <Button size="sm" onClick={handleSave} disabled={saveMut.isPending} className="gap-1.5">
            {saveMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            Save Progress
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
