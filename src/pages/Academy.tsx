import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Route, Layers, FileText, ClipboardList, BarChart3, Search, ChevronRight, CheckCircle2, Clock, Play, X, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useAcademyData, LmsCourse, LmsModule, LmsLesson, LmsQuiz } from '@/hooks/useAcademyData';
import { toast } from 'sonner';

function EmptyState({ icon: Icon, message }: { icon: any; message: string }) {
  return (
    <div className="text-center py-16 text-muted-foreground">
      <Icon className="w-12 h-12 mx-auto mb-4 opacity-30" />
      <p>{message}</p>
    </div>
  );
}

export default function Academy() {
  const navigate = useNavigate();
  const data = useAcademyData();
  const [search, setSearch] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<LmsCourse | null>(null);
  const [selectedModule, setSelectedModule] = useState<LmsModule | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<LmsLesson | null>(null);

  useEffect(() => { data.fetchAll(); }, []);

  const filteredCourses = data.courses.filter(c =>
    !search || (c.title || '').toLowerCase().includes(search.toLowerCase()) || (c.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const filteredAcademyModules = data.academyModules.filter(m =>
    !search || m.title.toLowerCase().includes(search.toLowerCase())
  );

  const filteredPaths = data.academyPaths.filter(p =>
    !search || p.title.toLowerCase().includes(search.toLowerCase())
  );

  // Course detail view
  const courseModules = selectedCourse ? data.getModulesForCourse(selectedCourse.id) : [];

  // Module detail view
  const moduleLessons = selectedModule ? data.getLessonsForModule(selectedModule.id) : [];

  const handleMarkComplete = async (lessonId: string) => {
    await data.markLessonComplete(lessonId);
    toast.success('Lesson marked complete');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-20">
        <div className="container py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => {
              if (selectedLesson) setSelectedLesson(null);
              else if (selectedModule) setSelectedModule(null);
              else if (selectedCourse) setSelectedCourse(null);
              else navigate(-1);
            }}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-foreground">
                {selectedLesson ? selectedLesson.title : selectedModule ? selectedModule.title : selectedCourse ? selectedCourse.title : 'Nova Academy'}
              </h1>
              <p className="text-xs text-muted-foreground">
                {selectedLesson ? 'Lesson Content' : selectedModule ? 'Module Lessons' : selectedCourse ? 'Course Modules' : 'Courses, Paths, Modules & Training'}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-6">
        {data.isLoading ? (
          <div className="text-center py-16 text-muted-foreground">Loading academy...</div>
        ) : selectedLesson ? (
          /* ====== LESSON CONTENT VIEW ====== */
          <div className="max-w-2xl mx-auto space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <Badge variant="outline">{selectedLesson.lesson_type || 'content'}</Badge>
                  {data.isLessonComplete(selectedLesson.id) ? (
                    <Badge variant="default" className="gap-1"><CheckCircle2 className="w-3 h-3" /> Completed</Badge>
                  ) : (
                    <Button size="sm" onClick={() => handleMarkComplete(selectedLesson.id)} className="gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Mark Complete
                    </Button>
                  )}
                </div>
                {selectedLesson.content ? (
                  <div className="prose prose-sm max-w-none">
                    {typeof selectedLesson.content === 'string' ? (
                      <p>{selectedLesson.content}</p>
                    ) : typeof selectedLesson.content === 'object' && selectedLesson.content !== null ? (
                      <div>
                        {(selectedLesson.content as any).text && <p>{(selectedLesson.content as any).text}</p>}
                        {(selectedLesson.content as any).html && <div dangerouslySetInnerHTML={{ __html: (selectedLesson.content as any).html }} />}
                        {(selectedLesson.content as any).video_url && (
                          <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                            <a href={(selectedLesson.content as any).video_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary">
                              <Play className="w-8 h-8" /> Watch Video
                            </a>
                          </div>
                        )}
                        {!(selectedLesson.content as any).text && !(selectedLesson.content as any).html && !(selectedLesson.content as any).video_url && (
                          <pre className="text-xs bg-muted p-3 rounded overflow-auto">{JSON.stringify(selectedLesson.content, null, 2)}</pre>
                        )}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No content available</p>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No content available for this lesson</p>
                )}
              </CardContent>
            </Card>

            {/* Quizzes for this lesson */}
            {data.getQuizzesForLesson(selectedLesson.id).length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-sm">Quiz</CardTitle></CardHeader>
                <CardContent>
                  {data.getQuizzesForLesson(selectedLesson.id).map(quiz => (
                    <div key={quiz.id} className="space-y-3">
                      <p className="font-medium text-sm">{quiz.title}</p>
                      {data.getQuestionsForQuiz(quiz.id).map((q, i) => (
                        <div key={q.id} className="p-3 border border-border rounded">
                          <p className="text-sm font-medium mb-2">{i + 1}. {q.question}</p>
                          {q.options && Array.isArray(q.options) && (
                            <div className="space-y-1">
                              {(q.options as any[]).map((opt: any, j: number) => (
                                <div key={j} className="text-sm pl-4">• {typeof opt === 'string' ? opt : opt.label || opt.text || JSON.stringify(opt)}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        ) : selectedModule ? (
          /* ====== MODULE DETAIL VIEW ====== */
          <div className="max-w-2xl mx-auto">
            <div className="space-y-3">
              {moduleLessons.length === 0 ? (
                <EmptyState icon={FileText} message="No lessons in this module yet" />
              ) : (
                moduleLessons.map((lesson, i) => (
                  <Card key={lesson.id} className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all" onClick={() => setSelectedLesson(lesson)}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">{i + 1}</div>
                          <div>
                            <p className="text-sm font-medium">{lesson.title || `Lesson ${i + 1}`}</p>
                            <p className="text-xs text-muted-foreground">{lesson.lesson_type || 'content'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {data.isLessonComplete(lesson.id) && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        ) : selectedCourse ? (
          /* ====== COURSE DETAIL VIEW ====== */
          <div className="max-w-2xl mx-auto">
            {selectedCourse.description && <p className="text-sm text-muted-foreground mb-4">{selectedCourse.description}</p>}
            <div className="flex items-center gap-4 mb-4">
              <Progress value={data.getCourseProgress(selectedCourse.id)} className="flex-1" />
              <span className="text-sm font-medium">{data.getCourseProgress(selectedCourse.id)}%</span>
            </div>
            {courseModules.length === 0 ? (
              <EmptyState icon={Layers} message="No modules in this course yet" />
            ) : (
              <div className="space-y-3">
                {courseModules.map((mod, i) => {
                  const modLessons = data.getLessonsForModule(mod.id);
                  const completedCount = modLessons.filter(l => data.isLessonComplete(l.id)).length;
                  return (
                    <Card key={mod.id} className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all" onClick={() => setSelectedModule(mod)}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{i + 1}</div>
                            <div>
                              <p className="text-sm font-medium">{mod.title || `Module ${i + 1}`}</p>
                              <p className="text-xs text-muted-foreground">{modLessons.length} lessons · {completedCount} completed</p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* ====== MAIN TABS VIEW ====== */
          <Tabs defaultValue="courses">
            <TabsList className="mb-4 flex flex-wrap gap-1">
              <TabsTrigger value="courses" className="gap-1"><BookOpen className="w-3.5 h-3.5" />Courses ({data.courses.length})</TabsTrigger>
              <TabsTrigger value="paths" className="gap-1"><Route className="w-3.5 h-3.5" />Paths ({data.academyPaths.length})</TabsTrigger>
              <TabsTrigger value="modules" className="gap-1"><Layers className="w-3.5 h-3.5" />Modules ({data.academyModules.length})</TabsTrigger>
              <TabsTrigger value="lessons" className="gap-1"><FileText className="w-3.5 h-3.5" />Lessons ({data.lessons.length})</TabsTrigger>
              <TabsTrigger value="assignments" className="gap-1"><ClipboardList className="w-3.5 h-3.5" />Assignments ({data.myAssignments.length})</TabsTrigger>
              <TabsTrigger value="progress" className="gap-1"><BarChart3 className="w-3.5 h-3.5" />My Progress</TabsTrigger>
              <TabsTrigger value="team-trainings" className="gap-1"><GraduationCap className="w-3.5 h-3.5" />Team Trainings</TabsTrigger>
            </TabsList>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search courses, modules, paths..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>

            {/* COURSES */}
            <TabsContent value="courses">
              {filteredCourses.length === 0 ? <EmptyState icon={BookOpen} message="No courses available" /> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredCourses.map(course => {
                    const prog = data.getCourseProgress(course.id);
                    const mods = data.getModulesForCourse(course.id);
                    return (
                      <Card key={course.id} className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all" onClick={() => setSelectedCourse(course)}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">{course.title}</CardTitle>
                          <CardDescription className="line-clamp-2 text-xs">{course.description || 'No description'}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-2 mb-2">
                            {course.audience && <Badge variant="outline" className="text-[10px]">{course.audience}</Badge>}
                            {course.estimated_minutes && <Badge variant="secondary" className="text-[10px]"><Clock className="w-3 h-3 mr-1" />{course.estimated_minutes}m</Badge>}
                            <Badge variant="secondary" className="text-[10px]">{mods.length} modules</Badge>
                          </div>
                          <Progress value={prog} className="h-1.5" />
                          <p className="text-[10px] text-muted-foreground mt-1">{prog}% complete</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* PATHS */}
            <TabsContent value="paths">
              {filteredPaths.length === 0 ? <EmptyState icon={Route} message="No learning paths available" /> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPaths.map(path => (
                    <Card key={path.id}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">{path.title}</CardTitle>
                        <CardDescription className="text-xs">{path.description || 'No description'}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-1">
                          <Badge variant="outline" className="text-[10px]">{path.path_type}</Badge>
                          <Badge variant={path.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">{path.status}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* MODULES (Academy) */}
            <TabsContent value="modules">
              {filteredAcademyModules.length === 0 ? <EmptyState icon={Layers} message="No modules available" /> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredAcademyModules.map(mod => (
                    <Card key={mod.id} className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all" onClick={() => navigate(`/module/${mod.id}`)}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">{mod.title}</CardTitle>
                        <CardDescription className="text-xs line-clamp-2">{mod.short_description || 'No description'}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-[10px]">{mod.audience}</Badge>
                          <Badge variant="secondary" className="text-[10px]"><Clock className="w-3 h-3 mr-1" />{mod.est_minutes}m</Badge>
                          <Badge variant={mod.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">{mod.status}</Badge>
                          {mod.suggested_tool && <Badge variant="outline" className="text-[10px]">{mod.suggested_tool}</Badge>}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* LESSONS */}
            <TabsContent value="lessons">
              {data.lessons.length === 0 ? <EmptyState icon={FileText} message="No lessons available" /> : (
                <div className="space-y-2">
                  {data.lessons.filter(l => !search || (l.title || '').toLowerCase().includes(search.toLowerCase())).map(lesson => (
                    <Card key={lesson.id} className="cursor-pointer hover:shadow-md transition-all" onClick={() => setSelectedLesson(lesson)}>
                      <CardContent className="pt-3 pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {data.isLessonComplete(lesson.id) ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <FileText className="w-4 h-4 text-muted-foreground" />}
                            <div>
                              <p className="text-sm font-medium">{lesson.title || 'Untitled Lesson'}</p>
                              <p className="text-xs text-muted-foreground">{lesson.lesson_type || 'content'}</p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ASSIGNMENTS */}
            <TabsContent value="assignments">
              {data.myAssignments.length === 0 ? <EmptyState icon={ClipboardList} message="No assignments yet" /> : (
                <div className="space-y-3">
                  {data.myAssignments.map(a => (
                    <Card key={a.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{a.module_title || 'Module'}</p>
                            {a.due_date && <p className="text-xs text-muted-foreground">Due: {new Date(a.due_date).toLocaleDateString()}</p>}
                          </div>
                          <Badge variant={a.status === 'completed' ? 'default' : a.status === 'assigned' ? 'secondary' : 'outline'}>{a.status}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* MY PROGRESS */}
            <TabsContent value="progress">
              {data.myProgress.length === 0 ? <EmptyState icon={BarChart3} message="No progress recorded yet" /> : (
                <div className="space-y-3">
                  {data.myProgress.map(p => {
                    const mod = data.academyModules.find(m => m.id === p.module_id);
                    return (
                      <Card key={p.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">{mod?.title || 'Module'}</p>
                              <p className="text-xs text-muted-foreground">XP: {p.xp_earned} | {p.started_at ? `Started: ${new Date(p.started_at).toLocaleDateString()}` : 'Not started'}</p>
                            </div>
                            <Badge variant={p.status === 'completed' ? 'default' : 'secondary'}>{p.status}</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
