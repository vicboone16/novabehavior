import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { BookOpen, Clock, ChevronRight, CheckCircle2, Circle } from 'lucide-react';
import { toast } from 'sonner';

interface LmsCourse {
  id: string;
  title: string;
  description?: string;
  audience?: string;
  estimated_minutes?: number;
}

interface LmsModule {
  id: string;
  course_id?: string;
  title: string;
  order_index?: number;
  estimated_minutes?: number;
}

interface LmsLesson {
  id: string;
  module_id?: string;
  title: string;
  content?: any;
  lesson_type?: string;
  order_index?: number;
}

interface LmsProgress {
  lesson_id?: string;
  completed: boolean;
}

export function CoursesTab() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<LmsCourse[]>([]);
  const [modules, setModules] = useState<LmsModule[]>([]);
  const [lessons, setLessons] = useState<LmsLesson[]>([]);
  const [progress, setProgress] = useState<LmsProgress[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const sb = supabase.from as any;
    const [cRes, mRes, lRes, pRes] = await Promise.all([
      sb('lms_courses').select('*').order('title'),
      sb('lms_modules').select('*').order('order_index'),
      sb('lms_lessons').select('*').order('order_index'),
      sb('lms_progress').select('lesson_id, completed').eq('user_id', user?.id || ''),
    ]);
    setCourses((cRes.data || []) as LmsCourse[]);
    setModules((mRes.data || []) as LmsModule[]);
    setLessons((lRes.data || []) as LmsLesson[]);
    setProgress((pRes.data || []) as LmsProgress[]);
    setIsLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const isLessonComplete = (lessonId: string) =>
    progress.some(p => p.lesson_id === lessonId && p.completed);

  const getCourseProgress = (courseId: string) => {
    const mods = modules.filter(m => m.course_id === courseId);
    const ls = mods.flatMap(m => lessons.filter(l => l.module_id === m.id));
    if (ls.length === 0) return 0;
    return Math.round((ls.filter(l => isLessonComplete(l.id)).length / ls.length) * 100);
  };

  const markComplete = async (lessonId: string) => {
    if (!user) return;
    const { error } = await (supabase.from as any)('lms_progress').upsert({
      user_id: user.id, lesson_id: lessonId, completed: true, completed_at: new Date().toISOString(),
    }, { onConflict: 'user_id,lesson_id' });
    if (!error) {
      toast.success('Lesson completed!');
      await fetchData();
    }
  };

  const getStatusIcon = (lessonId: string) =>
    isLessonComplete(lessonId)
      ? <CheckCircle2 className="w-4 h-4 text-success" />
      : <Circle className="w-4 h-4 text-muted-foreground" />;

  if (isLoading) {
    return <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  // Drill-down: Lesson view
  if (selectedModule) {
    const mod = modules.find(m => m.id === selectedModule);
    const modLessons = lessons.filter(l => l.module_id === selectedModule);
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setSelectedModule(null)}>← Back to Modules</Button>
        <h3 className="text-lg font-bold text-foreground">{mod?.title} — Lessons</h3>
        {modLessons.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No lessons in this module yet.</p>
        ) : (
          <div className="space-y-2">
            {modLessons.map((lesson) => (
              <Card key={lesson.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(lesson.id)}
                    <div>
                      <p className="font-medium text-sm text-foreground">{lesson.title}</p>
                      {lesson.lesson_type && (
                        <Badge variant="secondary" className="text-xs mt-0.5">{lesson.lesson_type}</Badge>
                      )}
                    </div>
                  </div>
                  {!isLessonComplete(lesson.id) && (
                    <Button size="sm" variant="outline" onClick={() => markComplete(lesson.id)}>
                      Mark Complete
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Drill-down: Module view
  if (selectedCourse) {
    const course = courses.find(c => c.id === selectedCourse);
    const courseMods = modules.filter(m => m.course_id === selectedCourse);
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setSelectedCourse(null)}>← Back to Courses</Button>
        <h3 className="text-lg font-bold text-foreground">{course?.title} — Modules</h3>
        {courseMods.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No modules in this course yet.</p>
        ) : (
          <div className="grid gap-3">
            {courseMods.map((mod) => {
              const modLessons = lessons.filter(l => l.module_id === mod.id);
              const completed = modLessons.filter(l => isLessonComplete(l.id)).length;
              return (
                <Card key={mod.id} className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedModule(mod.id)}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{mod.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {completed}/{modLessons.length} lessons complete
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Course list
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">Courses</h2>
        <p className="text-sm text-muted-foreground">Click a course to explore modules and lessons</p>
      </div>
      {courses.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold text-foreground">No Courses Available</h3>
          <p className="text-muted-foreground mt-1">LMS courses will appear here once created.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {courses.map((course) => {
            const pct = getCourseProgress(course.id);
            return (
              <Card key={course.id} className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedCourse(course.id)}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{course.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  {course.description && (
                    <p className="text-sm text-muted-foreground mb-3">{course.description}</p>
                  )}
                  <div className="flex items-center gap-3">
                    <Progress value={pct} className="flex-1 h-2" />
                    <span className="text-xs font-medium text-muted-foreground">{pct}%</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
