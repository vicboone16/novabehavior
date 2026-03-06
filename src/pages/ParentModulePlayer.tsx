import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, CheckCircle2, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const db = supabase as any;

export default function ParentModulePlayer() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [module, setModule] = useState<any>(null);
  const [version, setVersion] = useState<any>(null);
  const [screens, setScreens] = useState<any[]>([]);
  const [currentScreen, setCurrentScreen] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!moduleId) return;
    setIsLoading(true);
    (async () => {
      try {
        const { data: mod } = await db
          .from('parent_training_modules')
          .select('*')
          .eq('module_id', moduleId)
          .single();
        setModule(mod);

        // Get published version
        const { data: ver } = await db
          .from('parent_training_module_versions')
          .select('*')
          .eq('module_id', moduleId)
          .eq('status', 'published')
          .order('version_num', { ascending: false })
          .limit(1);

        if (ver && ver.length > 0) {
          setVersion(ver[0]);
          const content = ver[0].content as any;
          if (content?.screens) setScreens(content.screens);
          else if (content?.sections) setScreens(content.sections);
          else if (content?.body) setScreens([{ type: 'text', title: 'Content', body: content.body }]);
          else setScreens([{ type: 'info', title: mod?.title, body: mod?.short_description || 'No content yet.' }]);
        } else {
          setScreens([{ type: 'info', title: mod?.title || 'Module', body: mod?.short_description || 'No published content yet.' }]);
        }
      } catch (err: any) {
        toast.error('Failed to load module');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [moduleId]);

  const handleNext = async () => {
    if (currentScreen < screens.length - 1) {
      setCurrentScreen(prev => prev + 1);
    } else {
      // Mark assignment completed
      if (user && moduleId) {
        try {
          await db
            .from('parent_training_assignments')
            .update({ status: 'completed', updated_at: new Date().toISOString() })
            .eq('module_id', moduleId)
            .eq('parent_user_id', user.id);
        } catch {}
      }
      toast.success('Module completed! 🎉');
      navigate('/parent-training');
    }
  };

  const progressPct = screens.length > 0 ? ((currentScreen + 1) / screens.length) * 100 : 0;
  const screen = screens[currentScreen];

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-20">
        <div className="container py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/parent-training')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-lg font-bold text-foreground">{module?.title || 'Training Module'}</h1>
                <span className="text-xs text-muted-foreground">{currentScreen + 1} / {screens.length}</span>
              </div>
            </div>
          </div>
          <Progress value={progressPct} className="mt-2 h-1" />
        </div>
      </header>

      <main className="container py-6 max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>{screen?.title || `Section ${currentScreen + 1}`}</CardTitle>
          </CardHeader>
          <CardContent>
            {screen?.body && (
              <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">{screen.body}</div>
            )}
            {screen?.video_url && (
              <div className="aspect-video mt-4">
                <iframe src={screen.video_url} className="w-full h-full rounded-lg" allowFullScreen />
              </div>
            )}
            {screen?.image_url && <img src={screen.image_url} alt="" className="rounded-lg mt-4 max-w-full" />}
            {screen?.key_points && (
              <div className="bg-muted/50 rounded-lg p-4 mt-4 space-y-1">
                <p className="font-semibold text-sm">Key Takeaways</p>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  {screen.key_points.map((p: string, i: number) => <li key={i}>{p}</li>)}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={() => setCurrentScreen(prev => Math.max(0, prev - 1))} disabled={currentScreen === 0}>
            Previous
          </Button>
          <Button onClick={handleNext}>
            {currentScreen === screens.length - 1 ? 'Complete' : 'Next'}
          </Button>
        </div>
      </main>
    </div>
  );
}
