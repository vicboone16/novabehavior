import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Library, Clock, CheckCircle2, ChevronRight, FileText, Lightbulb, ListChecks, Target, Upload, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useParentTrainingParent } from '@/hooks/useParentTrainingParent';
import { ParentAssignedTraining } from '@/components/parent-training/ParentAssignedTraining';
import { ParentGoalsView } from '@/components/parent-training/ParentGoalsView';
import { ParentHomeworkView } from '@/components/parent-training/ParentHomeworkView';
import { ParentProgressView } from '@/components/parent-training/ParentProgressView';
import { toast } from 'sonner';

const db = supabase as any;

interface LibraryItem {
  item_id: string;
  title: string;
  summary: string | null;
  item_type: string;
  tags: string[];
  body: Record<string, unknown>;
  status: string;
}

interface IndependentModule {
  assignment_id: string;
  module_id: string;
  module_version_id: string;
  status: string;
  due_at: string | null;
  module_title?: string;
  est_minutes?: number;
  skill_tags?: string[];
  short_description?: string;
}

const ITEM_TYPE_ICONS: Record<string, typeof FileText> = {
  script: FileText,
  visual: Lightbulb,
  checklist: ListChecks,
  tip_sheet: FileText,
  replacement_idea: Lightbulb,
};

export default function ParentTrainingViewer() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Independent mode data (existing)
  const [indepAssignments, setIndepAssignments] = useState<IndependentModule[]>([]);
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [isIndepLoading, setIsIndepLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(null);

  // Agency-linked mode data (new)
  const agencyData = useParentTrainingParent();

  // Fetch independent-mode assignments (existing logic preserved)
  const fetchIndepAssignments = useCallback(async () => {
    if (!user) return;
    try {
      // Fetch assignments with no agency (independent) OR all if not agency-linked
      const query = db
        .from('parent_training_assignments')
        .select('*, parent_training_modules(title, short_description, est_minutes, skill_tags)')
        .eq('parent_user_id', user.id)
        .order('created_at', { ascending: false });

      // If agency-linked, only show independent modules here
      if (agencyData.isAgencyLinked) {
        query.is('agency_id', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      const mapped = (data || []).map((d: any) => ({
        ...d,
        module_title: d.parent_training_modules?.title,
        est_minutes: d.parent_training_modules?.est_minutes,
        skill_tags: d.parent_training_modules?.skill_tags || [],
        short_description: d.parent_training_modules?.short_description,
      }));
      setIndepAssignments(mapped);
    } catch (err: any) {
      console.error('Failed to load assignments:', err.message);
      setIndepAssignments([]);
    }
  }, [user, agencyData.isAgencyLinked]);

  const fetchLibrary = useCallback(async () => {
    try {
      const { data, error } = await db
        .from('parent_training_library')
        .select('*')
        .eq('status', 'active')
        .order('title');
      if (error) throw error;
      setLibrary(data || []);
    } catch (err: any) {
      console.error('Failed to load library:', err.message);
      setLibrary([]);
    }
  }, []);

  useEffect(() => {
    if (agencyData.isLoading) return;
    setIsIndepLoading(true);
    Promise.all([fetchIndepAssignments(), fetchLibrary()]).finally(() => setIsIndepLoading(false));
  }, [fetchIndepAssignments, fetchLibrary, agencyData.isLoading]);

  const completedCount = indepAssignments.filter(a => a.status === 'completed').length;
  const totalCount = indepAssignments.length;
  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const handleStartModule = async (assignment: IndependentModule) => {
    if (assignment.status === 'assigned') {
      try {
        await db
          .from('parent_training_assignments')
          .update({ status: 'in_progress', updated_at: new Date().toISOString() })
          .eq('assignment_id', assignment.assignment_id);
      } catch {}
    }
    navigate(`/parent-training/${assignment.module_id}`);
  };

  const isLoading = agencyData.isLoading || isIndepLoading;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-20">
        <div className="container py-4">
          <h1 className="text-xl font-bold text-foreground">My Training</h1>
          <p className="text-sm text-muted-foreground">
            {agencyData.isAgencyLinked
              ? `Training and resources from your care team${agencyData.agencyName ? ` at ${agencyData.agencyName}` : ''}`
              : 'Assigned modules and resource library from your care team'}
          </p>
        </div>
      </header>

      <main className="container py-6 max-w-4xl mx-auto">
        {/* Independent progress summary */}
        {totalCount > 0 && !agencyData.isAgencyLinked && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">{completedCount} of {totalCount} modules completed</span>
                <span className="text-sm text-muted-foreground">{Math.round(progressPct)}%</span>
              </div>
              <Progress value={progressPct} className="h-2" />
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue={agencyData.isAgencyLinked ? 'assigned' : 'modules'}>
          <TabsList className="mb-6 flex-wrap h-auto gap-1">
            {/* === Existing independent tabs (Learn lane) === */}
            <TabsTrigger value="modules" className="gap-2 text-xs md:text-sm">
              <BookOpen className="w-4 h-4" /> 
              {agencyData.isAgencyLinked ? 'Learn' : 'My Modules'}
              {totalCount > 0 && <Badge variant="secondary" className="ml-1 text-xs">{totalCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="library" className="gap-2 text-xs md:text-sm">
              <Library className="w-4 h-4" /> Resources
            </TabsTrigger>

            {/* === Agency-linked tabs (only shown for agency parents) === */}
            {agencyData.isAgencyLinked && (
              <>
                <TabsTrigger value="assigned" className="gap-2 text-xs md:text-sm">
                  <BookOpen className="w-4 h-4" /> Assigned Training
                  {agencyData.activeModules > 0 && <Badge variant="secondary" className="ml-1 text-xs">{agencyData.activeModules}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="goals" className="gap-2 text-xs md:text-sm">
                  <Target className="w-4 h-4" /> My Goals
                  {agencyData.totalGoals > 0 && <Badge variant="secondary" className="ml-1 text-xs">{agencyData.totalGoals}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="homework" className="gap-2 text-xs md:text-sm">
                  <Upload className="w-4 h-4" /> Homework
                </TabsTrigger>
                <TabsTrigger value="progress" className="gap-2 text-xs md:text-sm">
                  <BarChart3 className="w-4 h-4" /> Progress
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {/* =========== EXISTING: Modules tab (independent lane) =========== */}
          <TabsContent value="modules">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading…</div>
            ) : indepAssignments.length === 0 ? (
              <Card>
                <CardContent className="pt-12 pb-12 text-center">
                  <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
                  <p className="text-muted-foreground">No training modules assigned yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Your care team will assign modules when they're ready</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {indepAssignments.map(a => {
                  const isCompleted = a.status === 'completed';
                  const isOverdue = a.due_at && new Date(a.due_at) < new Date() && !isCompleted;
                  return (
                    <Card
                      key={a.assignment_id}
                      className={`cursor-pointer transition-all hover:shadow-md ${isCompleted ? 'opacity-70' : ''} ${isOverdue ? 'border-destructive/50' : 'hover:border-primary/30'}`}
                      onClick={() => handleStartModule(a)}
                    >
                      <CardContent className="py-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isCompleted ? 'bg-green-100 dark:bg-green-950' : 'bg-primary/10'}`}>
                            {isCompleted ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <BookOpen className="w-5 h-5 text-primary" />}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{a.module_title || 'Untitled Module'}</p>
                            {a.short_description && <p className="text-xs text-muted-foreground line-clamp-1">{a.short_description}</p>}
                            <div className="flex items-center gap-2 mt-1">
                              {a.est_minutes && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {a.est_minutes} min
                                </span>
                              )}
                              <Badge variant={isCompleted ? 'default' : isOverdue ? 'destructive' : 'secondary'} className="text-xs">
                                {isOverdue ? 'Overdue' : a.status}
                              </Badge>
                              {a.due_at && !isCompleted && (
                                <span className="text-xs text-muted-foreground">Due {new Date(a.due_at).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* =========== EXISTING: Library tab =========== */}
          <TabsContent value="library">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading…</div>
            ) : library.length === 0 ? (
              <Card>
                <CardContent className="pt-12 pb-12 text-center">
                  <Library className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
                  <p className="text-muted-foreground">No resources available yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {library.map(item => {
                  const Icon = ITEM_TYPE_ICONS[item.item_type] || FileText;
                  return (
                    <Card key={item.item_id} className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all" onClick={() => setSelectedItem(item)}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-primary" />
                          <CardTitle className="text-sm">{item.title}</CardTitle>
                        </div>
                        {item.summary && <CardDescription className="line-clamp-2">{item.summary}</CardDescription>}
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-1.5 flex-wrap">
                          <Badge variant="outline" className="text-xs capitalize">{item.item_type.replace('_', ' ')}</Badge>
                          {item.tags.slice(0, 2).map(t => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* =========== NEW: Agency-linked tabs =========== */}
          {agencyData.isAgencyLinked && (
            <>
              <TabsContent value="assigned">
                <ParentAssignedTraining assignments={agencyData.assignments} isLoading={agencyData.isLoading} />
              </TabsContent>
              <TabsContent value="goals">
                <ParentGoalsView goals={agencyData.goals} isLoading={agencyData.isLoading} />
              </TabsContent>
              <TabsContent value="homework">
                <ParentHomeworkView
                  homework={agencyData.homework}
                  assignments={agencyData.assignments}
                  isLoading={agencyData.isLoading}
                  onSubmit={agencyData.submitHomework}
                  onRefetch={agencyData.refetch}
                />
              </TabsContent>
              <TabsContent value="progress">
                <ParentProgressView
                  assignments={agencyData.assignments}
                  goals={agencyData.goals}
                  homework={agencyData.homework}
                  isLoading={agencyData.isLoading}
                />
              </TabsContent>
            </>
          )}
        </Tabs>
      </main>

      {/* Library item detail modal (existing, preserved) */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedItem(null)}>
          <Card className="max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>{selectedItem.title}</CardTitle>
              <CardDescription className="capitalize">{selectedItem.item_type.replace('_', ' ')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedItem.summary && <p className="text-sm text-muted-foreground">{selectedItem.summary}</p>}
              {selectedItem.body && typeof selectedItem.body === 'object' && (
                <div className="bg-muted/30 rounded-lg p-4 text-sm whitespace-pre-wrap text-foreground">
                  {(selectedItem.body as any).text || (selectedItem.body as any).content || JSON.stringify(selectedItem.body, null, 2)}
                </div>
              )}
              {selectedItem.tags.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {selectedItem.tags.map(t => <Badge key={t} variant="secondary">{t}</Badge>)}
                </div>
              )}
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setSelectedItem(null)}>Close</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
