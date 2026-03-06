import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Clock, Target, MessageSquare, AlertTriangle, CheckCircle2, Lightbulb, Users, Printer, Play, HelpCircle } from 'lucide-react';
import type { TrainingModuleContent } from '@/hooks/useSDCTraining';

interface Props {
  modules: TrainingModuleContent[];
}

function JsonList({ items, fallback = 'None specified' }: { items: any; fallback?: string }) {
  const arr = Array.isArray(items) ? items : [];
  if (arr.length === 0) return <p className="text-sm text-muted-foreground italic">{fallback}</p>;
  return (
    <ul className="space-y-1.5">
      {arr.map((item, i) => (
        <li key={i} className="text-sm flex items-start gap-2">
          <span className="text-primary mt-0.5">•</span>
          <span>{typeof item === 'string' ? item : item.text || item.label || JSON.stringify(item)}</span>
        </li>
      ))}
    </ul>
  );
}

export function InstructorGuideTab({ modules }: Props) {
  const [selectedKey, setSelectedKey] = useState<string | null>(modules[0]?.module_key || null);
  const selected = modules.find(m => m.module_key === selectedKey);

  if (modules.length === 0) {
    return (
      <div className="text-center py-16">
        <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold text-foreground">No Training Modules Yet</h3>
        <p className="text-muted-foreground mt-1">SDC training modules will appear here once created.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Instructor Guide</h2>
          <p className="text-sm text-muted-foreground">Trainer-facing content for in-person delivery</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden">
          <Printer className="w-4 h-4 mr-2" /> Print
        </Button>
      </div>

      <div className="flex gap-6">
        {/* Module list sidebar */}
        <div className="w-72 flex-shrink-0 space-y-1 print:hidden">
          {modules.map((mod, idx) => (
            <button
              key={mod.module_key}
              onClick={() => setSelectedKey(mod.module_key)}
              className={`w-full text-left p-3 rounded-lg text-sm transition-colors flex items-center gap-3 ${
                selectedKey === mod.module_key
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'hover:bg-muted text-foreground'
              }`}
            >
              <span className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                {idx + 1}
              </span>
              <span className="truncate">{mod.title}</span>
            </button>
          ))}
        </div>

        {/* Detail panel */}
        <div className="flex-1 min-w-0">
          {selected ? (
            <Card>
              <CardContent className="p-6 space-y-6">
                {/* Header */}
                <div>
                  <h3 className="text-lg font-bold text-foreground">{selected.title}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {selected.estimated_minutes} min
                    </span>
                    <Badge variant="secondary" className="text-xs">{selected.status}</Badge>
                    <Badge variant="outline" className="text-xs">{selected.audience}</Badge>
                  </div>
                </div>

                {/* Overview */}
                {selected.overview && (
                  <section>
                    <h4 className="font-semibold text-sm flex items-center gap-2 mb-2 text-foreground">
                      <Target className="w-4 h-4 text-accent" /> Overview
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{selected.overview}</p>
                  </section>
                )}

                {/* Learning Objectives */}
                <section>
                  <h4 className="font-semibold text-sm flex items-center gap-2 mb-2 text-foreground">
                    <CheckCircle2 className="w-4 h-4 text-success" /> Learning Objectives
                  </h4>
                  <JsonList items={selected.learning_objectives} />
                </section>

                {/* Talking Points */}
                <section>
                  <h4 className="font-semibold text-sm flex items-center gap-2 mb-2 text-foreground">
                    <MessageSquare className="w-4 h-4 text-info" /> Instructor Talking Points
                  </h4>
                  <JsonList items={selected.talking_points} />
                </section>

                {/* Discussion Prompts */}
                <section>
                  <h4 className="font-semibold text-sm flex items-center gap-2 mb-2 text-foreground">
                    <Users className="w-4 h-4 text-accent" /> Discussion Prompts
                  </h4>
                  <JsonList items={selected.discussion_prompts} />
                </section>

                {/* Demonstration Steps */}
                <section>
                  <h4 className="font-semibold text-sm flex items-center gap-2 mb-2 text-foreground">
                    <Play className="w-4 h-4 text-primary" /> Demonstration / Modeling
                  </h4>
                  <JsonList items={selected.demonstration_steps} />
                </section>

                {/* Practice Activities */}
                <section>
                  <h4 className="font-semibold text-sm flex items-center gap-2 mb-2 text-foreground">
                    <Lightbulb className="w-4 h-4 text-warning" /> Practice Activities
                  </h4>
                  <JsonList items={selected.practice_activities} />
                </section>

                {/* Scenario Prompts */}
                <section>
                  <h4 className="font-semibold text-sm flex items-center gap-2 mb-2 text-foreground">
                    <HelpCircle className="w-4 h-4 text-info" /> Scenario Prompts
                  </h4>
                  <JsonList items={selected.scenario_prompts} />
                </section>

                {/* Misconceptions */}
                <section>
                  <h4 className="font-semibold text-sm flex items-center gap-2 mb-2 text-foreground">
                    <AlertTriangle className="w-4 h-4 text-destructive" /> Common Misconceptions to Correct
                  </h4>
                  <JsonList items={selected.misconceptions} />
                </section>

                {/* Key Takeaways */}
                <section>
                  <h4 className="font-semibold text-sm flex items-center gap-2 mb-2 text-foreground">
                    <BookOpen className="w-4 h-4 text-primary" /> Key Takeaways
                  </h4>
                  <JsonList items={selected.key_takeaways} />
                </section>
              </CardContent>
            </Card>
          ) : (
            <p className="text-sm text-muted-foreground italic">Select a module to view instructor content.</p>
          )}
        </div>
      </div>
    </div>
  );
}
