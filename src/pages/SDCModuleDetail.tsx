import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Clock, Target, BookOpen, MessageSquare, Lightbulb, AlertTriangle, CheckCircle2, Download, PenTool } from 'lucide-react';
import type { SDCModule, SDCResource } from '@/hooks/useSDCTraining';

function JsonList({ items }: { items: any[] }) {
  if (!items || items.length === 0) return <p className="text-sm text-muted-foreground italic">None specified</p>;
  return (
    <ul className="space-y-1">
      {items.map((item, i) => (
        <li key={i} className="text-sm flex items-start gap-2">
          <span className="text-primary mt-0.5">•</span>
          <span>{typeof item === 'string' ? item : item.text || item.label || item.question || JSON.stringify(item)}</span>
        </li>
      ))}
    </ul>
  );
}

export default function SDCModuleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [mod, setMod] = useState<SDCModule | null>(null);
  const [resources, setResources] = useState<SDCResource[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    Promise.all([
      supabase.from('sdc_training_modules' as any).select('*').eq('id', id).single(),
      supabase.from('sdc_training_resources' as any).select('*').eq('module_id', id).order('sort_order'),
    ]).then(([modRes, resRes]) => {
      setMod(modRes.data as unknown as SDCModule);
      setResources((resRes.data || []) as unknown as SDCResource[]);
      setIsLoading(false);
    });
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (!mod) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-lg text-muted-foreground">Module not found</p>
        <Button onClick={() => navigate('/sdc-training')}>Back to SDC Training</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/sdc-training')} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to SDC Training
          </Button>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                  {mod.sort_order}
                </div>
                <h1 className="text-2xl font-bold text-foreground">{mod.title}</h1>
              </div>
              {mod.training_objective && (
                <p className="text-sm text-muted-foreground mt-1">{mod.training_objective}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />{mod.estimated_minutes} min</Badge>
              <Badge variant="outline">{mod.status}</Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Instructor Content */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-accent" /> Instructor Content
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {mod.instructor_script && (
              <section>
                <h4 className="font-semibold text-sm mb-2">Script / Talking Points</h4>
                <div className="bg-muted/50 rounded-lg p-4 text-sm whitespace-pre-wrap">{mod.instructor_script}</div>
              </section>
            )}
            <section>
              <h4 className="font-semibold text-sm flex items-center gap-2 mb-2"><MessageSquare className="w-4 h-4 text-info" />Discussion Prompts</h4>
              <JsonList items={mod.discussion_prompts} />
            </section>
            <section>
              <h4 className="font-semibold text-sm flex items-center gap-2 mb-2"><Lightbulb className="w-4 h-4 text-warning" />Key Definitions</h4>
              <JsonList items={mod.key_definitions} />
            </section>
            <section>
              <h4 className="font-semibold text-sm flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4 text-destructive" />Common Staff Errors</h4>
              <JsonList items={mod.common_staff_errors} />
            </section>
            <section>
              <h4 className="font-semibold text-sm flex items-center gap-2 mb-2"><CheckCircle2 className="w-4 h-4 text-success" />Fidelity Check Items</h4>
              <JsonList items={mod.fidelity_check_items} />
            </section>
            <section>
              <h4 className="font-semibold text-sm mb-2">Key Takeaways</h4>
              <JsonList items={mod.key_takeaways} />
            </section>
          </CardContent>
        </Card>

        {/* Workbook Content */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PenTool className="w-4 h-4 text-accent" /> Staff Workbook
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {mod.workbook_reading_content && (
              <section>
                <h4 className="font-semibold text-sm mb-2">Reading</h4>
                <div className="bg-muted/30 rounded-lg p-4 text-sm whitespace-pre-wrap leading-relaxed">{mod.workbook_reading_content}</div>
              </section>
            )}
            <section>
              <h4 className="font-semibold text-sm mb-2">Reflection Prompts</h4>
              <JsonList items={mod.reflection_prompts} />
            </section>
            <section>
              <h4 className="font-semibold text-sm mb-2">Scenario Questions</h4>
              <JsonList items={mod.scenario_questions} />
            </section>
            {mod.knowledge_check?.length > 0 && (
              <section>
                <h4 className="font-semibold text-sm mb-2">Knowledge Check</h4>
                <JsonList items={mod.knowledge_check} />
              </section>
            )}
          </CardContent>
        </Card>

        {/* Downloads */}
        {resources.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Download className="w-4 h-4 text-accent" /> Resources & Downloads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {resources.map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="text-sm font-medium text-foreground">{r.title}</p>
                      {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
                    </div>
                    {r.file_url ? (
                      <Button variant="outline" size="sm" asChild>
                        <a href={r.file_url} target="_blank" rel="noopener noreferrer">
                          <Download className="w-3 h-3 mr-1" /> Get
                        </a>
                      </Button>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
