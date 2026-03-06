import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface LmsCourse {
  id: string;
  title: string;
  description?: string;
  audience?: string;
  estimated_minutes?: number;
  slug?: string;
  app_visibility?: string[];
  created_at?: string;
}

export interface LmsModule {
  id: string;
  course_id?: string;
  title: string;
  order_index?: number;
  estimated_minutes?: number;
}

export interface LmsLesson {
  id: string;
  module_id?: string;
  title: string;
  content?: any;
  lesson_type?: string;
  order_index?: number;
}

export interface LmsProgress {
  id: string;
  user_id?: string;
  lesson_id?: string;
  completed: boolean;
  completed_at?: string;
}

export interface LmsQuiz {
  id: string;
  lesson_id?: string;
  title: string;
}

export interface LmsQuestion {
  id: string;
  quiz_id?: string;
  question: string;
  options?: any;
  correct_answer?: string;
}

export interface LmsResource {
  id: string;
  title: string;
  category?: string;
  description?: string;
  file_url?: string;
  created_at?: string;
}

export interface AcademyPath {
  id: string;
  title: string;
  description?: string;
  path_type: string;
  status: string;
  agency_id?: string;
  created_at: string;
}

export interface AcademyModule {
  id: string;
  title: string;
  short_description?: string;
  audience: string;
  scope: string;
  est_minutes: number;
  skill_tags: string[];
  status: string;
  suggested_tool?: string;
  created_at: string;
}

export interface AcademyAssignment {
  id: string;
  module_id: string;
  coach_user_id: string;
  status: string;
  due_date?: string;
  created_at: string;
  module_title?: string;
}

export interface AcademyProgress {
  id: string;
  module_id: string;
  coach_user_id: string;
  status: string;
  xp_earned: number;
  started_at?: string;
  completed_at?: string;
}

export function useAcademyData() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<LmsCourse[]>([]);
  const [modules, setModules] = useState<LmsModule[]>([]);
  const [lessons, setLessons] = useState<LmsLesson[]>([]);
  const [progress, setProgress] = useState<LmsProgress[]>([]);
  const [quizzes, setQuizzes] = useState<LmsQuiz[]>([]);
  const [questions, setQuestions] = useState<LmsQuestion[]>([]);
  const [resources, setResources] = useState<LmsResource[]>([]);
  const [academyPaths, setAcademyPaths] = useState<AcademyPath[]>([]);
  const [academyModules, setAcademyModules] = useState<AcademyModule[]>([]);
  const [academyAssignments, setAcademyAssignments] = useState<AcademyAssignment[]>([]);
  const [academyProgress, setAcademyProgress] = useState<AcademyProgress[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const sb = supabase.from as any;
      const [cRes, mRes, lRes, pRes, qRes, questRes, rRes, apRes, amRes, aaRes, aprogRes] = await Promise.all([
        sb('lms_courses').select('*').order('title'),
        sb('lms_modules').select('*').order('order_index'),
        sb('lms_lessons').select('*').order('order_index'),
        sb('lms_progress').select('*'),
        sb('lms_quizzes').select('*'),
        sb('lms_questions').select('*'),
        sb('lms_resources').select('*').order('title'),
        supabase.from('academy_paths').select('*').order('title'),
        supabase.from('academy_modules').select('*').order('title'),
        supabase.from('academy_module_assignments').select('*, academy_modules(title)').order('created_at', { ascending: false }),
        supabase.from('academy_module_progress').select('*'),
      ]);

      setCourses((cRes.data || []) as LmsCourse[]);
      setModules((mRes.data || []) as LmsModule[]);
      setLessons((lRes.data || []) as LmsLesson[]);
      setProgress((pRes.data || []) as LmsProgress[]);
      setQuizzes((qRes.data || []) as LmsQuiz[]);
      setQuestions((questRes.data || []) as LmsQuestion[]);
      setResources((rRes.data || []) as LmsResource[]);
      setAcademyPaths((apRes.data || []).map((p: any) => ({ ...p, id: p.path_id })) as AcademyPath[]);
      setAcademyModules((amRes.data || []).map((m: any) => ({ ...m, id: m.module_id })) as AcademyModule[]);
      setAcademyAssignments((aaRes.data || []).map((a: any) => ({
        ...a,
        id: a.assignment_id,
        module_title: a.academy_modules?.title,
      })) as AcademyAssignment[]);
      setAcademyProgress((aprogRes.data || []).map((p: any) => ({ ...p, id: p.progress_id })) as AcademyProgress[]);
    } catch (err: any) {
      console.error('Failed to load academy data:', err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getModulesForCourse = useCallback((courseId: string) => {
    return modules.filter(m => m.course_id === courseId);
  }, [modules]);

  const getLessonsForModule = useCallback((moduleId: string) => {
    return lessons.filter(l => l.module_id === moduleId);
  }, [lessons]);

  const getQuizzesForLesson = useCallback((lessonId: string) => {
    return quizzes.filter(q => q.lesson_id === lessonId);
  }, [quizzes]);

  const getQuestionsForQuiz = useCallback((quizId: string) => {
    return questions.filter(q => q.quiz_id === quizId);
  }, [questions]);

  const isLessonComplete = useCallback((lessonId: string) => {
    return progress.some(p => p.lesson_id === lessonId && p.completed);
  }, [progress]);

  const getCourseProgress = useCallback((courseId: string) => {
    const courseLessons = modules
      .filter(m => m.course_id === courseId)
      .flatMap(m => lessons.filter(l => l.module_id === m.id));
    if (courseLessons.length === 0) return 0;
    const completed = courseLessons.filter(l => isLessonComplete(l.id)).length;
    return Math.round((completed / courseLessons.length) * 100);
  }, [modules, lessons, isLessonComplete]);

  const markLessonComplete = useCallback(async (lessonId: string) => {
    if (!user) return;
    const { error } = await (supabase.from as any)('lms_progress').upsert({
      user_id: user.id,
      lesson_id: lessonId,
      completed: true,
      completed_at: new Date().toISOString(),
    }, { onConflict: 'user_id,lesson_id' });
    if (!error) await fetchAll();
  }, [user, fetchAll]);

  const myAssignments = academyAssignments.filter(a => a.coach_user_id === user?.id);
  const myProgress = academyProgress.filter(p => p.coach_user_id === user?.id);

  return {
    courses, modules, lessons, progress, quizzes, questions, resources,
    academyPaths, academyModules, academyAssignments, academyProgress,
    isLoading, fetchAll,
    getModulesForCourse, getLessonsForModule, getQuizzesForLesson, getQuestionsForQuiz,
    isLessonComplete, getCourseProgress, markLessonComplete,
    myAssignments, myProgress,
  };
}
