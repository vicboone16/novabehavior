import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, CheckCircle2, BookOpen, Play, FileText, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ModuleDetail {
  module_id: string;
  title: string;
  short_description: string | null;
  est_minutes: number;
  skill_tags: string[];
  status: string;
  audience: string;
  suggested_tool: string | null;
  created_at: string;
}

interface ModuleVersion {
  module_version_id: string;
  version_num: number;
  status: string;
  content: Record<string, unknown>;
  change_notes: string | null;
  created_at: string;
}

interface ModuleProgress {
  progress_id: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  last_screen_key: string | null;
  xp_earned: number;
}

export default function ModulePlayer() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [module, setModule] = useState<ModuleDetail | null>(null);
  const [version, setVersion] = useState<ModuleVersion | null>(null);
  const [progress, setProgress] = useState<ModuleProgress | null>(null);
  const [screens, setScreens] = useState<any[]>([]);
  const [currentScreen, setCurrentScreen] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchModule = useCallback(async () => {
    if (!moduleId) return;
    setIsLoading(true);
    try {
      // Fetch module
      const { data: mod, error: modErr } = await supabase
        .from('academy_modules')
        .select('*')
        .eq('module_id', moduleId)
        .single();
      if (modErr) throw modErr;
      setModule(mod as unknown as ModuleDetail);

      // Fetch latest published version
      const { data: ver } = await (supabase as any)
        .from('academy_module_versions')
        .select('*')
        .eq('module_id', moduleId)
        .eq('status', 'published')
        .order('version_num', { ascending: false })
        .limit(1);

      if (ver && ver.length > 0) {
        setVersion(ver[0]);
        const content = ver[0].content as any;
        if (content?.screens && Array.isArray(content.screens)) {
          setScreens(content.screens);
        } else if (content?.sections && Array.isArray(content.sections)) {
          setScreens(content.sections);
        } else if (content?.body) {
          setScreens([{ type: 'text', title: 'Content', body: content.body }]);
        } else {
          setScreens([{ type: 'info', title: mod.title, body: mod.short_description || 'No content available for this module yet.' }]);
        }
      } else {
        // No published version, show module info
        setScreens([{
          type: 'info',
          title: mod.title,
          body: mod.short_description || 'This module has no published content yet. Check back later or contact your administrator.',
        }]);
      }

      // Fetch user progress
      if (user) {
        const { data: prog } = await (supabase as any)
          .from('academy_module_progress')
          .select('*')
          .eq('module_id', moduleId)
          .eq('coach_user_id', user.id)
          .limit(1);
        if (prog && prog.length > 0) {
          setProgress(prog[0]);
          // Resume from last screen
          if (prog[0].last_screen_key) {
            const idx = parseInt(prog[0].last_screen_key);
            if (!isNaN(idx) && idx >= 0) setCurrentScreen(idx);
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to load module:', err.message);
      toast.error('Failed to load module');
    } finally {
      setIsLoading(false);
    }
  }, [moduleId, user]);

  useEffect(() => { fetchModule(); }, [fetchModule]);

  const saveProgress = useCallback(async (screenIdx: number, completed = false) => {
    if (!user || !moduleId) return;
    try {
      const now = new Date().toISOString();
      if (progress) {
        await (supabase as any)
          .from('academy_module_progress')
          .update({
            last_screen_key: String(screenIdx),
            status: completed ? 'completed' : 'in_progress',
            completed_at: completed ? now : null,
            updated_at: now,
          })
          .eq('progress_id', progress.progress_id);
      } else {
        const { data } = await (supabase as any)
          .from('academy_module_progress')
          .insert({
            module_id: moduleId,
            coach_user_id: user.id,
            module_version_id: version?.module_version_id || null,
            last_screen_key: String(screenIdx),
            status: completed ? 'completed' : 'in_progress',
            started_at: now,
            completed_at: completed ? now : null,
          })
          .select()
          .single();
        if (data) setProgress(data);
      }
    } catch (err: any) {
      console.error('Failed to save progress:', err.message);
    }
  }, [user, moduleId, progress, version]);

  const handleNext = () => {
    if (currentScreen < screens.length - 1) {
      const next = currentScreen + 1;
      setCurrentScreen(next);
      saveProgress(next);
    } else {
      // Complete
      saveProgress(currentScreen, true);
      toast.success('Module completed! 🎉');
    }
  };

  const handlePrev = () => {
    if (currentScreen > 0) setCurrentScreen(currentScreen - 1);
  };

  const progressPct = screens.length > 0 ? ((currentScreen + 1) / screens.length) * 100 : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading module…</div>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-40" />
            <p className="text-muted-foreground">Module not found</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const screen = screens[currentScreen];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-20">
        <div className="container py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-lg font-bold text-foreground">{module.title}</h1>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{module.est_minutes} min</span>
                  {version && <Badge variant="outline" className="text-xs">v{version.version_num}</Badge>}
                  {progress?.status === 'completed' && (
                    <Badge variant="default" className="text-xs gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Completed
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              {currentScreen + 1} / {screens.length}
            </div>
          </div>
          <Progress value={progressPct} className="mt-2 h-1" />
        </div>
      </header>

      {/* Content */}
      <main className="container py-6 max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{screen?.title || `Section ${currentScreen + 1}`}</CardTitle>
            {screen?.subtitle && <CardDescription>{screen.subtitle}</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Text content */}
            {screen?.body && (
              <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
                {screen.body}
              </div>
            )}

            {/* Video content */}
            {screen?.video_url && (
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <iframe
                  src={screen.video_url}
                  className="w-full h-full rounded-lg"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}

            {/* Image */}
            {screen?.image_url && (
              <img src={screen.image_url} alt={screen.title || ''} className="rounded-lg max-w-full" />
            )}

            {/* Link */}
            {screen?.link_url && (
              <a
                href={screen.link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                {screen.link_label || screen.link_url}
              </a>
            )}

            {/* Quiz questions */}
            {screen?.questions && Array.isArray(screen.questions) && (
              <QuizSection questions={screen.questions} />
            )}

            {/* Key points */}
            {screen?.key_points && Array.isArray(screen.key_points) && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="font-semibold text-sm text-foreground">Key Points</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {screen.key_points.map((point: string, i: number) => (
                    <li key={i}>{point}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tags */}
            {module.skill_tags.length > 0 && currentScreen === 0 && (
              <div className="flex gap-2 flex-wrap pt-4">
                {module.skill_tags.map(tag => (
                  <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-6">
          <Button variant="outline" onClick={handlePrev} disabled={currentScreen === 0}>
            Previous
          </Button>
          <Button onClick={handleNext}>
            {currentScreen === screens.length - 1 ? 'Complete Module' : 'Next'}
          </Button>
        </div>
      </main>
    </div>
  );
}

// Simple quiz component
function QuizSection({ questions }: { questions: any[] }) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);

  return (
    <div className="space-y-4">
      {questions.map((q, idx) => (
        <div key={idx} className="bg-muted/30 rounded-lg p-4 space-y-2">
          <p className="font-medium text-sm text-foreground">{q.question || q.text}</p>
          <div className="space-y-1">
            {(q.options || []).map((opt: any, oi: number) => {
              const label = typeof opt === 'string' ? opt : opt.label || opt.text;
              const isSelected = answers[idx] === label;
              const isCorrect = showResults && (typeof opt === 'string' ? opt === q.answer : opt.is_correct);
              const isWrong = showResults && isSelected && !isCorrect;
              return (
                <button
                  key={oi}
                  onClick={() => !showResults && setAnswers(prev => ({ ...prev, [idx]: label }))}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm border transition-colors ${
                    isSelected
                      ? isWrong ? 'border-destructive bg-destructive/10' : 'border-primary bg-primary/10'
                      : 'border-border hover:bg-accent'
                  } ${showResults && isCorrect ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : ''}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {showResults && q.rationale && (
            <p className="text-xs text-muted-foreground mt-1">💡 {q.rationale}</p>
          )}
        </div>
      ))}
      {!showResults && questions.length > 0 && (
        <Button
          size="sm"
          onClick={() => setShowResults(true)}
          disabled={Object.keys(answers).length < questions.length}
        >
          Check Answers
        </Button>
      )}
    </div>
  );
}
