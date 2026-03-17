import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Plus, Pencil, Trash2, Users, Layers, Clock, Activity,
  UserPlus, Eye, BarChart3, CheckCircle2, AlertCircle, FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { SDCModule, SDCResource, SDCStaffProgress } from '@/hooks/useSDCTraining';

interface Props {
  modules: SDCModule[];
  resources: SDCResource[];
  allStaffProgress: SDCStaffProgress[];
  onCreateModule: (data: Partial<SDCModule>) => Promise<any>;
  onUpdateModule: (id: string, data: Partial<SDCModule>) => Promise<boolean>;
  onDeleteModule: (id: string) => Promise<boolean>;
  onAssignModule: (moduleId: string, staffUserId: string, dueDate?: string) => Promise<boolean>;
  onCreateResource: (data: Partial<SDCResource>) => Promise<boolean>;
  onRefresh: () => void;
}

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  published: 'bg-success/10 text-success',
  active: 'bg-success/10 text-success',
  archived: 'bg-destructive/10 text-destructive',
  not_started: 'bg-muted text-muted-foreground',
  assigned: 'bg-info/10 text-info',
  in_progress: 'bg-warning/10 text-warning',
  completed: 'bg-success/10 text-success',
};

function formatTime(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return `${mins}m ${secs}s`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

export function AdminTab({ modules, resources, allStaffProgress, onCreateModule, onUpdateModule, onDeleteModule, onAssignModule, onCreateResource, onRefresh }: Props) {
  const [adminView, setAdminView] = useState('modules');
  const [showCreateModule, setShowCreateModule] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [showCreateResource, setShowCreateResource] = useState(false);
  const [editingModule, setEditingModule] = useState<SDCModule | null>(null);

  // New module form
  const [newTitle, setNewTitle] = useState('');
  const [newObjective, setNewObjective] = useState('');
  const [newMinutes, setNewMinutes] = useState(30);
  const [newScript, setNewScript] = useState('');

  // Assignment form
  const [assignModuleId, setAssignModuleId] = useState('');
  const [assignEmail, setAssignEmail] = useState('');
  const [assignDueDate, setAssignDueDate] = useState('');

  // Resource form
  const [resTitle, setResTitle] = useState('');
  const [resDescription, setResDescription] = useState('');
  const [resUrl, setResUrl] = useState('');
  const [resModuleId, setResModuleId] = useState('');
  const [resType, setResType] = useState('document');

  const [staffMembers, setStaffMembers] = useState<Array<{ id: string; email: string; full_name?: string }>>([]);
  const [staffLoaded, setStaffLoaded] = useState(false);

  const loadStaff = async () => {
    if (staffLoaded) return;
    const { data } = await supabase
      .from('agency_memberships')
      .select('user_id, role, profiles!inner(id, email, full_name)')
      .eq('status', 'active');
    if (data) {
      const members = data.map((d: any) => ({
        id: d.user_id,
        email: d.profiles?.email || '',
        full_name: d.profiles?.full_name || '',
      }));
      // Dedupe by id
      const unique = Array.from(new Map(members.map((m: any) => [m.id, m])).values());
      setStaffMembers(unique as any[]);
    }
    setStaffLoaded(true);
  };

  const handleCreateModule = async () => {
    if (!newTitle.trim()) { toast.error('Title required'); return; }
    await onCreateModule({
      title: newTitle,
      training_objective: newObjective,
      estimated_minutes: newMinutes,
      instructor_script: newScript,
    });
    setNewTitle(''); setNewObjective(''); setNewMinutes(30); setNewScript('');
    setShowCreateModule(false);
  };

  const handleSaveEdit = async () => {
    if (!editingModule) return;
    await onUpdateModule(editingModule.id, {
      title: editingModule.title,
      training_objective: editingModule.training_objective,
      estimated_minutes: editingModule.estimated_minutes,
      status: editingModule.status,
      instructor_script: editingModule.instructor_script,
    });
    setEditingModule(null);
  };

  const handleAssign = async () => {
    if (!assignModuleId) { toast.error('Select a module'); return; }
    if (!assignEmail) { toast.error('Select staff member'); return; }
    await onAssignModule(assignModuleId, assignEmail, assignDueDate || undefined);
    setAssignModuleId(''); setAssignEmail(''); setAssignDueDate('');
    setShowAssign(false);
  };

  const handleCreateResource = async () => {
    if (!resTitle.trim()) { toast.error('Title required'); return; }
    await onCreateResource({
      title: resTitle,
      description: resDescription,
      file_url: resUrl || undefined,
      module_id: resModuleId || undefined,
      resource_type: resType,
    });
    setResTitle(''); setResDescription(''); setResUrl(''); setResModuleId(''); setResType('document');
    setShowCreateResource(false);
  };

  // Progress stats
  const totalAssigned = allStaffProgress.length;
  const completedCount = allStaffProgress.filter(p => p.status === 'completed').length;
  const inProgressCount = allStaffProgress.filter(p => p.status === 'in_progress').length;
  const totalTimeSpent = allStaffProgress.reduce((sum, p) => sum + p.time_spent_seconds, 0);

  return (
    <div className="space-y-6">
      {/* Admin sub-tabs */}
      <Tabs value={adminView} onValueChange={setAdminView}>
        <TabsList className="mb-4">
          <TabsTrigger value="modules" className="flex items-center gap-1.5">
            <Layers className="w-4 h-4" /> Modules
          </TabsTrigger>
          <TabsTrigger value="progress" className="flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4" /> Staff Progress
          </TabsTrigger>
          <TabsTrigger value="resources" className="flex items-center gap-1.5">
            <FileText className="w-4 h-4" /> Resources
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex items-center gap-1.5" onClick={loadStaff}>
            <Users className="w-4 h-4" /> Assignments
          </TabsTrigger>
        </TabsList>

        {/* ─── MODULES MANAGEMENT ─── */}
        <TabsContent value="modules">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-foreground">Module Manager</h2>
              <p className="text-sm text-muted-foreground">{modules.length} modules total</p>
            </div>
            <Button onClick={() => setShowCreateModule(true)}>
              <Plus className="w-4 h-4 mr-2" /> New Module
            </Button>
          </div>

          {modules.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Layers className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-1">No Modules Yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Create your first training module to get started.</p>
                <Button onClick={() => setShowCreateModule(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Create Module
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {modules.map((mod, idx) => (
                <Card key={mod.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg font-bold text-primary flex-shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{mod.title}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {mod.estimated_minutes || 30} min</span>
                        <Badge className={statusColors[mod.status] || statusColors.draft}>{mod.status}</Badge>
                        {mod.training_objective && (
                          <span className="truncate max-w-[200px]">{mod.training_objective}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => setEditingModule({ ...mod })}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={async () => {
                        if (confirm(`Delete "${mod.title}"?`)) await onDeleteModule(mod.id);
                      }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Create Module Dialog */}
          <Dialog open={showCreateModule} onOpenChange={setShowCreateModule}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Module</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Title</label>
                  <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. Understanding Behavior as Communication" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Training Objective</label>
                  <Textarea value={newObjective} onChange={e => setNewObjective(e.target.value)} placeholder="What staff will learn..." rows={3} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Estimated Minutes</label>
                  <Input type="number" value={newMinutes} onChange={e => setNewMinutes(+e.target.value)} min={5} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Instructor Script (optional)</label>
                  <Textarea value={newScript} onChange={e => setNewScript(e.target.value)} placeholder="Instructor talking points..." rows={4} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowCreateModule(false)}>Cancel</Button>
                  <Button onClick={handleCreateModule}>Create Module</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit Module Dialog */}
          <Dialog open={!!editingModule} onOpenChange={(open) => { if (!open) setEditingModule(null); }}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Edit Module</DialogTitle>
              </DialogHeader>
              {editingModule && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">Title</label>
                    <Input value={editingModule.title} onChange={e => setEditingModule({ ...editingModule, title: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Training Objective</label>
                    <Textarea value={editingModule.training_objective || ''} onChange={e => setEditingModule({ ...editingModule, training_objective: e.target.value })} rows={3} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-foreground">Estimated Minutes</label>
                      <Input type="number" value={editingModule.estimated_minutes || 30} onChange={e => setEditingModule({ ...editingModule, estimated_minutes: +e.target.value })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Status</label>
                      <Select value={editingModule.status} onValueChange={v => setEditingModule({ ...editingModule, status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Instructor Script</label>
                    <Textarea value={editingModule.instructor_script || ''} onChange={e => setEditingModule({ ...editingModule, instructor_script: e.target.value })} rows={4} />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setEditingModule(null)}>Cancel</Button>
                    <Button onClick={handleSaveEdit}>Save Changes</Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ─── STAFF PROGRESS TRACKING ─── */}
        <TabsContent value="progress">
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-foreground">Staff Training Progress</h2>
              <p className="text-sm text-muted-foreground">Real-time tracking of staff training engagement</p>
            </div>

            {/* Stats */}
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold text-foreground">{totalAssigned}</p>
                  <p className="text-xs text-muted-foreground">Total Assigned</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Activity className="w-6 h-6 mx-auto mb-2 text-warning" />
                  <p className="text-2xl font-bold text-foreground">{inProgressCount}</p>
                  <p className="text-xs text-muted-foreground">In Progress</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-success" />
                  <p className="text-2xl font-bold text-foreground">{completedCount}</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Clock className="w-6 h-6 mx-auto mb-2 text-info" />
                  <p className="text-2xl font-bold text-foreground">{formatTime(totalTimeSpent)}</p>
                  <p className="text-xs text-muted-foreground">Total Time</p>
                </CardContent>
              </Card>
            </div>

            {/* Progress Table */}
            {allStaffProgress.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-1">No Training Data Yet</h3>
                  <p className="text-sm text-muted-foreground">Assign modules to staff to begin tracking progress.</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff</TableHead>
                      <TableHead>Module</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Time Spent</TableHead>
                      <TableHead>Last Activity</TableHead>
                      <TableHead>Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allStaffProgress.map(sp => {
                      const mod = modules.find(m => m.id === sp.module_id);
                      return (
                        <TableRow key={sp.id}>
                          <TableCell className="font-medium text-sm">{sp.user_id.slice(0, 8)}...</TableCell>
                          <TableCell className="text-sm">{mod?.title || 'Unknown'}</TableCell>
                          <TableCell>
                            <Badge className={statusColors[sp.status] || statusColors.not_started}>{sp.status}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">{formatTime(sp.time_spent_seconds)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {sp.last_activity_at ? new Date(sp.last_activity_at).toLocaleDateString() : '—'}
                          </TableCell>
                          <TableCell className="text-sm">{sp.score != null ? `${sp.score}%` : '—'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ─── RESOURCES MANAGEMENT ─── */}
        <TabsContent value="resources">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-foreground">Resources & Downloads</h2>
              <p className="text-sm text-muted-foreground">{resources.length} resources</p>
            </div>
            <Button onClick={() => setShowCreateResource(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add Resource
            </Button>
          </div>

          {resources.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-1">No Resources Yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Add PowerPoints, PDFs, worksheets, and other training materials.</p>
                <Button onClick={() => setShowCreateResource(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Add Resource
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {resources.map(res => {
                const mod = modules.find(m => m.id === res.module_id);
                return (
                  <Card key={res.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm text-foreground">{res.title}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <Badge variant="secondary">{res.resource_type}</Badge>
                          {mod && <span>{mod.title}</span>}
                          {res.is_instructor_only && <Badge variant="outline">Instructor Only</Badge>}
                        </div>
                      </div>
                      {res.file_url && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={res.file_url} target="_blank" rel="noopener noreferrer">
                            <Eye className="w-3 h-3 mr-1" /> View
                          </a>
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Create Resource Dialog */}
          <Dialog open={showCreateResource} onOpenChange={setShowCreateResource}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Resource</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Title</label>
                  <Input value={resTitle} onChange={e => setResTitle(e.target.value)} placeholder="Resource title" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Description</label>
                  <Textarea value={resDescription} onChange={e => setResDescription(e.target.value)} placeholder="Brief description..." rows={2} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">File URL</label>
                  <Input value={resUrl} onChange={e => setResUrl(e.target.value)} placeholder="https://..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">Type</label>
                    <Select value={resType} onValueChange={setResType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="document">Document</SelectItem>
                        <SelectItem value="presentation">Presentation</SelectItem>
                        <SelectItem value="worksheet">Worksheet</SelectItem>
                        <SelectItem value="video">Video</SelectItem>
                        <SelectItem value="template">Template</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Module (optional)</label>
                    <Select value={resModuleId} onValueChange={setResModuleId}>
                      <SelectTrigger><SelectValue placeholder="General" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">General</SelectItem>
                        {modules.map(m => (
                          <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowCreateResource(false)}>Cancel</Button>
                  <Button onClick={handleCreateResource}>Add Resource</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ─── ASSIGNMENTS ─── */}
        <TabsContent value="assignments">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-foreground">Training Assignments</h2>
              <p className="text-sm text-muted-foreground">Assign modules to staff members</p>
            </div>
            <Button onClick={() => { loadStaff(); setShowAssign(true); }}>
              <UserPlus className="w-4 h-4 mr-2" /> Assign Training
            </Button>
          </div>

          {/* Show per-module assignment summary */}
          {modules.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Layers className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-1">Create Modules First</h3>
                <p className="text-sm text-muted-foreground">You need at least one module before assigning training.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {modules.map(mod => {
                const modProgress = allStaffProgress.filter(p => p.module_id === mod.id);
                const assigned = modProgress.length;
                const completed = modProgress.filter(p => p.status === 'completed').length;
                const pct = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;
                return (
                  <Card key={mod.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-foreground">{mod.title}</h3>
                        <Badge className={statusColors[mod.status] || statusColors.draft}>{mod.status}</Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress value={pct} className="flex-1 h-2" />
                        <span className="text-xs text-muted-foreground">{completed}/{assigned} complete</span>
                      </div>
                      {assigned === 0 && (
                        <p className="text-xs text-muted-foreground mt-2 italic">No staff assigned yet</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Assign Dialog */}
          <Dialog open={showAssign} onOpenChange={setShowAssign}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Training</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Module</label>
                  <Select value={assignModuleId} onValueChange={setAssignModuleId}>
                    <SelectTrigger><SelectValue placeholder="Select module..." /></SelectTrigger>
                    <SelectContent>
                      {modules.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Staff Member</label>
                  <Select value={assignEmail} onValueChange={setAssignEmail}>
                    <SelectTrigger><SelectValue placeholder="Select staff..." /></SelectTrigger>
                    <SelectContent>
                      {staffMembers.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.full_name || s.email || s.id.slice(0, 8)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Due Date (optional)</label>
                  <Input type="date" value={assignDueDate} onChange={e => setAssignDueDate(e.target.value)} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowAssign(false)}>Cancel</Button>
                  <Button onClick={handleAssign}>Assign</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
