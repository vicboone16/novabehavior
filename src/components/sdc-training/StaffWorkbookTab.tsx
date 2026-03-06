import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { BookOpen, Clock, Printer, PenTool, HelpCircle, CheckSquare } from 'lucide-react';
import type { SDCModule } from '@/hooks/useSDCTraining';

interface Props {
  modules: SDCModule[];
}

function JsonList({ items, fallback = 'None specified' }: { items: any[]; fallback?: string }) {
  if (!items || items.length === 0) return <p className="text-sm text-muted-foreground italic">{fallback}</p>;
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="text-sm flex items-start gap-2">
          <span className="text-accent mt-0.5">•</span>
          <span>{typeof item === 'string' ? item : item.text || item.question || item.label || JSON.stringify(item)}</span>
        </li>
      ))}
    </ul>
  );
}

export function StaffWorkbookTab({ modules }: Props) {
  const handlePrint = () => window.print();

  if (modules.length === 0) {
    return (
      <div className="text-center py-16">
        <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold text-foreground">No Workbook Content Yet</h3>
        <p className="text-muted-foreground mt-1">Staff workbook modules will appear here once created.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Staff Workbook</h2>
          <p className="text-sm text-muted-foreground">Learner-facing reading, reflection, and practice activities</p>
        </div>
        <Button variant="outline" size="sm" onClick={handlePrint} className="print:hidden">
          <Printer className="w-4 h-4 mr-2" /> Print Workbook
        </Button>
      </div>

      <Accordion type="multiple" className="space-y-3">
        {modules.map((mod) => (
          <AccordionItem key={mod.id} value={mod.id} className="border rounded-lg bg-card px-4">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-3 text-left">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-sm font-bold text-accent">
                  {mod.sort_order}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{mod.title}</p>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {mod.estimated_minutes} min
                  </span>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-6">
              <div className="grid gap-6">
                {/* Reading Content */}
                {mod.workbook_reading_content && (
                  <section>
                    <h4 className="font-semibold text-sm flex items-center gap-2 mb-2 text-foreground">
                      <BookOpen className="w-4 h-4 text-primary" /> Reading
                    </h4>
                    <div className="bg-muted/30 rounded-lg p-4 text-sm whitespace-pre-wrap leading-relaxed">
                      {mod.workbook_reading_content}
                    </div>
                  </section>
                )}

                {/* Reflection Prompts */}
                <section>
                  <h4 className="font-semibold text-sm flex items-center gap-2 mb-2 text-foreground">
                    <PenTool className="w-4 h-4 text-accent" /> Reflection Prompts
                  </h4>
                  <JsonList items={mod.reflection_prompts} />
                </section>

                {/* Guided Practice */}
                <section>
                  <h4 className="font-semibold text-sm mb-2 text-foreground">Guided Practice</h4>
                  <JsonList items={mod.guided_practice} />
                </section>

                {/* Scenario Questions */}
                <section>
                  <h4 className="font-semibold text-sm flex items-center gap-2 mb-2 text-foreground">
                    <HelpCircle className="w-4 h-4 text-info" /> Scenario Questions
                  </h4>
                  <JsonList items={mod.scenario_questions} />
                </section>

                {/* Matching Activities */}
                {mod.matching_activities?.length > 0 && (
                  <section>
                    <h4 className="font-semibold text-sm mb-2 text-foreground">Matching Activities</h4>
                    <JsonList items={mod.matching_activities} />
                  </section>
                )}

                {/* ABC Worksheets */}
                {mod.abc_worksheets?.length > 0 && (
                  <section>
                    <h4 className="font-semibold text-sm mb-2 text-foreground">ABC Worksheets</h4>
                    <JsonList items={mod.abc_worksheets} />
                  </section>
                )}

                {/* Data Collection Practice */}
                {mod.data_collection_practice?.length > 0 && (
                  <section>
                    <h4 className="font-semibold text-sm mb-2 text-foreground">Data Collection Practice</h4>
                    <JsonList items={mod.data_collection_practice} />
                  </section>
                )}

                {/* Intervention Planning */}
                {mod.intervention_planning_prompts?.length > 0 && (
                  <section>
                    <h4 className="font-semibold text-sm mb-2 text-foreground">Intervention Planning</h4>
                    <JsonList items={mod.intervention_planning_prompts} />
                  </section>
                )}

                {/* Reinforcement Planning */}
                {mod.reinforcement_planning?.length > 0 && (
                  <section>
                    <h4 className="font-semibold text-sm mb-2 text-foreground">Reinforcement Planning</h4>
                    <JsonList items={mod.reinforcement_planning} />
                  </section>
                )}

                {/* Knowledge Check */}
                {mod.knowledge_check?.length > 0 && (
                  <section>
                    <h4 className="font-semibold text-sm flex items-center gap-2 mb-2 text-foreground">
                      <CheckSquare className="w-4 h-4 text-success" /> Knowledge Check
                    </h4>
                    <JsonList items={mod.knowledge_check} />
                  </section>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
