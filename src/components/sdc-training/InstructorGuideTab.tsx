import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { BookOpen, Clock, Target, MessageSquare, AlertTriangle, CheckCircle2, Lightbulb, Users } from 'lucide-react';
import type { SDCModule } from '@/hooks/useSDCTraining';

interface Props {
  modules: SDCModule[];
  isAdmin: boolean;
}

function JsonList({ items, fallback = 'None specified' }: { items: any[]; fallback?: string }) {
  if (!items || items.length === 0) return <p className="text-sm text-muted-foreground italic">{fallback}</p>;
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="text-sm flex items-start gap-2">
          <span className="text-primary mt-0.5">•</span>
          <span>{typeof item === 'string' ? item : item.text || item.label || JSON.stringify(item)}</span>
        </li>
      ))}
    </ul>
  );
}

export function InstructorGuideTab({ modules, isAdmin }: Props) {
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
        <Badge variant="outline" className="text-xs">{modules.length} Modules</Badge>
      </div>

      <Accordion type="multiple" className="space-y-3">
        {modules.map((mod) => (
          <AccordionItem key={mod.id} value={mod.id} className="border rounded-lg bg-card px-4">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-3 text-left">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                  {mod.sort_order}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{mod.title}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {mod.estimated_minutes} min
                    </span>
                    <Badge variant="secondary" className="text-xs">{mod.status}</Badge>
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-6">
              <div className="grid gap-6">
                {/* Overview */}
                {mod.training_objective && (
                  <section>
                    <h4 className="font-semibold text-sm flex items-center gap-2 mb-2 text-foreground">
                      <Target className="w-4 h-4 text-accent" /> Training Objective
                    </h4>
                    <p className="text-sm text-muted-foreground">{mod.training_objective}</p>
                  </section>
                )}

                {/* Instructor Script */}
                {mod.instructor_script && (
                  <section>
                    <h4 className="font-semibold text-sm flex items-center gap-2 mb-2 text-foreground">
                      <BookOpen className="w-4 h-4 text-accent" /> Instructor Script / Talking Points
                    </h4>
                    <div className="bg-muted/50 rounded-lg p-4 text-sm whitespace-pre-wrap">{mod.instructor_script}</div>
                  </section>
                )}

                {/* Talking Points */}
                <section>
                  <h4 className="font-semibold text-sm flex items-center gap-2 mb-2 text-foreground">
                    <MessageSquare className="w-4 h-4 text-info" /> Key Talking Points
                  </h4>
                  <JsonList items={mod.instructor_talking_points} />
                </section>

                {/* Key Definitions */}
                <section>
                  <h4 className="font-semibold text-sm flex items-center gap-2 mb-2 text-foreground">
                    <Lightbulb className="w-4 h-4 text-warning" /> Key Definitions
                  </h4>
                  <JsonList items={mod.key_definitions} />
                </section>

                {/* Discussion Prompts */}
                <section>
                  <h4 className="font-semibold text-sm flex items-center gap-2 mb-2 text-foreground">
                    <Users className="w-4 h-4 text-success" /> Discussion Prompts
                  </h4>
                  <JsonList items={mod.discussion_prompts} />
                </section>

                {/* Scenario Practice */}
                <section>
                  <h4 className="font-semibold text-sm mb-2 text-foreground">Scenario Practice Prompts</h4>
                  <JsonList items={mod.scenario_practice_prompts} />
                </section>

                {/* Demonstration Notes */}
                {mod.demonstration_notes && (
                  <section>
                    <h4 className="font-semibold text-sm mb-2 text-foreground">Demonstration / Modeling</h4>
                    <p className="text-sm text-muted-foreground">{mod.demonstration_notes}</p>
                  </section>
                )}

                {/* Examples */}
                <section>
                  <h4 className="font-semibold text-sm mb-2 text-foreground">Examples to Use</h4>
                  <JsonList items={mod.examples} />
                </section>

                {/* Staff Misconceptions */}
                <section>
                  <h4 className="font-semibold text-sm flex items-center gap-2 mb-2 text-foreground">
                    <AlertTriangle className="w-4 h-4 text-destructive" /> Staff Misconceptions to Correct
                  </h4>
                  <JsonList items={mod.staff_misconceptions} />
                </section>

                {/* Common Staff Errors */}
                <section>
                  <h4 className="font-semibold text-sm mb-2 text-foreground">Common Staff Errors</h4>
                  <JsonList items={mod.common_staff_errors} />
                </section>

                {/* Fidelity Check */}
                <section>
                  <h4 className="font-semibold text-sm flex items-center gap-2 mb-2 text-foreground">
                    <CheckCircle2 className="w-4 h-4 text-success" /> Fidelity Check Items
                  </h4>
                  <JsonList items={mod.fidelity_check_items} />
                </section>

                {/* Coaching Recommendations */}
                <section>
                  <h4 className="font-semibold text-sm mb-2 text-foreground">Follow-Up Coaching Recommendations</h4>
                  <JsonList items={mod.coaching_recommendations} />
                </section>

                {/* Key Takeaways */}
                <section>
                  <h4 className="font-semibold text-sm mb-2 text-foreground">Key Takeaways</h4>
                  <JsonList items={mod.key_takeaways} />
                </section>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
