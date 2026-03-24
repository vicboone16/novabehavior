import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useStudentDayState, useStudentDailyPlan, useSetDayState, useGenerateDailyPlan, useStudentBopsPrograms } from '@/hooks/useBopsData';
import { AlertTriangle, Sun, Leaf, Loader2, Zap } from 'lucide-react';

const PROBLEM_AREAS = ['elopement', 'noncompliance', 'verbal aggression', 'emotional escalation', 'task avoidance', 'power struggles', 'task initiation', 'task completion', 'overall functioning', 'engagement'];

export function BopsDailyAdjustment({ studentId }: { studentId: string }) {
  const today = new Date().toISOString().split('T')[0];
  const [date] = useState(today);
  const [dayState, setDayState] = useState<'red' | 'yellow' | 'green'>('yellow');
  const [selectedProblems, setSelectedProblems] = useState<string[]>([]);
  const [clinNote, setClinNote] = useState('');

  const { data: existingState } = useStudentDayState(studentId, date);
  const { data: dailyPlan, isLoading: planLoading } = useStudentDailyPlan(studentId, date);
  const { data: programs } = useStudentBopsPrograms(studentId);
  const setStateMut = useSetDayState();
  const genPlanMut = useGenerateDailyPlan();

  // Get unique problem areas from this student's programs
  const availableProblems = [...new Set(programs?.map(p => p.problem_area).filter(Boolean) || [])];

  const handleSetAndGenerate = async () => {
    await setStateMut.mutateAsync({ studentId, date, dayState, note: clinNote });
    await genPlanMut.mutateAsync({ studentId, state: dayState, notes: clinNote });
  };

  const stateButtons = [
    { value: 'red' as const, label: 'Red', desc: 'Regulation / Safety', icon: AlertTriangle, cls: 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100' },
    { value: 'yellow' as const, label: 'Yellow', desc: 'Supported Learning', icon: Sun, cls: 'border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-100' },
    { value: 'green' as const, label: 'Green', desc: 'Skill Building', icon: Leaf, cls: 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100' },
  ];

  return (
    <div className="space-y-4">
      {/* Day State Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daily Adjustment — {date}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {stateButtons.map(s => {
              const Icon = s.icon;
              return (
                <button
                  key={s.value}
                  onClick={() => setDayState(s.value)}
                  className={`p-4 rounded-lg border-2 text-center transition-all ${s.cls} ${dayState === s.value ? 'ring-2 ring-offset-2 ring-primary' : 'opacity-70'}`}
                >
                  <Icon className="w-6 h-6 mx-auto mb-1" />
                  <p className="font-bold">{s.label}</p>
                  <p className="text-xs">{s.desc}</p>
                </button>
              );
            })}
          </div>

          {/* Problem Areas */}
          <div>
            <p className="text-sm font-medium mb-2">Active Problem Areas</p>
            <div className="flex flex-wrap gap-3">
              {(availableProblems.length > 0 ? availableProblems : PROBLEM_AREAS).map(p => (
                <label key={p} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <Checkbox
                    checked={selectedProblems.includes(p)}
                    onCheckedChange={c => {
                      setSelectedProblems(prev => c ? [...prev, p] : prev.filter(x => x !== p));
                    }}
                  />
                  {p}
                </label>
              ))}
            </div>
          </div>

          <Textarea
            placeholder="Clinician note (optional)..."
            value={clinNote}
            onChange={e => setClinNote(e.target.value)}
            className="h-20"
          />

          <Button
            onClick={handleSetAndGenerate}
            disabled={setStateMut.isPending || genPlanMut.isPending}
            className="w-full gap-2"
          >
            {(setStateMut.isPending || genPlanMut.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Set Day State & Generate Plan
          </Button>
        </CardContent>
      </Card>

      {/* Generated Plan Output */}
      {planLoading ? <Loader2 className="animate-spin mx-auto" /> : dailyPlan && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Today's Plan</CardTitle>
              <Badge variant={dailyPlan.day_state === 'red' ? 'destructive' : dailyPlan.day_state === 'yellow' ? 'secondary' : 'default'}>
                {dailyPlan.day_state?.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Active Targets</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {(Array.isArray(dailyPlan.active_targets) ? dailyPlan.active_targets : []).map((t: any, i: number) => (
                  <Badge key={i} variant="outline">{String(t)}</Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Benchmark Level</p>
              <p>{dailyPlan.benchmark_level}</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border bg-blue-50/50">
                <p className="text-xs font-medium text-blue-700">Antecedent Plan</p>
                <p className="text-xs mt-1">{dailyPlan.antecedent_plan}</p>
              </div>
              <div className="p-3 rounded-lg border bg-orange-50/50">
                <p className="text-xs font-medium text-orange-700">Reactive Plan</p>
                <p className="text-xs mt-1">{dailyPlan.reactive_plan}</p>
              </div>
              <div className="p-3 rounded-lg border bg-green-50/50">
                <p className="text-xs font-medium text-green-700">Reinforcement Plan</p>
                <p className="text-xs mt-1">{dailyPlan.reinforcement_plan}</p>
              </div>
            </div>
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-xs font-medium text-muted-foreground mb-1">Teacher Summary</p>
              <p className="text-xs whitespace-pre-line">{dailyPlan.teacher_summary_view}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
