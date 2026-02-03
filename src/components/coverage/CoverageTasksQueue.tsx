import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  CheckCircle, Clock, AlertTriangle, Calendar, 
  User, Filter, ChevronRight
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { useCoverageTasks } from '@/hooks/useCoverage';
import { TASK_TYPES, TASK_PRIORITIES } from '@/types/coverage';

export function CoverageTasksQueue() {
  const [statusFilter, setStatusFilter] = useState('pending');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const { loading, tasks, stats, refetch, completeTask } = useCoverageTasks({
    status: statusFilter,
    priority: priorityFilter,
  });

  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);

  const handleComplete = async () => {
    if (!selectedTask) return;
    setIsCompleting(true);
    const success = await completeTask(selectedTask.id, resolutionNotes);
    if (success) {
      setSelectedTask(null);
      setResolutionNotes('');
    }
    setIsCompleting(false);
  };

  const getPriorityBadge = (priority: string) => {
    const config = TASK_PRIORITIES.find(p => p.value === priority);
    return <Badge className={config?.color || 'bg-muted'}>{config?.label || priority}</Badge>;
  };

  const getTaskTypeLabel = (type: string) => {
    return TASK_TYPES.find(t => t.value === type)?.label || type;
  };

  const getDaysIndicator = (dueDate: string) => {
    const days = differenceInDays(new Date(dueDate), new Date());
    if (days < 0) {
      return <span className="text-red-600 font-medium">{Math.abs(days)} days overdue</span>;
    } else if (days === 0) {
      return <span className="text-orange-600 font-medium">Due today</span>;
    } else if (days <= 3) {
      return <span className="text-yellow-600">Due in {days} days</span>;
    }
    return <span className="text-muted-foreground">Due in {days} days</span>;
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.overdue}</p>
                <p className="text-xs text-muted-foreground">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.due7}</p>
                <p className="text-xs text-muted-foreground">Due in 7 days</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.due14}</p>
                <p className="text-xs text-muted-foreground">Due in 14 days</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.due30}</p>
                <p className="text-xs text-muted-foreground">Due in 30 days</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Coverage Tasks</CardTitle>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted rounded" />)}
            </div>
          ) : tasks.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No coverage tasks found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                  onClick={() => setSelectedTask(task)}
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{getTaskTypeLabel(task.task_type)}</span>
                        {getPriorityBadge(task.priority)}
                        <Badge variant="outline">{task.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{task.reason || 'No reason specified'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {getDaysIndicator(task.due_date)}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Task Detail Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{getTaskTypeLabel(selectedTask?.task_type || '')}</DialogTitle>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <p className="capitalize">{selectedTask.status}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Priority</Label>
                  <p>{getPriorityBadge(selectedTask.priority)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Due Date</Label>
                  <p>{format(new Date(selectedTask.due_date), 'MMM d, yyyy')}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Created</Label>
                  <p>{format(new Date(selectedTask.created_at), 'MMM d, yyyy')}</p>
                </div>
              </div>
              
              {selectedTask.reason && (
                <div>
                  <Label className="text-muted-foreground">Reason</Label>
                  <p>{selectedTask.reason}</p>
                </div>
              )}

              {selectedTask.status === 'pending' && (
                <div className="space-y-2 pt-4 border-t">
                  <Label>Resolution Notes</Label>
                  <Textarea
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="Describe how this task was resolved..."
                    rows={3}
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setSelectedTask(null)}>
                      Close
                    </Button>
                    <Button onClick={handleComplete} disabled={isCompleting}>
                      {isCompleting ? 'Completing...' : 'Mark Complete'}
                    </Button>
                  </div>
                </div>
              )}

              {selectedTask.status === 'completed' && selectedTask.resolution_notes && (
                <div>
                  <Label className="text-muted-foreground">Resolution Notes</Label>
                  <p className="text-sm">{selectedTask.resolution_notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
