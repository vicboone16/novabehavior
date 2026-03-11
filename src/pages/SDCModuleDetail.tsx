import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Clock, Target, BookOpen, MessageSquare, Lightbulb, AlertTriangle, CheckCircle2, Download, PenTool, Play, HelpCircle } from 'lucide-react';
import type { TrainingModuleContent, TrainingDownload, TrainingWorkbookItem } from '@/hooks/useSDCTraining';

function JsonList({ items }: { items: any }) {
  const arr = Array.isArray(items) ? items : [];
  if (arr.length === 0) return <p className="text-sm text-muted-foreground italic">None specified</p>;
  return (
    <ul className="space-y-1">
      {arr.map((item, i) => (
        <li key={i} className="text-sm flex items-start gap-2">
          <span className="text-primary mt-0.5">•</span>
          <span>{typeof item === 'string' ? item : JSON.stringify(item)}</span>
        </li>
      ))}
    </ul>
  );
}

export default function SDCModuleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [mod, setMod] = useState<TrainingModuleContent | null>(null);
  const [downloads, setDownloads] = useState<TrainingDownload[]>([]);
  const [workbookItems, setWorkbookItems] = useState<TrainingWorkbookItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    Promise.all([
      (supabase.from as any)('training_module_content').select('*').eq('module_key', id).single(),
      (supabase.from as any)('training_downloads').select('*').eq('module_key', id).eq('is_active', true).order('sort_order'),
      (supabase.from as any)('training_workbook_items').select('*').eq('module_key', id).eq('is_active', true).order('sort_order'),
    ]).then(([modRes, dlRes, wbRes]) => {
      setMod(modRes.data as TrainingModuleContent | null);
      setDownloads((dlRes.data || []) as TrainingDownload[]);
      setWorkbookItems((wbRes.data || []) as TrainingWorkbookItem[]);
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
        <Button onClick={() => navigate('/sdc-training')}>Back to Team Trainings</Button>
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
            <h1 className="text-2xl font-bold text-foreground">{mod.title}</h1>
            <div className="flex items-center gap-2">
              <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />{mod.estimated_minutes} min</Badge>
              <Badge variant="outline">{mod.status}</Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {mod.overview && (
          <Card>
            <CardContent className="p-5">
              <h4 className="font-semibold text-sm flex items-center gap-2 mb-2"><Target className="w-4 h-4 text-accent" /> Overview</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{mod.overview}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><BookOpen className="w-4 h-4 text-accent" /> Instructor Content</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <section><h4 className="font-semibold text-sm flex items-center gap-2 mb-2"><CheckCircle2 className="w-4 h-4 text-success" />Learning Objectives</h4><JsonList items={mod.learning_objectives} /></section>
            <section><h4 className="font-semibold text-sm flex items-center gap-2 mb-2"><MessageSquare className="w-4 h-4 text-info" />Talking Points</h4><JsonList items={mod.talking_points} /></section>
            <section><h4 className="font-semibold text-sm flex items-center gap-2 mb-2"><Play className="w-4 h-4 text-primary" />Demonstration Steps</h4><JsonList items={mod.demonstration_steps} /></section>
            <section><h4 className="font-semibold text-sm flex items-center gap-2 mb-2"><HelpCircle className="w-4 h-4 text-info" />Discussion Prompts</h4><JsonList items={mod.discussion_prompts} /></section>
            <section><h4 className="font-semibold text-sm flex items-center gap-2 mb-2"><Lightbulb className="w-4 h-4 text-warning" />Scenario Prompts</h4><JsonList items={mod.scenario_prompts} /></section>
            <section><h4 className="font-semibold text-sm flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4 text-destructive" />Common Misconceptions</h4><JsonList items={mod.misconceptions} /></section>
            <section><h4 className="font-semibold text-sm mb-2">Key Takeaways</h4><JsonList items={mod.key_takeaways} /></section>
          </CardContent>
        </Card>

        {workbookItems.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><PenTool className="w-4 h-4 text-accent" /> Workbook Activities</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {workbookItems.map(item => (
                <div key={item.id} className="p-3 rounded-lg border">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <Badge variant="secondary" className="text-xs">{item.item_type}</Badge>
                  </div>
                  {item.instructions && <p className="text-xs text-muted-foreground">{item.instructions}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {downloads.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Download className="w-4 h-4 text-accent" /> Downloads</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {downloads.map(d => (
                <div key={d.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium text-foreground">{d.title}</p>
                    {d.description && <p className="text-xs text-muted-foreground">{d.description}</p>}
                  </div>
                  {d.file_url ? (
                    <Button variant="outline" size="sm" asChild>
                      <a href={d.file_url} target="_blank" rel="noopener noreferrer"><Download className="w-3 h-3 mr-1" /> Get</a>
                    </Button>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
